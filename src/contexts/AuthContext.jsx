import React, { createContext, useContext, useEffect, useState } from "react";
import { getIdTokenResult, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  buildUserProfileFallback,
  subscribeToUserProfile,
} from "../services/firebase/repositories/userRepository";
import { normalizeUserRole } from "../utils/userRoles";

const AuthContext = createContext();

const rolePriority = {
  super_admin: 60,
  admin: 50,
  support: 40,
  member: 30,
  teacher: 20,
  learner: 10,
};

const pickHighestRole = (...candidates) =>
  candidates
    .map((candidate) => normalizeUserRole(candidate))
    .filter(Boolean)
    .sort((left, right) => (rolePriority[right] || 0) - (rolePriority[left] || 0))[0] || "learner";

const resolveTokenRole = (tokenResult) => {
  const claims = tokenResult?.claims || {};
  return pickHighestRole(
    claims.role,
    claims.rbac?.role,
    ...(Array.isArray(claims.roles) ? claims.roles : []),
    ...(Array.isArray(claims.rbac?.roles) ? claims.rbac.roles : []),
  );
};

const resolveEffectiveUserRole = ({ profile, tokenResult } = {}) =>
  pickHighestRole(
    resolveTokenRole(tokenResult),
    profile?.rbac?.role,
    profile?.role,
  );

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = undefined;
      }

      if (!user) {
        setCurrentUser(null);
        setUserRole(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      unsubscribeUserDoc = subscribeToUserProfile(user.uid, {
        authUser: user,
        onNext: (profile) => {
          setUserProfile(profile);
          setUserRole(resolveEffectiveUserRole({ profile }));
          setLoading(false);
          getIdTokenResult(user, true)
            .then((tokenResult) => {
              setUserRole(resolveEffectiveUserRole({ profile, tokenResult }));
            })
            .catch((error) => {
              console.error("Unable to read Firebase Auth custom claims", error);
            });
        },
        onError: (error) => {
          console.error("ไม่สามารถอ่านข้อมูลโปรไฟล์ผู้ใช้แบบเรียลไทม์ได้", error);
          const fallbackProfile = buildUserProfileFallback(user);
          setUserProfile(fallbackProfile);
          setUserRole(resolveEffectiveUserRole({ profile: fallbackProfile }));
          setLoading(false);
          getIdTokenResult(user, true)
            .then((tokenResult) => {
              setUserRole(resolveEffectiveUserRole({ profile: fallbackProfile, tokenResult }));
            })
            .catch((tokenError) => {
              console.error("Unable to read Firebase Auth custom claims", tokenError);
            });
        },
      });
    });

    return () => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
      unsubscribeAuth();
    };
  }, []);

  const value = {
    currentUser,
    userRole,
    userProfile,
    loading,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

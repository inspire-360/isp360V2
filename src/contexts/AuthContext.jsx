import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  buildUserProfileFallback,
  subscribeToUserProfile,
} from "../services/firebase/repositories/userRepository";
import { normalizeUserRole } from "../utils/userRoles";

const AuthContext = createContext();

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
          setUserRole(normalizeUserRole(profile?.role));
          setLoading(false);
        },
        onError: (error) => {
          console.error("ไม่สามารถอ่านข้อมูลโปรไฟล์ผู้ใช้แบบเรียลไทม์ได้", error);
          const fallbackProfile = buildUserProfileFallback(user);
          setUserProfile(fallbackProfile);
          setUserRole(normalizeUserRole(fallbackProfile.role));
          setLoading(false);
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

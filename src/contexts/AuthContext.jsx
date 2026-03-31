import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);

function buildFallbackProfile(user) {
  return {
    uid: user?.uid || "",
    name: user?.displayName || user?.email?.split("@")[0] || "ผู้ใช้งาน",
    email: user?.email || "",
    photoURL: user?.photoURL || "",
    role: "teacher",
    status: "active",
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();

      if (!user) {
        setCurrentUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setCurrentUser(user);

      unsubscribeProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            setProfile({
              uid: user.uid,
              ...buildFallbackProfile(user),
              ...snapshot.data(),
            });
          } else {
            setProfile(buildFallbackProfile(user));
          }

          setLoading(false);
        },
        (error) => {
          console.error("Error syncing user profile:", error);
          setProfile(buildFallbackProfile(user));
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  const value = {
    currentUser,
    profile,
    userRole: profile?.role || null,
    userStatus: profile?.status || null,
    isAdmin: profile?.role === "admin",
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

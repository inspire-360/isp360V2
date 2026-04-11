import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { normalizeUserRole } from "../utils/userRoles";
import { สร้างโปรไฟล์สำรองจากบัญชีผู้ใช้ } from "../utils/teacherUserProfile";

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
      unsubscribeUserDoc = onSnapshot(
        doc(db, "users", user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            const profile = { id: docSnap.id, ...docSnap.data() };
            setUserProfile(profile);
            setUserRole(normalizeUserRole(profile.role));
          } else {
            setUserProfile(สร้างโปรไฟล์สำรองจากบัญชีผู้ใช้(user));
            setUserRole("teacher");
          }
          setLoading(false);
        },
        (error) => {
          console.error("ไม่สามารถอ่านข้อมูลโปรไฟล์ผู้ใช้แบบเรียลไทม์ได้", error);
          setUserProfile(สร้างโปรไฟล์สำรองจากบัญชีผู้ใช้(user));
          setUserRole("teacher");
          setLoading(false);
        },
      );
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

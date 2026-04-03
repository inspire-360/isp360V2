import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { normalizeUserRole } from "../utils/userRoles";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
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
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      unsubscribeUserDoc = onSnapshot(
        doc(db, "users", user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            setUserRole(normalizeUserRole(docSnap.data().role));
          } else {
            setUserRole("learner");
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error subscribing user role:", error);
          setUserRole("learner");
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
    loading,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

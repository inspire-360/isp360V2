import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

const HEARTBEAT_MS = 15000;

export function usePresence() {
  const { currentUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) return undefined;

    const userRef = doc(db, "users", currentUser.uid);

    const syncPresence = async (isOnline, presenceState) => {
      try {
        await setDoc(
          userRef,
          {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email?.split("@")[0] || "InSPIRE user",
            email: currentUser.email || "",
            isOnline,
            presenceState,
            activePath: location.pathname,
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };

    void syncPresence(!document.hidden, document.hidden ? "background" : "active");

    const interval = window.setInterval(() => {
      void syncPresence(!document.hidden, document.hidden ? "background" : "active");
    }, HEARTBEAT_MS);

    const handleVisibilityChange = () => {
      void syncPresence(!document.hidden, document.hidden ? "background" : "active");
    };

    const handlePageHide = () => {
      void syncPresence(false, "offline");
    };

    const handleBeforeUnload = () => {
      void syncPresence(false, "offline");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void syncPresence(false, "offline");
    };
  }, [currentUser, location.pathname]);
}

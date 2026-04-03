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

    let interval = 0;

    const syncPresence = async (presenceState) => {
      try {
        await setDoc(
          userRef,
          {
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email?.split("@")[0] || "InSPIRE user",
            email: currentUser.email || "",
            isOnline: true,
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

    const stopHeartbeat = () => {
      if (interval) {
        window.clearInterval(interval);
        interval = 0;
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      if (document.hidden) return;

      interval = window.setInterval(() => {
        void syncPresence("active");
      }, HEARTBEAT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopHeartbeat();
        void syncPresence("away");
        return;
      }

      void syncPresence("active");
      startHeartbeat();
    };

    const handlePageHide = () => {
      stopHeartbeat();
      void syncPresence("away");
    };

    const handleBeforeUnload = () => {
      stopHeartbeat();
      void syncPresence("away");
    };

    if (document.hidden) {
      void syncPresence("away");
    } else {
      void syncPresence("active");
      startHeartbeat();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUser, location.pathname]);
}

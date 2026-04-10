import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createPresenceSessionId, syncPresenceRecord } from "../utils/presenceSync";

const HEARTBEAT_MS = 10000;

export function usePresence() {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();
  const sessionIdRef = useRef(createPresenceSessionId());

  useEffect(() => {
    if (!currentUser) return undefined;

    let interval = 0;
    const sessionId = sessionIdRef.current;

    const syncPresence = async (presenceState) => {
      try {
        await syncPresenceRecord({
          user: currentUser,
          role: userRole,
          activePath: location.pathname,
          presenceState,
          sessionId,
        });
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
  }, [currentUser, location.pathname, userRole]);
}

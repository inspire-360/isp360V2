import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { startPresenceV2Session } from "../services/firebase/repositories/presenceV2Repository";
import { isPresenceV2EnabledForUser } from "../utils/presenceV2Flags";
import {
  createPresenceSessionId,
  isIgnorablePresenceSyncError,
  syncPresenceKeepalive,
  syncPresenceRecord,
} from "../utils/presenceSync";
import { PRESENCE_TICK_MS } from "../utils/presenceStatus";

export function usePresence() {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();
  const sessionIdRef = useRef(createPresenceSessionId());
  const latestPathRef = useRef(location.pathname);
  const latestRoleRef = useRef(userRole);
  const latestUserRef = useRef(currentUser);

  useEffect(() => {
    latestPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    latestRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    latestUserRef.current = currentUser;
    if (currentUser?.uid) {
      sessionIdRef.current = createPresenceSessionId();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;

    let heartbeatTimer = 0;

    const reportPresenceError = (label, error) => {
      if (isIgnorablePresenceSyncError(error)) return;
      console.error(label, error);
    };

    const writePresence = (presenceState, keepalive = false) => {
      const payload = {
        user: latestUserRef.current,
        role: latestRoleRef.current,
        activePath: latestPathRef.current,
        presenceState,
        sessionId: sessionIdRef.current,
      };

      void syncPresenceRecord(payload).catch((error) => {
        reportPresenceError("อัปเดตสถานะออนไลน์ไม่สำเร็จ:", error);
      });

      if (keepalive) {
        void syncPresenceKeepalive(payload).catch((error) => {
          reportPresenceError("ส่งสถานะคงค้างก่อนออกจากหน้าไม่สำเร็จ:", error);
        });
      }
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = 0;
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      if (document.visibilityState !== "visible") return;

      heartbeatTimer = window.setInterval(() => {
        writePresence("online");
      }, PRESENCE_TICK_MS);
    };

    const handleVisible = () => {
      writePresence("online");
      startHeartbeat();
    };

    const handleHidden = () => {
      stopHeartbeat();
      writePresence("away", true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleVisible();
        return;
      }

      handleHidden();
    };

    const handlePageHide = () => {
      stopHeartbeat();
      writePresence("offline", true);
    };

    if (document.visibilityState === "visible") {
      handleVisible();
    } else {
      handleHidden();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !isPresenceV2EnabledForUser({ currentUser })) return undefined;

    return startPresenceV2Session({
      user: currentUser,
      role: userRole,
      getActivePath: () => latestPathRef.current,
      getRole: () => latestRoleRef.current,
      onError: (error) => {
        if (isIgnorablePresenceSyncError(error)) return;
        console.error("Presence V2 sync failed:", error);
      },
    });
  }, [currentUser, currentUser?.uid, userRole]);

  useEffect(() => {
    if (!currentUser?.uid || document.visibilityState !== "visible") return;

    void syncPresenceRecord({
      user: currentUser,
      role: userRole,
      activePath: location.pathname,
      presenceState: "online",
      sessionId: sessionIdRef.current,
    }).catch((error) => {
      if (isIgnorablePresenceSyncError(error)) return;
      console.error("อัปเดตเส้นทางล่าสุดไม่สำเร็จ:", error);
    });
  }, [currentUser, location.pathname, userRole]);
}

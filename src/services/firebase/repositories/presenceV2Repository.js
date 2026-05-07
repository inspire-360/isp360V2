import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { realtimeDb } from "../../../lib/firebase";
import { getPresenceV2HeartbeatMs } from "../../../utils/presenceV2Flags";

const STORAGE_PREFIX = "inspire.presenceV2";

const normalizeString = (value, fallback = "") => String(value ?? fallback).trim();

const createId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const readStorageId = ({ storage, key }) => {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;

    const next = createId();
    storage.setItem(key, next);
    return next;
  } catch {
    return createId();
  }
};

const getDeviceId = () =>
  readStorageId({
    storage: window.localStorage,
    key: `${STORAGE_PREFIX}.deviceId`,
  });

const getTabId = () =>
  readStorageId({
    storage: window.sessionStorage,
    key: `${STORAGE_PREFIX}.tabId`,
  });

const resolveConnectionState = () => (document.visibilityState === "visible" ? "online" : "idle");

const resolveVisibilityState = () => (document.visibilityState === "visible" ? "visible" : "hidden");

const buildConnectionPayload = ({ user, role, activePath, deviceId, tabId }) => ({
  schemaVersion: 1,
  uid: user.uid,
  email: normalizeString(user.email),
  displayName: normalizeString(user.displayName || user.email),
  role: normalizeString(role || "learner"),
  activePath: normalizeString(activePath || "/"),
  state: resolveConnectionState(),
  visibilityState: resolveVisibilityState(),
  connectedAt: serverTimestamp(),
  lastHeartbeatAt: serverTimestamp(),
  userAgent: normalizeString(window.navigator?.userAgent).slice(0, 500),
  deviceId,
  tabId,
});

const buildHeartbeatPayload = ({ role, activePath }) => ({
  role: normalizeString(role || "learner"),
  activePath: normalizeString(activePath || "/"),
  state: resolveConnectionState(),
  visibilityState: resolveVisibilityState(),
  lastHeartbeatAt: serverTimestamp(),
});

export const startPresenceV2Session = ({
  user,
  role,
  getActivePath = () => "/",
  getRole = () => role,
  onError,
} = {}) => {
  if (!user?.uid || !realtimeDb || typeof window === "undefined") {
    return () => {};
  }

  const deviceId = getDeviceId();
  const tabId = getTabId();
  const connectionsRef = ref(realtimeDb, `status/${user.uid}/connections`);
  const connectionRef = push(connectionsRef);
  const connectedRef = ref(realtimeDb, ".info/connected");
  const heartbeatMs = getPresenceV2HeartbeatMs();
  let heartbeatTimer = 0;
  let stopped = false;

  const reportError = (error) => {
    onError?.(error);
  };

  const writeHeartbeat = () => {
    if (stopped) return;
    update(
      connectionRef,
      buildHeartbeatPayload({
        role: getRole(),
        activePath: getActivePath(),
      }),
    ).catch(reportError);
  };

  const startHeartbeat = () => {
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    heartbeatTimer = window.setInterval(writeHeartbeat, heartbeatMs);
  };

  const handleVisibilityChange = () => {
    writeHeartbeat();
  };

  const handlePageHide = () => {
    update(connectionRef, {
      state: "idle",
      visibilityState: "hidden",
      lastHeartbeatAt: serverTimestamp(),
    }).catch(reportError);
  };

  const unsubscribeConnected = onValue(
    connectedRef,
    (snapshot) => {
      if (snapshot.val() !== true || stopped) return;

      onDisconnect(connectionRef).remove().catch(reportError);
      set(
        connectionRef,
        buildConnectionPayload({
          user,
          role: getRole(),
          activePath: getActivePath(),
          deviceId,
          tabId,
        }),
      )
        .then(() => {
          writeHeartbeat();
          startHeartbeat();
        })
        .catch(reportError);
    },
    reportError,
  );

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("beforeunload", handlePageHide);

  return () => {
    stopped = true;
    if (heartbeatTimer) window.clearInterval(heartbeatTimer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("beforeunload", handlePageHide);
    unsubscribeConnected();
    remove(connectionRef).catch(() => {});
  };
};

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { PRESENCE_COLLECTION } from "./presenceStatus";

const buildFallbackName = (user) =>
  user?.displayName || user?.email?.split("@")[0] || "ผู้ใช้งาน InSPIRE";

const normalizePresenceState = (presenceState = "online") => {
  const normalized = String(presenceState || "online").trim().toLowerCase();
  if (["offline", "away", "background", "hidden"].includes(normalized)) {
    return normalized === "offline" ? "offline" : "away";
  }

  return "online";
};

const resolvePresenceFlags = (presenceState) => {
  const normalized = normalizePresenceState(presenceState);
  return {
    presenceState: normalized,
    isOnline: normalized === "online",
    visibilityState: normalized === "online" ? "visible" : "hidden",
  };
};

const buildPresencePayload = ({
  user,
  role,
  activePath = "/",
  presenceState = "online",
  sessionId,
  dateValue = new Date(),
  useServerTimestamp = true,
}) => {
  const presenceMeta = resolvePresenceFlags(presenceState);
  const baseTimestamp = useServerTimestamp ? serverTimestamp() : dateValue;
  const timestampMs = dateValue.getTime();

  return {
    uid: user.uid,
    name: buildFallbackName(user),
    role: role || "learner",
    photoURL: user.photoURL || "",
    activePath,
    presenceState: presenceMeta.presenceState,
    isOnline: presenceMeta.isOnline,
    visibilityState: presenceMeta.visibilityState,
    lastActive: baseTimestamp,
    lastActiveMs: timestampMs,
    lastSeen: baseTimestamp,
    lastSeenMs: timestampMs,
    updatedAt: baseTimestamp,
    updatedAtMs: timestampMs,
    sessionId: sessionId || null,
  };
};

const toFirestoreValue = (value) => {
  if (value == null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  return { stringValue: String(value) };
};

const buildFirestoreDocumentBody = (payload) => ({
  fields: Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, toFirestoreValue(value)]),
  ),
});

const normalizeErrorMessage = (error) =>
  String(
    error?.message
      || error?.code
      || error
      || "",
  ).trim();

export const isIgnorablePresenceSyncError = (error) => {
  const message = normalizeErrorMessage(error).toLowerCase();

  return (
    message.includes("failed to fetch")
    || message.includes("networkerror")
    || message.includes("the operation was aborted")
    || message.includes("aborterror")
    || message.includes("load failed")
    || message.includes("network request failed")
  );
};

const buildPresenceRestUrl = (userId, payload) => {
  const projectId = db.app.options.projectId;
  const url = new URL(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${PRESENCE_COLLECTION}/${userId}`,
  );

  Object.keys(payload).forEach((fieldPath) => {
    url.searchParams.append("updateMask.fieldPaths", fieldPath);
  });

  return url.toString();
};

export const createPresenceSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

export const syncPresenceRecord = async ({
  user,
  role,
  activePath = "/",
  presenceState = "online",
  sessionId,
}) => {
  if (!user?.uid) return;

  const payload = buildPresencePayload({
    user,
    role,
    activePath,
    presenceState,
    sessionId,
    useServerTimestamp: true,
  });

  await setDoc(doc(db, PRESENCE_COLLECTION, user.uid), payload, { merge: true });
};

export const syncPresenceKeepalive = async ({
  user,
  role,
  activePath = "/",
  presenceState = "online",
  sessionId,
}) => {
  if (!user?.uid || typeof fetch !== "function") return;

  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser?.uid || currentAuthUser.uid !== user.uid) return;

  const idToken = await currentAuthUser.getIdToken();
  const payload = buildPresencePayload({
    user,
    role,
    activePath,
    presenceState,
    sessionId,
    dateValue: new Date(),
    useServerTimestamp: false,
  });

  await fetch(buildPresenceRestUrl(user.uid, payload), {
    method: "PATCH",
    mode: "cors",
    keepalive: true,
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildFirestoreDocumentBody(payload)),
  });
};

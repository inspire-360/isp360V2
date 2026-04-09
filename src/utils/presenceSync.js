import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { PRESENCE_COLLECTION } from "./presenceStatus";

const buildFallbackName = (user) => user?.displayName || user?.email?.split("@")[0] || "InSPIRE user";

export const createPresenceSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

export const syncPresenceRecord = async ({
  user,
  role,
  activePath = "/",
  presenceState = "active",
  sessionId,
}) => {
  if (!user?.uid) return;

  await setDoc(
    doc(db, PRESENCE_COLLECTION, user.uid),
    {
      uid: user.uid,
      name: buildFallbackName(user),
      role: role || "learner",
      photoURL: user.photoURL || "",
      presenceState,
      activePath,
      lastSeen: serverTimestamp(),
      lastSeenMs: Date.now(),
      sessionId: sessionId || null,
    },
    { merge: true },
  );
};

import { getDoc, getDocs, setDoc } from "firebase/firestore";
import { normalizeMissionResponseRecord } from "../mappers/missionResponseMapper";
import { missionResponseDocRef, missionResponsesCollectionRef } from "../pathBuilders";
import { timestampNow } from "../timestamps";

export const getMissionResponse = async (uid, courseId, missionId) => {
  if (!uid || !courseId || !missionId) return null;

  const snapshot = await getDoc(missionResponseDocRef(uid, courseId, missionId));
  if (!snapshot.exists()) return null;

  return normalizeMissionResponseRecord(snapshot.data(), {
    missionId,
    courseId,
  });
};

export const listMissionResponses = async (uid, courseId) => {
  if (!uid || !courseId) return [];

  const snapshot = await getDocs(missionResponsesCollectionRef(uid, courseId));

  return snapshot.docs.map((item) =>
    normalizeMissionResponseRecord(item.data(), {
      missionId: item.id,
      courseId,
    }),
  );
};

export const upsertMissionResponse = async (
  uid,
  courseId,
  missionId,
  payload,
  { submitted = false } = {},
) => {
  if (!uid || !courseId || !missionId) {
    throw new Error("uid, courseId, and missionId are required to write a mission response.");
  }

  const responsePayload = {
    ...payload,
    missionId,
    courseId,
    saveState: submitted ? "submitted" : payload?.saveState || "draft",
    updatedAt: timestampNow(),
    ...(submitted ? { submittedAt: timestampNow() } : {}),
  };

  await setDoc(missionResponseDocRef(uid, courseId, missionId), responsePayload, { merge: true });
};

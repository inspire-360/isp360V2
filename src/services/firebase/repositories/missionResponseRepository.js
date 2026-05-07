import {
  collectionGroup,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  normalizeMissionResponseCollectionGroupRecord,
  normalizeMissionResponseRecord,
  resolveMissionResponsePathContext,
} from "../mappers/missionResponseMapper";
import { MISSION_RESPONSES_SUBCOLLECTION } from "../collections";
import { missionResponseDocRef, missionResponsesCollectionRef } from "../pathBuilders";
import { timestampNow } from "../timestamps";
import { assertMissionTextValid } from "../../../utils/missionTextValidation";
import { assertMissionLinksValid } from "../../../utils/missionLinkValidation";

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

export const subscribeToMissionResponses = (uid, courseId, { onNext, onError } = {}) => {
  if (!uid || !courseId) {
    onNext?.([]);
    return () => {};
  }

  return onSnapshot(
    missionResponsesCollectionRef(uid, courseId),
    (snapshot) => {
      onNext?.(
        snapshot.docs.map((item) =>
          normalizeMissionResponseRecord(item.data(), {
            missionId: item.id,
            courseId,
          }),
        ),
      );
    },
    onError,
  );
};

const normalizeCollectionGroupSnapshotDoc = (item) =>
  normalizeMissionResponseCollectionGroupRecord(item.data(), {
    id: item.id,
    path: item.ref.path,
    ...resolveMissionResponsePathContext(item.ref.path),
  });

const buildMissionResponseCollectionGroupQuery = ({ courseId } = {}) => {
  const collectionRef = collectionGroup(db, MISSION_RESPONSES_SUBCOLLECTION);

  return courseId ? query(collectionRef, where("courseId", "==", courseId)) : collectionRef;
};

export const listMissionResponseCollectionGroup = async ({ courseId } = {}) => {
  const snapshot = await getDocs(buildMissionResponseCollectionGroupQuery({ courseId }));
  return snapshot.docs.map(normalizeCollectionGroupSnapshotDoc);
};

export const subscribeToMissionResponseCollectionGroup = (
  { courseId, onNext, onError } = {},
) =>
  onSnapshot(
    buildMissionResponseCollectionGroupQuery({ courseId }),
    (snapshot) => {
      onNext?.(snapshot.docs.map(normalizeCollectionGroupSnapshotDoc));
    },
    onError,
  );

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

  if (submitted) {
    assertMissionTextValid(responsePayload);
    assertMissionLinksValid(responsePayload);
  }

  await setDoc(missionResponseDocRef(uid, courseId, missionId), responsePayload, { merge: true });
};

export const removeMissionResponse = async (uid, courseId, missionId) => {
  if (!uid || !courseId || !missionId) return;
  await deleteDoc(missionResponseDocRef(uid, courseId, missionId));
};

export const clearMissionResponses = async (uid, courseId, missionIds = []) => {
  if (!uid || !courseId || !Array.isArray(missionIds) || missionIds.length === 0) return;

  const batch = writeBatch(missionResponsesCollectionRef(uid, courseId).firestore);
  missionIds.forEach((missionId) => {
    if (!missionId) return;
    batch.delete(missionResponseDocRef(uid, courseId, missionId));
  });
  await batch.commit();
};

import {
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { INNOVATIONS_COLLECTION } from "../collections";
import {
  buildInnovationBoardRecord,
  normalizeInnovationRecord,
  shouldSyncInnovationMetadata,
} from "../mappers/innovationMapper";
import { innovationDocRef } from "../pathBuilders";
import { normalizeInnovationStage } from "../../../data/innovationKanban";

export const subscribeToInnovations = ({ onNext, onError } = {}) =>
  onSnapshot(
    query(collection(db, INNOVATIONS_COLLECTION)),
    (snapshot) => {
      const rows = snapshot.docs.map((item) =>
        normalizeInnovationRecord(item.data(), {
          id: item.id,
        }),
      );
      onNext?.(rows);
    },
    (error) => {
      onError?.(error);
    },
  );

export const syncInnovationMetadata = async ({
  enrollment,
  teacherProfile,
  missionResponses,
  existingInnovation,
  force = false,
} = {}) => {
  const nextInnovation = buildInnovationBoardRecord({
    enrollment,
    teacherProfile,
    missionResponses,
    existingInnovation,
  });

  if (!nextInnovation?.id) {
    return null;
  }

  if (
    !force &&
    existingInnovation?.id &&
    !shouldSyncInnovationMetadata(existingInnovation, nextInnovation)
  ) {
    return nextInnovation;
  }

  await setDoc(
    innovationDocRef(nextInnovation.id),
    {
      teacherId: nextInnovation.teacherId,
      teacherName: nextInnovation.teacherName,
      schoolName: nextInnovation.schoolName,
      title: nextInnovation.title,
      summary: nextInnovation.summary,
      focusArea: nextInnovation.focusArea,
      supportNeed: nextInnovation.supportNeed,
      tags: nextInnovation.tags,
      stage: normalizeInnovationStage(nextInnovation.stage),
      evidenceNote: nextInnovation.evidenceNote,
      createdAt: nextInnovation.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMovedAt: nextInnovation.lastMovedAt || null,
      lastMovedById: nextInnovation.lastMovedById || "",
      lastMovedByName: nextInnovation.lastMovedByName || "",
    },
    { merge: true },
  );

  return nextInnovation;
};

export const updateInnovationStage = async ({
  innovationId,
  nextStage,
  operatorId,
  operatorName,
} = {}) => {
  if (!innovationId || !nextStage || !operatorId) return;

  await updateDoc(innovationDocRef(innovationId), {
    stage: normalizeInnovationStage(nextStage),
    updatedAt: serverTimestamp(),
    lastMovedAt: serverTimestamp(),
    lastMovedById: operatorId,
    lastMovedByName: operatorName || "",
  });
};

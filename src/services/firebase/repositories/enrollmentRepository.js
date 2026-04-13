import { getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { normalizeEnrollmentSummaryRecord } from "../mappers/enrollmentSummaryMapper";
import { enrollmentDocRef, userEnrollmentsCollectionRef } from "../pathBuilders";

export const subscribeToEnrollmentSummary = (uid, courseId, { onNext, onError } = {}) => {
  if (!uid || !courseId) return () => {};

  return onSnapshot(
    enrollmentDocRef(uid, courseId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onNext?.(null);
        return;
      }

      onNext?.(
        normalizeEnrollmentSummaryRecord(snapshot.data(), {
          id: snapshot.id,
          path: snapshot.ref.path,
          userId: snapshot.ref.parent.parent?.id,
        }),
      );
    },
    onError,
  );
};

export const getEnrollmentSummary = async (uid, courseId) => {
  if (!uid || !courseId) return null;

  const snapshot = await getDoc(enrollmentDocRef(uid, courseId));
  if (!snapshot.exists()) return null;

  return normalizeEnrollmentSummaryRecord(snapshot.data(), {
    id: snapshot.id,
    path: snapshot.ref.path,
    userId: snapshot.ref.parent.parent?.id,
  });
};

export const listUserEnrollmentSummaries = async (uid) => {
  if (!uid) return [];

  const snapshot = await getDocs(userEnrollmentsCollectionRef(uid));

  return snapshot.docs.map((item) =>
    normalizeEnrollmentSummaryRecord(item.data(), {
      id: item.id,
      path: item.ref.path,
      userId: uid,
    }),
  );
};

export const upsertEnrollmentSummary = async (uid, courseId, payload, options = { merge: true }) => {
  if (!uid || !courseId) {
    throw new Error("uid and courseId are required to write an enrollment summary.");
  }

  await setDoc(enrollmentDocRef(uid, courseId), payload, options);
};

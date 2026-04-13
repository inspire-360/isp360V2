import { collectionGroup, getDoc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { ENROLLMENTS_SUBCOLLECTION } from "../collections";
import {
  buildEnrollmentSummaryCreateData,
  normalizeEnrollmentSummaryRecord,
} from "../mappers/enrollmentSummaryMapper";
import { enrollmentDocRef, userEnrollmentsCollectionRef } from "../pathBuilders";

const buildEnrollmentCollectionGroupQuery = ({ courseId } = {}) => {
  const collectionRef = collectionGroup(db, ENROLLMENTS_SUBCOLLECTION);
  return courseId ? query(collectionRef, where("courseId", "==", courseId)) : collectionRef;
};

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

export const subscribeToUserEnrollmentSummaries = (uid, { onNext, onError } = {}) => {
  if (!uid) {
    onNext?.([]);
    return () => {};
  }

  return onSnapshot(
    userEnrollmentsCollectionRef(uid),
    (snapshot) => {
      onNext?.(
        snapshot.docs.map((item) =>
          normalizeEnrollmentSummaryRecord(item.data(), {
            id: item.id,
            path: item.ref.path,
            userId: uid,
          }),
        ),
      );
    },
    onError,
  );
};

export const subscribeToEnrollmentSummaryCollectionGroup = (
  { courseId, onNext, onError } = {},
) =>
  onSnapshot(
    buildEnrollmentCollectionGroupQuery({ courseId }),
    (snapshot) => {
      onNext?.(
        snapshot.docs.map((item) =>
          normalizeEnrollmentSummaryRecord(item.data(), {
            id: item.id,
            path: item.ref.path,
            userId: item.ref.parent.parent?.id,
          }),
        ),
      );
    },
    onError,
  );

export const upsertEnrollmentSummary = async (uid, courseId, payload, options = { merge: true }) => {
  if (!uid || !courseId) {
    throw new Error("uid and courseId are required to write an enrollment summary.");
  }

  await setDoc(enrollmentDocRef(uid, courseId), payload, options);
};

export const createEnrollmentSummary = async ({
  uid,
  course = null,
  courseId = "",
  courseTitle = "",
  lessonCount = 0,
  moduleCount = 0,
  accessCodeUsed = "none",
} = {}) => {
  const resolvedCourseId = courseId || course?.id || "";

  if (!uid || !resolvedCourseId) {
    throw new Error("uid and courseId are required to create an enrollment summary.");
  }

  const payload = buildEnrollmentSummaryCreateData({
    course,
    courseId: resolvedCourseId,
    courseTitle,
    lessonCount,
    moduleCount,
    accessCodeUsed,
  });

  await setDoc(enrollmentDocRef(uid, resolvedCourseId), payload, { merge: true });

  return normalizeEnrollmentSummaryRecord(payload, {
    id: resolvedCourseId,
    path: enrollmentDocRef(uid, resolvedCourseId).path,
    userId: uid,
  });
};

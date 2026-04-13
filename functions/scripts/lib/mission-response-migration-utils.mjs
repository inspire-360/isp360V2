import { Timestamp } from "firebase-admin/firestore";

export const usageText = [
  "Usage:",
  "  npm run backfill-mission-responses -- --course-id course-teacher",
  "  npm run backfill-mission-responses -- --course-id course-teacher --write true",
  "  npm run backfill-mission-responses -- --user-id USER_UID --course-id course-teacher --write true --prune-legacy true",
  "  npm run verify-mission-response-backfill -- --course-id course-teacher",
  "",
  "Default behavior:",
  "  Backfill runs in dry-run mode unless --write true is provided.",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --course-id <courseId>",
  "  --user-id <uid>",
  "  --limit <number of enrollments>",
  "  --write true",
  "  --prune-legacy true",
  "  --strict true",
  "  --fail-on-diff true",
  "",
  "Prerequisite:",
  "  Set GOOGLE_APPLICATION_CREDENTIALS to a Firebase service account JSON.",
].join("\n");

export const parseArgs = (argv) =>
  argv.reduce((accumulator, token, index, items) => {
    if (!token.startsWith("--")) return accumulator;

    const key = token.slice(2);
    const next = items[index + 1];
    accumulator[key] = next && !next.startsWith("--") ? next : "true";
    return accumulator;
  }, {});

export const toBoolean = (value, fallback = false) => {
  if (value == null) return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;

  return fallback;
};

export const toPositiveInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

export const parseTopLevelTimestamp = (value) => {
  if (value == null) return value;
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);

  if (
    typeof value === "object" &&
    Number.isFinite(value.seconds) &&
    Number.isFinite(value.nanoseconds)
  ) {
    return new Timestamp(value.seconds, value.nanoseconds);
  }

  if (typeof value === "string" || typeof value === "number") {
    const candidate = new Date(value);
    if (!Number.isNaN(candidate.getTime())) {
      return Timestamp.fromDate(candidate);
    }
  }

  return value;
};

export const normalizeLegacyMissionResponse = ({ missionId, courseId, response }) => {
  const normalizedResponse =
    response && typeof response === "object" && !Array.isArray(response) ? { ...response } : {};

  ["updatedAt", "submittedAt", "clearedAt", "createdAt"].forEach((field) => {
    if (field in normalizedResponse) {
      normalizedResponse[field] = parseTopLevelTimestamp(normalizedResponse[field]);
    }
  });

  return {
    ...normalizedResponse,
    missionId,
    courseId,
    lessonId:
      String(normalizedResponse.lessonId || normalizedResponse.missionId || missionId).trim() ||
      missionId,
    saveState:
      String(normalizedResponse.saveState || "").trim() ||
      (normalizedResponse.submittedAt ? "submitted" : "draft"),
  };
};

export const shouldIncludeEnrollment = ({ snapshot, userIdFilter, courseIdFilter }) => {
  const userId = snapshot.ref.parent.parent?.id || "";
  const courseId = snapshot.get("courseId") || snapshot.id;

  if (userIdFilter && userId !== userIdFilter) return false;
  if (courseIdFilter && courseId !== courseIdFilter) return false;

  return true;
};

export const loadEnrollmentSnapshots = async ({ db, userIdFilter, courseIdFilter, limit }) => {
  if (userIdFilter && courseIdFilter) {
    const snapshot = await db
      .collection("users")
      .doc(userIdFilter)
      .collection("enrollments")
      .doc(courseIdFilter)
      .get();

    return snapshot.exists ? [snapshot] : [];
  }

  if (userIdFilter) {
    const snapshot = await db.collection("users").doc(userIdFilter).collection("enrollments").get();
    return snapshot.docs
      .filter((item) =>
        shouldIncludeEnrollment({ snapshot: item, userIdFilter, courseIdFilter }),
      )
      .slice(0, limit || undefined);
  }

  const snapshot = await db.collectionGroup("enrollments").get();
  return snapshot.docs
    .filter((item) =>
      shouldIncludeEnrollment({ snapshot: item, userIdFilter, courseIdFilter }),
    )
    .slice(0, limit || undefined);
};

export const toStableComparableValue = (value) => {
  if (value == null) return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toStableComparableValue(item));

  if (typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = toStableComparableValue(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

export const buildComparableMissionResponse = ({ missionId, courseId, response }) =>
  toStableComparableValue(
    normalizeLegacyMissionResponse({
      missionId,
      courseId,
      response,
    }),
  );

export const diffMissionResponseKeys = ({ legacyMap, canonicalMap, strictMode = false }) => {
  const legacyKeys = [...legacyMap.keys()].sort();
  const canonicalKeys = [...canonicalMap.keys()].sort();
  const missingInCanonical = legacyKeys.filter((missionId) => !canonicalMap.has(missionId));
  const extraInCanonical =
    legacyKeys.length === 0
      ? []
      : canonicalKeys.filter((missionId) => !legacyMap.has(missionId));
  const payloadDiffs = [];

  if (strictMode) {
    legacyKeys
      .filter((missionId) => canonicalMap.has(missionId))
      .forEach((missionId) => {
        const legacyPayload = JSON.stringify(legacyMap.get(missionId));
        const canonicalPayload = JSON.stringify(canonicalMap.get(missionId));

        if (legacyPayload !== canonicalPayload) {
          payloadDiffs.push(missionId);
        }
      });
  }

  return {
    missingInCanonical,
    extraInCanonical,
    payloadDiffs,
  };
};

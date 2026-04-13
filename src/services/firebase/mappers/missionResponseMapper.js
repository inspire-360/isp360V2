import { resolveTimestampMillis } from "../timestamps";

export const normalizeMissionResponseRecord = (record = {}, context = {}) => ({
  ...record,
  missionId: context.missionId || record.missionId || "",
  courseId: context.courseId || record.courseId || "",
  lessonId: record.lessonId || context.missionId || "",
  saveState: String(record.saveState || "draft").trim() || "draft",
  updatedAt: record.updatedAt || null,
  updatedAtMs: resolveTimestampMillis(record.updatedAt),
  submittedAt: record.submittedAt || null,
  submittedAtMs: resolveTimestampMillis(record.submittedAt),
});

export const resolveMissionResponsePathContext = (path = "") => {
  const segments = String(path || "")
    .split("/")
    .filter(Boolean);

  const userId = segments[1] || "";
  const enrollmentId = segments[3] || "";

  return {
    userId,
    enrollmentId,
    courseId: enrollmentId,
    enrollmentPath:
      segments.length >= 4 ? [segments[0], segments[1], segments[2], segments[3]].join("/") : "",
  };
};

export const normalizeMissionResponseCollectionGroupRecord = (record = {}, context = {}) => {
  const baseRecord = normalizeMissionResponseRecord(record, context);

  return {
    ...baseRecord,
    id: context.id || baseRecord.missionId,
    userId: context.userId || "",
    enrollmentId: context.enrollmentId || context.courseId || baseRecord.courseId || "",
    enrollmentPath: context.enrollmentPath || "",
    path: context.path || "",
  };
};

export const getMissionResponseEnrollmentKey = ({
  userId = "",
  courseId = "",
  enrollmentId = "",
} = {}) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedCourseId = String(courseId || enrollmentId || "").trim();

  if (!normalizedUserId || !normalizedCourseId) return "";

  return `${normalizedUserId}::${normalizedCourseId}`;
};

export const buildMissionResponseMap = (rows = []) =>
  rows.reduce((accumulator, row) => {
    const missionId = String(row?.missionId || row?.id || "").trim();
    if (!missionId) return accumulator;

    accumulator[missionId] = row;
    return accumulator;
  }, {});

export const groupMissionResponsesByEnrollmentKey = (rows = []) =>
  rows.reduce((accumulator, row) => {
    const key = getMissionResponseEnrollmentKey(row);
    const missionId = String(row?.missionId || row?.id || "").trim();

    if (!key || !missionId) return accumulator;

    const existing = accumulator[key] || {};
    accumulator[key] = {
      ...existing,
      [missionId]: row,
    };

    return accumulator;
  }, {});

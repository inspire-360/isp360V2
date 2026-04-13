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

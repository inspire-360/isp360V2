import { resolveTimestampMillis } from "../timestamps";

export const normalizeVideoRecord = (record = {}, context = {}) => ({
  ...record,
  id: context.id || record.id || "",
  teacherId: String(record.teacherId || "").trim(),
  title: String(record.title || "วิดีโอการสอนจริง").trim() || "วิดีโอการสอนจริง",
  reviewStatus: String(record.reviewStatus || "pending_feedback").trim() || "pending_feedback",
  updatedAtMs: resolveTimestampMillis(record.updatedAt || record.lastCommentAt || record.submittedAt),
});

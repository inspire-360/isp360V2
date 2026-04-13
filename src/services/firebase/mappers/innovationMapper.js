import { normalizeInnovationStage } from "../../../data/innovationKanban";
import { resolveTimestampMillis } from "../timestamps";

export const normalizeInnovationRecord = (record = {}, context = {}) => ({
  ...record,
  id: context.id || record.id || "",
  title: String(record.title || "นวัตกรรมที่ยังไม่ตั้งชื่อ").trim() || "นวัตกรรมที่ยังไม่ตั้งชื่อ",
  teacherId: String(record.teacherId || "").trim(),
  teacherName: String(record.teacherName || record.ownerName || "").trim(),
  schoolName: String(record.schoolName || record.school || "").trim(),
  stage: normalizeInnovationStage(record.stage),
  updatedAtMs: resolveTimestampMillis(record.updatedAt || record.lastMovedAt || record.createdAt),
});

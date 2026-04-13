import { buildEnrollmentInsight } from "../../../utils/duMemberInsights";

export const normalizeEnrollmentSummaryRecord = (record = {}, context = {}) =>
  buildEnrollmentInsight({
    ...record,
    id: context.id || record.id || "",
    path: context.path || record.path || "",
    userId: context.userId || record.userId || "",
  });

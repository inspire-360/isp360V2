import { buildEnrollmentInsight } from "../../../utils/duMemberInsights";
import { timestampNow } from "../timestamps";

export const buildEnrollmentSummaryCreateData = ({
  course = null,
  courseId = "",
  courseTitle = "",
  lessonCount = 0,
  moduleCount = 0,
  accessCodeUsed = "none",
} = {}) => {
  const resolvedCourseId = courseId || course?.id || "";
  const resolvedCourseTitle = courseTitle || course?.title || resolvedCourseId;
  const resolvedLessonCount = Number(course?.lessonCount ?? lessonCount ?? 0);
  const resolvedModuleCount = Number(course?.modules ?? moduleCount ?? 0);

  return {
    courseId: resolvedCourseId,
    courseTitle: resolvedCourseTitle,
    completedLessons: [],
    completedLessonsCount: 0,
    enrolledAt: timestampNow(),
    progress: 0,
    progressPercent: 0,
    lessonCount: Number.isFinite(resolvedLessonCount) ? resolvedLessonCount : 0,
    moduleCount: Number.isFinite(resolvedModuleCount) ? resolvedModuleCount : 0,
    currentModuleIndex: 0,
    activeModuleIndex: 0,
    activeLessonIndex: 0,
    activeModuleTitle: "",
    activeLessonId: "",
    activeLessonTitle: "",
    status: "not_started",
    lastAccess: timestampNow(),
    lastSavedAt: timestampNow(),
    accessCodeUsed: String(accessCodeUsed || "none").trim() || "none",
  };
};

export const normalizeEnrollmentSummaryRecord = (record = {}, context = {}) =>
  buildEnrollmentInsight({
    ...record,
    id: context.id || record.id || "",
    path: context.path || record.path || "",
    userId: context.userId || record.userId || "",
  });

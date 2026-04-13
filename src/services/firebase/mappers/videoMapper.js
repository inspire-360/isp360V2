import { resolveTimestampMillis } from "../timestamps";

export const VIDEO_REVIEW_COURSE_ID = "course-teacher";
export const VIDEO_SOURCE_MISSION_ID = "m5-mission-1";
export const VIDEO_CONTEXT_MISSION_ID = "m4-mission-1";
export const VIDEO_SUBJECT_MISSION_ID = "m4-mission-2";
export const DEFAULT_VIDEO_REVIEW_TITLE = "วิดีโอการสอนจริง";
export const DEFAULT_VIDEO_REVIEW_STATUS = "pending_feedback";
export const VIDEO_REVIEW_STATUS_SET = new Set([
  DEFAULT_VIDEO_REVIEW_STATUS,
  "coaching",
  "reviewed",
]);

const normalizeString = (value = "") => String(value || "").trim();

const pickFirstString = (...candidates) =>
  candidates.map((candidate) => normalizeString(candidate)).find(Boolean) || "";

const pickTimestamp = (...candidates) => candidates.find(Boolean) || null;

export const buildVideoReviewId = ({
  teacherId = "",
  enrollmentId = "",
  courseId = VIDEO_REVIEW_COURSE_ID,
} = {}) => {
  const normalizedTeacherId = normalizeString(teacherId);
  const normalizedEnrollmentId = normalizeString(enrollmentId || courseId);

  if (!normalizedTeacherId || !normalizedEnrollmentId) return "";

  return `${normalizedTeacherId}__${normalizedEnrollmentId}`;
};

export const normalizeVideoReviewStatus = (value = "") => {
  const normalized = normalizeString(value);
  return VIDEO_REVIEW_STATUS_SET.has(normalized)
    ? normalized
    : DEFAULT_VIDEO_REVIEW_STATUS;
};

export const buildTeacherDisplayName = ({
  teacherId = "",
  teacherProfile = {},
  fallbackName = "",
} = {}) =>
  pickFirstString(
    fallbackName,
    teacherProfile?.name,
    [teacherProfile?.prefix, teacherProfile?.firstName, teacherProfile?.lastName]
      .filter(Boolean)
      .join(" "),
    teacherProfile?.displayName,
    teacherId,
  );

export const normalizeVideoReviewRecord = (record = {}, context = {}) => ({
  ...record,
  id: context.id || normalizeString(record.id),
  teacherId: normalizeString(record.teacherId),
  teacherName:
    pickFirstString(record.teacherName, context.teacherName) || "ยังไม่ระบุครู",
  courseId: normalizeString(record.courseId || context.courseId || VIDEO_REVIEW_COURSE_ID),
  enrollmentId: normalizeString(
    record.enrollmentId || context.enrollmentId || record.courseId || VIDEO_REVIEW_COURSE_ID,
  ),
  sourceEnrollmentPath: normalizeString(record.sourceEnrollmentPath),
  sourceMissionId:
    normalizeString(record.sourceMissionId || context.sourceMissionId) || VIDEO_SOURCE_MISSION_ID,
  sourceMissionUpdatedAt: record.sourceMissionUpdatedAt || null,
  title:
    pickFirstString(record.title, context.title) || DEFAULT_VIDEO_REVIEW_TITLE,
  description: normalizeString(record.description),
  subject: normalizeString(record.subject),
  schoolName: normalizeString(record.schoolName),
  videoUrl: normalizeString(record.videoUrl),
  durationSeconds:
    record.durationSeconds == null
      ? null
      : Math.max(0, Math.floor(Number(record.durationSeconds) || 0)),
  reviewStatus: normalizeVideoReviewStatus(record.reviewStatus),
  assignedCoachIds: Array.isArray(record.assignedCoachIds) ? record.assignedCoachIds : [],
  submittedAt: record.submittedAt || null,
  updatedAt: record.updatedAt || null,
  lastCommentAt: record.lastCommentAt || null,
  lastCommentPreview: normalizeString(record.lastCommentPreview),
  commentCount: Math.max(0, Math.floor(Number(record.commentCount) || 0)),
  updatedAtMs: resolveTimestampMillis(record.updatedAt || record.lastCommentAt || record.submittedAt),
});

const buildVideoDescription = ({
  moduleFiveMissionOne = {},
  existingVideo = {},
} = {}) =>
  pickFirstString(
    moduleFiveMissionOne.learningFocus,
    moduleFiveMissionOne.evidenceNote,
    moduleFiveMissionOne.classroomContext,
    existingVideo.description,
  );

export const buildVideoReviewRecord = ({
  enrollment = {},
  teacherProfile = {},
  missionResponses = {},
  existingVideo = {},
} = {}) => {
  const moduleFourMissionOne = missionResponses[VIDEO_CONTEXT_MISSION_ID] || {};
  const moduleFourMissionTwo = missionResponses[VIDEO_SUBJECT_MISSION_ID] || {};
  const moduleFiveMissionOne = missionResponses[VIDEO_SOURCE_MISSION_ID] || {};
  const teacherId = normalizeString(enrollment.teacherId || existingVideo.teacherId);
  const courseId = normalizeString(
    enrollment.courseId || enrollment.enrollmentId || existingVideo.courseId || VIDEO_REVIEW_COURSE_ID,
  );
  const enrollmentId = normalizeString(
    enrollment.enrollmentId || enrollment.courseId || existingVideo.enrollmentId || courseId,
  );
  const submittedAt = pickTimestamp(
    existingVideo.submittedAt,
    moduleFiveMissionOne.submittedAt,
    moduleFiveMissionOne.updatedAt,
    enrollment.lastSavedAt,
    enrollment.lastAccessAt,
    enrollment.lastAccess,
    enrollment.updatedAt,
    enrollment.createdAt,
  );
  const updatedAt = pickTimestamp(
    existingVideo.updatedAt,
    existingVideo.lastCommentAt,
    moduleFiveMissionOne.updatedAt,
    moduleFiveMissionOne.submittedAt,
    enrollment.lastSavedAt,
    enrollment.lastAccessAt,
    enrollment.lastAccess,
    enrollment.updatedAt,
    submittedAt,
  );

  return normalizeVideoReviewRecord(
    {
      id:
        normalizeString(existingVideo.id) ||
        buildVideoReviewId({
          teacherId,
          enrollmentId,
          courseId,
        }),
      teacherId,
      teacherName: buildTeacherDisplayName({
        teacherId,
        teacherProfile,
        fallbackName: existingVideo.teacherName,
      }),
      courseId,
      enrollmentId,
      sourceEnrollmentPath: normalizeString(
        existingVideo.sourceEnrollmentPath || enrollment.path,
      ),
      sourceMissionId: VIDEO_SOURCE_MISSION_ID,
      sourceMissionUpdatedAt:
        existingVideo.sourceMissionUpdatedAt ||
        moduleFiveMissionOne.updatedAt ||
        moduleFiveMissionOne.submittedAt ||
        null,
      title:
        pickFirstString(
          moduleFiveMissionOne.lessonPlanTitle,
          moduleFourMissionOne.innovationName,
          existingVideo.title,
        ) || DEFAULT_VIDEO_REVIEW_TITLE,
      description: buildVideoDescription({
        moduleFiveMissionOne,
        existingVideo,
      }),
      subject: pickFirstString(
        moduleFourMissionTwo.subjectName,
        existingVideo.subject,
        teacherProfile.position,
      ),
      schoolName: pickFirstString(existingVideo.schoolName, teacherProfile.school),
      videoUrl: pickFirstString(moduleFiveMissionOne.clipLink, existingVideo.videoUrl),
      durationSeconds:
        existingVideo.durationSeconds == null
          ? null
          : Math.max(0, Math.floor(Number(existingVideo.durationSeconds) || 0)),
      reviewStatus: normalizeVideoReviewStatus(
        existingVideo.reviewStatus || DEFAULT_VIDEO_REVIEW_STATUS,
      ),
      assignedCoachIds: Array.isArray(existingVideo.assignedCoachIds)
        ? existingVideo.assignedCoachIds
        : [],
      submittedAt,
      updatedAt,
      lastCommentAt: existingVideo.lastCommentAt || null,
      lastCommentPreview: existingVideo.lastCommentPreview || "",
      commentCount: Math.max(0, Math.floor(Number(existingVideo.commentCount) || 0)),
    },
    {
      courseId,
      enrollmentId,
      teacherName: buildTeacherDisplayName({
        teacherId,
        teacherProfile,
        fallbackName: existingVideo.teacherName,
      }),
      title:
        pickFirstString(
          moduleFiveMissionOne.lessonPlanTitle,
          moduleFourMissionOne.innovationName,
          existingVideo.title,
        ) || DEFAULT_VIDEO_REVIEW_TITLE,
      sourceMissionId: VIDEO_SOURCE_MISSION_ID,
    },
  );
};

const comparableVideoMetadataKeys = [
  "teacherId",
  "teacherName",
  "courseId",
  "enrollmentId",
  "sourceEnrollmentPath",
  "sourceMissionId",
  "title",
  "description",
  "subject",
  "schoolName",
  "videoUrl",
  "durationSeconds",
  "reviewStatus",
  "assignedCoachIds",
  "commentCount",
  "lastCommentPreview",
];

export const shouldSyncVideoReviewMetadata = (existingVideo = {}, nextVideo = {}) =>
  comparableVideoMetadataKeys.some((key) => {
    const left = JSON.stringify(existingVideo?.[key] ?? null);
    const right = JSON.stringify(nextVideo?.[key] ?? null);
    return left !== right;
  });

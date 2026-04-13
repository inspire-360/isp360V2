import {
  INNOVATION_STAGE_IDEA,
  normalizeInnovationStage,
} from "../../../data/innovationKanban";
import { resolveTimestampMillis } from "../timestamps";

export const INNOVATION_BOARD_COURSE_ID = "course-teacher";
export const INNOVATION_SOURCE_MISSION_IDS = Object.freeze([
  "m4-mission-1",
  "m4-mission-2",
  "m4-mission-3",
  "m4-mission-4",
  "m5-mission-1",
  "m5-mission-2",
  "m5-mission-3",
]);

export const DEFAULT_INNOVATION_TITLE = "นวัตกรรมที่ยังไม่ตั้งชื่อ";
export const DEFAULT_INNOVATION_TEACHER_NAME = "ยังไม่ระบุชื่อครู";
export const DEFAULT_INNOVATION_SCHOOL_NAME = "ยังไม่ระบุโรงเรียน";

const normalizeString = (value = "") => String(value || "").trim();

const pickFirstString = (...candidates) =>
  candidates.map((candidate) => normalizeString(candidate)).find(Boolean) || "";

const pickTimestamp = (...candidates) => candidates.find(Boolean) || null;

const uniqueStrings = (...values) =>
  Array.from(
    new Set(
      values
        .flat()
        .map((value) => normalizeString(value))
        .filter(Boolean),
    ),
  );

const missionMetadataKeys = new Set([
  "missionId",
  "courseId",
  "lessonId",
  "saveState",
  "updatedAt",
  "updatedAtMs",
  "submittedAt",
  "submittedAtMs",
  "createdAt",
  "createdAtMs",
  "clearedAt",
  "clearedAtMs",
  "userId",
  "enrollmentId",
  "enrollmentPath",
  "path",
  "id",
]);

const missionHasContent = (mission = {}) =>
  Object.entries(mission || {}).some(([field, value]) => {
    if (missionMetadataKeys.has(field)) return false;
    if (Array.isArray(value)) return value.some((item) => normalizeString(item));
    if (value && typeof value === "object") {
      return Object.values(value).some((item) => normalizeString(item));
    }
    return Boolean(normalizeString(value));
  });

const missionUpdatedAt = (mission = {}) =>
  pickTimestamp(mission.updatedAt, mission.submittedAt, mission.createdAt);

const buildInnovationSummary = ({
  moduleFourInnovation = {},
  moduleFourBlueprint = {},
  moduleFourCraft = {},
  moduleFourBeta = {},
  moduleFiveRealClassroom = {},
  moduleFiveReflection = {},
  moduleFiveGrowth = {},
  existingInnovation = {},
} = {}) =>
  pickFirstString(
    moduleFiveReflection.whatHappened,
    moduleFiveRealClassroom.learningFocus,
    moduleFourBlueprint.innovationMechanism,
    moduleFourInnovation.targetGoal,
    moduleFourCraft.classroomUse,
    moduleFourBeta.feedbackNote,
    moduleFiveGrowth.scalePlan,
    existingInnovation.summary,
    existingInnovation.description,
  );

const buildInnovationFocusArea = ({
  moduleFourInnovation = {},
  moduleFourBlueprint = {},
  moduleFiveGrowth = {},
  existingInnovation = {},
} = {}) =>
  pickFirstString(
    moduleFiveGrowth.improvementFocus,
    moduleFourInnovation.painPoint,
    moduleFourBlueprint.subjectName,
    existingInnovation.focusArea,
  );

const buildInnovationSupportNeed = ({
  moduleFourBeta = {},
  moduleFiveGrowth = {},
  existingInnovation = {},
} = {}) =>
  pickFirstString(
    moduleFiveGrowth.supportNeeded,
    moduleFourBeta.upgradeAnswer,
    existingInnovation.supportNeed,
  );

const buildInnovationEvidenceNote = ({
  moduleFourCraft = {},
  moduleFiveRealClassroom = {},
  moduleFiveReflection = {},
  existingInnovation = {},
} = {}) =>
  pickFirstString(
    moduleFiveRealClassroom.evidenceNote,
    moduleFiveReflection.evidenceCollected,
    moduleFourCraft.assetDescription,
    moduleFiveReflection.proudMoment,
    existingInnovation.evidenceNote,
  );

const buildInnovationTags = ({
  moduleFourInnovation = {},
  moduleFourBlueprint = {},
  moduleFourCraft = {},
  existingInnovation = {},
} = {}) =>
  uniqueStrings(
    moduleFourBlueprint.subjectName,
    moduleFourInnovation.toolLabel,
    moduleFourInnovation.pedagogyLabel,
    moduleFourCraft.artifactType,
    Array.isArray(existingInnovation.tags) ? existingInnovation.tags : [],
  ).slice(0, 6);

export const buildInnovationId = ({
  teacherId = "",
  enrollmentId = "",
  courseId = INNOVATION_BOARD_COURSE_ID,
} = {}) => {
  const normalizedTeacherId = normalizeString(teacherId);
  const normalizedEnrollmentId = normalizeString(enrollmentId || courseId);

  if (!normalizedTeacherId || !normalizedEnrollmentId) return "";

  return `${normalizedTeacherId}__${normalizedEnrollmentId}`;
};

export const buildInnovationTeacherName = ({
  teacherId = "",
  teacherProfile = {},
  fallbackName = "",
} = {}) =>
  pickFirstString(
    teacherProfile?.name,
    [teacherProfile?.prefix, teacherProfile?.firstName, teacherProfile?.lastName]
      .filter(Boolean)
      .join(" "),
    teacherProfile?.displayName,
    fallbackName,
    teacherId,
  );

export const normalizeInnovationRecord = (record = {}, context = {}) => {
  const title =
    pickFirstString(record.title, context.title) || DEFAULT_INNOVATION_TITLE;
  const teacherName =
    pickFirstString(record.teacherName, context.teacherName) ||
    DEFAULT_INNOVATION_TEACHER_NAME;
  const schoolName =
    pickFirstString(record.schoolName, context.schoolName) ||
    DEFAULT_INNOVATION_SCHOOL_NAME;
  const summary =
    pickFirstString(record.summary, record.description, context.summary) || "";

  return {
    ...record,
    id: context.id || normalizeString(record.id),
    teacherId: normalizeString(record.teacherId),
    teacherName,
    schoolName,
    title,
    summary,
    description: pickFirstString(record.description, summary),
    focusArea: normalizeString(record.focusArea),
    supportNeed: normalizeString(record.supportNeed),
    evidenceNote: normalizeString(record.evidenceNote),
    tags: Array.isArray(record.tags)
      ? record.tags.map((tag) => normalizeString(tag)).filter(Boolean)
      : [],
    stage: normalizeInnovationStage(record.stage || context.stage || INNOVATION_STAGE_IDEA),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    lastMovedAt: record.lastMovedAt || null,
    lastMovedById: normalizeString(record.lastMovedById),
    lastMovedByName: normalizeString(record.lastMovedByName),
    updatedAtMs: resolveTimestampMillis(
      record.updatedAt || record.lastMovedAt || record.createdAt,
    ),
  };
};

export const buildInnovationBoardRecord = ({
  enrollment = {},
  teacherProfile = {},
  missionResponses = {},
  existingInnovation = {},
} = {}) => {
  const moduleFourInnovation = missionResponses["m4-mission-1"] || {};
  const moduleFourBlueprint = missionResponses["m4-mission-2"] || {};
  const moduleFourCraft = missionResponses["m4-mission-3"] || {};
  const moduleFourBeta = missionResponses["m4-mission-4"] || {};
  const moduleFiveRealClassroom = missionResponses["m5-mission-1"] || {};
  const moduleFiveReflection = missionResponses["m5-mission-2"] || {};
  const moduleFiveGrowth = missionResponses["m5-mission-3"] || {};

  const teacherId = normalizeString(enrollment.teacherId || existingInnovation.teacherId);
  const courseId = normalizeString(
    enrollment.courseId ||
      enrollment.enrollmentId ||
      existingInnovation.courseId ||
      INNOVATION_BOARD_COURSE_ID,
  );
  const enrollmentId = normalizeString(
    enrollment.enrollmentId || enrollment.courseId || existingInnovation.enrollmentId || courseId,
  );
  const teacherName = buildInnovationTeacherName({
    teacherId,
    teacherProfile,
    fallbackName: pickFirstString(
      moduleFourBlueprint.teacherName,
      existingInnovation.teacherName,
    ),
  });
  const schoolName =
    pickFirstString(existingInnovation.schoolName, teacherProfile.school) ||
    DEFAULT_INNOVATION_SCHOOL_NAME;
  const title =
    pickFirstString(
      moduleFiveRealClassroom.lessonPlanTitle,
      moduleFourCraft.artifactTitle,
      moduleFourBlueprint.innovationName,
      moduleFourInnovation.innovationName,
      existingInnovation.title,
    ) || DEFAULT_INNOVATION_TITLE;
  const summary = buildInnovationSummary({
    moduleFourInnovation,
    moduleFourBlueprint,
    moduleFourCraft,
    moduleFourBeta,
    moduleFiveRealClassroom,
    moduleFiveReflection,
    moduleFiveGrowth,
    existingInnovation,
  });
  const focusArea = buildInnovationFocusArea({
    moduleFourInnovation,
    moduleFourBlueprint,
    moduleFiveGrowth,
    existingInnovation,
  });
  const supportNeed = buildInnovationSupportNeed({
    moduleFourBeta,
    moduleFiveGrowth,
    existingInnovation,
  });
  const evidenceNote = buildInnovationEvidenceNote({
    moduleFourCraft,
    moduleFiveRealClassroom,
    moduleFiveReflection,
    existingInnovation,
  });
  const tags = buildInnovationTags({
    moduleFourInnovation,
    moduleFourBlueprint,
    moduleFourCraft,
    existingInnovation,
  });
  const sourceMissionIds = INNOVATION_SOURCE_MISSION_IDS.filter((missionId) =>
    missionHasContent(missionResponses[missionId] || {}),
  );

  if (
    !sourceMissionIds.length &&
    ![title, summary, focusArea, supportNeed, evidenceNote].some(Boolean) &&
    tags.length === 0
  ) {
    return null;
  }

  const relevantMissionTimestamps = sourceMissionIds
    .map((missionId) => missionUpdatedAt(missionResponses[missionId] || {}))
    .filter(Boolean);

  const createdAt = pickTimestamp(
    existingInnovation.createdAt,
    ...relevantMissionTimestamps,
    enrollment.createdAt,
  );
  const updatedAt = pickTimestamp(
    existingInnovation.updatedAt,
    existingInnovation.lastMovedAt,
    ...relevantMissionTimestamps,
    enrollment.lastSavedAt,
    enrollment.lastAccessAt,
    enrollment.lastAccess,
    enrollment.updatedAt,
    createdAt,
  );

  return normalizeInnovationRecord(
    {
      id:
        normalizeString(existingInnovation.id) ||
        buildInnovationId({
          teacherId,
          enrollmentId,
          courseId,
        }),
      teacherId,
      teacherName,
      schoolName,
      title,
      summary,
      focusArea,
      supportNeed,
      evidenceNote,
      tags,
      stage: normalizeInnovationStage(existingInnovation.stage || INNOVATION_STAGE_IDEA),
      createdAt,
      updatedAt,
      lastMovedAt: existingInnovation.lastMovedAt || null,
      lastMovedById: existingInnovation.lastMovedById || "",
      lastMovedByName: existingInnovation.lastMovedByName || "",
    },
    {
      teacherName,
      schoolName,
      title,
      summary,
    },
  );
};

const comparableInnovationMetadataKeys = [
  "teacherId",
  "teacherName",
  "schoolName",
  "title",
  "summary",
  "focusArea",
  "supportNeed",
  "evidenceNote",
  "tags",
];

export const shouldSyncInnovationMetadata = (
  existingInnovation = {},
  nextInnovation = {},
) =>
  comparableInnovationMetadataKeys.some((key) => {
    const left = JSON.stringify(existingInnovation?.[key] ?? null);
    const right = JSON.stringify(nextInnovation?.[key] ?? null);
    return left !== right;
  });

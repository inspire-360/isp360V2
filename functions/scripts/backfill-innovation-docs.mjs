import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  loadEnrollmentSnapshots,
  parseArgs,
  parseTopLevelTimestamp,
  toBoolean,
  toPositiveInteger,
} from "./lib/mission-response-migration-utils.mjs";

const MODULE_IDS = Object.freeze([
  "m4-mission-1",
  "m4-mission-2",
  "m4-mission-3",
  "m4-mission-4",
  "m5-mission-1",
  "m5-mission-2",
  "m5-mission-3",
]);
const DEFAULT_INNOVATION_TITLE = "นวัตกรรมที่ยังไม่ตั้งชื่อ";
const DEFAULT_SCHOOL_NAME = "ยังไม่ระบุโรงเรียน";
const DEFAULT_STAGE = "idea";

const usageText = [
  "Usage:",
  "  npm run backfill-innovation-docs -- --course-id course-teacher",
  "  npm run backfill-innovation-docs -- --course-id course-teacher --write true",
  "  npm run backfill-innovation-docs -- --user-id USER_UID --course-id course-teacher --write true",
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
].join("\n");

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

const buildInnovationId = ({ teacherId = "", enrollmentId = "", courseId = "" } = {}) =>
  [normalizeString(teacherId), normalizeString(enrollmentId || courseId)]
    .filter(Boolean)
    .join("__");

const normalizeMissionResponse = (value = {}) => {
  const response = value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
  ["updatedAt", "submittedAt", "createdAt", "clearedAt"].forEach((field) => {
    if (field in response) {
      response[field] = parseTopLevelTimestamp(response[field]);
    }
  });
  return response;
};

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

const buildTeacherName = ({
  teacherId = "",
  teacherProfile = {},
  moduleFourBlueprint = {},
  existingInnovation = {},
} = {}) =>
  pickFirstString(
    teacherProfile.name,
    [teacherProfile.prefix, teacherProfile.firstName, teacherProfile.lastName].filter(Boolean).join(" "),
    teacherProfile.displayName,
    moduleFourBlueprint.teacherName,
    existingInnovation.teacherName,
    teacherId,
  );

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
  );

const buildInnovationDoc = ({
  teacherId,
  courseId,
  enrollmentData = {},
  teacherProfile,
  missionMap,
  existingInnovation = {},
} = {}) => {
  const moduleFourInnovation = missionMap["m4-mission-1"] || {};
  const moduleFourBlueprint = missionMap["m4-mission-2"] || {};
  const moduleFourCraft = missionMap["m4-mission-3"] || {};
  const moduleFourBeta = missionMap["m4-mission-4"] || {};
  const moduleFiveRealClassroom = missionMap["m5-mission-1"] || {};
  const moduleFiveReflection = missionMap["m5-mission-2"] || {};
  const moduleFiveGrowth = missionMap["m5-mission-3"] || {};
  const sourceMissionIds = MODULE_IDS.filter((missionId) => missionHasContent(missionMap[missionId] || {}));

  if (sourceMissionIds.length === 0) {
    return null;
  }

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
  const focusArea = pickFirstString(
    moduleFiveGrowth.improvementFocus,
    moduleFourInnovation.painPoint,
    moduleFourBlueprint.subjectName,
    existingInnovation.focusArea,
  );
  const supportNeed = pickFirstString(
    moduleFiveGrowth.supportNeeded,
    moduleFourBeta.upgradeAnswer,
    existingInnovation.supportNeed,
  );
  const evidenceNote = pickFirstString(
    moduleFiveRealClassroom.evidenceNote,
    moduleFiveReflection.evidenceCollected,
    moduleFourCraft.assetDescription,
    moduleFiveReflection.proudMoment,
    existingInnovation.evidenceNote,
  );
  const tags = uniqueStrings(
    moduleFourBlueprint.subjectName,
    moduleFourInnovation.toolLabel,
    moduleFourInnovation.pedagogyLabel,
    moduleFourCraft.artifactType,
    Array.isArray(existingInnovation.tags) ? existingInnovation.tags : [],
  ).slice(0, 6);

  if (![title, summary, focusArea, supportNeed, evidenceNote].some(Boolean) && tags.length === 0) {
    return null;
  }

  const relevantMissionTimestamps = sourceMissionIds
    .map((missionId) => missionUpdatedAt(missionMap[missionId] || {}))
    .filter(Boolean);

  return {
    teacherId,
    teacherName: buildTeacherName({
      teacherId,
      teacherProfile,
      moduleFourBlueprint,
      existingInnovation,
    }),
    schoolName: pickFirstString(existingInnovation.schoolName, teacherProfile.school) || DEFAULT_SCHOOL_NAME,
    title,
    summary,
    focusArea,
    supportNeed,
    tags,
    stage: normalizeString(existingInnovation.stage) || DEFAULT_STAGE,
    evidenceNote,
    createdAt: pickTimestamp(
      existingInnovation.createdAt,
      ...relevantMissionTimestamps,
      enrollmentData.createdAt,
      enrollmentData.updatedAt,
      enrollmentData.lastSavedAt,
      enrollmentData.lastAccessAt,
      enrollmentData.lastAccess,
    ),
    updatedAt: pickTimestamp(
      existingInnovation.updatedAt,
      existingInnovation.lastMovedAt,
      ...relevantMissionTimestamps,
      enrollmentData.lastSavedAt,
      enrollmentData.lastAccessAt,
      enrollmentData.lastAccess,
      enrollmentData.updatedAt,
      enrollmentData.createdAt,
    ),
    lastMovedAt: existingInnovation.lastMovedAt || null,
    lastMovedById: normalizeString(existingInnovation.lastMovedById),
    lastMovedByName: normalizeString(existingInnovation.lastMovedByName),
  };
};

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const dryRun = !toBoolean(args.write, false);
const userIdFilter = normalizeString(args["user-id"]);
const courseIdFilter = normalizeString(args["course-id"]);
const limit = toPositiveInteger(args.limit, 0);

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: args.project || "inspire-72132",
    });
  }

  const db = getFirestore();
  const enrollmentSnapshots = await loadEnrollmentSnapshots({
    db,
    userIdFilter,
    courseIdFilter,
    limit,
  });

  const summary = {
    ok: true,
    dryRun,
    scannedEnrollments: enrollmentSnapshots.length,
    enrollmentsWithInnovationSignal: 0,
    existingInnovationDocsFound: 0,
    writeOperationsPlanned: 0,
    affectedInnovationIds: [],
    filters: {
      projectId: args.project || "inspire-72132",
      userId: userIdFilter || null,
      courseId: courseIdFilter || null,
      limit: limit || null,
    },
  };

  const writer = dryRun ? null : db.bulkWriter();
  const teacherCache = new Map();

  for (const enrollmentSnapshot of enrollmentSnapshots) {
    const enrollmentData = enrollmentSnapshot.data() || {};
    const teacherId = normalizeString(enrollmentSnapshot.ref.parent.parent?.id);
    const courseId = normalizeString(enrollmentData.courseId || enrollmentSnapshot.id) || enrollmentSnapshot.id;
    const innovationId = buildInnovationId({
      teacherId,
      courseId,
      enrollmentId: enrollmentSnapshot.id,
    });
    const innovationRef = db.collection("innovations").doc(innovationId);
    const existingInnovationSnapshot = await innovationRef.get();
    const existingInnovation = existingInnovationSnapshot.exists ? existingInnovationSnapshot.data() || {} : {};

    const missionSnapshot = await enrollmentSnapshot.ref.collection("mission_responses").get();
    const missionMap = missionSnapshot.docs.reduce((accumulator, item) => {
      accumulator[item.id] = normalizeMissionResponse(item.data());
      return accumulator;
    }, {});

    if (!teacherCache.has(teacherId)) {
      const teacherSnapshot = await db.collection("users").doc(teacherId).get();
      teacherCache.set(teacherId, teacherSnapshot.exists ? teacherSnapshot.data() || {} : {});
    }

    const payload = buildInnovationDoc({
      teacherId,
      courseId,
      enrollmentData,
      teacherProfile: teacherCache.get(teacherId) || {},
      missionMap,
      existingInnovation,
    });

    if (!payload) {
      continue;
    }

    summary.enrollmentsWithInnovationSignal += 1;
    summary.writeOperationsPlanned += 1;
    summary.affectedInnovationIds.push(innovationId);
    if (existingInnovationSnapshot.exists) {
      summary.existingInnovationDocsFound += 1;
    }

    if (!writer) {
      continue;
    }

    writer.set(
      innovationRef,
      {
        ...payload,
        createdAt: payload.createdAt || payload.updatedAt || new Date(),
        updatedAt: payload.updatedAt || payload.createdAt || new Date(),
      },
      { merge: true },
    );
  }

  if (writer) {
    await writer.close();
  }

  summary.affectedInnovationIds = summary.affectedInnovationIds.slice(0, 25);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

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

const MODULE_FOUR_MISSION_ONE_ID = "m4-mission-1";
const MODULE_FOUR_MISSION_TWO_ID = "m4-mission-2";
const MODULE_FIVE_MISSION_ONE_ID = "m5-mission-1";
const DEFAULT_VIDEO_TITLE = "วิดีโอการสอนจริง";
const DEFAULT_REVIEW_STATUS = "pending_feedback";

const usageText = [
  "Usage:",
  "  npm run backfill-video-review-docs -- --course-id course-teacher",
  "  npm run backfill-video-review-docs -- --course-id course-teacher --write true",
  "  npm run backfill-video-review-docs -- --user-id USER_UID --course-id course-teacher --write true",
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
const buildVideoReviewId = ({ teacherId = "", enrollmentId = "", courseId = "" } = {}) =>
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

const buildTeacherName = ({ teacherId = "", teacherProfile = {}, existingVideo = {} } = {}) =>
  pickFirstString(
    existingVideo.teacherName,
    teacherProfile.name,
    [teacherProfile.prefix, teacherProfile.firstName, teacherProfile.lastName].filter(Boolean).join(" "),
    teacherProfile.displayName,
    teacherId,
  ) || "ยังไม่ระบุครู";

const buildVideoReviewDoc = ({
  teacherId,
  courseId,
  enrollmentPath,
  teacherProfile,
  moduleFourMissionOne,
  moduleFourMissionTwo,
  moduleFiveMissionOne,
  existingVideo = {},
} = {}) => {
  const enrollmentId = normalizeString(courseId);

  return {
    teacherId,
    teacherName: buildTeacherName({
      teacherId,
      teacherProfile,
      existingVideo,
    }),
    courseId,
    enrollmentId,
    sourceEnrollmentPath: normalizeString(existingVideo.sourceEnrollmentPath || enrollmentPath),
    sourceMissionId: MODULE_FIVE_MISSION_ONE_ID,
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
      ) || DEFAULT_VIDEO_TITLE,
    description: pickFirstString(
      moduleFiveMissionOne.learningFocus,
      moduleFiveMissionOne.evidenceNote,
      moduleFiveMissionOne.classroomContext,
      existingVideo.description,
    ),
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
    reviewStatus: normalizeString(existingVideo.reviewStatus) || DEFAULT_REVIEW_STATUS,
    assignedCoachIds: Array.isArray(existingVideo.assignedCoachIds) ? existingVideo.assignedCoachIds : [],
    submittedAt: pickTimestamp(
      existingVideo.submittedAt,
      moduleFiveMissionOne.submittedAt,
      moduleFiveMissionOne.updatedAt,
    ),
    updatedAt: pickTimestamp(
      existingVideo.updatedAt,
      existingVideo.lastCommentAt,
      moduleFiveMissionOne.updatedAt,
      moduleFiveMissionOne.submittedAt,
    ),
    lastCommentAt: existingVideo.lastCommentAt || null,
    lastCommentPreview: normalizeString(existingVideo.lastCommentPreview),
    commentCount: Math.max(0, Math.floor(Number(existingVideo.commentCount) || 0)),
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
    enrollmentsWithVideoEvidence: 0,
    existingVideoDocsFound: 0,
    writeOperationsPlanned: 0,
    affectedVideoIds: [],
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

    const missionSnapshot = await enrollmentSnapshot.ref.collection("mission_responses").get();
    const missionMap = missionSnapshot.docs.reduce((accumulator, item) => {
      accumulator[item.id] = normalizeMissionResponse(item.data());
      return accumulator;
    }, {});

    const moduleFiveMissionOne = missionMap[MODULE_FIVE_MISSION_ONE_ID] || {};
    if (!normalizeString(moduleFiveMissionOne.clipLink)) {
      continue;
    }

    if (!teacherCache.has(teacherId)) {
      const teacherSnapshot = await db.collection("users").doc(teacherId).get();
      teacherCache.set(teacherId, teacherSnapshot.exists ? teacherSnapshot.data() || {} : {});
    }

    const videoId = buildVideoReviewId({
      teacherId,
      courseId,
      enrollmentId: enrollmentSnapshot.id,
    });
    const videoRef = db.collection("videos").doc(videoId);
    const existingVideoSnapshot = await videoRef.get();
    const existingVideo = existingVideoSnapshot.exists ? existingVideoSnapshot.data() || {} : {};

    const payload = buildVideoReviewDoc({
      teacherId,
      courseId,
      enrollmentPath: enrollmentSnapshot.ref.path,
      teacherProfile: teacherCache.get(teacherId) || {},
      moduleFourMissionOne: missionMap[MODULE_FOUR_MISSION_ONE_ID] || {},
      moduleFourMissionTwo: missionMap[MODULE_FOUR_MISSION_TWO_ID] || {},
      moduleFiveMissionOne,
      existingVideo,
    });

    if (!payload.videoUrl) {
      continue;
    }

    summary.enrollmentsWithVideoEvidence += 1;
    summary.writeOperationsPlanned += 1;
    summary.affectedVideoIds.push(videoId);
    if (existingVideoSnapshot.exists) {
      summary.existingVideoDocsFound += 1;
    }

    if (!writer) {
      continue;
    }

    writer.set(
      videoRef,
      {
        ...payload,
        submittedAt: payload.submittedAt || payload.updatedAt || payload.sourceMissionUpdatedAt,
        updatedAt: payload.updatedAt || payload.sourceMissionUpdatedAt,
      },
      { merge: true },
    );
  }

  if (writer) {
    await writer.close();
  }

  summary.affectedVideoIds = summary.affectedVideoIds.slice(0, 25);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  loadEnrollmentSnapshots,
  parseArgs,
  toBoolean,
} from "./lib/mission-response-migration-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run verify-innovation-quality -- --course-id course-teacher",
  "  npm run verify-innovation-quality -- --course-id course-teacher --strict true",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --course-id <courseId>",
  "  --strict true",
].join("\n");

const normalizeString = (value = "") => String(value || "").trim();

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const projectId = args.project || "inspire-72132";
const courseId = normalizeString(args["course-id"]);
const strict = toBoolean(args.strict, false);

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const enrollmentSnapshot = await loadEnrollmentSnapshots({
    db,
    courseIdFilter: courseId,
    userIdFilter: "",
    limit: 0,
  });
  const expectedInnovationIds = new Set(
    enrollmentSnapshot.map((item) => {
      const teacherId = normalizeString(item.ref.parent.parent?.id);
      const enrollmentId = normalizeString(item.id);
      if (!teacherId || !enrollmentId) return "";
      return `${teacherId}__${enrollmentId}`;
    }).filter(Boolean),
  );

  const innovationSnapshot = await db.collection("innovations").get();
  const rows = innovationSnapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .filter((row) => expectedInnovationIds.has(row.id));

  const report = {
    ok: true,
    projectId,
    courseId,
    totalInnovations: rows.length,
    missingTitleCount: 0,
    missingTeacherNameCount: 0,
    missingSchoolNameCount: 0,
    emptyDetailCount: 0,
    missingTitleIds: [],
    missingTeacherNameIds: [],
    missingSchoolNameIds: [],
    emptyDetailIds: [],
  };

  for (const row of rows) {
    if (!normalizeString(row.title)) {
      report.missingTitleCount += 1;
      report.missingTitleIds.push(row.id);
    }

    if (!normalizeString(row.teacherName) || normalizeString(row.teacherName) === normalizeString(row.teacherId)) {
      report.missingTeacherNameCount += 1;
      report.missingTeacherNameIds.push(row.id);
    }

    if (!normalizeString(row.schoolName)) {
      report.missingSchoolNameCount += 1;
      report.missingSchoolNameIds.push(row.id);
    }

    const hasDetail = [
      row.summary,
      row.focusArea,
      row.supportNeed,
      row.evidenceNote,
      Array.isArray(row.tags) ? row.tags.join(" ") : "",
    ].some((value) => normalizeString(value));

    if (!hasDetail) {
      report.emptyDetailCount += 1;
      report.emptyDetailIds.push(row.id);
    }
  }

  report.missingTitleIds = report.missingTitleIds.slice(0, 25);
  report.missingTeacherNameIds = report.missingTeacherNameIds.slice(0, 25);
  report.missingSchoolNameIds = report.missingSchoolNameIds.slice(0, 25);
  report.emptyDetailIds = report.emptyDetailIds.slice(0, 25);

  console.log(JSON.stringify(report, null, 2));

  if (
    strict &&
    (report.missingTitleCount > 0 ||
      report.missingTeacherNameCount > 0 ||
      report.missingSchoolNameCount > 0 ||
      report.emptyDetailCount > 0)
  ) {
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

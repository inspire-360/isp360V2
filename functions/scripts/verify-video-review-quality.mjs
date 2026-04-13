import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { parseArgs, toBoolean } from "./lib/mission-response-migration-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run verify-video-review-quality -- --course-id course-teacher",
  "  npm run verify-video-review-quality -- --course-id course-teacher --strict true",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --course-id <courseId>",
  "  --strict true",
].join("\n");

const normalizeString = (value = "") => String(value || "").trim();

const hasPlaceholderVideoUrlText = (value = "") => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("ใส่ลิงก์") ||
    normalized.includes("google drive / youtube") ||
    normalized.includes("https://...")
  );
};

const isUsableVideoUrl = (value = "") => {
  const normalized = normalizeString(value);
  if (!normalized) return false;
  if (normalized.toLowerCase().startsWith("file://")) return false;
  if (hasPlaceholderVideoUrlText(normalized)) return false;

  try {
    const parsed = new URL(normalized);
    const host = String(parsed.hostname || "").toLowerCase();
    const pathname = String(parsed.pathname || "").toLowerCase();

    if (host.includes("youtu.be") || host.includes("youtube.com")) {
      return true;
    }

    if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
      return pathname.includes("/file/") || parsed.searchParams.has("id");
    }

    if (/\.(mp4|webm|ogg|m4v|mov)$/.test(pathname)) {
      return true;
    }

    if (host.includes("firebasestorage.googleapis.com")) {
      return true;
    }

    return parsed.searchParams.get("alt") === "media";
  } catch {
    return false;
  }
};

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const projectId = args.project || "inspire-72132";
const courseId = normalizeString(args["course-id"]);
const strict = toBoolean(args.strict, false);

if (!courseId) {
  console.error("Missing required --course-id\n");
  console.error(usageText);
  process.exit(1);
}

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const snapshot = await db.collection("videos").where("courseId", "==", courseId).get();
  const rows = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));

  const report = {
    ok: true,
    projectId,
    courseId,
    totalVideos: rows.length,
    missingSchoolNameCount: 0,
    teacherNameFallbackToIdCount: 0,
    invalidVideoUrlCount: 0,
    invalidVideoIds: [],
    teacherNameFallbackIds: [],
    missingSchoolNameIds: [],
  };

  for (const row of rows) {
    if (!normalizeString(row.schoolName)) {
      report.missingSchoolNameCount += 1;
      report.missingSchoolNameIds.push(row.id);
    }

    if (!normalizeString(row.teacherName) || normalizeString(row.teacherName) === normalizeString(row.teacherId)) {
      report.teacherNameFallbackToIdCount += 1;
      report.teacherNameFallbackIds.push(row.id);
    }

    if (!isUsableVideoUrl(row.videoUrl)) {
      report.invalidVideoUrlCount += 1;
      report.invalidVideoIds.push(row.id);
    }
  }

  report.invalidVideoIds = report.invalidVideoIds.slice(0, 25);
  report.teacherNameFallbackIds = report.teacherNameFallbackIds.slice(0, 25);
  report.missingSchoolNameIds = report.missingSchoolNameIds.slice(0, 25);

  console.log(JSON.stringify(report, null, 2));

  if (
    strict &&
    (report.missingSchoolNameCount > 0 ||
      report.teacherNameFallbackToIdCount > 0 ||
      report.invalidVideoUrlCount > 0)
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

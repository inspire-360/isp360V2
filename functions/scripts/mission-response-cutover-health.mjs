import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  buildComparableMissionResponse,
  diffMissionResponseKeys,
  loadEnrollmentSnapshots,
  parseArgs,
  toBoolean,
  toPositiveInteger,
  usageText,
} from "./lib/mission-response-migration-utils.mjs";

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const userIdFilter = String(args["user-id"] || "").trim();
const courseIdFilter = String(args["course-id"] || "").trim();
const limit = toPositiveInteger(args.limit, 0);
const strict = toBoolean(args.strict, false);

const buildReadiness = (summary) => {
  if (summary.legacyOnlyEnrollments > 0) {
    return {
      status: "not_ready",
      reason: "มี enrollment ที่ยังมีเฉพาะ legacy missionResponses และยังไม่สร้าง canonical docs",
    };
  }

  if (summary.mismatchedEnrollments > 0) {
    return {
      status: "not_ready",
      reason: "ยังมี mismatch ระหว่าง legacy missionResponses กับ canonical mission_responses",
    };
  }

  if (summary.legacyAndCanonicalEnrollments > 0 && summary.legacyOnlyEnrollments === 0) {
    return {
      status: "ready_to_prune",
      reason: "canonical docs ครบแล้ว และเหลือเพียง legacy field ที่สามารถ prune ได้",
    };
  }

  if (summary.canonicalOnlyEnrollments > 0 && summary.legacyFieldRemainingEnrollments === 0) {
    return {
      status: "canonical_only",
      reason: "ข้อมูลอยู่ใน canonical path แล้วและไม่พบ legacy field ที่ต้อง prune",
    };
  }

  return {
    status: "no_mission_data",
    reason: "ไม่พบ mission response data ใน scope ที่ตรวจ",
  };
};

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
    strict,
    scannedEnrollments: enrollmentSnapshots.length,
    legacyFieldRemainingEnrollments: 0,
    legacyOnlyEnrollments: 0,
    canonicalOnlyEnrollments: 0,
    legacyAndCanonicalEnrollments: 0,
    emptyEnrollments: 0,
    exactMatches: 0,
    mismatchedEnrollments: 0,
    missingInCanonicalCount: 0,
    extraInCanonicalCount: 0,
    payloadDiffCount: 0,
    readyToPrunePaths: [],
    mismatchSamples: [],
    filters: {
      projectId: args.project || "inspire-72132",
      userId: userIdFilter || null,
      courseId: courseIdFilter || null,
      limit: limit || null,
    },
  };

  for (const enrollmentSnapshot of enrollmentSnapshots) {
    const data = enrollmentSnapshot.data() || {};
    const courseId = String(data.courseId || enrollmentSnapshot.id).trim() || enrollmentSnapshot.id;
    const legacyMissionResponses =
      data.missionResponses && typeof data.missionResponses === "object"
        ? data.missionResponses
        : {};
    const legacyEntries = Object.entries(legacyMissionResponses).filter(
      ([, value]) => value && typeof value === "object" && !Array.isArray(value),
    );
    const canonicalSnapshot = await enrollmentSnapshot.ref.collection("mission_responses").get();

    const legacyMap = new Map(
      legacyEntries.map(([missionId, response]) => [
        missionId,
        buildComparableMissionResponse({
          missionId,
          courseId,
          response,
        }),
      ]),
    );

    const canonicalMap = new Map(
      canonicalSnapshot.docs.map((item) => [
        item.id,
        buildComparableMissionResponse({
          missionId: item.id,
          courseId,
          response: item.data(),
        }),
      ]),
    );

    const hasLegacy = legacyMap.size > 0;
    const hasCanonical = canonicalMap.size > 0;

    if (hasLegacy) summary.legacyFieldRemainingEnrollments += 1;
    if (hasLegacy && hasCanonical) summary.legacyAndCanonicalEnrollments += 1;
    if (hasLegacy && !hasCanonical) summary.legacyOnlyEnrollments += 1;
    if (!hasLegacy && hasCanonical) summary.canonicalOnlyEnrollments += 1;
    if (!hasLegacy && !hasCanonical) summary.emptyEnrollments += 1;

    if (hasLegacy && hasCanonical) {
      summary.readyToPrunePaths.push(enrollmentSnapshot.ref.path);
    }

    const diffs = diffMissionResponseKeys({
      legacyMap,
      canonicalMap,
      strictMode: strict,
    });

    if (
      diffs.missingInCanonical.length === 0 &&
      diffs.extraInCanonical.length === 0 &&
      diffs.payloadDiffs.length === 0
    ) {
      if (hasLegacy || hasCanonical) {
        summary.exactMatches += 1;
      }
      continue;
    }

    summary.mismatchedEnrollments += 1;
    summary.missingInCanonicalCount += diffs.missingInCanonical.length;
    summary.extraInCanonicalCount += diffs.extraInCanonical.length;
    summary.payloadDiffCount += diffs.payloadDiffs.length;

    if (summary.mismatchSamples.length < 20) {
      summary.mismatchSamples.push({
        userId: enrollmentSnapshot.ref.parent.parent?.id || "",
        courseId,
        enrollmentPath: enrollmentSnapshot.ref.path,
        missingInCanonical: diffs.missingInCanonical,
        extraInCanonical: diffs.extraInCanonical,
        payloadDiffs: diffs.payloadDiffs,
      });
    }
  }

  summary.readyToPrunePaths = summary.readyToPrunePaths.slice(0, 20);
  summary.readiness = buildReadiness(summary);

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

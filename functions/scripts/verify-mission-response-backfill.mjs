import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  loadEnrollmentSnapshots,
  normalizeLegacyMissionResponse,
  parseArgs,
  toBoolean,
  toPositiveInteger,
  toStableComparableValue,
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
const failOnDiff = toBoolean(args["fail-on-diff"], false);

const buildComparableMissionResponse = ({ missionId, courseId, response }) =>
  toStableComparableValue(
    normalizeLegacyMissionResponse({
      missionId,
      courseId,
      response,
    }),
  );

const diffMissionResponseKeys = ({ legacyMap, canonicalMap, strictMode }) => {
  const legacyKeys = [...legacyMap.keys()].sort();
  const canonicalKeys = [...canonicalMap.keys()].sort();
  const missingInCanonical = legacyKeys.filter((missionId) => !canonicalMap.has(missionId));
  const extraInCanonical = canonicalKeys.filter((missionId) => !legacyMap.has(missionId));
  const payloadDiffs = [];

  if (strictMode) {
    legacyKeys
      .filter((missionId) => canonicalMap.has(missionId))
      .forEach((missionId) => {
        const legacyPayload = JSON.stringify(legacyMap.get(missionId));
        const canonicalPayload = JSON.stringify(canonicalMap.get(missionId));

        if (legacyPayload !== canonicalPayload) {
          payloadDiffs.push(missionId);
        }
      });
  }

  return {
    missingInCanonical,
    extraInCanonical,
    payloadDiffs,
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
    enrollmentsWithLegacyResponses: 0,
    enrollmentsWithCanonicalResponses: 0,
    exactMatches: 0,
    mismatchedEnrollments: 0,
    missingInCanonicalCount: 0,
    extraInCanonicalCount: 0,
    payloadDiffCount: 0,
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

    if (legacyEntries.length > 0) {
      summary.enrollmentsWithLegacyResponses += 1;
    }

    if (!canonicalSnapshot.empty) {
      summary.enrollmentsWithCanonicalResponses += 1;
    }

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
      if (legacyMap.size > 0 || canonicalMap.size > 0) {
        summary.exactMatches += 1;
      }
      continue;
    }

    summary.mismatchedEnrollments += 1;
    summary.missingInCanonicalCount += diffs.missingInCanonical.length;
    summary.extraInCanonicalCount += diffs.extraInCanonical.length;
    summary.payloadDiffCount += diffs.payloadDiffs.length;

    if (summary.mismatchSamples.length < 25) {
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

  console.log(JSON.stringify(summary, null, 2));

  if (failOnDiff && summary.mismatchedEnrollments > 0) {
    process.exit(2);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

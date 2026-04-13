import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  loadEnrollmentSnapshots,
  normalizeLegacyMissionResponse,
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

const dryRun = !toBoolean(args.write, false);
const pruneLegacy = toBoolean(args["prune-legacy"], false);
const userIdFilter = String(args["user-id"] || "").trim();
const courseIdFilter = String(args["course-id"] || "").trim();
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
    pruneLegacy: pruneLegacy && !dryRun,
    scannedEnrollments: enrollmentSnapshots.length,
    enrollmentsWithLegacyResponses: 0,
    missionResponsesFound: 0,
    malformedResponsesSkipped: 0,
    writeOperationsPlanned: 0,
    affectedEnrollmentPaths: [],
    filters: {
      projectId: args.project || "inspire-72132",
      userId: userIdFilter || null,
      courseId: courseIdFilter || null,
      limit: limit || null,
    },
  };

  const writer = dryRun ? null : db.bulkWriter();

  for (const enrollmentSnapshot of enrollmentSnapshots) {
    const data = enrollmentSnapshot.data() || {};
    const courseId = String(data.courseId || enrollmentSnapshot.id).trim() || enrollmentSnapshot.id;
    const legacyMissionResponses =
      data.missionResponses && typeof data.missionResponses === "object"
        ? data.missionResponses
        : {};
    const missionEntries = Object.entries(legacyMissionResponses).filter(
      ([, value]) => value && typeof value === "object" && !Array.isArray(value),
    );

    if (missionEntries.length === 0) continue;

    summary.enrollmentsWithLegacyResponses += 1;
    summary.affectedEnrollmentPaths.push(enrollmentSnapshot.ref.path);

    missionEntries.forEach(([missionId]) => {
      summary.missionResponsesFound += 1;
      summary.writeOperationsPlanned += 1;
    });

    Object.entries(legacyMissionResponses).forEach(([missionId, response]) => {
      if (!response || typeof response !== "object" || Array.isArray(response)) {
        summary.malformedResponsesSkipped += 1;
        return;
      }

      if (!writer) return;

      writer.set(
        enrollmentSnapshot.ref.collection("mission_responses").doc(missionId),
        normalizeLegacyMissionResponse({
          missionId,
          courseId,
          response,
        }),
        { merge: true },
      );
    });

    if (writer && pruneLegacy) {
      writer.set(
        enrollmentSnapshot.ref,
        {
          missionResponses: FieldValue.delete(),
        },
        { merge: true },
      );
    }
  }

  if (writer) {
    await writer.close();
  }

  summary.affectedEnrollmentPaths = summary.affectedEnrollmentPaths.slice(0, 20);

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  buildMatchRequestQualityReport,
  parseArgs,
  toBoolean,
  toPositiveInteger,
} from "./lib/matchmaking-contract-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run verify-matchmaking-quality --",
  "  npm run verify-matchmaking-quality -- --strict true",
  "  npm run verify-matchmaking-quality -- --user-id USER_UID --strict true",
  "  npm run verify-matchmaking-quality -- --request-id REQUEST_ID --strict true",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --user-id <uid>",
  "  --request-id <requestId>",
  "  --limit <number of requests>",
  "  --strict true",
].join("\n");

const normalizeString = (value = "") => String(value ?? "").trim();

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const projectId = args.project || "inspire-72132";
const userIdFilter = normalizeString(args["user-id"]);
const requestIdFilter = normalizeString(args["request-id"]);
const limit = toPositiveInteger(args.limit, 0);
const strict = toBoolean(args.strict, false);

const loadRequestSnapshots = async ({ db, userId, requestId, maxRows }) => {
  if (requestId) {
    const snapshot = await db.collection("match_requests").doc(requestId).get();
    return snapshot.exists ? [snapshot] : [];
  }

  let query = db.collection("match_requests");
  if (userId) {
    query = query.where("requesterId", "==", userId);
  }

  const snapshot = await query.get();
  const rows = snapshot.docs;
  return maxRows > 0 ? rows.slice(0, maxRows) : rows;
};

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const requestSnapshots = await loadRequestSnapshots({
    db,
    userId: userIdFilter,
    requestId: requestIdFilter,
    maxRows: limit,
  });

  const report = {
    ok: true,
    projectId,
    strict,
    totalRequests: requestSnapshots.length,
    missingRequesterIdCount: 0,
    missingRequesterSnapshotCount: 0,
    invalidPriorityCount: 0,
    invalidResourceTypeCount: 0,
    missingNeedTagsCount: 0,
    invalidStatusCount: 0,
    missingMatchedExpertSnapshotCount: 0,
    completedWithoutClosedReasonCount: 0,
    snapshotFlatMismatchCount: 0,
    missingRequesterIdIds: [],
    missingRequesterSnapshotIds: [],
    invalidPriorityIds: [],
    invalidResourceTypeIds: [],
    missingNeedTagsIds: [],
    invalidStatusIds: [],
    missingMatchedExpertSnapshotIds: [],
    completedWithoutClosedReasonIds: [],
    snapshotFlatMismatchIds: [],
    filters: {
      userId: userIdFilter || null,
      requestId: requestIdFilter || null,
      limit: limit || null,
    },
  };

  for (const requestSnapshot of requestSnapshots) {
    const itemReport = buildMatchRequestQualityReport({
      id: requestSnapshot.id,
      record: requestSnapshot.data() || {},
    });

    if (itemReport.missingRequesterId) {
      report.missingRequesterIdCount += 1;
      report.missingRequesterIdIds.push(itemReport.id);
    }

    if (itemReport.missingRequesterSnapshot) {
      report.missingRequesterSnapshotCount += 1;
      report.missingRequesterSnapshotIds.push(itemReport.id);
    }

    if (itemReport.invalidPriority) {
      report.invalidPriorityCount += 1;
      report.invalidPriorityIds.push(itemReport.id);
    }

    if (itemReport.invalidResourceType) {
      report.invalidResourceTypeCount += 1;
      report.invalidResourceTypeIds.push(itemReport.id);
    }

    if (itemReport.missingNeedTags) {
      report.missingNeedTagsCount += 1;
      report.missingNeedTagsIds.push(itemReport.id);
    }

    if (itemReport.invalidStatus) {
      report.invalidStatusCount += 1;
      report.invalidStatusIds.push(itemReport.id);
    }

    if (itemReport.missingMatchedExpertSnapshot) {
      report.missingMatchedExpertSnapshotCount += 1;
      report.missingMatchedExpertSnapshotIds.push(itemReport.id);
    }

    if (itemReport.completedWithoutClosedReason) {
      report.completedWithoutClosedReasonCount += 1;
      report.completedWithoutClosedReasonIds.push(itemReport.id);
    }

    if (itemReport.snapshotFlatMismatch) {
      report.snapshotFlatMismatchCount += 1;
      report.snapshotFlatMismatchIds.push(itemReport.id);
    }
  }

  [
    "missingRequesterIdIds",
    "missingRequesterSnapshotIds",
    "invalidPriorityIds",
    "invalidResourceTypeIds",
    "missingNeedTagsIds",
    "invalidStatusIds",
    "missingMatchedExpertSnapshotIds",
    "completedWithoutClosedReasonIds",
    "snapshotFlatMismatchIds",
  ].forEach((key) => {
    report[key] = report[key].slice(0, 25);
  });

  console.log(JSON.stringify(report, null, 2));

  if (
    strict
    && (
      report.missingRequesterIdCount > 0
      || report.missingRequesterSnapshotCount > 0
      || report.invalidPriorityCount > 0
      || report.invalidResourceTypeCount > 0
      || report.missingNeedTagsCount > 0
      || report.invalidStatusCount > 0
      || report.missingMatchedExpertSnapshotCount > 0
      || report.completedWithoutClosedReasonCount > 0
      || report.snapshotFlatMismatchCount > 0
    )
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

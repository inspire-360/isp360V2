import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  buildMatchRequestContractPatch,
  parseArgs,
  toBoolean,
  toPositiveInteger,
} from "./lib/matchmaking-contract-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run backfill-match-request-contract --",
  "  npm run backfill-match-request-contract -- --write true",
  "  npm run backfill-match-request-contract -- --user-id USER_UID --write true",
  "  npm run backfill-match-request-contract -- --request-id REQUEST_ID --write true",
  "",
  "Default behavior:",
  "  Backfill runs in dry-run mode unless --write true is provided.",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --user-id <uid>",
  "  --request-id <requestId>",
  "  --limit <number of requests>",
  "  --write true",
].join("\n");

const normalizeString = (value = "") => String(value ?? "").trim();

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const dryRun = !toBoolean(args.write, false);
const projectId = args.project || "inspire-72132";
const userIdFilter = normalizeString(args["user-id"]);
const requestIdFilter = normalizeString(args["request-id"]);
const limit = toPositiveInteger(args.limit, 0);

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
  const summary = {
    ok: true,
    dryRun,
    projectId,
    scannedRequests: requestSnapshots.length,
    changedRequests: 0,
    writeOperationsPlanned: 0,
    pendingRequests: 0,
    matchedRequests: 0,
    completedRequests: 0,
    missingRequesterProfilesBefore: 0,
    missingMatchedExpertSnapshotsBefore: 0,
    requestIds: [],
    filters: {
      userId: userIdFilter || null,
      requestId: requestIdFilter || null,
      limit: limit || null,
    },
  };

  const writer = dryRun ? null : db.bulkWriter();
  const userCache = new Map();
  const expertCache = new Map();

  for (const requestSnapshot of requestSnapshots) {
    const requestId = requestSnapshot.id;
    const requestRecord = requestSnapshot.data() || {};
    const requesterId = normalizeString(requestRecord.requesterId);
    const matchedExpertId = normalizeString(requestRecord.matchedExpertId);

    if (requestRecord.status === "pending_match") summary.pendingRequests += 1;
    if (requestRecord.status === "matched") summary.matchedRequests += 1;
    if (requestRecord.status === "completed") summary.completedRequests += 1;

    if (
      !requestRecord.requesterProfileSnapshot
      || !normalizeString(requestRecord.requesterProfileSnapshot?.name)
    ) {
      summary.missingRequesterProfilesBefore += 1;
    }

    if (
      requestRecord.status !== "pending_match"
      && (
        !requestRecord.matchedExpertSnapshot
        || !normalizeString(requestRecord.matchedExpertSnapshot?.id)
      )
    ) {
      summary.missingMatchedExpertSnapshotsBefore += 1;
    }

    if (requesterId && !userCache.has(requesterId)) {
      const userSnapshot = await db.collection("users").doc(requesterId).get();
      userCache.set(requesterId, userSnapshot.exists ? userSnapshot.data() || {} : {});
    }

    if (matchedExpertId && !expertCache.has(matchedExpertId)) {
      const expertSnapshot = await db.collection("experts").doc(matchedExpertId).get();
      expertCache.set(matchedExpertId, expertSnapshot.exists ? expertSnapshot.data() || {} : {});
    }

    const { patch } = buildMatchRequestContractPatch({
      id: requestId,
      record: requestRecord,
      userRecord: userCache.get(requesterId) || {},
      expertRecord: expertCache.get(matchedExpertId) || {},
      fallbackNow: Timestamp.now(),
    });

    if (!Object.keys(patch).length) {
      continue;
    }

    summary.changedRequests += 1;
    summary.writeOperationsPlanned += 1;
    summary.requestIds.push(requestId);

    if (writer) {
      writer.set(requestSnapshot.ref, patch, { merge: true });
    }
  }

  if (writer) {
    await writer.close();
  }

  summary.requestIds = summary.requestIds.slice(0, 50);

  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

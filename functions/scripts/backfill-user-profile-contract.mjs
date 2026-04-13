import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  buildUserProfileContractPatch,
  parseArgs,
  toBoolean,
  toPositiveInteger,
} from "./lib/user-profile-contract-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run backfill-user-profile-contract --",
  "  npm run backfill-user-profile-contract -- --user-id USER_UID",
  "  npm run backfill-user-profile-contract -- --write true",
  "",
  "Default behavior:",
  "  Backfill runs in dry-run mode unless --write true is provided.",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --user-id <uid>",
  "  --limit <number of users>",
  "  --write true",
].join("\n");

const normalizeString = (value = "") => String(value ?? "").trim();

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const projectId = args.project || "inspire-72132";
const userIdFilter = normalizeString(args["user-id"]);
const dryRun = !toBoolean(args.write, false);
const limit = toPositiveInteger(args.limit, 0);

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const summary = {
    ok: true,
    projectId,
    dryRun,
    filters: {
      userId: userIdFilter || null,
      limit: limit || null,
    },
    scannedUsers: 0,
    writeOperationsPlanned: 0,
    updatedUserIds: [],
  };

  const now = Timestamp.now();
  const writer = dryRun ? null : db.bulkWriter();
  const snapshot = userIdFilter
    ? await db.collection("users").doc(userIdFilter).get()
    : await db.collection("users").get();
  const docs = userIdFilter
    ? snapshot.exists
      ? [snapshot]
      : []
    : snapshot.docs.slice(0, limit || undefined);

  for (const userDoc of docs) {
    summary.scannedUsers += 1;
    const { patch } = buildUserProfileContractPatch({
      id: userDoc.id,
      record: userDoc.data() || {},
      fallbackNow: now,
    });

    if (Object.keys(patch).length === 0) {
      continue;
    }

    summary.writeOperationsPlanned += 1;
    summary.updatedUserIds.push(userDoc.id);

    if (!writer) continue;
    writer.set(userDoc.ref, patch, { merge: true });
  }

  if (writer) {
    await writer.close();
  }

  summary.updatedUserIds = summary.updatedUserIds.slice(0, 25);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

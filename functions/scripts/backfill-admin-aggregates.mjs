import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  buildAdminAggregateDocuments,
  loadAdminMonitoringSources,
  normalizeAdminAggregateDocIds,
  parseArgs,
  toBoolean,
} from "./lib/admin-aggregate-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run backfill-admin-aggregates --",
  "  npm run backfill-admin-aggregates -- --write true",
  "  npm run backfill-admin-aggregates -- --doc-id learning --write true",
  "",
  "Default behavior:",
  "  Backfill runs in dry-run mode unless --write true is provided.",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --doc-id <overview|learning|support|reviews|innovations|matching>",
  "  --write true",
].join("\n");

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const dryRun = !toBoolean(args.write, false);
const projectId = args.project || "inspire-72132";

try {
  const docIds = normalizeAdminAggregateDocIds(args["doc-id"]);

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const sources = await loadAdminMonitoringSources({ db });
  const snapshotAt = Timestamp.now();
  const docsById = buildAdminAggregateDocuments({
    sources,
    snapshotAt,
    docIds,
  });

  if (!dryRun) {
    const writer = db.bulkWriter();
    docIds.forEach((docId) => {
      writer.set(db.collection("admin_aggregates").doc(docId), docsById[docId]);
    });
    await writer.close();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        projectId,
        docIds,
        writeOperationsPlanned: docIds.length,
        coverage: {
          userCount: sources.users.length,
          presenceCount: sources.presence.length,
          enrollmentCount: sources.enrollments.length,
          ticketCount: sources.tickets.length,
          videoCount: sources.videos.length,
          innovationCount: sources.innovations.length,
          expertCount: sources.experts.length,
          matchRequestCount: sources.matchRequests.length,
        },
        previews: Object.fromEntries(
          docIds.map((docId) => [
            docId,
            {
              title: docsById[docId].title,
              counts: docsById[docId].counts,
              health: docsById[docId].health,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

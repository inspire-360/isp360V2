import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";
import {
  buildAdminAggregateDocuments,
  buildAdminAggregateQualityReport,
  loadAdminMonitoringSources,
  normalizeAdminAggregateDocIds,
  parseArgs,
  toBoolean,
  toPositiveInteger,
} from "./lib/admin-aggregate-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run verify-admin-monitoring-quality --",
  "  npm run verify-admin-monitoring-quality -- --strict true",
  "  npm run verify-admin-monitoring-quality -- --doc-id learning --strict true",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --doc-id <overview|learning|support|reviews|innovations|matching>",
  "  --max-age-hours 24",
  "  --strict true",
].join("\n");

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const strict = toBoolean(args.strict, false);
const projectId = args.project || "inspire-72132";
const maxAgeHours = toPositiveInteger(args["max-age-hours"], 24);

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
  const expectedDocs = buildAdminAggregateDocuments({ sources, docIds });
  const actualSnapshot = await db
    .collection("admin_aggregates")
    .where(FieldPath.documentId(), "in", docIds)
    .get();

  const actualDocs = actualSnapshot.docs.reduce((accumulator, item) => {
    accumulator[item.id] = item.data() || {};
    return accumulator;
  }, {});

  const report = {
    ok: true,
    projectId,
    strict,
    maxAgeHours,
    ...buildAdminAggregateQualityReport({
      expectedDocs,
      actualDocs,
      maxAgeHours,
    }),
  };

  console.log(JSON.stringify(report, null, 2));

  if (
    strict &&
    (
      report.missingDocCount > 0
      || report.missingSnapshotCount > 0
      || report.staleSnapshotCount > 0
      || report.titleMismatchCount > 0
      || report.sourceVersionMismatchCount > 0
      || report.statusMismatchCount > 0
      || report.countMismatchCount > 0
      || report.healthMismatchCount > 0
      || report.coverageMismatchCount > 0
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

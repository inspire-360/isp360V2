import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  buildUserProfileQualityReport,
  parseArgs,
  toBoolean,
  toPositiveInteger,
} from "./lib/user-profile-contract-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run verify-user-profile-quality --",
  "  npm run verify-user-profile-quality -- --user-id USER_UID --strict true",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --user-id <uid>",
  "  --limit <number of users>",
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
const strict = toBoolean(args.strict, false);
const limit = toPositiveInteger(args.limit, 0);

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const snapshot = userIdFilter
    ? await db.collection("users").doc(userIdFilter).get()
    : await db.collection("users").get();
  const docs = userIdFilter
    ? snapshot.exists
      ? [snapshot]
      : []
    : snapshot.docs.slice(0, limit || undefined);

  const report = {
    ok: true,
    projectId,
    totalUsers: docs.length,
    uidMismatchCount: 0,
    invalidRoleCount: 0,
    missingNameCount: 0,
    missingActivePathCount: 0,
    missingMemberStatusCount: 0,
    missingSourceProviderCount: 0,
    missingLastLoginAtCount: 0,
    invalidProfileVersionCount: 0,
    uidMismatchIds: [],
    invalidRoleIds: [],
    missingNameIds: [],
    missingActivePathIds: [],
    missingMemberStatusIds: [],
    missingSourceProviderIds: [],
    missingLastLoginAtIds: [],
    invalidProfileVersionIds: [],
  };

  docs.forEach((userDoc) => {
    const row = buildUserProfileQualityReport({
      id: userDoc.id,
      record: userDoc.data() || {},
    });

    if (row.uidMismatch) {
      report.uidMismatchCount += 1;
      report.uidMismatchIds.push(userDoc.id);
    }
    if (row.invalidRole) {
      report.invalidRoleCount += 1;
      report.invalidRoleIds.push(userDoc.id);
    }
    if (row.missingName) {
      report.missingNameCount += 1;
      report.missingNameIds.push(userDoc.id);
    }
    if (row.missingActivePath) {
      report.missingActivePathCount += 1;
      report.missingActivePathIds.push(userDoc.id);
    }
    if (row.missingMemberStatus) {
      report.missingMemberStatusCount += 1;
      report.missingMemberStatusIds.push(userDoc.id);
    }
    if (row.missingSourceProvider) {
      report.missingSourceProviderCount += 1;
      report.missingSourceProviderIds.push(userDoc.id);
    }
    if (row.missingLastLoginAt) {
      report.missingLastLoginAtCount += 1;
      report.missingLastLoginAtIds.push(userDoc.id);
    }
    if (row.invalidProfileVersion) {
      report.invalidProfileVersionCount += 1;
      report.invalidProfileVersionIds.push(userDoc.id);
    }
  });

  Object.keys(report)
    .filter((key) => key.endsWith("Ids"))
    .forEach((key) => {
      report[key] = report[key].slice(0, 25);
    });

  console.log(JSON.stringify(report, null, 2));

  if (
    strict &&
    (
      report.uidMismatchCount > 0 ||
      report.invalidRoleCount > 0 ||
      report.missingNameCount > 0 ||
      report.missingActivePathCount > 0 ||
      report.missingMemberStatusCount > 0 ||
      report.missingSourceProviderCount > 0 ||
      report.missingLastLoginAtCount > 0 ||
      report.invalidProfileVersionCount > 0
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

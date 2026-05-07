import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  parseArgs,
  parseTopLevelTimestamp,
  toBoolean,
  toPositiveInteger,
} from "./lib/mission-response-migration-utils.mjs";

const usageText = [
  "Usage:",
  "  npm run member-v2:backfill -- --auth-export ./output/phase0-auth-export.json",
  "  npm run member-v2:backfill -- --auth-export ./output/phase0-auth-export.json --limit 100",
  "  npm run member-v2:backfill -- --auth-export ./output/phase0-auth-export.json --write true --confirm PHASE2_WRITE --limit 100",
  "",
  "Default behavior:",
  "  Dry run only. No Firestore writes unless --write true --confirm PHASE2_WRITE are both provided.",
  "",
  "Optional flags:",
  "  --project inspire-72132",
  "  --auth-export <path to Firebase Auth export JSON>",
  "  --user-id <uid>",
  "  --limit <number of auth users>",
  "  --batch-size 100",
  "  --write true",
  "  --confirm PHASE2_WRITE",
  "  --repair-users true",
  "  --confirm-repair-users PHASE2_REPAIR_USERS",
  "  --missing-profiles-only true",
  "  --max-repair-users-write 10",
  "  --system-health-only true",
  "  --write-system-health true",
  "  --reason <audit reason>",
  "  --output-dir ./output/phase2-member-v2-backfill-<timestamp>",
  "",
  "Write-mode guardrails:",
  "  --write true requires --confirm PHASE2_WRITE.",
  "  Missing users/{uid} profiles are not created unless --repair-users true is also provided.",
  "  Repairing users/{uid} in write mode also requires --confirm-repair-users PHASE2_REPAIR_USERS.",
  "  Repairing users/{uid} is limited to --max-repair-users-write users per run. Default: 10.",
  "  A local backup-before-write.json is written before the first Firestore batch commit.",
].join("\n");

const args = parseArgs(process.argv.slice(2));

if (args.help === "true") {
  console.log(usageText);
  process.exit(0);
}

const projectId = args.project || "inspire-72132";
const authExportPath = args["auth-export"] || "";
const userIdFilter = normalizeString(args["user-id"]);
const writeMode = toBoolean(args.write, false);
const repairUsers = toBoolean(args["repair-users"], false);
const missingProfilesOnly = toBoolean(args["missing-profiles-only"], repairUsers);
const systemHealthOnly = toBoolean(args["system-health-only"], false);
const writeSystemHealth = toBoolean(args["write-system-health"], true);
const confirmToken = normalizeString(args.confirm);
const confirmRepairUsersToken = normalizeString(args["confirm-repair-users"]);
const reason = normalizeString(args.reason) || "phase2-member-v2-safe-backfill";
const requestedLimit = toPositiveInteger(args.limit, 0);
const limit = writeMode && requestedLimit === 0 ? 100 : requestedLimit;
const batchSize = Math.min(toPositiveInteger(args["batch-size"], 100), 100);
const maxRepairUsersWrite = Math.min(toPositiveInteger(args["max-repair-users-write"], 10), 25);
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = path.resolve(args["output-dir"] || path.join("output", `phase2-member-v2-backfill-${runId}`));

if (writeMode && confirmToken !== "PHASE2_WRITE") {
  console.error("Write mode requires --confirm PHASE2_WRITE.");
  console.error("\n" + usageText);
  process.exit(1);
}

if (writeMode && repairUsers && confirmRepairUsersToken !== "PHASE2_REPAIR_USERS") {
  console.error("Repairing users/{uid} requires --confirm-repair-users PHASE2_REPAIR_USERS.");
  console.error("\n" + usageText);
  process.exit(1);
}

if (writeMode && repairUsers && (limit === 0 || limit > maxRepairUsersWrite)) {
  console.error(
    `Repairing users/{uid} is limited to ${maxRepairUsersWrite} missing profiles per write run. Use --limit ${maxRepairUsersWrite} or lower.`,
  );
  console.error("\n" + usageText);
  process.exit(1);
}

if (writeMode && batchSize > 100) {
  console.error("Batch size must be <= 100 users.");
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

try {
  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const db = getFirestore();
  const authUsers = await loadAuthUsers();
  const now = Timestamp.now();

  const [
    userDocsById,
    memberDocsById,
    userUsageDocsById,
    presenceDocsById,
    enrollmentCountsByUser,
    missionCountsByUser,
    systemHealthBefore,
  ] = await Promise.all([
    loadCollectionById(db, "users"),
    loadCollectionById(db, "members_v2"),
    loadCollectionById(db, "userUsage"),
    loadCollectionById(db, "presence"),
    loadCollectionGroupCounts(db, "enrollments"),
    loadCollectionGroupCounts(db, "mission_responses"),
    db.collection("systemHealth").doc("memberIntegrity").get(),
  ]);

  const selectedAuthUsers = systemHealthOnly ? [] : selectAuthUsers(authUsers, { userDocsById });

  const authIds = new Set(authUsers.map((item) => item.uid));
  const selectedAuthIds = new Set(selectedAuthUsers.map((item) => item.uid));
  const profileIds = new Set(userDocsById.keys());
  const presenceIds = new Set(presenceDocsById.keys());
  const memberIds = new Set(memberDocsById.keys());
  const usageIds = new Set(userUsageDocsById.keys());

  const operations = [];
  const rollbackManifest = {
    generatedAt: new Date().toISOString(),
    projectId,
    dryRun: !writeMode,
    reason,
    status: writeMode ? "pending" : "dry_run",
    committedBatchCount: 0,
    failedBatchCount: 0,
    documents: [],
    auditLogs: [],
    failedOperations: [],
  };
  const batchLogRows = [];
  const errors = [];

  if (!systemHealthOnly) for (const authUser of selectedAuthUsers) {
    const uid = authUser.uid;
    const userDoc = userDocsById.get(uid) || null;
    const profilePatch = !userDoc && repairUsers ? buildMinimalLegacyUserProfile({ authUser, now }) : null;
    const effectiveUserDoc = profilePatch
      ? {
          id: uid,
          path: `users/${uid}`,
          data: profilePatch,
        }
      : userDoc;
    const memberDoc = memberDocsById.get(uid) || null;
    const userUsageDoc = userUsageDocsById.get(uid) || null;
    const presenceDoc = presenceDocsById.get(uid) || null;
    const enrollmentCount = enrollmentCountsByUser.get(uid) || 0;
    const missionResponseCount = missionCountsByUser.get(uid) || 0;

    const memberTarget = buildMemberV2Target({
      authUser,
      userDoc: effectiveUserDoc,
      userUsageDoc,
      presenceDoc,
      enrollmentCount,
      missionResponseCount,
      now,
    });
    const memberPatch = diffPatchWithUpdatedAt(memberDoc?.data || {}, memberTarget);
    if (Object.keys(memberPatch).length > 0) {
      operations.push({
        kind: "members_v2_upsert",
        uid,
        path: `members_v2/${uid}`,
        patch: memberPatch,
        before: memberDoc,
      });
    }

    const usageTarget = buildUserUsageTarget({
      uid,
      userUsageDoc,
      presenceDoc,
      userDoc: effectiveUserDoc,
      enrollmentCount,
      missionResponseCount,
      now,
    });
    const usagePatch = diffPatchWithUpdatedAt(userUsageDoc?.data || {}, usageTarget);
    if (!repairUsers && Object.keys(usagePatch).length > 0) {
      operations.push({
        kind: "userUsage_upsert",
        uid,
        path: `userUsage/${uid}`,
        patch: usagePatch,
        before: userUsageDoc,
      });
    }

    if (profilePatch) {
      operations.push({
        kind: "users_minimal_profile_create",
        uid,
        path: `users/${uid}`,
        patch: profilePatch,
        before: null,
      });
    }
  }

  const integrityReport = buildIntegrityReport({
    authUsers,
    selectedAuthUsers,
    authIds,
    selectedAuthIds,
    profileIds,
    memberIds,
    usageIds,
    presenceIds,
    userDocsById,
    memberDocsById,
    userUsageDocsById,
    presenceDocsById,
    enrollmentCountsByUser,
    missionCountsByUser,
  });

  if (writeSystemHealth && (writeMode || systemHealthOnly)) {
    const systemPatch = {
      schemaVersion: 1,
      authUsersCount: integrityReport.counts.authUsers,
      firestoreUsersCount: integrityReport.counts.firestoreProfiles,
      membersV2Count: integrityReport.counts.membersV2,
      missingProfilesCount: integrityReport.authVsFirestore.authWithoutProfileCount,
      orphanProfilesCount: integrityReport.authVsFirestore.profileWithoutAuthCount,
      usageMissingCount: integrityReport.usageDataMissing.profilesWithoutUsageCount,
      roleMismatchCount: integrityReport.integrity.roleMismatchCount,
      disabledMismatchCount: integrityReport.integrity.disabledMismatchCount,
      stalePresenceCount: integrityReport.presenceInconsistency.staleOnlinePresenceCount,
      presenceWithoutProfileCount: integrityReport.presenceInconsistency.presenceWithoutProfileCount,
      presenceWithoutAuthCount: integrityReport.presenceInconsistency.presenceWithoutAuthCount,
      lastCheckedAt: now,
      dryRun: !writeMode,
      sourceReportPath: path.relative(process.cwd(), outputDir),
      updatedAt: now,
      updatedBy: "system:phase2-member-v2-safe-backfill",
    };

    operations.push({
      kind: "systemHealth_memberIntegrity_upsert",
      uid: "system",
      path: "systemHealth/memberIntegrity",
      patch: systemPatch,
      before: systemHealthBefore.exists
        ? { id: "memberIntegrity", path: "systemHealth/memberIntegrity", data: systemHealthBefore.data() || {} }
        : null,
    });
  }

  const plannedSummary = summarizeOperations(operations);
  const dryRunReport = {
    ok: true,
    projectId,
    dryRun: !writeMode,
    writeMode,
    repairUsers,
    missingProfilesOnly,
    maxRepairUsersWrite,
    systemHealthOnly,
    writeSystemHealth,
    reason,
    filters: {
      userId: userIdFilter || null,
      limit: limit || null,
      batchSize,
    },
    counts: integrityReport.counts,
    plannedSummary,
    plannedOperations: operations.map((operation) => ({
      kind: operation.kind,
      uid: operation.uid,
      path: operation.path,
      fields: Object.keys(operation.patch).sort(),
      createsDocument: !operation.before,
    })),
  };

  if (writeMode) {
    writeJson("backup-before-write.json", buildBackupBeforeWrite({ operations, reason }));
    await writeOperations({
      db,
      operations,
      batchSize,
      reason,
      rollbackManifest,
      batchLogRows,
      errors,
    });
  }

  writeJson("dry-run-report.json", dryRunReport);
  writeJson("data-integrity-report.json", integrityReport);
  writeJson("rollback-manifest.json", rollbackManifest);
  writeJson("error-report.json", {
    ok: errors.length === 0,
    errorCount: errors.length,
    errors,
  });
  writeJson("write-summary.json", {
    ok: errors.length === 0,
    projectId,
    dryRun: !writeMode,
    writeMode,
    plannedSummary,
    committedBatchCount: batchLogRows.filter((row) => row.status === "committed").length,
    errorCount: errors.length,
    outputDir,
  });
  fs.writeFileSync(
    path.join(outputDir, "batch-log.jsonl"),
    batchLogRows.map((row) => JSON.stringify(row)).join("\n") + (batchLogRows.length ? "\n" : ""),
  );

  console.log(
    JSON.stringify(
      {
        ok: errors.length === 0,
        projectId,
        dryRun: !writeMode,
        writeMode,
        outputDir,
        counts: integrityReport.counts,
        plannedSummary,
        errorCount: errors.length,
      },
      null,
      2,
    ),
  );

  if (errors.length > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  const errorReport = {
    ok: false,
    fatal: normalizeError(error),
  };
  writeJson("error-report.json", errorReport);
  console.error(error instanceof Error ? error.message : error);
  if (error?.stack) {
    console.error(error.stack);
  }
  console.error("\n" + usageText);
  process.exit(1);
}

function normalizeString(value = "") {
  return String(value ?? "").trim();
}

function normalizeRole(role = "") {
  const normalized = normalizeString(role).toLowerCase();
  if (["admin", "du admin", "du_admin"].includes(normalized)) return "admin";
  if (normalized === "teacher") return "teacher";
  if (["student", "learner"].includes(normalized)) return "learner";
  return normalized || "unknown";
}

function selectAuthUsers(authUsers, { userDocsById = new Map() } = {}) {
  const sorted = [...authUsers].sort((left, right) => left.uid.localeCompare(right.uid));
  const filtered = (userIdFilter ? sorted.filter((item) => item.uid === userIdFilter) : sorted).filter((item) => {
    if (!missingProfilesOnly) return true;
    return !userDocsById.has(item.uid);
  });
  return limit > 0 ? filtered.slice(0, limit) : filtered;
}

async function loadAuthUsers() {
  if (authExportPath) {
    const absolutePath = path.resolve(authExportPath);
    const raw = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    const rows = Array.isArray(raw) ? raw : raw.users || [];
    return rows.map(normalizeAuthExportUser).filter((item) => item.uid);
  }

  const auth = getAuth();
  const rows = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    rows.push(...page.users.map(normalizeAdminAuthUser));
    pageToken = page.pageToken;
  } while (pageToken);
  return rows;
}

function normalizeAuthExportUser(record = {}) {
  const providerUserInfo = Array.isArray(record.providerUserInfo) ? record.providerUserInfo : [];
  return {
    uid: normalizeString(record.localId || record.uid),
    displayName: normalizeString(record.displayName),
    email: normalizeString(record.email),
    phoneNumber: normalizeString(record.phoneNumber),
    photoURL: normalizeString(record.photoUrl || record.photoURL),
    disabled: record.disabled === true,
    emailVerified: record.emailVerified === true,
    providerIds: providerUserInfo.map((item) => normalizeString(item.providerId)).filter(Boolean),
    creationTime: parseTimestamp(record.createdAt || record.createdTime),
    lastSignInTime: parseTimestamp(record.lastSignedInAt || record.lastSignInTime),
  };
}

function normalizeAdminAuthUser(record) {
  return {
    uid: normalizeString(record.uid),
    displayName: normalizeString(record.displayName),
    email: normalizeString(record.email),
    phoneNumber: normalizeString(record.phoneNumber),
    photoURL: normalizeString(record.photoURL),
    disabled: record.disabled === true,
    emailVerified: record.emailVerified === true,
    providerIds: (record.providerData || []).map((item) => normalizeString(item.providerId)).filter(Boolean),
    creationTime: parseTimestamp(record.metadata?.creationTime),
    lastSignInTime: parseTimestamp(record.metadata?.lastSignInTime),
  };
}

async function loadCollectionById(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  return new Map(
    snapshot.docs.map((item) => [
      item.id,
      {
        id: item.id,
        path: item.ref.path,
        data: item.data() || {},
      },
    ]),
  );
}

async function loadCollectionGroupCounts(db, collectionName) {
  const snapshot = await db.collectionGroup(collectionName).get();
  const counts = new Map();
  snapshot.docs.forEach((item) => {
    const userId = resolveUserIdFromCollectionGroupDoc(item.ref, collectionName);
    if (!userId) return;
    counts.set(userId, (counts.get(userId) || 0) + 1);
  });
  return counts;
}

function resolveUserIdFromCollectionGroupDoc(ref, collectionName) {
  if (collectionName === "enrollments") {
    return ref.parent.parent?.id || "";
  }

  if (collectionName === "mission_responses") {
    const enrollmentRef = ref.parent.parent;
    return enrollmentRef?.parent?.parent?.id || "";
  }

  return "";
}

function parseTimestamp(value) {
  const parsed = parseTopLevelTimestamp(value);
  return parsed instanceof Timestamp ? parsed : null;
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function maxTimestamp(...values) {
  const candidates = values
    .filter(Boolean)
    .map((value) => ({
      value,
      millis: timestampToMillis(value),
    }))
    .filter((item) => item.millis > 0)
    .sort((left, right) => right.millis - left.millis);
  return candidates[0]?.value || null;
}

function resolveDisplayName({ authUser, userDoc }) {
  const record = userDoc?.data || {};
  return (
    normalizeString(record.name) ||
    [record.prefix, record.firstName, record.lastName].map(normalizeString).filter(Boolean).join(" ") ||
    normalizeString(authUser.displayName) ||
    normalizeString(authUser.email) ||
    authUser.uid
  );
}

function resolvePresenceState(presenceDoc) {
  if (!presenceDoc) {
    return {
      state: "unknown",
      isOnline: false,
      isStale: false,
      lastSeenAt: null,
      lastActiveAt: null,
      activePath: "",
      sessionId: null,
    };
  }

  const record = presenceDoc.data || {};
  const lastActiveAt = record.lastActive || record.updatedAt || null;
  const lastSeenAt = record.lastSeen || lastActiveAt || null;
  const lastActiveMs = timestampToMillis(lastActiveAt) || Number(record.lastActiveMs || record.updatedAtMs || 0);
  const activeWindowMs = 45 * 1000;
  const state = normalizeString(record.presenceState).toLowerCase() || "unknown";
  const onlineLike = record.isOnline === true || state === "online";
  const isStale = onlineLike && (!lastActiveMs || Date.now() - lastActiveMs > activeWindowMs);

  return {
    state: ["online", "away", "offline"].includes(state) ? state : "unknown",
    isOnline: record.isOnline === true,
    isStale,
    lastSeenAt,
    lastActiveAt,
    activePath: normalizeString(record.activePath),
    sessionId: record.sessionId || null,
  };
}

function buildMemberV2Target({
  authUser,
  userDoc,
  userUsageDoc,
  presenceDoc,
  enrollmentCount,
  missionResponseCount,
  now,
}) {
  const userRecord = userDoc?.data || {};
  const usageRecord = userUsageDoc?.data || {};
  const profileMissing = !userDoc;
  const role = profileMissing ? "unknown" : normalizeRole(userRecord.role);
  const presence = resolvePresenceState(presenceDoc);
  const usageMissing = !hasUsageSignals({
    usageRecord,
    enrollmentCount,
    missionResponseCount,
    presence,
  });
  const lastLoginAt = userRecord.lastLoginAt || userRecord.lastLogin || authUser.lastSignInTime || null;
  const lastActiveAt = maxTimestamp(
    usageRecord.lastActiveAt,
    presence.lastActiveAt,
    presence.lastSeenAt,
    lastLoginAt,
  );

  return {
    schemaVersion: 1,
    uid: authUser.uid,
    displayName: resolveDisplayName({ authUser, userDoc }),
    email: normalizeString(authUser.email || userRecord.email),
    phoneNumber: authUser.phoneNumber || null,
    photoURL: normalizeString(authUser.photoURL || userRecord.photoURL),
    role,
    status: resolveMemberV2Status({ authUser, userRecord, profileMissing }),
    auth: {
      disabled: authUser.disabled === true,
      emailVerified: authUser.emailVerified === true,
      providerIds: authUser.providerIds || [],
      creationTime: authUser.creationTime || null,
      lastSignInTime: authUser.lastSignInTime || null,
    },
    legacy: {
      userDocExists: Boolean(userDoc),
      userDocPath: userDoc?.path || "",
      memberStatus: normalizeString(userRecord.memberStatus),
      status: normalizeString(userRecord.status),
      activePath: normalizeString(userRecord.activePath),
      profileVersion:
        typeof userRecord.profileVersion === "number" && Number.isFinite(userRecord.profileVersion)
          ? userRecord.profileVersion
          : null,
      sourceProvider: normalizeString(userRecord.sourceProvider),
    },
    profile: {
      prefix: normalizeString(userRecord.prefix),
      firstName: normalizeString(userRecord.firstName),
      lastName: normalizeString(userRecord.lastName),
      school: normalizeString(userRecord.school),
      position: normalizeString(userRecord.position),
      pdpaAccepted: typeof userRecord.pdpaAccepted === "boolean" ? userRecord.pdpaAccepted : null,
      pdpaAcceptedAt: userRecord.pdpaAcceptedAt || null,
    },
    usageSummary: {
      enrollmentCount,
      missionResponseCount,
      totalSessions: numberOrZero(usageRecord.totalSessions),
      totalActions: numberOrZero(usageRecord.totalActions),
      lastActiveAt,
      lastLoginAt,
    },
    presence,
    flags: {
      profileMissing,
      usageMissing,
      authOnly: profileMissing,
      orphanProfile: false,
      stalePresence: presence.isStale,
      disabledMismatch: false,
      roleMismatch: false,
      requiresReview: profileMissing || usageMissing || presence.isStale,
    },
    createdAt: userDoc?.data?.createdAt || authUser.creationTime || now,
    updatedAt: now,
    createdBy: "system:phase2-member-v2-safe-backfill",
    updatedBy: "system:phase2-member-v2-safe-backfill",
  };
}

function resolveMemberV2Status({ authUser, userRecord, profileMissing }) {
  if (authUser.disabled) return "suspended";
  if (profileMissing) return "incomplete";
  const status = normalizeString(userRecord.memberStatus || userRecord.status).toLowerCase();
  if (status === "active") return "active";
  if (status === "suspended") return "suspended";
  if (status === "soft_deleted") return "soft_deleted";
  if (status === "inactive" || status === "pending") return "incomplete";
  return "unknown";
}

function hasUsageSignals({ usageRecord, enrollmentCount, missionResponseCount, presence }) {
  return (
    enrollmentCount > 0 ||
    missionResponseCount > 0 ||
    numberOrZero(usageRecord.loginCount) > 0 ||
    numberOrZero(usageRecord.totalSessions) > 0 ||
    numberOrZero(usageRecord.totalActions) > 0 ||
    Boolean(usageRecord.lastActiveAt) ||
    Boolean(presence?.lastActiveAt) ||
    Boolean(presence?.lastSeenAt)
  );
}

function buildUserUsageTarget({
  uid,
  userUsageDoc,
  presenceDoc,
  userDoc,
  enrollmentCount,
  missionResponseCount,
  now,
}) {
  const existing = userUsageDoc?.data || {};
  const presence = resolvePresenceState(presenceDoc);
  const userRecord = userDoc?.data || {};
  const lastActiveAt = maxTimestamp(
    existing.lastActiveAt,
    presence.lastActiveAt,
    presence.lastSeenAt,
    userRecord.lastLoginAt,
    userRecord.lastLogin,
  );

  const target = {
    schemaVersion: 1,
    uid,
    enrollmentCount,
    missionResponseCount,
    generatedFrom: {
      enrollments: enrollmentCount > 0,
      missionResponses: missionResponseCount > 0,
      presence: Boolean(presenceDoc),
    },
    updatedAt: now,
  };

  if (!userUsageDoc) {
    return {
      ...target,
      loginCount: 0,
      totalSessions: 0,
      totalActions: 0,
      lastActiveAt,
      featureUsage: {},
      createdAt: now,
    };
  }

  if (!existing.lastActiveAt && lastActiveAt) {
    target.lastActiveAt = lastActiveAt;
  }
  if (!existing.featureUsage || typeof existing.featureUsage !== "object" || Array.isArray(existing.featureUsage)) {
    target.featureUsage = {};
  }
  if (typeof existing.loginCount !== "number") target.loginCount = 0;
  if (typeof existing.totalSessions !== "number") target.totalSessions = 0;
  if (typeof existing.totalActions !== "number") target.totalActions = 0;

  return target;
}

function buildMinimalLegacyUserProfile({ authUser, now }) {
  const email = normalizeString(authUser.email);
  const fallbackName = normalizeString(authUser.displayName) || email || authUser.uid;
  const nameParts = splitName(fallbackName);
  const createdAt = authUser.creationTime || now;
  const lastLoginAt = authUser.lastSignInTime || createdAt || now;

  return {
    uid: authUser.uid,
    prefix: "",
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    name: fallbackName,
    position: "",
    school: "",
    email,
    role: "teacher",
    activePath: "/course/teacher",
    progress: 0,
    progressPercent: 0,
    status: "active",
    photoURL: normalizeString(authUser.photoURL),
    createdAt,
    updatedAt: now,
    lastLogin: lastLoginAt,
    lastLoginAt,
    memberStatus: "active",
    sourceProvider: "auth_backfill",
    profileVersion: 2,
    pdpaAccepted: true,
    pdpaAcceptedAt: createdAt,
    badges: [],
    lineUserId: "",
    backfill: {
      phase: "phase2-member-v2-safe-backfill",
      createdAt: now,
      requiresReview: true,
      reason: "Auth user had no users/{uid} profile at backfill time.",
    },
  };
}

function splitName(value = "") {
  const parts = normalizeString(value).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function numberOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function diffPatch(existing, target) {
  return Object.entries(target).reduce((patch, [key, value]) => {
    if (!deepEqualForFirestore(existing[key], value)) {
      patch[key] = value;
    }
    return patch;
  }, {});
}

function diffPatchWithUpdatedAt(existing, target) {
  const { createdAt, updatedAt, ...stableTarget } = target;
  const patch = diffPatch(existing, stableTarget);
  if (
    !Object.prototype.hasOwnProperty.call(existing, "createdAt") &&
    createdAt &&
    !deepEqualForFirestore(existing.createdAt, createdAt)
  ) {
    patch.createdAt = createdAt;
  }
  if (Object.keys(patch).length > 0 && updatedAt) {
    patch.updatedAt = updatedAt;
  }
  return patch;
}

function deepEqualForFirestore(left, right) {
  return stableStringify(toComparable(left)) === stableStringify(toComparable(right));
}

function toComparable(value) {
  if (value instanceof Timestamp) return { __timestamp: value.toMillis() };
  if (value && typeof value.toMillis === "function") return { __timestamp: value.toMillis() };
  if (Array.isArray(value)) return value.map(toComparable);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = toComparable(value[key]);
        return accumulator;
      }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function buildIntegrityReport({
  authUsers,
  selectedAuthUsers,
  authIds,
  selectedAuthIds,
  profileIds,
  memberIds,
  usageIds,
  presenceIds,
  userDocsById,
  memberDocsById,
  userUsageDocsById,
  presenceDocsById,
  enrollmentCountsByUser,
  missionCountsByUser,
}) {
  const authWithoutProfile = [...authIds].filter((uid) => !profileIds.has(uid)).sort();
  const selectedAuthWithoutProfile = [...selectedAuthIds].filter((uid) => !profileIds.has(uid)).sort();
  const profileWithoutAuth = [...profileIds].filter((uid) => !authIds.has(uid)).sort();
  const profilesWithoutUsage = [...profileIds]
    .filter((uid) => !usageIds.has(uid) && !enrollmentCountsByUser.has(uid) && !missionCountsByUser.has(uid))
    .sort();
  const authWithoutUserUsage = [...authIds].filter((uid) => !usageIds.has(uid)).sort();
  const stalePresence = [...presenceDocsById.values()]
    .filter((item) => resolvePresenceState(item).isStale)
    .map((item) => item.id)
    .sort();
  const presenceWithoutProfile = [...presenceIds].filter((uid) => !profileIds.has(uid)).sort();
  const presenceWithoutAuth = [...presenceIds].filter((uid) => !authIds.has(uid)).sort();
  const presenceUidMismatch = [...presenceDocsById.values()]
    .filter((item) => item.data?.uid && item.data.uid !== item.id)
    .map((item) => item.id)
    .sort();

  const roleMismatchIds = [];
  const disabledMismatchIds = [];
  memberDocsById.forEach((memberDoc, uid) => {
    const userDoc = userDocsById.get(uid);
    if (userDoc && memberDoc.data?.role && normalizeRole(memberDoc.data.role) !== normalizeRole(userDoc.data?.role)) {
      roleMismatchIds.push(uid);
    }
    const authUser = authUsers.find((item) => item.uid === uid);
    if (
      authUser &&
      memberDoc.data?.auth &&
      typeof memberDoc.data.auth.disabled === "boolean" &&
      memberDoc.data.auth.disabled !== authUser.disabled
    ) {
      disabledMismatchIds.push(uid);
    }
  });

  return {
    generatedAt: new Date().toISOString(),
    projectId,
    counts: {
      authUsers: authUsers.length,
      selectedAuthUsers: selectedAuthUsers.length,
      firestoreProfiles: profileIds.size,
      membersV2: memberIds.size,
      userUsage: usageIds.size,
      presenceDocs: presenceIds.size,
      enrollmentUsers: enrollmentCountsByUser.size,
      missionResponseUsers: missionCountsByUser.size,
    },
    authVsFirestore: {
      authWithoutProfileCount: authWithoutProfile.length,
      authWithoutProfileIds: limitIds(authWithoutProfile),
      selectedAuthWithoutProfileCount: selectedAuthWithoutProfile.length,
      selectedAuthWithoutProfileIds: limitIds(selectedAuthWithoutProfile),
      profileWithoutAuthCount: profileWithoutAuth.length,
      profileWithoutAuthIds: limitIds(profileWithoutAuth),
    },
    usageDataMissing: {
      profilesWithoutUsageCount: profilesWithoutUsage.length,
      profilesWithoutUsageIds: limitIds(profilesWithoutUsage),
      authWithoutUserUsageCount: authWithoutUserUsage.length,
      authWithoutUserUsageIds: limitIds(authWithoutUserUsage),
    },
    presenceInconsistency: {
      staleOnlinePresenceCount: stalePresence.length,
      staleOnlinePresenceIds: limitIds(stalePresence),
      presenceWithoutProfileCount: presenceWithoutProfile.length,
      presenceWithoutProfileIds: limitIds(presenceWithoutProfile),
      presenceWithoutAuthCount: presenceWithoutAuth.length,
      presenceWithoutAuthIds: limitIds(presenceWithoutAuth),
      presenceUidMismatchCount: presenceUidMismatch.length,
      presenceUidMismatchIds: limitIds(presenceUidMismatch),
    },
    integrity: {
      roleMismatchCount: roleMismatchIds.length,
      roleMismatchIds: limitIds(roleMismatchIds.sort()),
      disabledMismatchCount: disabledMismatchIds.length,
      disabledMismatchIds: limitIds(disabledMismatchIds.sort()),
    },
  };
}

function limitIds(ids) {
  return ids.slice(0, 100);
}

function summarizeOperations(operations) {
  return operations.reduce(
    (summary, operation) => {
      summary.total += 1;
      summary.byKind[operation.kind] = (summary.byKind[operation.kind] || 0) + 1;
      if (!operation.before) summary.creates += 1;
      return summary;
    },
    {
      total: 0,
      creates: 0,
      byKind: {},
    },
  );
}

function buildBackupBeforeWrite({ operations, reason }) {
  return {
    generatedAt: new Date().toISOString(),
    projectId,
    reason,
    operationCount: operations.length,
    documents: operations.map((operation) => ({
      path: operation.path,
      kind: operation.kind,
      uid: operation.uid,
      existedBefore: Boolean(operation.before),
      before: operation.before ? serializeForJson(operation.before.data || {}) : null,
      plannedPatch: serializeForJson(operation.patch),
    })),
  };
}

async function writeOperations({
  db,
  operations,
  batchSize,
  reason,
  rollbackManifest,
  batchLogRows,
  errors,
}) {
  for (let index = 0; index < operations.length; index += batchSize) {
    const batchOperations = operations.slice(index, index + batchSize);
    const batchId = Math.floor(index / batchSize) + 1;
    const batch = db.batch();
    const auditEntries = [];
    const rollbackEntries = batchOperations.map((operation) => buildRollbackEntry(operation));

    batchOperations.forEach((operation) => {
      const docRef = docRefFromPath(db, operation.path);
      batch.set(docRef, operation.patch, { merge: true });

      if (!operation.path.startsWith("auditLogs/")) {
        const auditRef = db.collection("auditLogs").doc();
        auditEntries.push({
          path: auditRef.path,
          type: operation.kind,
          targetPath: operation.path,
          targetUid: operation.uid,
        });
        batch.set(auditRef, buildAuditLog({ operation, reason }), { merge: false });
      }
    });

    const commitResult = await commitWithRetry({
      batch,
      batchId,
      batchOperations,
      batchLogRows,
      errors,
    });

    if (commitResult.committed) {
      rollbackManifest.committedBatchCount += 1;
      rollbackManifest.documents.push(
        ...rollbackEntries.map((entry) => ({
          ...entry,
          batchId,
          committedAt: commitResult.committedAt,
          auditLogPaths: auditEntries
            .filter((auditEntry) => auditEntry.targetPath === entry.path)
            .map((auditEntry) => auditEntry.path),
        })),
      );
      rollbackManifest.auditLogs = [
        ...rollbackManifest.auditLogs,
        ...auditEntries.map((entry) => ({
          ...entry,
          batchId,
          committedAt: commitResult.committedAt,
        })),
      ];
    } else {
      rollbackManifest.failedBatchCount += 1;
      rollbackManifest.failedOperations.push(
        ...batchOperations.map((operation) => ({
          batchId,
          path: operation.path,
          kind: operation.kind,
          uid: operation.uid,
        })),
      );
    }
  }

  rollbackManifest.status = errors.length > 0 ? "completed_with_errors" : "completed";
}

function docRefFromPath(db, docPath) {
  const parts = docPath.split("/").filter(Boolean);
  if (parts.length % 2 !== 0) {
    throw new Error(`Invalid document path: ${docPath}`);
  }

  let ref = db.collection(parts[0]).doc(parts[1]);
  for (let index = 2; index < parts.length; index += 2) {
    ref = ref.collection(parts[index]).doc(parts[index + 1]);
  }
  return ref;
}

function buildRollbackEntry(operation) {
  const beforeData = operation.before?.data || {};
  const writtenFields = Object.keys(operation.patch).sort();
  return {
    path: operation.path,
    kind: operation.kind,
    uid: operation.uid,
    existedBefore: Boolean(operation.before),
    writtenFields,
    beforeFields: writtenFields.reduce((accumulator, field) => {
      accumulator[field] = Object.prototype.hasOwnProperty.call(beforeData, field)
        ? serializeForJson(beforeData[field])
        : null;
      return accumulator;
    }, {}),
  };
}

function buildAuditLog({ operation, reason }) {
  return {
    schemaVersion: 1,
    type: operation.kind,
    actorUid: "system:phase2-member-v2-safe-backfill",
    actorRole: "system",
    targetUid: operation.uid,
    targetCollection: operation.path.split("/")[0],
    before: buildAuditFieldSnapshot(operation.before?.data || {}, Object.keys(operation.patch)),
    after: serializeForJson(operation.patch),
    reason,
    requestId: runId,
    metadata: {
      script: "member-v2-safe-backfill",
      documentPath: operation.path,
      createsDocument: !operation.before,
    },
    createdAt: Timestamp.now(),
  };
}

function buildAuditFieldSnapshot(beforeData, fields) {
  return fields.reduce((accumulator, field) => {
    accumulator[field] = Object.prototype.hasOwnProperty.call(beforeData, field)
      ? serializeForJson(beforeData[field])
      : null;
    return accumulator;
  }, {});
}

async function commitWithRetry({ batch, batchId, batchOperations, batchLogRows, errors }) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await batch.commit();
      batchLogRows.push({
        batchId,
        attempt,
        status: "committed",
        operationCount: batchOperations.length,
        paths: batchOperations.map((operation) => operation.path),
        committedAt: new Date().toISOString(),
      });
      return {
        committed: true,
        committedAt: new Date().toISOString(),
      };
    } catch (error) {
      const normalizedError = normalizeError(error);
      batchLogRows.push({
        batchId,
        attempt,
        status: attempt === maxAttempts ? "failed" : "retrying",
        operationCount: batchOperations.length,
        error: normalizedError,
        updatedAt: new Date().toISOString(),
      });

      if (attempt === maxAttempts) {
        errors.push({
          batchId,
          operationPaths: batchOperations.map((operation) => operation.path),
          error: normalizedError,
        });
        return {
          committed: false,
          committedAt: null,
        };
      }

      await sleep(500 * attempt);
    }
  }

  return {
    committed: false,
    committedAt: null,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serializeForJson(value) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeForJson);
  }
  if (value && typeof value === "object") {
    return Object.keys(value).reduce((accumulator, key) => {
      accumulator[key] = serializeForJson(value[key]);
      return accumulator;
    }, {});
  }
  return value;
}

function normalizeError(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    code: error?.code || "",
    stack: error?.stack || "",
  };
}

function writeJson(fileName, payload) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(payload, null, 2));
}

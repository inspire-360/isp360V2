import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onValueWritten } from "firebase-functions/v2/database";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (getApps().length === 0) {
  initializeApp();
}

const FUNCTION_REGION = "asia-southeast1";
const USER_PROFILE_FIELDS = ["prefix", "firstName", "lastName", "school", "position", "photoURL"];
const MAX_FIELD_LENGTHS = {
  prefix: 32,
  firstName: 80,
  lastName: 80,
  school: 160,
  position: 120,
  photoURL: 500,
};
const HARD_DELETE_CONFIRM = "PHASE6_HARD_DELETE";
const HARD_DELETE_SECOND_CONFIRM = "DELETE_PERMANENTLY";
const HARD_DELETE_DEPENDENCY_COLLECTIONS = ["orders", "payments", "transactions", "invoices", "receipts"];
const HARD_DELETE_DEPENDENCY_FIELDS = ["uid", "userId", "memberUid", "targetUid", "payerUid"];
const HARD_DELETE_RETENTION_POLICY = {
  auditLogs: "Preserve permanently unless the organization approves a separate audit retention policy.",
  deletionExports: "Retain pre-delete snapshots under memberDeletionExports for policy review and legal hold.",
  firestoreUserData: "Anonymize direct profile and presence data instead of deleting audit history.",
  authUser: "Delete Firebase Auth user only after soft delete and dependency dry run pass.",
};
const HARD_DELETE_ANONYMIZATION_PLAN = {
  users: ["email", "name", "displayName", "firstName", "lastName", "prefix", "phoneNumber", "photoURL"],
  members_v2: ["email", "displayName", "phoneNumber", "photoURL", "profile"],
  userUsage: ["featureUsage", "lastActiveAt", "lastLoginAt"],
  presence: "Delete ephemeral presence document.",
};
const PRESENCE_V2_STALE_CONNECTION_MS = 2 * 60 * 1000;
const PRESENCE_V2_CLEANUP_STALE_MS = 5 * 60 * 1000;
const RBAC_ROLE_VALUES = ["super_admin", "admin", "support", "member"];
const RBAC_CONFIRM = "PHASE8_SET_ROLE";
const LEARNING_RESET_CONFIRM = "MEMBER_LEARNING_RESET";
const PHASE9_HEALTH_WRITE_CONFIRM = "PHASE9_HEALTH_SNAPSHOT";
const PHASE9_REQUIRED_USER_FIELDS = ["uid", "email", "role"];
const PHASE9_REQUIRED_MEMBER_FIELDS = ["uid", "email", "role", "status", "schemaVersion"];

const normalizeString = (value) => String(value ?? "").trim();

const hasControlCharacters = (value) =>
  [...String(value || "")].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

const normalizeRole = (role = "") => {
  const normalized = normalizeString(role).toLowerCase();
  if (["super_admin", "super admin", "superadmin"].includes(normalized)) return "super_admin";
  if (["admin", "du admin", "du_admin", "duadmin"].includes(normalized)) return "admin";
  if (normalized === "support") return "support";
  if (normalized === "member") return "member";
  if (normalized === "teacher") return "teacher";
  if (["student", "learner"].includes(normalized)) return "learner";
  return normalized || "learner";
};

const isAdminLikeRole = (role = "") => ["admin", "super_admin"].includes(normalizeRole(role));
const isSuperAdminRole = (role = "") => normalizeRole(role) === "super_admin";
const isRbacRole = (role = "") => RBAC_ROLE_VALUES.includes(normalizeRole(role));
const rolePriority = {
  super_admin: 60,
  admin: 50,
  support: 40,
  member: 30,
  teacher: 20,
  learner: 10,
};
const pickHighestRole = (...candidates) =>
  candidates
    .map((candidate) => normalizeRole(candidate))
    .filter(Boolean)
    .sort((left, right) => (rolePriority[right] || 0) - (rolePriority[left] || 0))[0] || "learner";
const resolveAuthTokenRole = (authToken = {}) =>
  pickHighestRole(
    authToken.role,
    authToken.rbac?.role,
    ...(Array.isArray(authToken.roles) ? authToken.roles : []),
    ...(Array.isArray(authToken.rbac?.roles) ? authToken.rbac.roles : []),
  );
const isDeletedStatus = (status = "") =>
  ["deleted", "soft_deleted", "hard_deleted"].includes(normalizeString(status).toLowerCase());
const isSoftDeletedStatus = (status = "") =>
  ["deleted", "soft_deleted"].includes(normalizeString(status).toLowerCase());

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const assertAdminActor = async ({ db, uid, authToken = {} }) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const actorSnapshot = await db.collection("users").doc(uid).get();
  const actorData = actorSnapshot.data() || {};
  const authTokenRole = resolveAuthTokenRole(authToken);
  let actorMemberData = null;
  let actorRole = pickHighestRole(authTokenRole, actorData.rbac?.role, actorData.role);

  if (!actorSnapshot.exists || !isAdminLikeRole(actorRole)) {
    const actorMemberSnapshot = await db.collection("members_v2").doc(uid).get();
    actorMemberData = actorMemberSnapshot.exists ? actorMemberSnapshot.data() || {} : null;
    actorRole = pickHighestRole(
      actorRole,
      actorMemberData?.rbac?.role,
      actorMemberData?.role,
    );
  }

  if ((!actorSnapshot.exists && !actorMemberData) || !isAdminLikeRole(actorRole)) {
    throw new HttpsError("permission-denied", "Admin role is required.");
  }

  return {
    ...actorData,
    role: actorData.role || actorRole,
    rbac: actorData.rbac || actorMemberData?.rbac || null,
    authTokenRole,
    memberRole: normalizeRole(actorMemberData?.role || ""),
    normalizedRole: actorRole,
  };
};

const validateProfilePatch = (profile) => {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new HttpsError("invalid-argument", "profile must be an object.");
  }

  const patch = {};
  const rejectedFields = Object.keys(profile).filter((field) => !USER_PROFILE_FIELDS.includes(field));
  if (rejectedFields.length > 0) {
    throw new HttpsError("invalid-argument", `Unsupported profile fields: ${rejectedFields.join(", ")}`);
  }

  for (const field of USER_PROFILE_FIELDS) {
    if (!(field in profile)) continue;
    const value = normalizeString(profile[field]);
    if (value.length > MAX_FIELD_LENGTHS[field]) {
      throw new HttpsError("invalid-argument", `${field} is too long.`);
    }
    if (hasControlCharacters(value)) {
      throw new HttpsError("invalid-argument", `${field} contains unsupported characters.`);
    }
    if (field === "photoURL" && value && !/^https?:\/\/[^\s]+$/i.test(value)) {
      throw new HttpsError("invalid-argument", "photoURL must be a valid http(s) URL.");
    }
    patch[field] = value;
  }

  return patch;
};

const resolveDisplayName = ({ existingUser, patch }) => {
  const prefix = patch.prefix ?? existingUser.prefix ?? "";
  const firstName = patch.firstName ?? existingUser.firstName ?? "";
  const lastName = patch.lastName ?? existingUser.lastName ?? "";
  const candidate = [prefix, firstName, lastName].map(normalizeString).filter(Boolean).join(" ");
  return candidate || normalizeString(existingUser.name || existingUser.email);
};

export const adminUpdateMemberProfileV2 = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    const db = getFirestore();
    const actorUid = request.auth?.uid || "";
    const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });

    const targetUid = normalizeString(request.data?.targetUid);
    const reason = normalizeString(request.data?.reason);
    const baseMembersV2UpdatedAtMs = Number(request.data?.baseMembersV2UpdatedAtMs || 0);
    const profilePatch = validateProfilePatch(request.data?.profile);

    if (!targetUid) {
      throw new HttpsError("invalid-argument", "targetUid is required.");
    }
    if (targetUid === actorUid) {
      throw new HttpsError("failed-precondition", "Admins cannot edit their own member record in this flow.");
    }
    if (reason.length < 8 || reason.length > 500) {
      throw new HttpsError("invalid-argument", "reason must be 8-500 characters.");
    }

    const userRef = db.collection("users").doc(targetUid);
    const memberRef = db.collection("members_v2").doc(targetUid);
    const auditRef = db.collection("auditLogs").doc();
    const now = Timestamp.now();

    return db.runTransaction(async (transaction) => {
      const [userSnapshot, memberSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(memberRef),
      ]);

      if (!userSnapshot.exists) {
        throw new HttpsError("not-found", "Target user profile does not exist.");
      }
      if (!memberSnapshot.exists) {
        throw new HttpsError("not-found", "Target members_v2 document does not exist.");
      }

      const existingUser = userSnapshot.data() || {};
      const existingMember = memberSnapshot.data() || {};
      const currentMembersV2UpdatedAtMs = timestampToMillis(existingMember.updatedAt);
      if (
        baseMembersV2UpdatedAtMs > 0 &&
        currentMembersV2UpdatedAtMs > 0 &&
        Math.abs(currentMembersV2UpdatedAtMs - baseMembersV2UpdatedAtMs) > 1000
      ) {
        throw new HttpsError("failed-precondition", "Member profile changed after this drawer was opened.");
      }

      const changedFields = Object.keys(profilePatch).filter(
        (field) => normalizeString(existingUser[field]) !== normalizeString(profilePatch[field]),
      );

      if (changedFields.length === 0) {
        return {
          ok: true,
          changedFields: [],
          auditLogId: null,
          currentMembersV2UpdatedAtMs,
        };
      }

      const nextName = resolveDisplayName({ existingUser, patch: profilePatch });
      const userPatch = {
        updatedAt: now,
        updatedBy: actorUid,
      };
      const memberPatch = {
        displayName: nextName,
        updatedAt: now,
        updatedBy: actorUid,
      };

      for (const field of changedFields) {
        userPatch[field] = profilePatch[field];
        memberPatch[`profile.${field}`] = profilePatch[field];
      }

      if (changedFields.some((field) => ["prefix", "firstName", "lastName"].includes(field))) {
        userPatch.name = nextName;
      }
      if (changedFields.includes("photoURL")) {
        memberPatch.photoURL = profilePatch.photoURL;
      }

      const before = {};
      const after = {};
      for (const field of changedFields) {
        before[field] = normalizeString(existingUser[field]);
        after[field] = profilePatch[field];
      }
      if ("name" in userPatch) {
        before.name = normalizeString(existingUser.name);
        after.name = nextName;
      }

      transaction.set(userRef, userPatch, { merge: true });
      transaction.set(memberRef, memberPatch, { merge: true });
      transaction.set(auditRef, {
        schemaVersion: 1,
        type: "member.profile.update",
        actorUid,
        actorRole: actorProfile.normalizedRole,
        targetUid,
        targetCollection: "users",
        before,
        after,
        changedFields,
        reason,
        requestId: auditRef.id,
        metadata: {
          source: "members_v2_drawer",
          baseMembersV2UpdatedAtMs,
          previousMembersV2UpdatedAtMs: currentMembersV2UpdatedAtMs,
        },
        createdAt: now,
        expireAt: null,
      });

      return {
        ok: true,
        changedFields,
        auditLogId: auditRef.id,
        serverUpdatedAtMs: timestampToMillis(now),
      };
    });
  },
);

const validateRoleChangeRequest = ({ request }) => {
  const targetUid = normalizeString(request.data?.targetUid);
  const nextRole = normalizeRole(request.data?.role);
  const reason = normalizeString(request.data?.reason);
  const confirm = normalizeString(request.data?.confirm);
  const baseMembersV2UpdatedAtMs = Number(request.data?.baseMembersV2UpdatedAtMs || 0);

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }
  if (!isRbacRole(nextRole)) {
    throw new HttpsError("invalid-argument", `role must be one of ${RBAC_ROLE_VALUES.join(", ")}.`);
  }
  if (reason.length < 8 || reason.length > 500) {
    throw new HttpsError("invalid-argument", "reason must be 8-500 characters.");
  }
  if (hasControlCharacters(reason)) {
    throw new HttpsError("invalid-argument", "reason contains unsupported characters.");
  }
  if (confirm !== RBAC_CONFIRM) {
    throw new HttpsError("failed-precondition", `Role changes require confirm ${RBAC_CONFIRM}.`);
  }

  return {
    targetUid,
    nextRole,
    reason,
    baseMembersV2UpdatedAtMs,
  };
};

const buildRbacClaims = ({ existingClaims = {}, role, updatedAtMs }) => ({
  ...existingClaims,
  role,
  roles: [role],
  rbac: {
    schemaVersion: 1,
    role,
    roles: [role],
    updatedAtMs,
  },
});

export const setUserRole = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const db = getFirestore();
    const auth = getAuth();
    const actorUid = request.auth?.uid || "";
    const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });
    const actorRole = normalizeRole(actorProfile.normalizedRole || actorProfile.role);
    const { targetUid, nextRole, reason, baseMembersV2UpdatedAtMs } = validateRoleChangeRequest({ request });

    if (!isSuperAdminRole(actorRole)) {
      throw new HttpsError("permission-denied", "Only super_admin can change roles.");
    }
    if (targetUid === actorUid) {
      throw new HttpsError("failed-precondition", "Admins cannot change their own role.");
    }

    const userRef = db.collection("users").doc(targetUid);
    const memberRef = db.collection("members_v2").doc(targetUid);
    const auditRef = db.collection("auditLogs").doc();
    const startedAt = Timestamp.now();

    const [userSnapshot, memberSnapshot, authRecord] = await Promise.all([
      userRef.get(),
      memberRef.get(),
      auth.getUser(targetUid).catch((error) => {
        throw new HttpsError("not-found", `Target Auth user was not found: ${error.message}`);
      }),
    ]);

    if (!userSnapshot.exists) {
      throw new HttpsError("not-found", "Target users profile does not exist.");
    }
    if (!memberSnapshot.exists) {
      throw new HttpsError("not-found", "Target members_v2 document does not exist.");
    }

    const targetProfile = userSnapshot.data() || {};
    const targetMember = memberSnapshot.data() || {};
    const targetRole = normalizeRole(targetProfile.role || targetMember.role);
    const currentMembersV2UpdatedAtMs = timestampToMillis(targetMember.updatedAt);

    if (isSuperAdminRole(targetRole)) {
      throw new HttpsError("permission-denied", "super_admin role changes require break-glass manual process.");
    }
    if (baseMembersV2UpdatedAtMs > 0 && currentMembersV2UpdatedAtMs > 0) {
      if (Math.abs(currentMembersV2UpdatedAtMs - baseMembersV2UpdatedAtMs) > 1000) {
        throw new HttpsError("failed-precondition", "Member role changed after this drawer was opened.");
      }
    }

    if (targetRole === nextRole) {
      return {
        ok: true,
        changed: false,
        targetUid,
        role: nextRole,
        auditLogId: null,
      };
    }

    const updatedAtMs = Date.now();
    const nextClaims = buildRbacClaims({
      existingClaims: authRecord.customClaims || {},
      role: nextRole,
      updatedAtMs,
    });
    const before = {
      customClaims: {
        role: authRecord.customClaims?.role || null,
        rbac: authRecord.customClaims?.rbac || null,
      },
      users: {
        role: targetRole,
        rbac: targetProfile.rbac || null,
      },
      members_v2: {
        role: normalizeRole(targetMember.role),
        rbac: targetMember.rbac || null,
      },
    };
    const after = {
      customClaims: {
        role: nextRole,
        rbac: nextClaims.rbac,
      },
      users: {
        role: nextRole,
      },
      members_v2: {
        role: nextRole,
      },
      refreshTokensRevoked: true,
    };

    await auditRef.set({
      schemaVersion: 1,
      type: "member.rbac.role.update",
      actorUid,
      actorRole,
      targetUid,
      targetRole,
      targetCollection: "users",
      before,
      after,
      reason,
      requestId: auditRef.id,
      status: "started",
      partialFailure: false,
      requiresReconciliation: false,
      metadata: {
        source: "members_v2_permissions_tab",
        baseMembersV2UpdatedAtMs,
        previousMembersV2UpdatedAtMs: currentMembersV2UpdatedAtMs,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    });

    let claimsUpdated = false;
    let tokensRevoked = false;
    let firestoreUpdated = false;

    try {
      await auth.setCustomUserClaims(targetUid, nextClaims);
      claimsUpdated = true;
      await auth.revokeRefreshTokens(targetUid);
      tokensRevoked = true;

      const completedAt = Timestamp.now();
      const rbacPatch = {
        schemaVersion: 1,
        role: nextRole,
        roles: [nextRole],
        source: "custom_claims",
        updatedAt: completedAt,
        updatedAtMs,
        updatedBy: actorUid,
        auditLogId: auditRef.id,
      };
      const batch = db.batch();
      batch.set(
        userRef,
        {
          role: nextRole,
          rbac: rbacPatch,
          roleUpdatedAt: completedAt,
          roleUpdatedBy: actorUid,
          customClaimsSyncedAt: completedAt,
          updatedAt: completedAt,
          updatedBy: actorUid,
        },
        { merge: true },
      );
      batch.set(
        memberRef,
        {
          role: nextRole,
          rbac: rbacPatch,
          legacy: {
            role: nextRole,
          },
          flags: {
            roleMismatch: false,
            requiresReview: false,
          },
          updatedAt: completedAt,
          updatedBy: actorUid,
        },
        { merge: true },
      );
      batch.set(
        auditRef,
        {
          status: "completed",
          partialFailure: false,
          requiresReconciliation: false,
          metadata: {
            source: "members_v2_permissions_tab",
            claimsUpdated,
            tokensRevoked,
            firestoreUpdated: true,
          },
          updatedAt: completedAt,
        },
        { merge: true },
      );
      await batch.commit();
      firestoreUpdated = true;

      return {
        ok: true,
        changed: true,
        targetUid,
        role: nextRole,
        auditLogId: auditRef.id,
        claimsUpdated,
        tokensRevoked,
        firestoreUpdated,
      };
    } catch (error) {
      const failedAt = Timestamp.now();
      const requiresReconciliation = claimsUpdated && !firestoreUpdated;
      const errorPayload = formatErrorPayload(error);

      await auditRef
        .set(
          {
            status: requiresReconciliation ? "partial_failure" : "failed",
            partialFailure: requiresReconciliation,
            requiresReconciliation,
            error: errorPayload,
            metadata: {
              source: "members_v2_permissions_tab",
              claimsUpdated,
              tokensRevoked,
              firestoreUpdated,
            },
            updatedAt: failedAt,
          },
          { merge: true },
        )
        .catch(() => {});

      if (requiresReconciliation) {
        await db.collection("systemHealth").doc("memberRbacReconciliation")
          .set(
            {
              schemaVersion: 1,
              lastMismatchAt: failedAt,
              lastMismatchTargetUid: targetUid,
              lastMismatchAuditLogId: auditRef.id,
              expectedRole: nextRole,
              requiresReview: true,
              updatedAt: failedAt,
              updatedBy: actorUid,
            },
            { merge: true },
          )
          .catch(() => {});
      }

      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        requiresReconciliation ? "failed-precondition" : "internal",
        requiresReconciliation
          ? "Custom claims changed but Firestore role mirror failed. Review memberRbacReconciliation."
          : `Role update failed: ${errorPayload.message}`,
      );
    }
  },
);

const validateLifecycleRequest = ({ request, action }) => {
  const targetUid = normalizeString(request.data?.targetUid);
  const reason = normalizeString(request.data?.reason);

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }
  if (!["suspend", "restore", "soft_delete"].includes(action)) {
    throw new HttpsError("invalid-argument", "Unsupported lifecycle action.");
  }
  if (reason.length < 8 || reason.length > 500) {
    throw new HttpsError("invalid-argument", "reason must be 8-500 characters.");
  }
  if (hasControlCharacters(reason)) {
    throw new HttpsError("invalid-argument", "reason contains unsupported characters.");
  }

  return {
    targetUid,
    reason,
  };
};

const formatErrorPayload = (error) => ({
  message: normalizeString(error?.message || "Unknown error"),
  code: normalizeString(error?.code || error?.status || "unknown"),
  name: normalizeString(error?.name || "Error"),
});

const assertLifecycleAllowed = ({ actorUid, actorProfile, targetUid, targetProfile }) => {
  const actorRole = normalizeRole(actorProfile?.normalizedRole || actorProfile?.role);
  const targetRole = normalizeRole(targetProfile?.role);

  if (!isAdminLikeRole(actorRole)) {
    throw new HttpsError("permission-denied", "Admin role is required.");
  }
  if (actorRole === "support") {
    throw new HttpsError("permission-denied", "Support role cannot change member lifecycle.");
  }
  if (targetUid === actorUid) {
    throw new HttpsError("failed-precondition", "Admins cannot change their own lifecycle state.");
  }
  if (isSuperAdminRole(targetRole) && !isSuperAdminRole(actorRole)) {
    throw new HttpsError("permission-denied", "Admins cannot change a super_admin lifecycle state.");
  }

  return {
    actorRole,
    targetRole,
  };
};

const buildLifecycleFirestorePatches = ({ action, actorUid, now }) => {
  const disabled = action !== "restore";
  const statusByAction = {
    suspend: "suspended",
    restore: "active",
    soft_delete: "deleted",
  };
  const status = statusByAction[action] || "active";

  return {
    userPatch: {
      status,
      memberStatus: status,
      lifecycle: {
        status,
        lastAction: action,
        lastChangedAt: now,
        lastChangedBy: actorUid,
      },
      deletedAt: action === "soft_delete" ? now : null,
      updatedAt: now,
      updatedBy: actorUid,
    },
    memberPatch: {
      status,
      auth: {
        disabled,
      },
      legacy: {
        status,
        memberStatus: status,
      },
      flags: {
        disabledMismatch: false,
        requiresReview: false,
      },
      deletedAt: action === "soft_delete" ? now : null,
      updatedAt: now,
      updatedBy: actorUid,
    },
  };
};

const runMemberLifecycleAction = async ({ request, action }) => {
  const db = getFirestore();
  const auth = getAuth();
  const actorUid = request.auth?.uid || "";
  const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });
  const { targetUid, reason } = validateLifecycleRequest({ request, action });
  const desiredDisabled = action !== "restore";
  const statusByAction = {
    suspend: "suspended",
    restore: "active",
    soft_delete: "deleted",
  };
  const desiredStatus = statusByAction[action] || "active";
  const operationTypeByAction = {
    suspend: "member.lifecycle.suspend",
    restore: "member.lifecycle.restore",
    soft_delete: "member.delete.soft",
  };
  const operationType = operationTypeByAction[action] || "member.lifecycle.update";

  const userRef = db.collection("users").doc(targetUid);
  const memberRef = db.collection("members_v2").doc(targetUid);
  const auditRef = db.collection("auditLogs").doc();
  const reconciliationRef = db.collection("systemHealth").doc("memberLifecycleReconciliation");
  const startedAt = Timestamp.now();

  const [userSnapshot, memberSnapshot, authRecord] = await Promise.all([
    userRef.get(),
    memberRef.get(),
    auth.getUser(targetUid).catch((error) => {
      throw new HttpsError("not-found", `Target Auth user was not found: ${error.message}`);
    }),
  ]);

  if (!userSnapshot.exists) {
    throw new HttpsError("not-found", "Target users profile does not exist.");
  }
  if (!memberSnapshot.exists) {
    throw new HttpsError("not-found", "Target members_v2 document does not exist.");
  }

  const targetProfile = userSnapshot.data() || {};
  const targetMember = memberSnapshot.data() || {};
  const { actorRole, targetRole } = assertLifecycleAllowed({
    actorUid,
    actorProfile,
    targetUid,
    targetProfile,
  });
  const before = {
    auth: {
      disabled: authRecord.disabled === true,
      tokensValidAfterTime: authRecord.tokensValidAfterTime || null,
    },
    users: {
      status: normalizeString(targetProfile.status),
      memberStatus: normalizeString(targetProfile.memberStatus),
      role: targetRole,
    },
    members_v2: {
      status: normalizeString(targetMember.status),
      authDisabled: targetMember.auth?.disabled === true,
    },
  };
  const after = {
    auth: {
      disabled: desiredDisabled,
      refreshTokensRevoked: desiredDisabled,
    },
    users: {
      status: desiredStatus,
      memberStatus: desiredStatus,
    },
    members_v2: {
      status: desiredStatus,
      authDisabled: desiredDisabled,
    },
  };

  await auditRef.set({
    schemaVersion: 1,
    type: operationType,
    actorUid,
    actorRole,
    targetUid,
    targetRole,
    targetCollection: "users",
    before,
    after,
    reason,
    requestId: auditRef.id,
    status: "started",
    partialFailure: false,
    requiresReconciliation: false,
    metadata: {
      source: "members_v2_danger_zone",
      action,
    },
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  let authReachedDesiredState = authRecord.disabled === desiredDisabled;
  let refreshTokensRevoked = false;
  let firestoreUpdated = false;

  try {
    if (!authReachedDesiredState) {
      await auth.updateUser(targetUid, { disabled: desiredDisabled });
      authReachedDesiredState = true;
    }
    if (desiredDisabled) {
      await auth.revokeRefreshTokens(targetUid);
      refreshTokensRevoked = true;
    }

    const completedAt = Timestamp.now();
    const { userPatch, memberPatch } = buildLifecycleFirestorePatches({
      action,
      actorUid,
      now: completedAt,
    });
    const batch = db.batch();
    batch.set(userRef, userPatch, { merge: true });
    batch.set(memberRef, memberPatch, { merge: true });
    batch.set(
      auditRef,
      {
        status: "completed",
        partialFailure: false,
        requiresReconciliation: false,
        metadata: {
          source: "members_v2_danger_zone",
          action,
          authReachedDesiredState,
          refreshTokensRevoked,
        },
        updatedAt: completedAt,
      },
      { merge: true },
    );
    await batch.commit();
    firestoreUpdated = true;

    return {
      ok: true,
      action,
      targetUid,
      auditLogId: auditRef.id,
      authDisabled: desiredDisabled,
      status: desiredStatus,
      refreshTokensRevoked,
      firestoreUpdated,
    };
  } catch (error) {
    const failedAt = Timestamp.now();
    const requiresReconciliation = authReachedDesiredState && !firestoreUpdated;
    const errorPayload = formatErrorPayload(error);

    await auditRef
      .set(
        {
          status: requiresReconciliation ? "partial_failure" : "failed",
          partialFailure: requiresReconciliation,
          requiresReconciliation,
          error: errorPayload,
          metadata: {
            source: "members_v2_danger_zone",
            action,
            authReachedDesiredState,
            refreshTokensRevoked,
            firestoreUpdated,
          },
          updatedAt: failedAt,
        },
        { merge: true },
      )
      .catch(() => {});

    if (requiresReconciliation) {
      await reconciliationRef
        .set(
          {
            schemaVersion: 1,
            lastMismatchAt: failedAt,
            lastMismatchTargetUid: targetUid,
            lastMismatchAction: action,
            lastMismatchAuditLogId: auditRef.id,
            requiresReview: true,
            updatedAt: failedAt,
            updatedBy: actorUid,
          },
          { merge: true },
        )
        .catch(() => {});
    }

    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      requiresReconciliation ? "failed-precondition" : "internal",
      requiresReconciliation
        ? "Auth state changed but Firestore update failed. Run lifecycle reconciliation."
        : `Member lifecycle update failed: ${errorPayload.message}`,
    );
  }
};

export const suspendMember = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 45,
    memory: "256MiB",
  },
  (request) => runMemberLifecycleAction({ request, action: "suspend" }),
);

export const restoreMember = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 45,
    memory: "256MiB",
  },
  (request) => runMemberLifecycleAction({ request, action: "restore" }),
);

export const softDeleteMember = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 45,
    memory: "256MiB",
  },
  (request) => runMemberLifecycleAction({ request, action: "soft_delete" }),
);

const validateLearningResetRequest = ({ request }) => {
  const targetUid = normalizeString(request.data?.targetUid);
  const courseId = normalizeString(request.data?.courseId || "all") || "all";
  const reason = normalizeString(request.data?.reason);
  const confirm = normalizeString(request.data?.confirm);

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }
  if (courseId.includes("/") || courseId.includes("..")) {
    throw new HttpsError("invalid-argument", "courseId is invalid.");
  }
  if (reason.length < 8 || reason.length > 500) {
    throw new HttpsError("invalid-argument", "reason must be 8-500 characters.");
  }
  if (hasControlCharacters(reason)) {
    throw new HttpsError("invalid-argument", "reason contains unsupported characters.");
  }
  if (confirm !== LEARNING_RESET_CONFIRM) {
    throw new HttpsError("failed-precondition", `Learning reset requires confirm ${LEARNING_RESET_CONFIRM}.`);
  }

  return {
    targetUid,
    courseId,
    reason,
  };
};

const buildLearningResetPayload = ({ actorUid, now }) => ({
  completedLessons: [],
  completedLessonsCount: 0,
  currentModuleIndex: 0,
  activeModuleIndex: 0,
  activeLessonIndex: 0,
  activeModuleTitle: "",
  activeLessonId: "",
  activeLessonTitle: "",
  moduleReports: {},
  earnedBadges: [],
  postTestAttempts: 0,
  score: 0,
  progress: 0,
  progressPercent: 0,
  status: "not_started",
  lastAccess: now,
  lastSavedAt: now,
  resetAt: now,
  resetBy: actorUid,
  updatedAt: now,
  updatedBy: actorUid,
});

const getEnrollmentSnapshotsForReset = async ({ db, targetUid, courseId }) => {
  const enrollmentsRef = db.collection("users").doc(targetUid).collection("enrollments");
  if (courseId === "all") {
    const snapshot = await enrollmentsRef.get();
    return snapshot.docs;
  }

  const snapshot = await enrollmentsRef.doc(courseId).get();
  return snapshot.exists ? [snapshot] : [];
};

const commitLearningResetWrites = async ({ db, writeItems }) => {
  let committed = 0;
  for (let index = 0; index < writeItems.length; index += 450) {
    const batch = db.batch();
    writeItems.slice(index, index + 450).forEach((item) => {
      if (item.type === "delete") {
        batch.delete(item.ref);
        return;
      }
      batch.set(item.ref, item.data, item.options || { merge: true });
    });
    await batch.commit();
    committed += writeItems.slice(index, index + 450).length;
  }
  return committed;
};

export const resetMemberLearningProgress = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    const db = getFirestore();
    const actorUid = request.auth?.uid || "";
    const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });
    const { targetUid, courseId, reason } = validateLearningResetRequest({ request });

    if (targetUid === actorUid) {
      throw new HttpsError("failed-precondition", "Admins cannot reset their own learning record from this console.");
    }

    const userRef = db.collection("users").doc(targetUid);
    const memberRef = db.collection("members_v2").doc(targetUid);
    const usageRef = db.collection("userUsage").doc(targetUid);
    const [targetUserSnapshot, targetMemberSnapshot, enrollmentSnapshots] = await Promise.all([
      userRef.get(),
      memberRef.get(),
      getEnrollmentSnapshotsForReset({ db, targetUid, courseId }),
    ]);

    if (!targetUserSnapshot.exists) {
      throw new HttpsError("not-found", "Target users profile does not exist.");
    }
    if (!targetMemberSnapshot.exists) {
      throw new HttpsError("not-found", "Target members_v2 document does not exist.");
    }

    const targetRole = normalizeRole(targetUserSnapshot.data()?.role || targetMemberSnapshot.data()?.role);
    const actorRole = normalizeRole(actorProfile.normalizedRole || actorProfile.role);
    if (isSuperAdminRole(targetRole) && !isSuperAdminRole(actorRole)) {
      throw new HttpsError("permission-denied", "Only a super_admin can reset another super_admin learning record.");
    }

    const now = Timestamp.now();
    const auditRef = db.collection("auditLogs").doc();
    const missionResponseSnapshots = await Promise.all(
      enrollmentSnapshots.map((enrollmentSnapshot) => enrollmentSnapshot.ref.collection("mission_responses").get()),
    );
    const deletedMissionResponseCount = missionResponseSnapshots.reduce(
      (total, snapshot) => total + snapshot.docs.length,
      0,
    );
    const beforeEnrollments = enrollmentSnapshots.map((snapshot, index) => {
      const data = snapshot.data() || {};
      return {
        courseId: snapshot.id,
        status: normalizeString(data.status),
        progress: typeof data.progress === "number" ? data.progress : null,
        progressPercent: typeof data.progressPercent === "number" ? data.progressPercent : null,
        completedLessonsCount:
          typeof data.completedLessonsCount === "number" ? data.completedLessonsCount : null,
        missionResponseCount: missionResponseSnapshots[index]?.docs.length || 0,
      };
    });

    await auditRef.set({
      schemaVersion: 1,
      type: "member.learning.reset",
      actorUid,
      actorRole,
      targetUid,
      targetRole,
      targetCollection: "users",
      before: {
        courseId,
        enrollments: beforeEnrollments,
      },
      after: {
        status: "not_started",
        progress: 0,
        progressPercent: 0,
        missionResponsesDeleted: deletedMissionResponseCount,
      },
      reason,
      requestId: auditRef.id,
      status: "started",
      partialFailure: false,
      metadata: {
        source: "member_management_learning_tab",
        courseId,
        enrollmentCount: enrollmentSnapshots.length,
      },
      createdAt: now,
      updatedAt: now,
    });

    if (enrollmentSnapshots.length === 0) {
      await auditRef.set(
        {
          status: "completed",
          metadata: {
            source: "member_management_learning_tab",
            courseId,
            enrollmentCount: 0,
            noop: true,
          },
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
      return {
        ok: true,
        targetUid,
        courseId,
        enrollmentCount: 0,
        deletedMissionResponseCount: 0,
        auditLogId: auditRef.id,
      };
    }

    try {
      const resetPayload = buildLearningResetPayload({ actorUid, now: Timestamp.now() });
      const writeItems = [
        ...enrollmentSnapshots.map((snapshot) => ({
          type: "set",
          ref: snapshot.ref,
          data: resetPayload,
          options: { merge: true },
        })),
        ...missionResponseSnapshots.flatMap((snapshot) =>
          snapshot.docs.map((docSnapshot) => ({
            type: "delete",
            ref: docSnapshot.ref,
          })),
        ),
        {
          type: "set",
          ref: memberRef,
          data: {
            learning: {
              lastResetAt: now,
              lastResetBy: actorUid,
              lastResetCourseId: courseId,
            },
            updatedAt: now,
            updatedBy: actorUid,
          },
          options: { merge: true },
        },
        {
          type: "set",
          ref: usageRef,
          data: {
            lastLearningResetAt: now,
            lastLearningResetBy: actorUid,
            lastLearningResetCourseId: courseId,
            updatedAt: now,
            updatedBy: actorUid,
          },
          options: { merge: true },
        },
      ];

      const committedWriteCount = await commitLearningResetWrites({ db, writeItems });
      const completedAt = Timestamp.now();
      await auditRef.set(
        {
          status: "completed",
          partialFailure: false,
          metadata: {
            source: "member_management_learning_tab",
            courseId,
            enrollmentCount: enrollmentSnapshots.length,
            deletedMissionResponseCount,
            committedWriteCount,
          },
          updatedAt: completedAt,
        },
        { merge: true },
      );

      return {
        ok: true,
        targetUid,
        courseId,
        enrollmentCount: enrollmentSnapshots.length,
        deletedMissionResponseCount,
        auditLogId: auditRef.id,
        committedWriteCount,
      };
    } catch (error) {
      const failedAt = Timestamp.now();
      await auditRef
        .set(
          {
            status: "failed",
            partialFailure: true,
            error: formatErrorPayload(error),
            updatedAt: failedAt,
          },
          { merge: true },
        )
        .catch(() => {});

      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", `Learning reset failed: ${error.message}`);
    }
  },
);

const validateHardDeleteRequest = ({ request }) => {
  const targetUid = normalizeString(request.data?.targetUid);
  const reason = normalizeString(request.data?.reason);
  const writeMode = request.data?.write === true;
  const confirm = normalizeString(request.data?.confirm);
  const secondConfirm = normalizeString(request.data?.secondConfirm);
  const confirmationValue = normalizeString(request.data?.confirmationValue);
  const dryRunReviewed = request.data?.dryRunReviewed === true;

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }
  if (reason.length < 8 || reason.length > 500) {
    throw new HttpsError("invalid-argument", "reason must be 8-500 characters.");
  }
  if (hasControlCharacters(reason)) {
    throw new HttpsError("invalid-argument", "reason contains unsupported characters.");
  }
  if (writeMode && confirm !== HARD_DELETE_CONFIRM) {
    throw new HttpsError("failed-precondition", `Write mode requires confirm ${HARD_DELETE_CONFIRM}.`);
  }
  if (writeMode && !dryRunReviewed) {
    throw new HttpsError("failed-precondition", "Write mode requires a reviewed hard delete dry run.");
  }
  if (writeMode && secondConfirm !== HARD_DELETE_SECOND_CONFIRM) {
    throw new HttpsError("failed-precondition", `Write mode requires secondConfirm ${HARD_DELETE_SECOND_CONFIRM}.`);
  }
  if (writeMode && !confirmationValue) {
    throw new HttpsError("invalid-argument", "confirmationValue must match the target UID or email.");
  }

  return {
    targetUid,
    reason,
    writeMode,
    dryRun: !writeMode,
    confirm,
    secondConfirm,
    confirmationValue,
    dryRunReviewed,
  };
};

const getAuthUserOrNull = async ({ auth, uid }) => {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    if (String(error?.code || "").includes("user-not-found")) {
      return null;
    }
    throw new HttpsError("internal", `Unable to read target Auth user: ${error.message}`);
  }
};

const buildAuthSnapshot = (authRecord) => {
  if (!authRecord) return null;

  return {
    uid: authRecord.uid,
    email: authRecord.email || null,
    displayName: authRecord.displayName || null,
    phoneNumber: authRecord.phoneNumber || null,
    photoURL: authRecord.photoURL || null,
    disabled: authRecord.disabled === true,
    emailVerified: authRecord.emailVerified === true,
    providerData: (authRecord.providerData || []).map((provider) => ({
      providerId: provider.providerId || null,
      uid: provider.uid || null,
      email: provider.email || null,
      displayName: provider.displayName || null,
      phoneNumber: provider.phoneNumber || null,
      photoURL: provider.photoURL || null,
    })),
    customClaims: authRecord.customClaims || {},
    metadata: {
      creationTime: authRecord.metadata?.creationTime || null,
      lastSignInTime: authRecord.metadata?.lastSignInTime || null,
      lastRefreshTime: authRecord.metadata?.lastRefreshTime || null,
    },
    tokensValidAfterTime: authRecord.tokensValidAfterTime || null,
    tenantId: authRecord.tenantId || null,
  };
};

const resolveTargetEmailCandidates = ({ targetUid, authRecord, userRecord, memberRecord }) => {
  const candidates = [targetUid, authRecord?.email, userRecord?.email, memberRecord?.email]
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean);

  return new Set(candidates);
};

const assertHardDeleteAllowed = ({ actorUid, actorProfile, targetUid, authRecord, userRecord, memberRecord }) => {
  const actorRole = normalizeRole(actorProfile?.normalizedRole || actorProfile?.role);
  const targetRole = normalizeRole(userRecord?.role || memberRecord?.role);

  if (!isSuperAdminRole(actorRole)) {
    throw new HttpsError("permission-denied", "Hard delete requires super_admin role.");
  }
  if (targetUid === actorUid) {
    throw new HttpsError("failed-precondition", "Super admins cannot hard delete themselves.");
  }

  const userStatus = normalizeString(userRecord?.status || userRecord?.memberStatus).toLowerCase();
  const userMemberStatus = normalizeString(userRecord?.memberStatus).toLowerCase();
  const memberStatus = normalizeString(memberRecord?.status || memberRecord?.legacy?.memberStatus).toLowerCase();
  const authDeleted = !authRecord;
  const authDisabled = authRecord?.disabled === true || memberRecord?.auth?.disabled === true;
  const alreadyHardDeleted = [userStatus, userMemberStatus, memberStatus].some((status) => status === "hard_deleted");
  const softDeleted = [userStatus, userMemberStatus, memberStatus].some(isSoftDeletedStatus);

  if (!alreadyHardDeleted && !(softDeleted && (authDisabled || authDeleted))) {
    throw new HttpsError(
      "failed-precondition",
      "Hard delete requires a completed soft delete first, including disabled Auth or an already missing Auth user.",
    );
  }

  return {
    actorRole,
    targetRole,
    alreadyHardDeleted,
    currentState: {
      authExists: Boolean(authRecord),
      authDisabled,
      userStatus: userStatus || null,
      userMemberStatus: userMemberStatus || null,
      memberStatus: memberStatus || null,
    },
  };
};

const checkHardDeleteDependencies = async ({ db, uid }) => {
  const blocking = [];
  const errors = [];

  for (const collectionId of HARD_DELETE_DEPENDENCY_COLLECTIONS) {
    for (const field of HARD_DELETE_DEPENDENCY_FIELDS) {
      try {
        const snapshot = await db.collection(collectionId).where(field, "==", uid).limit(1).get();
        if (!snapshot.empty) {
          blocking.push({
            collectionId,
            field,
            countAtLeast: 1,
            samplePath: snapshot.docs[0].ref.path,
          });
        }
      } catch (error) {
        errors.push({
          collectionId,
          field,
          ...formatErrorPayload(error),
        });
      }
    }
  }

  try {
    const subcollections = await db.collection("users").doc(uid).listCollections();
    for (const subcollection of subcollections) {
      const sample = await subcollection.limit(1).get();
      if (!sample.empty) {
        blocking.push({
          collectionId: `users/${uid}/${subcollection.id}`,
          field: "__subcollection__",
          countAtLeast: 1,
          samplePath: sample.docs[0].ref.path,
        });
      }
    }
  } catch (error) {
    errors.push({
      collectionId: `users/${uid}`,
      field: "__subcollections__",
      ...formatErrorPayload(error),
    });
  }

  return {
    blocking,
    errors,
    checkedAt: Timestamp.now(),
  };
};

const buildHardDeletePlan = ({
  targetUid,
  targetRole,
  authRecord,
  userSnapshot,
  memberSnapshot,
  userUsageSnapshot,
  presenceSnapshot,
  dependencies,
  currentState,
}) => {
  const targetEmail = authRecord?.email || userSnapshot.data()?.email || memberSnapshot.data()?.email || null;

  return {
    schemaVersion: 1,
    targetUid,
    targetEmail,
    targetRole,
    blocked: dependencies.blocking.length > 0 || dependencies.errors.length > 0,
    currentState,
    operations: {
      deleteAuthUser: Boolean(authRecord),
      anonymizeFirestoreDocs: [
        "users/" + targetUid,
        "members_v2/" + targetUid,
        "userUsage/" + targetUid,
      ],
      deleteEphemeralDocs: presenceSnapshot.exists ? ["presence/" + targetUid] : [],
      preserveDocs: ["auditLogs/*", "memberDeletionExports/{exportId}"],
      existingDocs: {
        users: userSnapshot.exists,
        members_v2: memberSnapshot.exists,
        userUsage: userUsageSnapshot.exists,
        presence: presenceSnapshot.exists,
      },
    },
    dependencies,
    retentionPolicy: HARD_DELETE_RETENTION_POLICY,
    anonymizationPlan: HARD_DELETE_ANONYMIZATION_PLAN,
  };
};

const buildHardDeletedUserPatch = ({ uid, actorUid, now, auditLogId, exportId }) => ({
  uid,
  email: "",
  name: "Deleted user",
  displayName: "Deleted user",
  firstName: "",
  lastName: "",
  prefix: "",
  phoneNumber: null,
  photoURL: "",
  status: "hard_deleted",
  memberStatus: "hard_deleted",
  deletedAt: now,
  hardDeletedAt: now,
  anonymizedAt: now,
  updatedAt: now,
  updatedBy: actorUid,
  lifecycle: {
    status: "hard_deleted",
    lastAction: "hard_delete",
    lastChangedAt: now,
    lastChangedBy: actorUid,
  },
  deletion: {
    status: "hard_deleted",
    hardDeletedAt: now,
    hardDeletedBy: actorUid,
    auditLogId,
    exportId,
  },
});

const buildHardDeletedMemberPatch = ({ uid, actorUid, now, auditLogId, exportId }) => ({
  uid,
  email: "",
  displayName: "Deleted user",
  phoneNumber: null,
  photoURL: "",
  role: "learner",
  status: "hard_deleted",
  auth: {
    disabled: true,
    emailVerified: false,
    providerIds: [],
    creationTime: null,
    lastSignInTime: null,
  },
  legacy: {
    status: "hard_deleted",
    memberStatus: "hard_deleted",
  },
  profile: {
    prefix: "",
    firstName: "",
    lastName: "",
    school: "",
    position: "",
    photoURL: "",
  },
  flags: {
    profileMissing: false,
    usageMissing: false,
    authOnly: false,
    orphanProfile: false,
    stalePresence: false,
    disabledMismatch: false,
    roleMismatch: false,
    requiresReview: false,
  },
  deletedAt: now,
  hardDeletedAt: now,
  anonymizedAt: now,
  updatedAt: now,
  updatedBy: actorUid,
  deletion: {
    status: "hard_deleted",
    hardDeletedAt: now,
    hardDeletedBy: actorUid,
    auditLogId,
    exportId,
  },
});

const buildHardDeletedUsagePatch = ({ uid, actorUid, now, auditLogId, exportId }) => ({
  uid,
  loginCount: 0,
  totalSessions: 0,
  totalActions: 0,
  lastActiveAt: null,
  lastLoginAt: null,
  featureUsage: {},
  anonymized: true,
  anonymizedAt: now,
  updatedAt: now,
  updatedBy: actorUid,
  deletion: {
    status: "hard_deleted",
    hardDeletedAt: now,
    hardDeletedBy: actorUid,
    auditLogId,
    exportId,
  },
});

export const hardDeleteMember = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    const db = getFirestore();
    const auth = getAuth();
    const actorUid = request.auth?.uid || "";
    const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });
    const { targetUid, reason, dryRun, confirmationValue } = validateHardDeleteRequest({ request });

    const userRef = db.collection("users").doc(targetUid);
    const memberRef = db.collection("members_v2").doc(targetUid);
    const usageRef = db.collection("userUsage").doc(targetUid);
    const presenceRef = db.collection("presence").doc(targetUid);

    const [userSnapshot, memberSnapshot, userUsageSnapshot, presenceSnapshot, authRecord] = await Promise.all([
      userRef.get(),
      memberRef.get(),
      usageRef.get(),
      presenceRef.get(),
      getAuthUserOrNull({ auth, uid: targetUid }),
    ]);

    if (!userSnapshot.exists && !memberSnapshot.exists && !authRecord) {
      throw new HttpsError("not-found", "Target member does not exist in Auth, users, or members_v2.");
    }

    const userRecord = userSnapshot.data() || {};
    const memberRecord = memberSnapshot.data() || {};
    const { actorRole, targetRole, currentState } = assertHardDeleteAllowed({
      actorUid,
      actorProfile,
      targetUid,
      authRecord,
      userRecord,
      memberRecord,
    });

    const dependencies = await checkHardDeleteDependencies({ db, uid: targetUid });
    const plan = buildHardDeletePlan({
      targetUid,
      targetRole,
      authRecord,
      userSnapshot,
      memberSnapshot,
      userUsageSnapshot,
      presenceSnapshot,
      dependencies,
      currentState,
    });

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        writeMode: false,
        blocked: plan.blocked,
        plan,
      };
    }

    if (plan.blocked) {
      throw new HttpsError(
        "failed-precondition",
        "Hard delete blocked by dependency records or dependency check errors. Review dry-run output first.",
      );
    }

    const confirmationCandidates = resolveTargetEmailCandidates({
      targetUid,
      authRecord,
      userRecord,
      memberRecord,
    });
    if (!confirmationCandidates.has(confirmationValue.toLowerCase())) {
      throw new HttpsError("invalid-argument", "confirmationValue must match the target UID or email.");
    }

    const startedAt = Timestamp.now();
    const auditRef = db.collection("auditLogs").doc();
    const exportRef = db.collection("memberDeletionExports").doc();

    await db.batch()
      .set(auditRef, {
        schemaVersion: 1,
        type: "member.delete.hard",
        actorUid,
        actorRole,
        targetUid,
        targetRole,
        targetCollection: "users",
        before: {
          auth: {
            exists: Boolean(authRecord),
            disabled: authRecord?.disabled === true,
          },
          users: {
            exists: userSnapshot.exists,
            status: normalizeString(userRecord.status || userRecord.memberStatus),
          },
          members_v2: {
            exists: memberSnapshot.exists,
            status: normalizeString(memberRecord.status),
          },
        },
        after: {
          auth: {
            deleted: Boolean(authRecord),
          },
          firestore: {
            status: "hard_deleted",
            anonymized: true,
          },
        },
        reason,
        requestId: auditRef.id,
        status: "started",
        partialFailure: false,
        requiresReconciliation: false,
        metadata: {
          source: "members_v2_danger_zone",
          deletionExportId: exportRef.id,
          retentionPolicy: HARD_DELETE_RETENTION_POLICY,
        },
        createdAt: startedAt,
        updatedAt: startedAt,
      })
      .set(exportRef, {
        schemaVersion: 1,
        type: "member.delete.hard.snapshot",
        targetUid,
        actorUid,
        actorRole,
        auditLogId: auditRef.id,
        reason,
        plan,
        auth: buildAuthSnapshot(authRecord),
        firestore: {
          users: userSnapshot.exists ? userRecord : null,
          members_v2: memberSnapshot.exists ? memberRecord : null,
          userUsage: userUsageSnapshot.exists ? userUsageSnapshot.data() : null,
          presence: presenceSnapshot.exists ? presenceSnapshot.data() : null,
        },
        createdAt: startedAt,
      })
      .commit();

    let authDeleted = !authRecord;
    let firestoreAnonymized = false;

    try {
      if (authRecord) {
        try {
          await auth.deleteUser(targetUid);
          authDeleted = true;
        } catch (error) {
          if (String(error?.code || "").includes("user-not-found")) {
            authDeleted = true;
          } else {
            throw error;
          }
        }
      }

      const completedAt = Timestamp.now();
      const batch = db.batch();
      batch.set(
        userRef,
        buildHardDeletedUserPatch({
          uid: targetUid,
          actorUid,
          now: completedAt,
          auditLogId: auditRef.id,
          exportId: exportRef.id,
        }),
        { merge: true },
      );
      batch.set(
        memberRef,
        buildHardDeletedMemberPatch({
          uid: targetUid,
          actorUid,
          now: completedAt,
          auditLogId: auditRef.id,
          exportId: exportRef.id,
        }),
        { merge: true },
      );
      batch.set(
        usageRef,
        buildHardDeletedUsagePatch({
          uid: targetUid,
          actorUid,
          now: completedAt,
          auditLogId: auditRef.id,
          exportId: exportRef.id,
        }),
        { merge: true },
      );
      if (presenceSnapshot.exists) {
        batch.delete(presenceRef);
      }
      batch.set(
        auditRef,
        {
          status: "completed",
          partialFailure: false,
          requiresReconciliation: false,
          metadata: {
            source: "members_v2_danger_zone",
            deletionExportId: exportRef.id,
            authDeleted,
            firestoreAnonymized: true,
            presenceDeleted: presenceSnapshot.exists,
          },
          updatedAt: completedAt,
        },
        { merge: true },
      );
      await batch.commit();
      firestoreAnonymized = true;

      return {
        ok: true,
        dryRun: false,
        writeMode: true,
        targetUid,
        auditLogId: auditRef.id,
        deletionExportId: exportRef.id,
        authDeleted,
        firestoreAnonymized,
        presenceDeleted: presenceSnapshot.exists,
      };
    } catch (error) {
      const failedAt = Timestamp.now();
      const requiresReconciliation = authDeleted && !firestoreAnonymized;
      const errorPayload = formatErrorPayload(error);

      await auditRef
        .set(
          {
            status: requiresReconciliation ? "partial_failure" : "failed",
            partialFailure: requiresReconciliation,
            requiresReconciliation,
            error: errorPayload,
            metadata: {
              source: "members_v2_danger_zone",
              deletionExportId: exportRef.id,
              authDeleted,
              firestoreAnonymized,
            },
            updatedAt: failedAt,
          },
          { merge: true },
        )
        .catch(() => {});

      if (requiresReconciliation) {
        await db.collection("systemHealth").doc("memberDeleteReconciliation")
          .set(
            {
              schemaVersion: 1,
              lastMismatchAt: failedAt,
              lastMismatchTargetUid: targetUid,
              lastMismatchAuditLogId: auditRef.id,
              requiresReview: true,
              remediation: "Run hardDeleteMember again after reviewing memberDeletionExports snapshot.",
              updatedAt: failedAt,
              updatedBy: actorUid,
            },
            { merge: true },
          )
          .catch(() => {});
      }

      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        requiresReconciliation ? "failed-precondition" : "internal",
        requiresReconciliation
          ? "Auth user was deleted but Firestore anonymization failed. Re-run hardDeleteMember to complete cleanup."
          : `Hard delete failed: ${errorPayload.message}`,
      );
    }
  },
);

const toNumberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const timestampFromMsOrNull = (value) => {
  const ms = toNumberOrZero(value);
  return ms > 0 ? Timestamp.fromMillis(ms) : null;
};

const normalizePresenceV2Connection = ([connectionId, data = {}]) => {
  const lastHeartbeatMs = toNumberOrZero(data.lastHeartbeatAt || data.connectedAt);
  const connectedAtMs = toNumberOrZero(data.connectedAt);

  return {
    connectionId,
    state: normalizeString(data.state || "unknown").toLowerCase(),
    visibilityState: normalizeString(data.visibilityState || "unknown").toLowerCase(),
    activePath: normalizeString(data.activePath),
    deviceId: normalizeString(data.deviceId),
    tabId: normalizeString(data.tabId),
    userAgent: normalizeString(data.userAgent).slice(0, 500),
    connectedAtMs,
    lastHeartbeatMs,
  };
};

const resolvePresenceV2Summary = ({ uid, rawConnections = {}, nowMs = Date.now() }) => {
  const connections = Object.entries(rawConnections || {}).map(normalizePresenceV2Connection);
  const activeConnections = connections.filter(
    (connection) =>
      connection.lastHeartbeatMs > 0 && nowMs - connection.lastHeartbeatMs <= PRESENCE_V2_STALE_CONNECTION_MS,
  );
  const visibleConnections = activeConnections.filter(
    (connection) => connection.visibilityState === "visible" && connection.state === "online",
  );
  const latestConnection = [...connections].sort(
    (left, right) => (right.lastHeartbeatMs || 0) - (left.lastHeartbeatMs || 0),
  )[0];
  const latestActiveConnection = [...activeConnections].sort(
    (left, right) => (right.lastHeartbeatMs || 0) - (left.lastHeartbeatMs || 0),
  )[0];
  const lastSeenMs = Math.max(...connections.map((connection) => connection.lastHeartbeatMs || 0), 0);
  const state =
    activeConnections.length === 0
      ? connections.length > 0
        ? "stale"
        : "offline"
      : visibleConnections.length > 0
        ? "online"
        : "idle";
  const lastHeartbeatMs = latestActiveConnection?.lastHeartbeatMs || lastSeenMs || 0;

  return {
    schemaVersion: 2,
    source: "rtdb_presence_v2",
    uid,
    state,
    online: state === "online" || state === "idle",
    isOnline: state === "online" || state === "idle",
    isStale: state === "stale",
    connectionCount: activeConnections.length,
    rawConnectionCount: connections.length,
    activeConnectionCount: activeConnections.length,
    visibleConnectionCount: visibleConnections.length,
    lastSeenAt: timestampFromMsOrNull(lastSeenMs),
    lastActiveAt: state === "online" ? timestampFromMsOrNull(lastHeartbeatMs) : null,
    lastHeartbeatAt: timestampFromMsOrNull(lastHeartbeatMs),
    activePath: normalizeString(latestActiveConnection?.activePath || latestConnection?.activePath),
    deviceCount: new Set(activeConnections.map((connection) => connection.deviceId).filter(Boolean)).size,
    tabCount: new Set(activeConnections.map((connection) => connection.tabId).filter(Boolean)).size,
    aggregatedAt: Timestamp.now(),
  };
};

const buildLegacyPresenceV2Document = ({ uid, summary }) => ({
  uid,
  presenceState: summary.state === "idle" ? "away" : summary.state,
  isOnline: summary.isOnline,
  visibilityState: summary.state === "online" ? "visible" : "hidden",
  activePath: summary.activePath || "",
  lastActive: summary.lastActiveAt || summary.lastHeartbeatAt || summary.lastSeenAt || Timestamp.now(),
  lastActiveMs:
    timestampToMillis(summary.lastActiveAt) ||
    timestampToMillis(summary.lastHeartbeatAt) ||
    timestampToMillis(summary.lastSeenAt),
  lastSeen: summary.lastSeenAt || summary.lastHeartbeatAt || Timestamp.now(),
  lastSeenMs: timestampToMillis(summary.lastSeenAt) || timestampToMillis(summary.lastHeartbeatAt),
  updatedAt: summary.aggregatedAt,
  updatedAtMs: timestampToMillis(summary.aggregatedAt),
  source: "rtdb_presence_v2",
  connectionCount: summary.connectionCount,
  rawConnectionCount: summary.rawConnectionCount,
  isStale: summary.isStale,
});

const aggregatePresenceV2ForUid = async ({ uid, reason = "aggregate" }) => {
  if (!uid) {
    return {
      ok: false,
      error: "uid is required",
    };
  }

  const firestore = getFirestore();
  const rtdb = getDatabase();
  const snapshot = await rtdb.ref(`status/${uid}/connections`).get();
  const summary = resolvePresenceV2Summary({
    uid,
    rawConnections: snapshot.val() || {},
  });
  const userRef = firestore.collection("users").doc(uid);
  const memberRef = firestore.collection("members_v2").doc(uid);
  const legacyPresenceRef = firestore.collection("presence").doc(uid);
  const [userSnapshot, memberSnapshot] = await Promise.all([userRef.get(), memberRef.get()]);
  const batch = firestore.batch();

  if (userSnapshot.exists) {
    batch.set(
      userRef,
      {
        presence: summary,
        updatedAt: summary.aggregatedAt,
      },
      { merge: true },
    );
  }
  if (memberSnapshot.exists) {
    batch.set(
      memberRef,
      {
        presence: summary,
        flags: {
          stalePresence: summary.isStale,
        },
        updatedAt: summary.aggregatedAt,
      },
      { merge: true },
    );
  }
  batch.set(legacyPresenceRef, buildLegacyPresenceV2Document({ uid, summary }), { merge: true });
  await batch.commit();

  return {
    ok: true,
    uid,
    reason,
    state: summary.state,
    connectionCount: summary.connectionCount,
    rawConnectionCount: summary.rawConnectionCount,
    isStale: summary.isStale,
  };
};

export const aggregatePresenceV2Connection = onValueWritten(
  {
    ref: "/status/{uid}/connections/{connectionId}",
    region: FUNCTION_REGION,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (event) =>
    aggregatePresenceV2ForUid({
      uid: event.params.uid,
      reason: `rtdb_connection_${event.params.connectionId}`,
    }),
);

const cleanupPresenceV2StaleConnectionsForUid = async ({ uid, writeMode = true, nowMs = Date.now() }) => {
  const rtdb = getDatabase();
  const connectionsRef = rtdb.ref(`status/${uid}/connections`);
  const snapshot = await connectionsRef.get();
  const connections = Object.entries(snapshot.val() || {}).map(normalizePresenceV2Connection);
  const staleConnections = connections.filter(
    (connection) =>
      connection.lastHeartbeatMs > 0 && nowMs - connection.lastHeartbeatMs > PRESENCE_V2_CLEANUP_STALE_MS,
  );

  if (writeMode) {
    await Promise.all(staleConnections.map((connection) => connectionsRef.child(connection.connectionId).remove()));
    await aggregatePresenceV2ForUid({ uid, reason: "cleanup_stale_connections" });
  }

  return {
    uid,
    checkedCount: connections.length,
    removedCount: writeMode ? staleConnections.length : 0,
    staleCount: staleConnections.length,
    staleConnectionIds: staleConnections.map((connection) => connection.connectionId),
  };
};

export const cleanupPresenceV2StaleConnections = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Bangkok",
    region: FUNCTION_REGION,
    timeoutSeconds: 120,
    memory: "512MiB",
    retryCount: 0,
  },
  async () => {
    const rtdb = getDatabase();
    const statusSnapshot = await rtdb.ref("status").get();
    const uidList = Object.keys(statusSnapshot.val() || {}).slice(0, 500);
    const results = [];

    for (const uid of uidList) {
      results.push(await cleanupPresenceV2StaleConnectionsForUid({ uid, writeMode: true }));
    }

    await getFirestore().collection("systemHealth").doc("presenceV2").set(
      {
        schemaVersion: 1,
        checkedUsers: results.length,
        removedConnections: results.reduce((total, item) => total + item.removedCount, 0),
        lastCheckedAt: Timestamp.now(),
        status: "completed",
      },
      { merge: true },
    );
  },
);

export const cleanupPresenceV2StaleConnectionsNow = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    const db = getFirestore();
    const actorUid = request.auth?.uid || "";
    const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });
    const actorRole = normalizeRole(actorProfile.normalizedRole || actorProfile.role);
    const targetUid = normalizeString(request.data?.targetUid);
    const writeMode = request.data?.write === true;
    const confirm = normalizeString(request.data?.confirm);

    if (!isSuperAdminRole(actorRole)) {
      throw new HttpsError("permission-denied", "Presence cleanup write requires super_admin role.");
    }
    if (writeMode && confirm !== "PHASE7_PRESENCE_CLEANUP") {
      throw new HttpsError("failed-precondition", "Write mode requires confirm PHASE7_PRESENCE_CLEANUP.");
    }

    const rtdb = getDatabase();
    const uidList = targetUid
      ? [targetUid]
      : Object.keys((await rtdb.ref("status").get()).val() || {}).slice(0, 100);
    const results = [];

    for (const uid of uidList) {
      results.push(await cleanupPresenceV2StaleConnectionsForUid({ uid, writeMode }));
    }

    return {
      ok: true,
      dryRun: !writeMode,
      checkedUsers: results.length,
      removedConnections: results.reduce((total, item) => total + item.removedCount, 0),
      staleConnections: results.reduce((total, item) => total + item.staleCount, 0),
      results,
    };
  },
);

const toPlainAuthUser = (authRecord) => ({
  uid: authRecord.uid,
  email: authRecord.email || "",
  disabled: authRecord.disabled === true,
  emailVerified: authRecord.emailVerified === true,
  roleClaim: normalizeRole(authRecord.customClaims?.role || authRecord.customClaims?.rbac?.role || ""),
  creationTime: authRecord.metadata?.creationTime || null,
  lastSignInTime: authRecord.metadata?.lastSignInTime || null,
});

const listAuthUsersSafe = async ({ auth, limit: requestedLimit }) => {
  const limit = Math.min(Math.max(Number(requestedLimit || 1000) || 1000, 1), 1000);
  const users = [];
  let pageToken;

  do {
    const page = await auth.listUsers(Math.min(1000, limit - users.length), pageToken);
    users.push(...page.users.map(toPlainAuthUser));
    pageToken = page.pageToken;
  } while (pageToken && users.length < limit);

  return users;
};

const snapshotCollectionById = async ({ db, collectionId, limit = 2000 }) => {
  const snapshot = await db.collection(collectionId).limit(limit).get();
  return new Map(snapshot.docs.map((docSnapshot) => [docSnapshot.id, docSnapshot.data() || {}]));
};

const hasMissingRequiredFields = ({ record = {}, fields = [] }) =>
  fields.filter((field) => {
    const value = record[field];
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return normalizeString(value).length === 0;
    return false;
  });

const resolveExpectedStatusFromAuthDisabled = ({ authDisabled, status }) => {
  const normalized = normalizeString(status).toLowerCase();
  if (isDeletedStatus(normalized)) return normalized;
  if (authDisabled) return "suspended";
  return normalized || "active";
};

const buildIssue = ({ type, uid, severity = "medium", message, details = {} }) => ({
  type,
  uid,
  severity,
  message,
  details,
});

const buildHealthSummary = ({ issues, counts, checkedAt }) => {
  const byType = issues.reduce((summary, issue) => {
    summary[issue.type] = (summary[issue.type] || 0) + 1;
    return summary;
  }, {});
  const highRiskTypes = [
    "auth_missing_firestore_profile",
    "firestore_profile_missing_auth",
    "auth_disabled_status_mismatch",
    "role_claim_mismatch",
    "failed_backfill_record",
  ];
  const highRiskIssueCount = issues.filter((issue) => highRiskTypes.includes(issue.type)).length;

  return {
    schemaVersion: 1,
    status: highRiskIssueCount > 0 ? "requires_review" : issues.length > 0 ? "warning" : "healthy",
    checkedAt,
    counts: {
      ...counts,
      issueCount: issues.length,
      highRiskIssueCount,
    },
    byType,
  };
};

export const runMemberIntegrityCheck = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 180,
    memory: "1GiB",
  },
  async (request) => {
    const db = getFirestore();
    const auth = getAuth();
    const actorUid = request.auth?.uid || "";
    const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });
    const actorRole = normalizeRole(actorProfile.normalizedRole || actorProfile.role);
    const writeMode = request.data?.write === true;
    const confirm = normalizeString(request.data?.confirm);
    const limit = Math.min(Math.max(Number(request.data?.limit || 1000) || 1000, 1), 1000);

    if (writeMode && !isSuperAdminRole(actorRole)) {
      throw new HttpsError("permission-denied", "Health snapshot write requires super_admin role.");
    }
    if (writeMode && confirm !== PHASE9_HEALTH_WRITE_CONFIRM) {
      throw new HttpsError("failed-precondition", `Write mode requires confirm ${PHASE9_HEALTH_WRITE_CONFIRM}.`);
    }

    const checkedAt = Timestamp.now();
    const [authUsers, usersMap, membersMap, usageMap, presenceMap, auditSnapshot] = await Promise.all([
      listAuthUsersSafe({ auth, limit }),
      snapshotCollectionById({ db, collectionId: "users", limit: 3000 }),
      snapshotCollectionById({ db, collectionId: "members_v2", limit: 3000 }),
      snapshotCollectionById({ db, collectionId: "userUsage", limit: 3000 }),
      snapshotCollectionById({ db, collectionId: "presence", limit: 3000 }),
      db.collection("auditLogs").where("status", "in", ["failed", "partial_failure"]).limit(50).get().catch(() => null),
    ]);
    const authMap = new Map(authUsers.map((user) => [user.uid, user]));
    const allUids = new Set([...authMap.keys(), ...usersMap.keys(), ...membersMap.keys()]);
    const issues = [];
    const stalePresenceMs = 2 * 60 * 1000;
    const nowMs = Date.now();

    for (const uid of allUids) {
      const authUser = authMap.get(uid);
      const userRecord = usersMap.get(uid);
      const memberRecord = membersMap.get(uid);
      const usageRecord = usageMap.get(uid);
      const presenceRecord = presenceMap.get(uid);

      if (authUser && !userRecord) {
        issues.push(buildIssue({
          type: "auth_missing_firestore_profile",
          uid,
          severity: "high",
          message: "Auth user has no users profile.",
        }));
      }
      if (userRecord && !authUser) {
        issues.push(buildIssue({
          type: "firestore_profile_missing_auth",
          uid,
          severity: "high",
          message: "users profile has no matching Auth user.",
          details: {
            email: userRecord.email || null,
          },
        }));
      }
      if (authUser && !usageRecord) {
        issues.push(buildIssue({
          type: "missing_usage_record",
          uid,
          severity: "medium",
          message: "Auth user has no userUsage record.",
        }));
      }
      if (authUser && userRecord) {
        const firestoreStatus = normalizeString(userRecord.status || userRecord.memberStatus).toLowerCase();
        const expectedStatus = resolveExpectedStatusFromAuthDisabled({
          authDisabled: authUser.disabled,
          status: firestoreStatus,
        });
        const mismatch =
          (authUser.disabled && !["suspended", "deleted", "soft_deleted", "hard_deleted"].includes(firestoreStatus)) ||
          (!authUser.disabled && firestoreStatus === "suspended");
        if (mismatch) {
          issues.push(buildIssue({
            type: "auth_disabled_status_mismatch",
            uid,
            severity: "high",
            message: "Firestore status does not match Auth disabled state.",
            details: {
              authDisabled: authUser.disabled,
              firestoreStatus: firestoreStatus || null,
              expectedStatus,
            },
          }));
        }

        const firestoreRole = normalizeRole(userRecord.role || memberRecord?.role || "");
        if (authUser.roleClaim && firestoreRole && authUser.roleClaim !== firestoreRole) {
          issues.push(buildIssue({
            type: "role_claim_mismatch",
            uid,
            severity: "high",
            message: "Firebase custom claim role does not match Firestore role mirror.",
            details: {
              roleClaim: authUser.roleClaim,
              firestoreRole,
            },
          }));
        }
      }
      if (userRecord) {
        const missingFields = hasMissingRequiredFields({
          record: userRecord,
          fields: PHASE9_REQUIRED_USER_FIELDS,
        });
        if (missingFields.length > 0) {
          issues.push(buildIssue({
            type: "missing_required_fields",
            uid,
            severity: "medium",
            message: "users profile is missing required fields.",
            details: {
              collection: "users",
              missingFields,
            },
          }));
        }
      }
      if (memberRecord) {
        const missingFields = hasMissingRequiredFields({
          record: memberRecord,
          fields: PHASE9_REQUIRED_MEMBER_FIELDS,
        });
        if (missingFields.length > 0) {
          issues.push(buildIssue({
            type: "missing_required_fields",
            uid,
            severity: "medium",
            message: "members_v2 record is missing required fields.",
            details: {
              collection: "members_v2",
              missingFields,
            },
          }));
        }
        if (memberRecord.flags?.requiresReview || memberRecord.flags?.backfillFailed) {
          issues.push(buildIssue({
            type: "failed_backfill_record",
            uid,
            severity: "high",
            message: "members_v2 record is marked for review or backfill failure.",
            details: {
              flags: memberRecord.flags || {},
            },
          }));
        }
      }
      if (memberRecord?.presence?.isStale || memberRecord?.flags?.stalePresence) {
        issues.push(buildIssue({
          type: "presence_stale",
          uid,
          severity: "low",
          message: "members_v2 presence is stale.",
        }));
      } else if (presenceRecord) {
        const lastPresenceMs = timestampToMillis(presenceRecord.updatedAt) || Number(presenceRecord.updatedAtMs || 0);
        if (lastPresenceMs > 0 && nowMs - lastPresenceMs > stalePresenceMs && presenceRecord.isOnline === true) {
          issues.push(buildIssue({
            type: "presence_stale",
            uid,
            severity: "low",
            message: "Legacy presence document still says online after stale window.",
            details: {
              lastPresenceMs,
            },
          }));
        }
      }
    }

    if (auditSnapshot) {
      for (const auditDoc of auditSnapshot.docs) {
        const auditData = auditDoc.data() || {};
        issues.push(buildIssue({
          type: "failed_admin_action",
          uid: auditData.targetUid || auditData.actorUid || auditDoc.id,
          severity: auditData.status === "partial_failure" ? "high" : "medium",
          message: `Audit log ${auditData.status || "failed"} action requires review.`,
          details: {
            auditLogId: auditDoc.id,
            auditType: auditData.type || null,
            status: auditData.status || null,
          },
        }));
      }
    }

    const counts = {
      authUsersCount: authUsers.length,
      firestoreUsersCount: usersMap.size,
      membersV2Count: membersMap.size,
      userUsageCount: usageMap.size,
      presenceDocsCount: presenceMap.size,
      missingProfilesCount: issues.filter((issue) => issue.type === "auth_missing_firestore_profile").length,
      orphanProfilesCount: issues.filter((issue) => issue.type === "firestore_profile_missing_auth").length,
      usageMissingCount: issues.filter((issue) => issue.type === "missing_usage_record").length,
      disabledMismatchCount: issues.filter((issue) => issue.type === "auth_disabled_status_mismatch").length,
      roleMismatchCount: issues.filter((issue) => issue.type === "role_claim_mismatch").length,
      stalePresenceCount: issues.filter((issue) => issue.type === "presence_stale").length,
      missingRequiredFieldsCount: issues.filter((issue) => issue.type === "missing_required_fields").length,
      failedBackfillCount: issues.filter((issue) => issue.type === "failed_backfill_record").length,
      failedAdminActionCount: issues.filter((issue) => issue.type === "failed_admin_action").length,
    };
    const summary = buildHealthSummary({ issues, counts, checkedAt });

    if (writeMode) {
      const snapshotRef = db.collection("systemHealth").doc("memberIntegrity");
      const runRef = db.collection("systemHealthRuns").doc();
      const auditRef = db.collection("auditLogs").doc();
      const batch = db.batch();
      batch.set(snapshotRef, {
        ...summary,
        lastCheckedAt: checkedAt,
        lastRunId: runRef.id,
        updatedAt: checkedAt,
        updatedBy: actorUid,
      }, { merge: true });
      batch.set(runRef, {
        ...summary,
        issues: issues.slice(0, 500),
        actorUid,
        actorRole,
        createdAt: checkedAt,
      });
      batch.set(auditRef, {
        schemaVersion: 1,
        type: "system.health.member_integrity.snapshot",
        actorUid,
        actorRole,
        targetUid: null,
        before: null,
        after: summary,
        reason: "phase9 member integrity health snapshot",
        requestId: auditRef.id,
        status: "completed",
        createdAt: checkedAt,
        updatedAt: checkedAt,
      });
      await batch.commit();
    }

    return {
      ok: true,
      dryRun: !writeMode,
      writeMode,
      summary,
      issues: issues.slice(0, 500),
      truncated: issues.length > 500,
    };
  },
);

const toSafeLimit = (value) => Math.min(Math.max(Number(value || 100) || 100, 1), 100);

const resolveReconciledStatus = ({ authDisabled, userStatus, memberStatus }) => {
  const normalizedUserStatus = normalizeString(userStatus).toLowerCase();
  const normalizedMemberStatus = normalizeString(memberStatus).toLowerCase();
  if (isDeletedStatus(normalizedUserStatus)) return normalizedUserStatus;
  if (isDeletedStatus(normalizedMemberStatus)) return normalizedMemberStatus;
  if (authDisabled) return "suspended";
  if (normalizedUserStatus === "suspended") return "active";
  if (normalizedMemberStatus === "suspended") return "active";
  return normalizeString(userStatus || memberStatus || "active").toLowerCase();
};

export const reconcileMemberLifecycleMismatch = onCall(
  {
    region: FUNCTION_REGION,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    const db = getFirestore();
    const auth = getAuth();
    const actorUid = request.auth?.uid || "";
    const actorProfile = await assertAdminActor({ db, uid: actorUid, authToken: request.auth?.token });
    const actorRole = normalizeRole(actorProfile.normalizedRole || actorProfile.role);
    const targetUid = normalizeString(request.data?.targetUid);
    const writeMode = request.data?.write === true;
    const confirm = normalizeString(request.data?.confirm);
    const reason = normalizeString(request.data?.reason);
    const limit = toSafeLimit(request.data?.limit);

    if (writeMode && confirm !== "PHASE5_RECONCILE_WRITE") {
      throw new HttpsError("failed-precondition", "Write mode requires confirm PHASE5_RECONCILE_WRITE.");
    }
    if (writeMode && (reason.length < 8 || reason.length > 500)) {
      throw new HttpsError("invalid-argument", "Write mode requires reason 8-500 characters.");
    }
    if (writeMode && hasControlCharacters(reason)) {
      throw new HttpsError("invalid-argument", "reason contains unsupported characters.");
    }

    const memberDocs = targetUid
      ? [await db.collection("members_v2").doc(targetUid).get()]
      : (await db.collection("members_v2").limit(limit).get()).docs;
    const checked = [];
    const mismatches = [];
    const errors = [];
    const batch = db.batch();
    let writeCount = 0;

    for (const memberDoc of memberDocs) {
      if (!memberDoc.exists) {
        errors.push({ uid: targetUid || "", code: "not-found", message: "members_v2 document missing" });
        continue;
      }

      const uid = memberDoc.id;
      const memberRecord = memberDoc.data() || {};
      const userRef = db.collection("users").doc(uid);
      const memberRef = db.collection("members_v2").doc(uid);
      const userSnapshot = await userRef.get();
      const userRecord = userSnapshot.data() || {};
      let authRecord;

      try {
        authRecord = await auth.getUser(uid);
      } catch (error) {
        errors.push({ uid, ...formatErrorPayload(error) });
        continue;
      }

      const expectedStatus = resolveReconciledStatus({
        authDisabled: authRecord.disabled === true,
        userStatus: userRecord.status,
        memberStatus: memberRecord.status,
      });
      const currentUserStatus = normalizeString(userRecord.status).toLowerCase();
      const currentMemberStatus = normalizeString(memberRecord.status).toLowerCase();
      const currentMemberAuthDisabled = memberRecord.auth?.disabled === true;
      const mismatch =
        currentMemberAuthDisabled !== (authRecord.disabled === true) ||
        currentUserStatus !== expectedStatus ||
        currentMemberStatus !== expectedStatus;

      checked.push(uid);
      if (!mismatch) continue;

      const mismatchRow = {
        uid,
        authDisabled: authRecord.disabled === true,
        userStatus: currentUserStatus || null,
        memberStatus: currentMemberStatus || null,
        memberAuthDisabled: currentMemberAuthDisabled,
        expectedStatus,
      };
      mismatches.push(mismatchRow);

      if (writeMode) {
        const now = Timestamp.now();
        const auditRef = db.collection("auditLogs").doc();
        batch.set(
          userRef,
          {
            status: expectedStatus,
            memberStatus: expectedStatus,
            updatedAt: now,
            updatedBy: actorUid,
            lifecycle: {
              status: expectedStatus,
              lastAction: "reconcile",
              lastChangedAt: now,
              lastChangedBy: actorUid,
            },
          },
          { merge: true },
        );
        batch.set(
          memberRef,
          {
            status: expectedStatus,
            auth: {
              disabled: authRecord.disabled === true,
            },
            legacy: {
              status: expectedStatus,
              memberStatus: expectedStatus,
            },
            flags: {
              disabledMismatch: false,
            },
            updatedAt: now,
            updatedBy: actorUid,
          },
          { merge: true },
        );
        batch.set(auditRef, {
          schemaVersion: 1,
          type: "member.lifecycle.reconcile",
          actorUid,
          actorRole,
          targetUid: uid,
          targetCollection: "users",
          before: mismatchRow,
          after: {
            status: expectedStatus,
            authDisabled: authRecord.disabled === true,
          },
          reason,
          requestId: auditRef.id,
          status: "completed",
          createdAt: now,
          updatedAt: now,
        });
        writeCount += 1;
      }
    }

    if (writeMode && writeCount > 0) {
      await batch.commit();
    }

    return {
      ok: true,
      dryRun: !writeMode,
      checkedCount: checked.length,
      mismatchCount: mismatches.length,
      writeCount: writeMode ? writeCount : 0,
      mismatches,
      errors,
    };
  },
);

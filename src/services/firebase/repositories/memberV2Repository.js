import { limit, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";
import {
  auditLogsCollectionRef,
  membersV2CollectionRef,
  userUsageDocRef,
} from "../pathBuilders";

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeString = (value, fallback = "") => String(value ?? fallback).trim();

const normalizeTimestampValue = (value) => ({
  raw: value || null,
  ms: toMillis(value),
});

const normalizeMemberV2Record = (data = {}, { id } = {}) => {
  const profile = data.profile && typeof data.profile === "object" ? data.profile : {};
  const usageSummary =
    data.usageSummary && typeof data.usageSummary === "object" ? data.usageSummary : {};
  const presence = data.presence && typeof data.presence === "object" ? data.presence : {};
  const flags = data.flags && typeof data.flags === "object" ? data.flags : {};
  const auth = data.auth && typeof data.auth === "object" ? data.auth : {};
  const legacy = data.legacy && typeof data.legacy === "object" ? data.legacy : {};
  const rbac = data.rbac && typeof data.rbac === "object" ? data.rbac : {};
  const createdAt = normalizeTimestampValue(data.createdAt || auth.creationTime);
  const updatedAt = normalizeTimestampValue(data.updatedAt);
  const lastActiveAt = normalizeTimestampValue(
    usageSummary.lastActiveAt || presence.lastActiveAt || presence.lastHeartbeatAt || presence.lastSeenAt,
  );
  const lastLoginAt = normalizeTimestampValue(usageSummary.lastLoginAt || auth.lastSignInTime);

  return {
    id,
    uid: normalizeString(data.uid || id),
    schemaVersion: Number(data.schemaVersion || 0),
    displayName: normalizeString(data.displayName || data.email || id, "Unknown member"),
    email: normalizeString(data.email),
    phoneNumber: data.phoneNumber || null,
    photoURL: normalizeString(data.photoURL),
    role: normalizeString(data.role || "unknown").toLowerCase(),
    status: normalizeString(data.status || "unknown").toLowerCase(),
    auth: {
      disabled: auth.disabled === true,
      emailVerified: auth.emailVerified === true,
      providerIds: Array.isArray(auth.providerIds) ? auth.providerIds : [],
      creationTime: auth.creationTime || null,
      lastSignInTime: auth.lastSignInTime || null,
    },
    legacy,
    rbac,
    profile,
    usageSummary: {
      enrollmentCount: Number(usageSummary.enrollmentCount || 0),
      missionResponseCount: Number(usageSummary.missionResponseCount || 0),
      totalSessions: Number(usageSummary.totalSessions || 0),
      totalActions: Number(usageSummary.totalActions || 0),
      lastActiveAt: usageSummary.lastActiveAt || null,
      lastLoginAt: usageSummary.lastLoginAt || null,
    },
    presence: {
      state: normalizeString(presence.state || "unknown").toLowerCase(),
      source: normalizeString(presence.source),
      isOnline: presence.isOnline === true,
      isStale: presence.isStale === true,
      online: presence.online === true,
      connectionCount: Number(presence.connectionCount || 0),
      activeConnectionCount: Number(presence.activeConnectionCount || 0),
      lastSeenAt: presence.lastSeenAt || null,
      lastActiveAt: presence.lastActiveAt || null,
      lastHeartbeatAt: presence.lastHeartbeatAt || null,
      aggregatedAt: presence.aggregatedAt || null,
      activePath: normalizeString(presence.activePath),
      sessionId: presence.sessionId || null,
    },
    flags: {
      profileMissing: flags.profileMissing === true,
      usageMissing: flags.usageMissing === true,
      authOnly: flags.authOnly === true,
      orphanProfile: flags.orphanProfile === true,
      stalePresence: flags.stalePresence === true,
      disabledMismatch: flags.disabledMismatch === true,
      roleMismatch: flags.roleMismatch === true,
      requiresReview: flags.requiresReview === true,
    },
    createdAt: createdAt.raw,
    createdAtMs: createdAt.ms,
    updatedAt: updatedAt.raw,
    updatedAtMs: updatedAt.ms,
    lastActiveAtMs: lastActiveAt.ms,
    lastLoginAtMs: lastLoginAt.ms,
    createdBy: normalizeString(data.createdBy),
    updatedBy: normalizeString(data.updatedBy),
  };
};

export const subscribeToMembersV2 = ({ onNext, onError } = {}) =>
  onSnapshot(
    query(membersV2CollectionRef()),
    (snapshot) => {
      const rows = snapshot.docs.map((item) =>
        normalizeMemberV2Record(item.data(), {
          id: item.id,
        }),
      );

      onNext?.(rows);
    },
    onError,
  );

export const subscribeToMemberUsageDetails = (uid, { onNext, onError } = {}) => {
  if (!uid) return () => {};

  return onSnapshot(
    userUsageDocRef(uid),
    (snapshot) => {
      onNext?.(
        snapshot.exists()
          ? {
              id: snapshot.id,
              ...snapshot.data(),
            }
          : null,
      );
    },
    onError,
  );
};

export const subscribeToMemberAuditLogs = (uid, { onNext, onError } = {}) => {
  if (!uid) return () => {};

  return onSnapshot(
    query(auditLogsCollectionRef(), where("targetUid", "==", uid), limit(25)),
    (snapshot) => {
      const rows = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
          createdAtMs: toMillis(item.data()?.createdAt),
        }))
        .sort((left, right) => (right.createdAtMs || 0) - (left.createdAtMs || 0));

      onNext?.(rows);
    },
    onError,
  );
};

export const updateMemberProfileV2 = async ({
  targetUid,
  profile,
  reason,
  baseMembersV2UpdatedAtMs,
} = {}) => {
  const callable = httpsCallable(functions, "adminUpdateMemberProfileV2");
  const response = await callable({
    targetUid,
    profile,
    reason,
    baseMembersV2UpdatedAtMs,
  });

  return response.data;
};

export const suspendMemberV2 = async ({ targetUid, reason } = {}) => {
  const callable = httpsCallable(functions, "suspendMember");
  const response = await callable({
    targetUid,
    reason,
  });

  return response.data;
};

export const restoreMemberV2 = async ({ targetUid, reason } = {}) => {
  const callable = httpsCallable(functions, "restoreMember");
  const response = await callable({
    targetUid,
    reason,
  });

  return response.data;
};

export const softDeleteMemberV2 = async ({ targetUid, reason } = {}) => {
  const callable = httpsCallable(functions, "softDeleteMember");
  const response = await callable({
    targetUid,
    reason,
  });

  return response.data;
};

export const hardDeleteMemberV2 = async ({
  targetUid,
  reason,
  write = false,
  confirm = "",
  secondConfirm = "",
  confirmationValue = "",
  dryRunReviewed = false,
} = {}) => {
  const callable = httpsCallable(functions, "hardDeleteMember");
  const response = await callable({
    targetUid,
    reason,
    write,
    confirm,
    secondConfirm,
    confirmationValue,
    dryRunReviewed,
  });

  return response.data;
};

export const setUserRoleV2 = async ({
  targetUid,
  role,
  reason,
  confirm = "PHASE8_SET_ROLE",
  baseMembersV2UpdatedAtMs,
} = {}) => {
  const callable = httpsCallable(functions, "setUserRole");
  const response = await callable({
    targetUid,
    role,
    reason,
    confirm,
    baseMembersV2UpdatedAtMs,
  });

  return response.data;
};

export const resetMemberLearningProgressV2 = async ({
  targetUid,
  courseId = "all",
  reason,
  confirm = "MEMBER_LEARNING_RESET",
} = {}) => {
  const callable = httpsCallable(functions, "resetMemberLearningProgress");
  const response = await callable({
    targetUid,
    courseId,
    reason,
    confirm,
  });

  return response.data;
};

export const reconcileMemberLifecycleMismatch = async ({
  targetUid,
  write = false,
  confirm = "",
  reason = "",
  limit: requestedLimit = 100,
} = {}) => {
  const callable = httpsCallable(functions, "reconcileMemberLifecycleMismatch");
  const response = await callable({
    targetUid,
    write,
    confirm,
    reason,
    limit: requestedLimit,
  });

  return response.data;
};

export const formatMemberV2DateTime = (value, fallback = "-") => {
  const ms = toMillis(value);
  if (!ms) return fallback;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
};

export const formatMemberV2RelativeTime = (value, fallback = "-") => {
  const ms = toMillis(value);
  if (!ms) return fallback;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} min ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))} hr ago`;
  return formatMemberV2DateTime(ms, fallback);
};

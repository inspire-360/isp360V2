import { Timestamp } from "firebase-admin/firestore";
import {
  parseArgs,
  parseTopLevelTimestamp,
  toBoolean,
  toPositiveInteger,
} from "./mission-response-migration-utils.mjs";

export { parseArgs, toBoolean, toPositiveInteger };

export const DEFAULT_MATCH_REQUEST_STATUS = "pending_match";
export const DEFAULT_MATCH_REQUEST_PRIORITY = "medium";
export const DEFAULT_MATCH_RESOURCE_TYPE = "consultation";
export const DEFAULT_MATCH_CLOSED_REASON = "";

const MATCH_REQUEST_STATUSES = new Set(["pending_match", "matched", "completed"]);
const MATCH_REQUEST_PRIORITIES = new Set(["high", "medium", "low"]);
const MATCH_RESOURCE_TYPES = new Set(["consultation", "coaching", "workshop", "resource_pack"]);
const MATCH_CLOSED_REASONS = new Set(["resolved", "follow_up", "handoff", "teacher_withdrew"]);
const MATCH_PREFERRED_FORMATS = new Set(["online", "onsite", "hybrid"]);

const normalizeString = (value = "") => String(value ?? "").trim();

const uniqueStrings = (...values) =>
  Array.from(
    new Set(
      values
        .flat()
        .map((value) => normalizeString(value))
        .filter(Boolean),
    ),
  );

const tokenizeNeedTagCandidates = (value = "") =>
  normalizeString(value)
    .split(/[,/\n|]+/g)
    .map((item) => normalizeString(item).toLowerCase())
    .filter(Boolean);

const normalizeUserRole = (value = "") => {
  const normalized = normalizeString(value).toLowerCase();
  if (["admin", "du admin", "du_admin", "duadmin"].includes(normalized)) return "admin";
  if (["learner", "student"].includes(normalized)) return "learner";
  return normalized || "teacher";
};

const normalizePreferredFormat = (value = "") => {
  const normalized = normalizeString(value).toLowerCase();
  return MATCH_PREFERRED_FORMATS.has(normalized) ? normalized : "online";
};

const normalizePriority = (value = "") => {
  const normalized = normalizeString(value).toLowerCase();
  return MATCH_REQUEST_PRIORITIES.has(normalized) ? normalized : DEFAULT_MATCH_REQUEST_PRIORITY;
};

const normalizeResourceType = (value = "") => {
  const normalized = normalizeString(value).toLowerCase();
  return MATCH_RESOURCE_TYPES.has(normalized) ? normalized : DEFAULT_MATCH_RESOURCE_TYPE;
};

const normalizeStatus = (value = "") => {
  const normalized = normalizeString(value).toLowerCase();
  return MATCH_REQUEST_STATUSES.has(normalized) ? normalized : DEFAULT_MATCH_REQUEST_STATUS;
};

const normalizeClosedReason = ({ value = "", status = DEFAULT_MATCH_REQUEST_STATUS } = {}) => {
  const normalized = normalizeString(value).toLowerCase();
  if (MATCH_CLOSED_REASONS.has(normalized)) return normalized;
  return normalizeStatus(status) === "completed" ? "resolved" : DEFAULT_MATCH_CLOSED_REASON;
};

const inferSourceProvider = (record = {}) => {
  if (normalizeString(record.sourceProvider)) return normalizeString(record.sourceProvider);
  if (normalizeString(record.lineUserId)) return "line";
  if (normalizeString(record.updatedBy) === "bootstrap-admin-script") return "admin_bootstrap";
  if (normalizeString(record.email)) return "email";
  return "app";
};

const buildDisplayName = ({ userRecord = {}, fallbackName = "", fallbackId = "" } = {}) =>
  normalizeString(
    userRecord.name
      || [userRecord.prefix, userRecord.firstName, userRecord.lastName].filter(Boolean).join(" ")
      || userRecord.displayName
      || userRecord.email?.split("@")[0]
      || fallbackName
      || fallbackId,
  );

const toTimestamp = (...values) => {
  for (const value of values) {
    const parsed = parseTopLevelTimestamp(value);
    if (parsed instanceof Timestamp) return parsed;
  }

  return null;
};

export const buildNeedTags = ({
  requestTitle = "",
  desiredExpertise = "",
  requestDetails = "",
  needTags = [],
} = {}) =>
  uniqueStrings(
    Array.isArray(needTags) ? needTags.map((item) => normalizeString(item).toLowerCase()) : [],
    tokenizeNeedTagCandidates(desiredExpertise),
    tokenizeNeedTagCandidates(requestTitle),
    tokenizeNeedTagCandidates(requestDetails).slice(0, 4),
  ).slice(0, 8);

export const buildRequesterProfileSnapshot = ({
  requesterId = "",
  requesterName = "",
  requesterRole = "teacher",
  schoolName = "",
  userRecord = {},
} = {}) => ({
  name: buildDisplayName({
    userRecord,
    fallbackName: requesterName,
    fallbackId: requesterId,
  }),
  role: normalizeUserRole(requesterRole || userRecord.role || "teacher"),
  school: normalizeString(userRecord.school || schoolName),
  position: normalizeString(userRecord.position),
  memberStatus: normalizeString(userRecord.memberStatus || userRecord.status || "active") || "active",
  sourceProvider: inferSourceProvider(userRecord),
});

export const buildMatchedExpertSnapshot = ({
  expertId = "",
  expertRecord = {},
  requestRecord = {},
} = {}) => {
  const normalizedExpertId = normalizeString(expertId || requestRecord.matchedExpertId);
  if (!normalizedExpertId) return {};

  const serviceModes = Array.isArray(expertRecord.serviceModes)
    ? expertRecord.serviceModes.map((item) => normalizeString(item).toLowerCase()).filter(Boolean)
    : [];
  const expertiseTags = Array.isArray(expertRecord.expertiseTags)
    ? expertRecord.expertiseTags.map((item) => normalizeString(item).toLowerCase()).filter(Boolean)
    : [];

  return {
    id: normalizedExpertId,
    name: normalizeString(
      expertRecord.displayName || expertRecord.name || requestRecord.matchedExpertName,
    ),
    title: normalizeString(expertRecord.title || requestRecord.matchedExpertTitle),
    organization: normalizeString(expertRecord.organization),
    primaryExpertise: normalizeString(
      expertRecord.primaryExpertise || requestRecord.matchedExpertPrimaryExpertise,
    ),
    region: normalizeString(expertRecord.region),
    serviceModes,
    expertiseTags,
    capacityStatus: normalizeString(expertRecord.capacityStatus || "available") || "available",
  };
};

const buildLatestUpdateText = ({
  status = DEFAULT_MATCH_REQUEST_STATUS,
  latestUpdateText = "",
  matchedExpertName = "",
} = {}) => {
  const existingText = normalizeString(latestUpdateText);
  if (existingText) return existingText;

  if (status === "completed") {
    return matchedExpertName
      ? `Closed after coordinating with ${matchedExpertName}.`
      : "Closed this request.";
  }

  if (status === "matched") {
    return matchedExpertName
      ? `Matched with ${matchedExpertName}.`
      : "DU team is coordinating an expert.";
  }

  return "DU team received the request and is reviewing the best expert fit.";
};

const toComparableValue = (value) => {
  if (value == null) return value;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toComparableValue(item));

  if (typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = toComparableValue(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

export const buildMatchRequestContractPatch = ({
  id = "",
  record = {},
  userRecord = {},
  expertRecord = {},
  fallbackNow = Timestamp.now(),
} = {}) => {
  const status = normalizeStatus(record.status);
  const requesterId = normalizeString(record.requesterId);
  const requesterName = normalizeString(record.requesterName);
  const schoolName = normalizeString(record.schoolName);
  const matchedExpertId = normalizeString(record.matchedExpertId);
  const matchedExpertName = normalizeString(
    expertRecord.displayName || expertRecord.name || record.matchedExpertName,
  );
  const createdAt = toTimestamp(record.createdAt, record.updatedAt, record.matchedAt, record.completedAt, fallbackNow);
  const updatedAt = toTimestamp(record.updatedAt, record.completedAt, record.matchedAt, createdAt, fallbackNow);
  const matchedAt = status === "pending_match"
    ? null
    : toTimestamp(record.matchedAt, updatedAt, createdAt, fallbackNow);
  const completedAt = status === "completed"
    ? toTimestamp(record.completedAt, updatedAt, matchedAt, fallbackNow)
    : null;

  const target = {
    requesterId,
    requesterName: requesterName || buildDisplayName({
      userRecord,
      fallbackId: requesterId,
    }),
    requesterRole: normalizeUserRole(record.requesterRole || userRecord.role || "teacher"),
    schoolName: schoolName || normalizeString(userRecord.school),
    requestTitle: normalizeString(record.requestTitle),
    desiredExpertise: normalizeString(record.desiredExpertise),
    preferredFormat: normalizePreferredFormat(record.preferredFormat),
    requestDetails: normalizeString(record.requestDetails),
    priority: normalizePriority(record.priority),
    resourceType: normalizeResourceType(record.resourceType),
    needTags: buildNeedTags({
      requestTitle: record.requestTitle,
      desiredExpertise: record.desiredExpertise,
      requestDetails: record.requestDetails,
      needTags: Array.isArray(record.needTags) ? record.needTags : [],
    }),
    requesterProfileSnapshot: buildRequesterProfileSnapshot({
      requesterId,
      requesterName,
      requesterRole: record.requesterRole,
      schoolName,
      userRecord,
    }),
    status,
    createdAt,
    updatedAt,
    matchedExpertId: status === "pending_match" ? "" : matchedExpertId,
    matchedExpertName: status === "pending_match" ? "" : matchedExpertName,
    matchedExpertTitle: status === "pending_match"
      ? ""
      : normalizeString(expertRecord.title || record.matchedExpertTitle),
    matchedExpertPrimaryExpertise: status === "pending_match"
      ? ""
      : normalizeString(expertRecord.primaryExpertise || record.matchedExpertPrimaryExpertise),
    matchedExpertSnapshot: status === "pending_match"
      ? {}
      : buildMatchedExpertSnapshot({
        expertId: matchedExpertId,
        expertRecord,
        requestRecord: record,
      }),
    matchedByAdminId: status === "pending_match" ? "" : normalizeString(record.matchedByAdminId),
    matchedByAdminName: status === "pending_match" ? "" : normalizeString(record.matchedByAdminName),
    matchedAt,
    completedAt,
    closedReason: normalizeClosedReason({
      value: record.closedReason,
      status,
    }),
    adminNote: normalizeString(record.adminNote),
    latestUpdateText: buildLatestUpdateText({
      status,
      latestUpdateText: record.latestUpdateText,
      matchedExpertName,
    }),
  };

  const patch = Object.entries(target).reduce((accumulator, [key, value]) => {
    const currentComparable = JSON.stringify(toComparableValue(record[key]));
    const nextComparable = JSON.stringify(toComparableValue(value));
    if (currentComparable !== nextComparable) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  return { patch, target };
};

export const buildMatchRequestQualityReport = ({ id = "", record = {} } = {}) => {
  const requesterProfileSnapshot =
    record.requesterProfileSnapshot && typeof record.requesterProfileSnapshot === "object"
      ? record.requesterProfileSnapshot
      : {};
  const matchedExpertSnapshot =
    record.matchedExpertSnapshot && typeof record.matchedExpertSnapshot === "object"
      ? record.matchedExpertSnapshot
      : {};
  const status = normalizeStatus(record.status);
  const needTags = Array.isArray(record.needTags) ? record.needTags : [];

  return {
    id,
    missingRequesterId: !normalizeString(record.requesterId),
    missingRequesterSnapshot:
      !normalizeString(requesterProfileSnapshot.name)
      || !normalizeString(requesterProfileSnapshot.role)
      || !normalizeString(requesterProfileSnapshot.memberStatus)
      || !normalizeString(requesterProfileSnapshot.sourceProvider),
    invalidPriority: normalizePriority(record.priority) !== normalizeString(record.priority).toLowerCase(),
    invalidResourceType:
      normalizeResourceType(record.resourceType) !== normalizeString(record.resourceType).toLowerCase(),
    missingNeedTags: needTags.length === 0,
    invalidStatus: normalizeStatus(record.status) !== normalizeString(record.status).toLowerCase(),
    missingMatchedExpertSnapshot:
      status !== "pending_match"
      && (!normalizeString(matchedExpertSnapshot.id) || !normalizeString(matchedExpertSnapshot.name)),
    completedWithoutClosedReason:
      status === "completed" && !normalizeString(record.closedReason),
    snapshotFlatMismatch:
      (normalizeString(requesterProfileSnapshot.name) && normalizeString(record.requesterName)
        && normalizeString(requesterProfileSnapshot.name) !== normalizeString(record.requesterName))
      || (normalizeString(requesterProfileSnapshot.school) && normalizeString(record.schoolName)
        && normalizeString(requesterProfileSnapshot.school) !== normalizeString(record.schoolName))
      || (status !== "pending_match"
        && normalizeString(matchedExpertSnapshot.id)
        && normalizeString(record.matchedExpertId)
        && normalizeString(matchedExpertSnapshot.id) !== normalizeString(record.matchedExpertId)),
  };
};

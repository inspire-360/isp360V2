import {
  DEFAULT_MATCH_CLOSED_REASON,
  DEFAULT_MATCH_REQUEST_PRIORITY,
  DEFAULT_MATCH_REQUEST_STATUS,
  DEFAULT_MATCH_RESOURCE_TYPE,
  buildRequestNeedTags,
  normalizeClosedReason,
  normalizeMarketplaceExpertName,
  normalizeMatchRequestStatus,
  normalizePreferredFormat,
  normalizeRequestPriority,
  normalizeResourceType,
} from "../../../data/resourceMatchmaking";
import { normalizeUserRole } from "../../../utils/userRoles";
import { resolveTimestampMillis } from "../timestamps";

const normalizeString = (value = "") => String(value || "").trim();

const uniqueStrings = (...values) =>
  Array.from(
    new Set(
      values
        .flat()
        .map((value) => normalizeString(value))
        .filter(Boolean),
    ),
  );

const buildDisplayName = ({
  currentUser = null,
  userProfile = null,
  userRole = "",
  fallbackName = "",
} = {}) =>
  normalizeString(
    userProfile?.name
      || [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName]
        .filter(Boolean)
        .join(" ")
      || currentUser?.displayName
      || currentUser?.email?.split("@")[0]
      || fallbackName
      || (normalizeUserRole(userRole) === "admin" ? "ผู้ดูแล DU" : "ครู"),
  );

export const buildRequesterProfileSnapshot = ({
  currentUser = null,
  userProfile = null,
  userRole = "",
  fallbackName = "",
} = {}) => ({
  name: buildDisplayName({
    currentUser,
    userProfile,
    userRole,
    fallbackName,
  }),
  role: normalizeUserRole(userRole || userProfile?.role || "teacher"),
  school: normalizeString(userProfile?.school),
  position: normalizeString(userProfile?.position),
  memberStatus: normalizeString(userProfile?.memberStatus || "active"),
  sourceProvider: normalizeString(userProfile?.sourceProvider || "app"),
});

export const buildMatchedExpertSnapshot = (expert = {}) => ({
  id: normalizeString(expert.id),
  name: normalizeMarketplaceExpertName(expert.displayName || expert.name),
  title: normalizeString(expert.title),
  organization: normalizeString(expert.organization),
  primaryExpertise: normalizeString(expert.primaryExpertise),
  region: normalizeString(expert.region),
  serviceModes: Array.isArray(expert.serviceModes)
    ? expert.serviceModes.map((item) => normalizeString(item)).filter(Boolean)
    : [],
  expertiseTags: Array.isArray(expert.expertiseTags)
    ? expert.expertiseTags.map((item) => normalizeString(item)).filter(Boolean)
    : [],
  capacityStatus: normalizeString(expert.capacityStatus || "available"),
});

export const normalizeExpertMatchRecord = (record = {}, context = {}) => ({
  ...record,
  id: context.id || normalizeString(record.id),
  displayName: normalizeMarketplaceExpertName(record.displayName || record.name),
  title: normalizeString(record.title),
  organization: normalizeString(record.organization),
  primaryExpertise: normalizeString(record.primaryExpertise),
  expertiseTags: uniqueStrings(Array.isArray(record.expertiseTags) ? record.expertiseTags : []),
  serviceModes: Array.isArray(record.serviceModes)
    ? record.serviceModes.map((item) => normalizeString(item)).filter(Boolean)
    : ["online", "onsite", "hybrid"],
  region: normalizeString(record.region),
  bio: normalizeString(record.bio),
  contactEmail: normalizeString(record.contactEmail),
  contactLine: normalizeString(record.contactLine),
  isActive: record.isActive !== false,
  capacityStatus: normalizeString(record.capacityStatus || "available"),
});

export const normalizeMatchRequestRecord = (record = {}, context = {}) => {
  const requesterProfileSnapshot = record.requesterProfileSnapshot || {};
  const matchedExpertSnapshot = record.matchedExpertSnapshot || {};
  const requestTitle = normalizeString(record.requestTitle);
  const desiredExpertise = normalizeString(record.desiredExpertise);
  const requestDetails = normalizeString(record.requestDetails);
  const needTags = buildRequestNeedTags({
    desiredExpertise,
    requestTitle,
    requestDetails,
    needTags: Array.isArray(record.needTags) ? record.needTags : [],
  });

  return {
    ...record,
    id: context.id || normalizeString(record.id),
    requesterId: normalizeString(record.requesterId),
    requesterName: normalizeString(
      record.requesterName || requesterProfileSnapshot.name || "ครูผู้ส่งคำร้อง",
    ),
    requesterRole: normalizeUserRole(record.requesterRole || requesterProfileSnapshot.role || "teacher"),
    schoolName: normalizeString(record.schoolName || requesterProfileSnapshot.school),
    requestTitle,
    desiredExpertise,
    preferredFormat: normalizePreferredFormat(record.preferredFormat),
    requestDetails,
    priority: normalizeRequestPriority(record.priority || DEFAULT_MATCH_REQUEST_PRIORITY),
    resourceType: normalizeResourceType(record.resourceType || DEFAULT_MATCH_RESOURCE_TYPE),
    needTags,
    requesterProfileSnapshot: {
      name: normalizeString(requesterProfileSnapshot.name || record.requesterName),
      role: normalizeUserRole(requesterProfileSnapshot.role || record.requesterRole || "teacher"),
      school: normalizeString(requesterProfileSnapshot.school || record.schoolName),
      position: normalizeString(requesterProfileSnapshot.position),
      memberStatus: normalizeString(requesterProfileSnapshot.memberStatus || "active"),
      sourceProvider: normalizeString(requesterProfileSnapshot.sourceProvider || "app"),
    },
    status: normalizeMatchRequestStatus(record.status || DEFAULT_MATCH_REQUEST_STATUS),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    matchedExpertId: normalizeString(
      record.matchedExpertId || matchedExpertSnapshot.id,
    ),
    matchedExpertName: normalizeString(
      record.matchedExpertName || matchedExpertSnapshot.name,
    ),
    matchedExpertTitle: normalizeString(
      record.matchedExpertTitle || matchedExpertSnapshot.title,
    ),
    matchedExpertPrimaryExpertise: normalizeString(
      record.matchedExpertPrimaryExpertise || matchedExpertSnapshot.primaryExpertise,
    ),
    matchedExpertSnapshot: {
      id: normalizeString(matchedExpertSnapshot.id || record.matchedExpertId),
      name: normalizeString(matchedExpertSnapshot.name || record.matchedExpertName),
      title: normalizeString(matchedExpertSnapshot.title || record.matchedExpertTitle),
      organization: normalizeString(matchedExpertSnapshot.organization),
      primaryExpertise: normalizeString(
        matchedExpertSnapshot.primaryExpertise || record.matchedExpertPrimaryExpertise,
      ),
      region: normalizeString(matchedExpertSnapshot.region),
      serviceModes: Array.isArray(matchedExpertSnapshot.serviceModes)
        ? matchedExpertSnapshot.serviceModes.map((item) => normalizeString(item)).filter(Boolean)
        : [],
      expertiseTags: Array.isArray(matchedExpertSnapshot.expertiseTags)
        ? matchedExpertSnapshot.expertiseTags.map((item) => normalizeString(item)).filter(Boolean)
        : [],
      capacityStatus: normalizeString(matchedExpertSnapshot.capacityStatus),
    },
    matchedByAdminId: normalizeString(record.matchedByAdminId),
    matchedByAdminName: normalizeString(record.matchedByAdminName),
    matchedAt: record.matchedAt || null,
    completedAt: record.completedAt || null,
    closedReason: normalizeClosedReason(record.closedReason || DEFAULT_MATCH_CLOSED_REASON),
    adminNote: normalizeString(record.adminNote),
    latestUpdateText: normalizeString(record.latestUpdateText),
    updatedAtMs: resolveTimestampMillis(record.updatedAt || record.matchedAt || record.createdAt),
  };
};

export const buildTeacherMatchRequestCreateData = ({
  currentUser = null,
  userProfile = null,
  userRole = "",
  requestTitle = "",
  desiredExpertise = "",
  preferredFormat = "online",
  priority = DEFAULT_MATCH_REQUEST_PRIORITY,
  resourceType = DEFAULT_MATCH_RESOURCE_TYPE,
  requestDetails = "",
  needTags = [],
} = {}) => {
  const requesterProfileSnapshot = buildRequesterProfileSnapshot({
    currentUser,
    userProfile,
    userRole,
  });

  return {
    requesterId: normalizeString(currentUser?.uid),
    requesterName: requesterProfileSnapshot.name,
    requesterRole: "teacher",
    schoolName: requesterProfileSnapshot.school,
    requestTitle: normalizeString(requestTitle),
    desiredExpertise: normalizeString(desiredExpertise),
    preferredFormat: normalizePreferredFormat(preferredFormat),
    requestDetails: normalizeString(requestDetails),
    priority: normalizeRequestPriority(priority),
    resourceType: normalizeResourceType(resourceType),
    needTags: buildRequestNeedTags({
      desiredExpertise,
      requestTitle,
      requestDetails,
      needTags,
    }),
    requesterProfileSnapshot,
    status: DEFAULT_MATCH_REQUEST_STATUS,
    matchedExpertId: "",
    matchedExpertName: "",
    matchedExpertTitle: "",
    matchedExpertPrimaryExpertise: "",
    matchedExpertSnapshot: {},
    matchedByAdminId: "",
    matchedByAdminName: "",
    matchedAt: null,
    completedAt: null,
    closedReason: DEFAULT_MATCH_CLOSED_REASON,
    adminNote: "",
    latestUpdateText: "ทีม DU รับคำร้องแล้วและกำลังคัดผู้เชี่ยวชาญที่เหมาะสม",
  };
};

export const buildMatchRequestAssignmentData = ({
  request = {},
  expert = {},
  adminUser = null,
  adminProfile = null,
  adminRole = "admin",
  adminNote = "",
} = {}) => {
  const normalizedRequest = normalizeMatchRequestRecord(request);
  const matchedExpertSnapshot = buildMatchedExpertSnapshot(expert);

  return {
    requesterId: normalizedRequest.requesterId,
    requesterName: normalizedRequest.requesterName,
    requesterRole: normalizedRequest.requesterRole,
    schoolName: normalizedRequest.schoolName,
    requestTitle: normalizedRequest.requestTitle,
    desiredExpertise: normalizedRequest.desiredExpertise,
    preferredFormat: normalizedRequest.preferredFormat,
    requestDetails: normalizedRequest.requestDetails,
    priority: normalizedRequest.priority,
    resourceType: normalizedRequest.resourceType,
    needTags: normalizedRequest.needTags,
    requesterProfileSnapshot: normalizedRequest.requesterProfileSnapshot,
    status: "matched",
    matchedExpertId: matchedExpertSnapshot.id,
    matchedExpertName: matchedExpertSnapshot.name,
    matchedExpertTitle: matchedExpertSnapshot.title,
    matchedExpertPrimaryExpertise: matchedExpertSnapshot.primaryExpertise,
    matchedExpertSnapshot,
    matchedByAdminId: normalizeString(adminUser?.uid),
    matchedByAdminName: buildDisplayName({
      currentUser: adminUser,
      userProfile: adminProfile,
      userRole: adminRole,
      fallbackName: "ทีม DU",
    }),
    matchedAt: normalizedRequest.matchedAt || null,
    completedAt: null,
    closedReason: DEFAULT_MATCH_CLOSED_REASON,
    adminNote: normalizeString(adminNote),
    latestUpdateText: `จับคู่กับ ${matchedExpertSnapshot.name || "ผู้เชี่ยวชาญ"} แล้ว`,
  };
};

export const buildMatchRequestCompletionData = ({
  request = {},
  adminNote = "",
  closedReason = "resolved",
} = {}) => {
  const normalizedRequest = normalizeMatchRequestRecord(request);
  const latestUpdateText = normalizedRequest.matchedExpertName
    ? `ปิดงานหลังประสานกับ ${normalizedRequest.matchedExpertName} แล้ว`
    : "ปิดงานคำร้องนี้แล้ว";

  return {
    requesterId: normalizedRequest.requesterId,
    requesterName: normalizedRequest.requesterName,
    requesterRole: normalizedRequest.requesterRole,
    schoolName: normalizedRequest.schoolName,
    requestTitle: normalizedRequest.requestTitle,
    desiredExpertise: normalizedRequest.desiredExpertise,
    preferredFormat: normalizedRequest.preferredFormat,
    requestDetails: normalizedRequest.requestDetails,
    priority: normalizedRequest.priority,
    resourceType: normalizedRequest.resourceType,
    needTags: normalizedRequest.needTags,
    requesterProfileSnapshot: normalizedRequest.requesterProfileSnapshot,
    status: "completed",
    matchedExpertId: normalizedRequest.matchedExpertId,
    matchedExpertName: normalizedRequest.matchedExpertName,
    matchedExpertTitle: normalizedRequest.matchedExpertTitle,
    matchedExpertPrimaryExpertise: normalizedRequest.matchedExpertPrimaryExpertise,
    matchedExpertSnapshot: normalizedRequest.matchedExpertSnapshot,
    matchedByAdminId: normalizedRequest.matchedByAdminId,
    matchedByAdminName: normalizedRequest.matchedByAdminName,
    matchedAt: normalizedRequest.matchedAt || null,
    completedAt: normalizedRequest.completedAt || null,
    closedReason: normalizeClosedReason(closedReason || "resolved"),
    adminNote: normalizeString(adminNote),
    latestUpdateText,
  };
};

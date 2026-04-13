import { Timestamp } from "firebase-admin/firestore";
import { parseArgs, parseTopLevelTimestamp, toBoolean, toPositiveInteger } from "./mission-response-migration-utils.mjs";

export { parseArgs, toBoolean, toPositiveInteger };

export const USER_PROFILE_VERSION = 2;
export const DEFAULT_MEMBER_STATUS = "active";

const DEFAULT_PROFILE_PREFIX = "คุณ";
const DEFAULT_TEACHER_POSITION = "ครู";

const normalizeString = (value = "") => String(value ?? "").trim();

export const normalizeUserRole = (role = "") => {
  const normalized = normalizeString(role).toLowerCase();
  if (["admin", "du admin", "du_admin"].includes(normalized)) return "admin";
  if (normalized === "teacher") return "teacher";
  if (["student", "learner"].includes(normalized)) return "learner";
  return normalized || "learner";
};

export const resolveDefaultActivePathForRole = (role = "") => {
  const normalizedRole = normalizeUserRole(role);
  if (normalizedRole === "admin") return "/du/admin";
  if (normalizedRole === "learner") return "/dashboard";
  return "/course/teacher";
};

const resolveDefaultPositionForRole = (role = "") =>
  normalizeUserRole(role) === "teacher" ? DEFAULT_TEACHER_POSITION : "";

const splitDisplayName = (displayName = "") => {
  const parts = normalizeString(displayName).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

const buildDisplayName = ({ prefix = "", firstName = "", lastName = "", fallbackName = "", email = "" } = {}) => {
  const compactFirstName = `${normalizeString(prefix)}${normalizeString(firstName)}`.trim();
  const joinedName = [compactFirstName, normalizeString(lastName)].filter(Boolean).join(" ").trim();
  return joinedName || normalizeString(fallbackName) || normalizeString(email);
};

const inferSourceProvider = (record = {}, normalizedRole = "teacher") => {
  if (normalizeString(record.sourceProvider)) return normalizeString(record.sourceProvider);
  if (normalizeString(record.lineUserId)) return "line";
  if (normalizeString(record.updatedBy) === "bootstrap-admin-script") return "admin_bootstrap";
  if (normalizedRole === "admin" && normalizeString(record.activePath) === "/du/admin") {
    return "admin_bootstrap";
  }
  if (normalizeString(record.email)) return "email";
  return "unknown";
};

const toTimestamp = (...values) => {
  for (const value of values) {
    const parsed = parseTopLevelTimestamp(value);
    if (parsed instanceof Timestamp) return parsed;
  }
  return null;
};

export const buildUserProfileContractPatch = ({ id = "", record = {}, fallbackNow = Timestamp.now() } = {}) => {
  const role = normalizeUserRole(record.role);
  const derivedNameParts = splitDisplayName(record.name);
  const prefix = normalizeString(record.prefix) || DEFAULT_PROFILE_PREFIX;
  const firstName = normalizeString(record.firstName) || derivedNameParts.firstName;
  const lastName = normalizeString(record.lastName) || derivedNameParts.lastName;
  const email = normalizeString(record.email);
  const name = buildDisplayName({
    prefix,
    firstName,
    lastName,
    fallbackName: record.name,
    email,
  });
  const createdAt = toTimestamp(record.createdAt, record.updatedAt, record.lastLoginAt, record.lastLogin, fallbackNow);
  const updatedAt = toTimestamp(record.updatedAt, record.lastLoginAt, record.lastLogin, createdAt, fallbackNow);
  const lastLoginAt = toTimestamp(record.lastLoginAt, record.lastLogin, updatedAt, createdAt, fallbackNow);
  const lastLogin = toTimestamp(record.lastLogin, record.lastLoginAt, updatedAt, createdAt, fallbackNow);
  const pdpaAccepted = typeof record.pdpaAccepted === "boolean" ? record.pdpaAccepted : true;
  const pdpaAcceptedAt = toTimestamp(record.pdpaAcceptedAt, lastLoginAt, createdAt, updatedAt, fallbackNow);

  const target = {
    uid: normalizeString(record.uid) || id,
    prefix,
    firstName,
    lastName,
    name,
    position: normalizeString(record.position) || resolveDefaultPositionForRole(role),
    school: normalizeString(record.school),
    email,
    role,
    activePath: normalizeString(record.activePath) || resolveDefaultActivePathForRole(role),
    progress:
      typeof record.progress === "number" && Number.isFinite(record.progress) ? record.progress : 0,
    progressPercent:
      typeof record.progressPercent === "number" && Number.isFinite(record.progressPercent)
        ? record.progressPercent
        : 0,
    status: normalizeString(record.status) || DEFAULT_MEMBER_STATUS,
    photoURL: normalizeString(record.photoURL),
    createdAt,
    updatedAt,
    lastLogin,
    lastLoginAt,
    memberStatus: normalizeString(record.memberStatus || record.status) || DEFAULT_MEMBER_STATUS,
    sourceProvider: inferSourceProvider(record, role),
    profileVersion:
      typeof record.profileVersion === "number" && Number.isFinite(record.profileVersion)
        ? record.profileVersion
        : USER_PROFILE_VERSION,
    pdpaAccepted,
    pdpaAcceptedAt,
    badges: Array.isArray(record.badges) ? record.badges : [],
    lineUserId: normalizeString(record.lineUserId),
  };

  const patch = Object.entries(target).reduce((accumulator, [key, value]) => {
    const currentComparable = JSON.stringify(record[key] instanceof Timestamp ? record[key].toDate().toISOString() : record[key]);
    const nextComparable = JSON.stringify(value instanceof Timestamp ? value.toDate().toISOString() : value);
    if (currentComparable !== nextComparable) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});

  return { patch, target };
};

export const buildUserProfileQualityReport = ({ id = "", record = {} } = {}) => {
  const role = normalizeUserRole(record.role);
  const hasName = Boolean(normalizeString(record.name));
  const hasActivePath = Boolean(normalizeString(record.activePath));
  const hasMemberStatus = Boolean(normalizeString(record.memberStatus));
  const hasSourceProvider = Boolean(normalizeString(record.sourceProvider));
  const hasLastLoginAt = Boolean(toTimestamp(record.lastLoginAt));
  const validProfileVersion =
    typeof record.profileVersion === "number" && Number.isFinite(record.profileVersion) && record.profileVersion >= USER_PROFILE_VERSION;

  return {
    id,
    uidMismatch: normalizeString(record.uid) !== id,
    invalidRole: !["admin", "teacher", "learner"].includes(role),
    missingName: !hasName,
    missingActivePath: !hasActivePath,
    missingMemberStatus: !hasMemberStatus,
    missingSourceProvider: !hasSourceProvider,
    missingLastLoginAt: !hasLastLoginAt,
    invalidProfileVersion: !validProfileVersion,
  };
};

import { normalizeUserRole } from "../../../utils/userRoles";
import { timestampNow } from "../timestamps";

export const DEFAULT_TEACHER_ROLE = "teacher";
export const DEFAULT_TEACHER_ACTIVE_PATH = "/course/teacher";
export const DEFAULT_TEACHER_POSITION = "ครู";
export const DEFAULT_PROFILE_PREFIX = "คุณ";
export const DEFAULT_MEMBER_STATUS = "active";
export const USER_PROFILE_VERSION = 2;
export const LEGACY_PROFILE_PROGRESS = 0;
export const LEGACY_PROFILE_STATUS = "active";

export const splitDisplayName = (displayName = "") => {
  const parts = String(displayName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

export const buildUserDisplayName = ({
  prefix = "",
  firstName = "",
  lastName = "",
  fallbackName = "",
  email = "",
}) => {
  const normalizedPrefix = String(prefix || "").trim();
  const normalizedFirstName = String(firstName || "").trim();
  const normalizedLastName = String(lastName || "").trim();
  const compactFirstName = `${normalizedPrefix}${normalizedFirstName}`.trim();
  const joinedName = [compactFirstName, normalizedLastName].filter(Boolean).join(" ").trim();

  return joinedName || String(fallbackName || "").trim() || String(email || "").trim();
};

const inferSourceProvider = ({ authUser, lineUserId = "", explicitSource = "" } = {}) => {
  if (String(explicitSource || "").trim()) return String(explicitSource).trim();
  if (String(lineUserId || "").trim()) return "line";

  const providerId = authUser?.providerData?.[0]?.providerId || "";

  if (providerId === "password") return "email";
  if (providerId === "google.com") return "google";
  if (providerId === "line" || providerId === "oidc.line") return "line";

  return "email";
};

const resolveString = (...values) =>
  values
    .map((value) => String(value ?? "").trim())
    .find(Boolean) || "";

export const normalizeUserProfileRecord = (record = {}, { id = "", authUser = null } = {}) => {
  const uid = resolveString(record.uid, id, authUser?.uid);
  const prefix = resolveString(record.prefix, DEFAULT_PROFILE_PREFIX);
  const derivedNameParts = splitDisplayName(record.name);
  const firstName = resolveString(record.firstName, derivedNameParts.firstName);
  const lastName = resolveString(record.lastName, derivedNameParts.lastName);
  const email = resolveString(record.email, authUser?.email);
  const role = normalizeUserRole(record.role || DEFAULT_TEACHER_ROLE);
  const photoURL = resolveString(record.photoURL, authUser?.photoURL);
  const name = buildUserDisplayName({
    prefix,
    firstName,
    lastName,
    fallbackName: resolveString(record.name, authUser?.displayName),
    email,
  });

  return {
    ...record,
    id: resolveString(record.id, id, uid),
    uid,
    prefix,
    firstName,
    lastName,
    name,
    position: resolveString(record.position, DEFAULT_TEACHER_POSITION),
    school: resolveString(record.school),
    email,
    role,
    activePath: resolveString(record.activePath, DEFAULT_TEACHER_ACTIVE_PATH),
    photoURL,
    lineUserId: resolveString(record.lineUserId),
    pdpaAccepted: typeof record.pdpaAccepted === "boolean" ? record.pdpaAccepted : true,
    pdpaAcceptedAt: record.pdpaAcceptedAt || null,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    lastLogin: record.lastLogin || record.lastLoginAt || null,
    lastLoginAt: record.lastLoginAt || record.lastLogin || null,
    memberStatus: resolveString(record.memberStatus, record.status, DEFAULT_MEMBER_STATUS),
    sourceProvider: inferSourceProvider({
      authUser,
      lineUserId: record.lineUserId,
      explicitSource: record.sourceProvider,
    }),
    profileVersion:
      typeof record.profileVersion === "number" && Number.isFinite(record.profileVersion)
        ? record.profileVersion
        : USER_PROFILE_VERSION,
  };
};

export const buildAuthFallbackUserProfile = (authUser) =>
  normalizeUserProfileRecord(
    {
      uid: authUser?.uid || "",
      email: authUser?.email || "",
      name: authUser?.displayName || authUser?.email || "",
      role: DEFAULT_TEACHER_ROLE,
      activePath: DEFAULT_TEACHER_ACTIVE_PATH,
      photoURL: authUser?.photoURL || "",
      pdpaAccepted: true,
      lineUserId: "",
    },
    { id: authUser?.uid || "", authUser },
  );

export const buildTeacherUserProfileCreateData = ({
  user,
  prefix = DEFAULT_PROFILE_PREFIX,
  firstName = "",
  lastName = "",
  position = DEFAULT_TEACHER_POSITION,
  school = "",
  email = "",
  photoURL = "",
  lineUserId = "",
  pdpaAccepted = true,
  role = DEFAULT_TEACHER_ROLE,
  activePath = DEFAULT_TEACHER_ACTIVE_PATH,
}) => {
  const normalizedEmail = resolveString(email, user?.email);
  const normalizedPhotoURL = resolveString(photoURL, user?.photoURL);

  return {
    uid: user?.uid || "",
    prefix: resolveString(prefix, DEFAULT_PROFILE_PREFIX),
    firstName: resolveString(firstName),
    lastName: resolveString(lastName),
    name: buildUserDisplayName({
      prefix,
      firstName,
      lastName,
      fallbackName: user?.displayName,
      email: normalizedEmail,
    }),
    position: resolveString(position, DEFAULT_TEACHER_POSITION),
    school: resolveString(school),
    email: normalizedEmail,
    role: normalizeUserRole(role || DEFAULT_TEACHER_ROLE) || DEFAULT_TEACHER_ROLE,
    activePath: resolveString(activePath, DEFAULT_TEACHER_ACTIVE_PATH),
    progress: LEGACY_PROFILE_PROGRESS,
    progressPercent: LEGACY_PROFILE_PROGRESS,
    status: LEGACY_PROFILE_STATUS,
    photoURL: normalizedPhotoURL,
    createdAt: timestampNow(),
    updatedAt: timestampNow(),
    lastLogin: timestampNow(),
    pdpaAccepted: Boolean(pdpaAccepted),
    pdpaAcceptedAt: timestampNow(),
    badges: [],
    lineUserId: resolveString(lineUserId),
  };
};

export const buildTeacherUserProfileMergeData = (
  existingProfile = {},
  {
    user = null,
    prefix,
    firstName,
    lastName,
    position,
    school,
    photoURL,
    lineUserId,
    pdpaAccepted,
    touchLastLogin = true,
  } = {},
) => {
  const normalizedExisting = normalizeUserProfileRecord(existingProfile, {
    id: existingProfile.id || existingProfile.uid,
    authUser: user,
  });
  const nextPrefix = resolveString(prefix, normalizedExisting.prefix, DEFAULT_PROFILE_PREFIX);
  const nextFirstName = resolveString(firstName, normalizedExisting.firstName);
  const nextLastName = resolveString(lastName, normalizedExisting.lastName);
  const nextPosition = resolveString(position, normalizedExisting.position, DEFAULT_TEACHER_POSITION);
  const nextSchool = resolveString(school, normalizedExisting.school);
  const nextPhotoURL = resolveString(photoURL, normalizedExisting.photoURL, user?.photoURL);
  const nextLineUserId = resolveString(lineUserId, normalizedExisting.lineUserId);
  const nextName = buildUserDisplayName({
    prefix: nextPrefix,
    firstName: nextFirstName,
    lastName: nextLastName,
    fallbackName: resolveString(user?.displayName, normalizedExisting.name),
    email: normalizedExisting.email,
  });

  const patch = {};

  if (nextPrefix !== normalizedExisting.prefix) patch.prefix = nextPrefix;
  if (nextFirstName !== normalizedExisting.firstName) patch.firstName = nextFirstName;
  if (nextLastName !== normalizedExisting.lastName) patch.lastName = nextLastName;
  if (nextName !== normalizedExisting.name) patch.name = nextName;
  if (nextPosition !== normalizedExisting.position) patch.position = nextPosition;
  if (nextSchool !== normalizedExisting.school) patch.school = nextSchool;
  if (nextPhotoURL !== normalizedExisting.photoURL) patch.photoURL = nextPhotoURL;
  if (nextLineUserId !== normalizedExisting.lineUserId) patch.lineUserId = nextLineUserId;

  if (!String(existingProfile.activePath || "").trim()) {
    patch.activePath = DEFAULT_TEACHER_ACTIVE_PATH;
  }
  if (typeof existingProfile.progress !== "number") {
    patch.progress = LEGACY_PROFILE_PROGRESS;
  }
  if (typeof existingProfile.progressPercent !== "number") {
    patch.progressPercent = LEGACY_PROFILE_PROGRESS;
  }
  if (!String(existingProfile.status || "").trim()) {
    patch.status = LEGACY_PROFILE_STATUS;
  }
  if (!Array.isArray(existingProfile.badges)) {
    patch.badges = [];
  }
  if (typeof existingProfile.pdpaAccepted !== "boolean") {
    patch.pdpaAccepted = Boolean(pdpaAccepted ?? true);
  }
  if (
    !existingProfile.pdpaAcceptedAt &&
    (pdpaAccepted === true || typeof existingProfile.pdpaAccepted !== "boolean")
  ) {
    patch.pdpaAcceptedAt = timestampNow();
  }

  if (touchLastLogin) {
    patch.lastLogin = timestampNow();
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = timestampNow();
  }

  return patch;
};

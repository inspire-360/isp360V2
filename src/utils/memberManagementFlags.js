import { isAdminRole, isSuperAdminRole } from "./userRoles";

const trueValues = new Set(["1", "true", "yes", "on", "enabled"]);

const parseBooleanFlag = (value) => trueValues.has(String(value || "").trim().toLowerCase());

const parseBooleanFlagWithDefault = (value, fallback) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (trueValues.has(normalized)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  return fallback;
};

const parseListFlag = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const getMembersV2FlagState = ({ currentUser, userRole } = {}) => {
  const enabled = parseBooleanFlag(import.meta.env.VITE_MEMBERS_V2_ENABLED);
  const allowAllAdmins = parseBooleanFlag(import.meta.env.VITE_MEMBERS_V2_ALLOW_ALL_ADMINS);
  const allowSuperAdmins = parseBooleanFlagWithDefault(
    import.meta.env.VITE_MEMBERS_V2_ALLOW_SUPER_ADMINS,
    true,
  );
  const allowedUids = parseListFlag(import.meta.env.VITE_MEMBERS_V2_ADMIN_UIDS);
  const allowedEmails = parseListFlag(import.meta.env.VITE_MEMBERS_V2_ADMIN_EMAILS).map((item) =>
    item.toLowerCase(),
  );
  const userEmail = String(currentUser?.email || "").trim().toLowerCase();
  const uidAllowed = Boolean(currentUser?.uid && allowedUids.includes(currentUser.uid));
  const emailAllowed = Boolean(userEmail && allowedEmails.includes(userEmail));
  const admin = isAdminRole(userRole);
  const superAdmin = isSuperAdminRole(userRole);
  const superAdminAllowed = Boolean(superAdmin && allowSuperAdmins);
  const hasAllowList = allowedUids.length > 0 || allowedEmails.length > 0;

  return {
    enabled,
    admin,
    superAdmin,
    allowAllAdmins,
    allowSuperAdmins,
    hasAllowList,
    allowed: Boolean(admin && enabled && (allowAllAdmins || superAdminAllowed || uidAllowed || emailAllowed)),
    superAdminAllowed,
    uidAllowed,
    emailAllowed,
  };
};

export const isMembersV2EnabledForUser = (context) => getMembersV2FlagState(context).allowed;

const isMembersV2ActionEnabledForUser = (context, actionFlagName, superAdminFlagName) => {
  const state = getMembersV2FlagState(context);
  if (!state.allowed) return false;

  if (parseBooleanFlag(import.meta.env[actionFlagName])) return true;

  return Boolean(state.superAdmin && parseBooleanFlag(import.meta.env[superAdminFlagName]));
};

export const isMembersV2LifecycleActionsEnabledForUser = (context) =>
  isMembersV2ActionEnabledForUser(
    context,
    "VITE_MEMBERS_V2_LIFECYCLE_ACTIONS_ENABLED",
    "VITE_MEMBERS_V2_SUPER_ADMIN_LIFECYCLE_ACTIONS_ENABLED",
  );

export const isMembersV2DeleteActionsEnabledForUser = (context) =>
  isMembersV2ActionEnabledForUser(
    context,
    "VITE_MEMBERS_V2_DELETE_ACTIONS_ENABLED",
    "VITE_MEMBERS_V2_SUPER_ADMIN_DELETE_ACTIONS_ENABLED",
  );

export const isMembersV2RoleEditorEnabledForUser = (context) =>
  isMembersV2ActionEnabledForUser(
    context,
    "VITE_MEMBERS_V2_ROLE_EDITOR_ENABLED",
    "VITE_MEMBERS_V2_SUPER_ADMIN_ROLE_EDITOR_ENABLED",
  );

export const isMembersV2LearningResetEnabledForUser = (context) =>
  isMembersV2ActionEnabledForUser(
    context,
    "VITE_MEMBERS_V2_LEARNING_RESET_ENABLED",
    "VITE_MEMBERS_V2_SUPER_ADMIN_LEARNING_RESET_ENABLED",
  );

export const isMembersV2HealthDashboardEnabledForUser = (context) =>
  getMembersV2FlagState(context).allowed &&
  parseBooleanFlag(import.meta.env.VITE_MEMBERS_V2_HEALTH_DASHBOARD_ENABLED);

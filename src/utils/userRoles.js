export const userRoleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "support", label: "Support" },
  { value: "member", label: "Member" },
  { value: "teacher", label: "Teacher" },
  { value: "learner", label: "Learner" },
];

export const normalizeUserRole = (role = "") => {
  const normalized = String(role || "").trim().toLowerCase();

  if (["super_admin", "super admin", "superadmin"].includes(normalized)) return "super_admin";
  if (["admin", "du admin", "du_admin"].includes(normalized)) return "admin";
  if (normalized === "support") return "support";
  if (normalized === "member") return "member";
  if (normalized === "teacher") return "teacher";
  if (["student", "learner"].includes(normalized)) return "learner";

  return normalized || "learner";
};

export const isAdminRole = (role = "") => ["admin", "super_admin"].includes(normalizeUserRole(role));
export const isSuperAdminRole = (role = "") => normalizeUserRole(role) === "super_admin";
export const isTeacherRole = (role = "") => normalizeUserRole(role) === "teacher";
export const isLearnerRole = (role = "") => ["learner", "member"].includes(normalizeUserRole(role));

export const getRoleLabel = (role = "") => {
  const normalized = normalizeUserRole(role);
  return userRoleOptions.find((option) => option.value === normalized)?.label || "Learner";
};

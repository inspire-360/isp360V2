export const userRoleOptions = [
  { value: "admin", label: "ผู้ดูแล DU" },
  { value: "teacher", label: "ครู" },
  { value: "learner", label: "ผู้เรียน" },
];

export const normalizeUserRole = (role = "") => {
  const normalized = String(role || "").trim().toLowerCase();

  if (["admin", "du admin", "du_admin"].includes(normalized)) return "admin";
  if (normalized === "teacher") return "teacher";
  if (["student", "learner"].includes(normalized)) return "learner";

  return normalized || "learner";
};

export const isAdminRole = (role = "") => normalizeUserRole(role) === "admin";
export const isTeacherRole = (role = "") => normalizeUserRole(role) === "teacher";
export const isLearnerRole = (role = "") => normalizeUserRole(role) === "learner";

export const getRoleLabel = (role = "") => {
  const normalized = normalizeUserRole(role);
  return userRoleOptions.find((option) => option.value === normalized)?.label || "ผู้เรียน";
};

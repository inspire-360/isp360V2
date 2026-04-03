export const userRoleOptions = [
  { value: "admin", label: "DU Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "learner", label: "Learner" },
];

export const normalizeUserRole = (role = "") => {
  const normalized = String(role || "").trim().toLowerCase();

  if (["admin", "du admin", "du_admin"].includes(normalized)) return "admin";
  if (normalized === "teacher") return "teacher";
  if (["student", "learner"].includes(normalized)) return "learner";

  return normalized || "learner";
};

export const isAdminRole = (role = "") => normalizeUserRole(role) === "admin";

export const getRoleLabel = (role = "") => {
  const normalized = normalizeUserRole(role);
  return userRoleOptions.find((option) => option.value === normalized)?.label || "Learner";
};

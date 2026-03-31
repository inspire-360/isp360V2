export const prefixOptions = [
  "นาย",
  "นางสาว",
  "นาง",
  "ดร.",
  "ผอ.",
  "รองผอ.",
  "ว่าที่ร้อยตรี",
  "คุณ",
  "อื่นๆ",
];

export const positionOptions = [
  "ครู",
  "ครูชำนาญการ",
  "ครูชำนาญการพิเศษ",
  "บุคลากรทางการศึกษา",
  "ผู้อำนวยการสถานศึกษา",
  "รองผู้อำนวยการสถานศึกษา",
  "ศึกษานิเทศก์",
  "นักเรียน/นักศึกษา",
  "อื่นๆ",
];

export const roleOptions = [
  { value: "teacher", label: "ครู / บุคลากร" },
  { value: "learner", label: "ผู้เรียน" },
  { value: "admin", label: "ผู้ดูแลระบบ" },
];

const roleLabels = {
  learner: "ผู้เรียน",
  teacher: "ครู",
  admin: "ผู้ดูแลระบบ",
};

const userStatusLabels = {
  active: "ใช้งานปกติ",
  pending: "รอตรวจสอบ",
  disabled: "ปิดใช้งาน",
  archived: "เก็บถาวร",
};

export function getRoleLabel(role) {
  return roleLabels[role] || "ผู้เรียน";
}

export function getUserStatusLabel(status) {
  return userStatusLabels[status] || "ใช้งานปกติ";
}

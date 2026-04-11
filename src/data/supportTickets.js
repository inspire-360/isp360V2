export const SUPPORT_TICKETS_COLLECTION = "supportTickets";
export const SUPPORT_TICKET_MESSAGES_SUBCOLLECTION = "messages";

export const supportTicketStatusOptions = [
  { value: "pending", label: "รอดำเนินการ" },
  { value: "investigating", label: "กำลังตรวจสอบ" },
  { value: "resolved", label: "แก้ไขแล้ว" },
];

export const supportTicketPriorityOptions = [
  { value: "high", label: "เร่งด่วน", helper: "ปัญหากระทบการใช้งานทันทีหรือมีความเสี่ยงสูง" },
  { value: "medium", label: "ปานกลาง", helper: "มีผลต่อการเรียนหรือการใช้งาน แต่ยังมีทางเลี่ยงชั่วคราว" },
  { value: "low", label: "ทั่วไป", helper: "ข้อเสนอแนะหรือคำถามที่ไม่กระทบงานเร่งด่วน" },
];

export const supportTicketCategoryOptions = [
  { value: "learning", label: "ปัญหาการเรียน" },
  { value: "platform", label: "ปัญหาการใช้งานระบบ" },
  { value: "account", label: "บัญชีผู้ใช้และสิทธิ์" },
  { value: "wellbeing", label: "ขอคำปรึกษาและการช่วยเหลือ" },
  { value: "other", label: "อื่น ๆ" },
];

export const supportTicketStatusTone = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  investigating: "border-sky-200 bg-sky-50 text-sky-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const supportTicketPriorityTone = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-orange-200 bg-orange-50 text-orange-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
};

export const getSupportTicketStatusMeta = (value = "") =>
  supportTicketStatusOptions.find((option) => option.value === value) || supportTicketStatusOptions[0];

export const getSupportTicketPriorityMeta = (value = "") =>
  supportTicketPriorityOptions.find((option) => option.value === value) || supportTicketPriorityOptions[1];

export const getSupportTicketCategoryMeta = (value = "") =>
  supportTicketCategoryOptions.find((option) => option.value === value) || supportTicketCategoryOptions[0];

export const formatSupportTicketNumber = (id = "") => `SOS-${String(id).slice(0, 6).toUpperCase()}`;

export const toSupportTicketMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatSupportTicketDateTime = (value) => {
  const millis = toSupportTicketMillis(value);
  if (!millis) return "รอการซิงก์";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(millis);
};

export const sortSupportTickets = (left, right) =>
  toSupportTicketMillis(right.updatedAt || right.lastMessageAt || right.createdAt) -
  toSupportTicketMillis(left.updatedAt || left.lastMessageAt || left.createdAt);

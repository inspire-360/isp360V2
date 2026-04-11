export const SUPPORT_TICKETS_COLLECTION = "sos_tickets";
export const SUPPORT_TICKET_MESSAGES_SUBCOLLECTION = "messages";

export const supportTicketStatusOptions = [
  {
    value: "รอดำเนินการ",
    label: "รอดำเนินการ",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    value: "กำลังช่วยเหลือ",
    label: "กำลังช่วยเหลือ",
    tone: "border-secondary/15 bg-secondary/5 text-secondary",
  },
  {
    value: "ปิดงาน",
    label: "ปิดงาน",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

export const supportTicketUrgencyOptions = [
  {
    value: "ฉุกเฉินวิกฤต",
    label: "ฉุกเฉินวิกฤต",
    color: "#DC2626",
    textColor: "#FFFFFF",
    tone: "border-transparent text-white",
    helper: "ต้องการการช่วยเหลือทันทีและมีผลกระทบสูงมาก",
  },
  {
    value: "ฉุกเฉินหนัก",
    label: "ฉุกเฉินหนัก",
    color: "#EA580C",
    textColor: "#FFFFFF",
    tone: "border-transparent text-white",
    helper: "ต้องรีบรับเรื่องและติดตามอย่างใกล้ชิด",
  },
  {
    value: "ฉุกเฉิน",
    label: "ฉุกเฉิน",
    color: "#F59E0B",
    textColor: "#4B3200",
    tone: "border-transparent text-[#4B3200]",
    helper: "ควรได้รับการช่วยเหลือในลำดับต้น",
  },
  {
    value: "ฉุกเฉินไม่เร่งด่วน",
    label: "ฉุกเฉินไม่เร่งด่วน",
    color: "#16A34A",
    textColor: "#FFFFFF",
    tone: "border-transparent text-white",
    helper: "มีผลกระทบต่อการทำงาน แต่ยังพอจัดการระยะสั้นได้",
  },
  {
    value: "เรื่องทั่วไป",
    label: "เรื่องทั่วไป",
    color: "#3B82F6",
    textColor: "#FFFFFF",
    tone: "border-transparent text-white",
    helper: "เป็นคำร้องทั่วไปหรือข้อเสนอแนะเพื่อการช่วยเหลือ",
  },
];

export const supportTicketMainCategoryOptions = [
  {
    value: "หมวดงาน",
    label: "หมวดงาน",
    helper: "ภาระงานสอน งานเอกสาร และผลกระทบจากนโยบาย",
    subCategories: [
      "งานสอนและเตรียมสอน",
      "งานเอกสาร/ประเมิน",
      "งานพิเศษ/กิจกรรม",
      "ผลกระทบจากนโยบาย",
    ],
  },
  {
    value: "หมวดสถานที่และอุปกรณ์",
    label: "หมวดสถานที่และอุปกรณ์",
    helper: "พื้นที่ใช้งาน อุปกรณ์ และระบบสนับสนุนในโรงเรียน",
    subCategories: [
      "ซ่อมบำรุงอาคาร/พื้นที่",
      "อุปกรณ์การสอนชำรุด/ขาดแคลน",
      "ระบบ IT/อินเทอร์เน็ต",
      "ความปลอดภัย/สภาพแวดล้อม",
    ],
  },
  {
    value: "หมวดความสัมพันธ์",
    label: "หมวดความสัมพันธ์",
    helper: "ความสัมพันธ์กับนักเรียน ผู้ปกครอง เพื่อนร่วมงาน และผู้บังคับบัญชา",
    subCategories: [
      "ปัญหาพฤติกรรมนักเรียน",
      "การสื่อสารกับผู้ปกครอง",
      "บรรยากาศเพื่อนร่วมงาน",
      "การบริหารของผู้บังคับบัญชา",
      "การถูกคุกคาม/กลั่นแกล้ง",
    ],
  },
  {
    value: "หมวดสุขภาพกาย",
    label: "หมวดสุขภาพกาย",
    helper: "อาการทางกายจากการทำงานหรือสุขภาพเรื้อรัง",
    subCategories: [
      "ออฟฟิศซินโดรม",
      "ปัญหาเส้นเสียง/ทางเดินหายใจ",
      "ความอ่อนล้าสะสม",
      "ปัญหาสุขภาพเรื้อรัง",
    ],
  },
  {
    value: "หมวดสุขภาพจิต",
    label: "หมวดสุขภาพจิต",
    helper: "ความเครียด ภาวะหมดไฟ และการเข้าถึงที่ปรึกษา",
    subCategories: [
      "ภาวะหมดไฟ (Burnout)",
      "ความเครียด/วิตกกังวลสูง",
      "ต้องการที่ปรึกษาทางจิตวิทยา",
      "ปัญหาภาระหนี้สิน",
    ],
  },
];

export const sensitiveSupportTopics = new Set([
  "หมวดสุขภาพจิต",
  "การบริหารของผู้บังคับบัญชา",
  "การถูกคุกคาม/กลั่นแกล้ง",
]);

const statusMetaByValue = new Map(
  supportTicketStatusOptions.map((option) => [option.value, option]),
);

const urgencyMetaByValue = new Map(
  supportTicketUrgencyOptions.map((option) => [option.value, option]),
);

const mainCategoryMetaByValue = new Map(
  supportTicketMainCategoryOptions.map((option) => [option.value, option]),
);

export const getSupportTicketStatusMeta = (value = "") =>
  statusMetaByValue.get(value) || supportTicketStatusOptions[0];

export const getSupportTicketUrgencyMeta = (value = "") =>
  urgencyMetaByValue.get(value) || supportTicketUrgencyOptions[2];

export const getSupportTicketMainCategoryMeta = (value = "") =>
  mainCategoryMetaByValue.get(value) || supportTicketMainCategoryOptions[0];

export const getSupportTicketSubCategoryOptions = (mainCategory = "") =>
  getSupportTicketMainCategoryMeta(mainCategory).subCategories || [];

export const shouldSuggestConfidentialMode = ({ mainCategory = "", subCategory = "" }) =>
  sensitiveSupportTopics.has(mainCategory) || sensitiveSupportTopics.has(subCategory);

export const formatSupportTicketNumber = (id = "") => `SOS-${String(id).slice(0, 6).toUpperCase()}`;

export const toSupportTicketMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatSupportTicketDateTime = (value) => {
  const millis = toSupportTicketMillis(value);
  if (!millis) return "รอการซิงก์";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(millis));
};

export const buildUrgencyBadgeStyle = (urgencyLevel = "") => {
  const meta = getSupportTicketUrgencyMeta(urgencyLevel);
  return {
    backgroundColor: meta.color,
    color: meta.textColor,
  };
};

export const sortSupportTickets = (left, right) =>
  toSupportTicketMillis(right.updatedAt || right.lastMessageAt || right.createdAt) -
  toSupportTicketMillis(left.updatedAt || left.lastMessageAt || left.createdAt);

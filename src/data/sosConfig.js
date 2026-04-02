export const SOS_COLLECTION = "duSosCases";

export const sosUrgencyOptions = [
  { value: "critical", label: "Critical", helper: "ต้องการการช่วยเหลือทันทีหรือมีความเสี่ยงสูง" },
  { value: "high", label: "High", helper: "ต้องการการตอบกลับภายในวันนี้" },
  { value: "medium", label: "Medium", helper: "ต้องการคำแนะนำและการติดตามตามปกติ" },
  { value: "low", label: "Low", helper: "เป็นการขอคำปรึกษาเชิงป้องกันหรือข้อมูลเพิ่มเติม" },
];

export const sosCategoryOptions = [
  { value: "wellbeing", label: "Wellbeing", helper: "ความเครียด สุขภาวะใจ หรือภาวะเสี่ยง" },
  { value: "learning", label: "Learning Support", helper: "อุปสรรคด้านการเรียนหรือการสอน" },
  { value: "safety", label: "Safety", helper: "ความปลอดภัย เหตุฉุกเฉิน หรือความรุนแรง" },
  { value: "technology", label: "Technology", helper: "อุปกรณ์ ระบบ หรือการใช้งานแพลตฟอร์ม" },
  { value: "coordination", label: "Coordination", helper: "ต้องการคนประสานงานหรือหน่วยงานช่วยต่อ" },
];

export const sosStatusOptions = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_user", label: "Waiting User" },
  { value: "resolved", label: "Resolved" },
];

export const sosStatusTone = {
  new: "bg-accent/10 text-accent border-accent/15",
  in_progress: "bg-secondary/10 text-secondary border-secondary/15",
  waiting_user: "bg-warm/15 text-[#a24619] border-warm/20",
  resolved: "bg-primary/10 text-primary border-primary/15",
};

export const sosUrgencyTone = {
  critical: "bg-accent text-white border-transparent",
  high: "bg-secondary text-white border-transparent",
  medium: "bg-warm/15 text-[#a24619] border-warm/20",
  low: "bg-primary/10 text-primary border-primary/15",
};

export const formatCaseNumber = (id = "") => `DU-${id.slice(0, 6).toUpperCase()}`;

export const toUnixTime = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatDateTime = (value) => {
  const unix = toUnixTime(value);
  if (!unix) return "Pending sync";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(unix);
};

export const createTimelineEntry = ({ type, by, message, status }) => ({
  id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  type,
  by,
  message,
  status,
  at: new Date().toISOString(),
});

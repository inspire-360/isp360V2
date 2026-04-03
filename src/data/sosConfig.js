export const SOS_COLLECTION = "duSosCases";
export const SOS_USER_SUBCOLLECTION = "sosCases";

export const sosRiskOptions = [
  {
    value: "critical",
    label: "ฉุกเฉินวิกฤต",
    level: "Emergency",
    helper: "เร่งด่วนมากที่สุด ต้องช่วยเหลือทันที",
    sort: 5,
    colors: ["#5E0006", "#9B0F06", "#D53E0F", "#EED9B9"],
    tone: "border-transparent text-white",
  },
  {
    value: "emergent",
    label: "ฉุกเฉินหนัก",
    level: "Emergent",
    helper: "เร่งด่วนมาก ต้องรีบรับเรื่องและเริ่มช่วยเหลือ",
    sort: 4,
    colors: ["#F13E93", "#F891BB", "#F9D0CD"],
    tone: "border-transparent text-white",
  },
  {
    value: "urgent",
    label: "ฉุกเฉิน",
    level: "Urgent",
    helper: "ต้องได้รับการติดตามแบบเร่งด่วน",
    sort: 3,
    colors: ["#FFD400", "#FFC300", "#FF8C00", "#FF5F00"],
    tone: "border-transparent text-[#4B3200]",
  },
  {
    value: "semi_urgent",
    label: "ฉุกเฉินไม่เร่งด่วน",
    level: "Semi-Urgent",
    helper: "ระดับปานกลาง ควรจัดลำดับและติดตามต่อเนื่อง",
    sort: 2,
    colors: ["#059212", "#06D001", "#9BEC00", "#F3FF90"],
    tone: "border-transparent text-[#0F3D12]",
  },
  {
    value: "non_urgent",
    label: "เรื่องทั่วไป",
    level: "Non-Urgent",
    helper: "ระดับน้อยที่สุด แต่ยังต้องการการดูแล",
    sort: 1,
    colors: ["#F7F7F7", "#EEEEEE", "#393E46", "#929AAB"],
    tone: "border-slate-200 text-[#393E46]",
  },
];

export const sosCategoryOptions = [
  {
    value: "workload",
    label: "หมวดงาน",
    helper: "ภาระงาน นโยบาย และเวลาเตรียมสอน",
    tags: [
      "#งานธุรการล้นมือ",
      "#ประเมินซ้ำซ้อน",
      "#นโยบายไม่ตรงหน้างาน",
      "#ประชุมและอบรมเยอะ",
      "#เวลาเตรียมสอนไม่พอ",
      "#หลักสูตรอัดแน่น",
    ],
  },
  {
    value: "environment_resources",
    label: "หมวดสถานที่และอุปกรณ์",
    helper: "อาคาร พื้นที่ อุปกรณ์ และอินเทอร์เน็ต",
    tags: [
      "#สื่อและอุปกรณ์ไม่พอ",
      "#อินเทอร์เน็ตมีปัญหา",
      "#อาคารเรียนทรุดโทรม",
      "#พื้นที่ไม่ปลอดภัย",
      "#คอมพิวเตอร์ล้าสมัย",
    ],
  },
  {
    value: "relationships_support",
    label: "หมวดความสัมพันธ์ระหว่างบุคคล",
    helper: "ผู้บริหาร ผู้ปกครอง เพื่อนครู และการรับมือพฤติกรรม",
    tags: [
      "#โดดเดี่ยว/ขาดที่ปรึกษา",
      "#กดดันจากผู้บริหาร",
      "#ปัญหาการสื่อสารกับผู้ปกครอง",
      "#รับมือเด็กพฤติกรรมรุนแรง",
      "#ขาดเพื่อนร่วมคิด (PLC)",
    ],
  },
  {
    value: "physical_health",
    label: "หมวดสุขภาพกาย",
    helper: "อาการล้า ปวด เจ็บคอ และสุขภาพเรื้อรัง",
    tags: [
      "#ออฟฟิศซินโดรม/ปวดคอบ่าไหล่",
      "#ปัญหาเส้นเสียง/เจ็บคอ",
      "#พักผ่อนไม่เพียงพอ/อ่อนล้า",
      "#ปัญหาสุขภาพเรื้อรัง",
    ],
  },
  {
    value: "mental_health",
    label: "หมวดสุขภาพจิต",
    helper: "ความเครียด หมดไฟ ภาวะกังวล และภาระหนี้",
    tags: [
      "#หมดไฟในการสอน (Burnout)",
      "#เครียดสะสม/วิตกกังวล",
      "#รู้สึกท้อแท้/ซึมเศร้า",
      "#เครียดจากปัญหาหนี้สิน",
    ],
  },
];

export const sosStatusOptions = [
  { value: "new", label: "New" },
  { value: "triaged", label: "Triaged" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_user", label: "Waiting User" },
  { value: "resolved", label: "Resolved" },
];

export const sosApprovalOptions = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "need_more_info", label: "Need More Info" },
];

export const sosStatusTone = {
  new: "bg-accent/10 text-accent border-accent/15",
  triaged: "bg-secondary/10 text-secondary border-secondary/15",
  in_progress: "bg-primary/10 text-primary border-primary/15",
  waiting_user: "bg-warm/15 text-[#a24619] border-warm/20",
  resolved: "bg-slate-900/5 text-slate-700 border-slate-200",
};

export const sosApprovalTone = {
  pending_review: "bg-slate-100 text-slate-600 border-slate-200",
  approved: "bg-primary/10 text-primary border-primary/15",
  need_more_info: "bg-warm/15 text-[#a24619] border-warm/20",
};

export const sosRiskTone = Object.fromEntries(
  sosRiskOptions.map((option) => [option.value, option.tone]),
);

export const sosUrgencyOptions = sosRiskOptions;
export const sosUrgencyTone = sosRiskTone;

export const getRiskMeta = (value) =>
  sosRiskOptions.find((option) => option.value === value) ||
  sosRiskOptions.find((option) => option.value === "urgent");

export const getCategoryMeta = (value) =>
  sosCategoryOptions.find((option) => option.value === value) || sosCategoryOptions[0];

export const getApprovalMeta = (value) =>
  sosApprovalOptions.find((option) => option.value === value) || sosApprovalOptions[0];

export const getStatusMeta = (value) =>
  sosStatusOptions.find((option) => option.value === value) || sosStatusOptions[0];

export const normalizeRiskLevel = (value) => {
  if (["critical", "high"].includes(value)) return "critical";
  if (value === "medium") return "urgent";
  if (value === "low") return "non_urgent";
  return getRiskMeta(value).value;
};

export const normalizeTags = (tags = []) =>
  [...new Set((tags || []).map((tag) => String(tag || "").trim()).filter(Boolean))];

export const formatCaseNumber = (id = "") => `DU-${id.slice(0, 6).toUpperCase()}`;

export const riskSortValue = (caseItem = {}) =>
  getRiskMeta(normalizeRiskLevel(caseItem.riskLevel || caseItem.urgency)).sort;

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

export const createTimelineEntry = ({ type, by, message, status, approvalState }) => ({
  id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  type,
  by,
  message,
  status,
  approvalState,
  at: new Date().toISOString(),
});

export const mergeSosCases = (...collections) => {
  const merged = new Map();

  collections.flat().forEach((caseItem) => {
    if (!caseItem?.id) return;

    const existing = merged.get(caseItem.id) || {};
    const previousTime = toUnixTime(existing.updatedAt || existing.createdAt);
    const nextTime = toUnixTime(caseItem.updatedAt || caseItem.createdAt);

    const normalizeUpdates = (updates = []) =>
      updates.reduce((items, entry) => {
        if (!entry?.id || items.some((item) => item.id === entry.id)) return items;
        return [...items, entry];
      }, []);

    merged.set(
      caseItem.id,
      nextTime >= previousTime
        ? {
            ...existing,
            ...caseItem,
            tags: normalizeTags([...(existing.tags || []), ...(caseItem.tags || [])]),
            updates: normalizeUpdates([...(existing.updates || []), ...(caseItem.updates || [])]),
          }
        : {
            ...caseItem,
            ...existing,
            tags: normalizeTags([...(caseItem.tags || []), ...(existing.tags || [])]),
            updates: normalizeUpdates([...(caseItem.updates || []), ...(existing.updates || [])]),
          },
    );
  });

  return [...merged.values()].sort((left, right) => {
    const riskGap = riskSortValue(right) - riskSortValue(left);
    if (riskGap !== 0) return riskGap;
    return toUnixTime(right.updatedAt || right.createdAt) - toUnixTime(left.updatedAt || left.createdAt);
  });
};

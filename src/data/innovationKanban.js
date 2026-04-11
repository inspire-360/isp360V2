export const INNOVATIONS_COLLECTION = "innovations";

export const innovationStageOptions = [
  {
    value: "idea",
    label: "ไอเดียเบื้องต้น",
    description: "แนวคิดตั้งต้นที่กำลังเก็บโจทย์และมองหาทิศทาง",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    glow: "from-sky-500/18 via-sky-500/6 to-transparent",
  },
  {
    value: "prototype",
    label: "กำลังพัฒนา (Prototype)",
    description: "มีการทดลองต้นแบบหรือเริ่มลงมือทดสอบแล้ว",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    glow: "from-amber-500/18 via-amber-500/6 to-transparent",
  },
  {
    value: "funded",
    label: "ได้รับทุน (Seed Funding)",
    description: "ได้รับแรงหนุนและทรัพยากรเพื่อต่อยอดให้ใช้งานจริง",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    glow: "from-emerald-500/18 via-emerald-500/6 to-transparent",
  },
  {
    value: "best_practice",
    label: "Best Practice",
    description: "พร้อมเป็นต้นแบบให้โรงเรียนอื่นนำไปประยุกต์ใช้",
    tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    glow: "from-fuchsia-500/18 via-fuchsia-500/6 to-transparent",
  },
];

const innovationStageMetaByValue = new Map(
  innovationStageOptions.map((option, index) => [
    option.value,
    {
      ...option,
      rank: index,
    },
  ]),
);

export const getInnovationStageMeta = (stage = "") =>
  innovationStageMetaByValue.get(stage) || innovationStageMetaByValue.get("idea");

const getTimestampMs = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
};

export const formatInnovationDateTime = (value) => {
  const timestampMs = getTimestampMs(value);
  if (!timestampMs) return "ยังไม่มีข้อมูลเวลา";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs));
};

export const sortInnovations = (left, right) => {
  const leftStage = getInnovationStageMeta(left?.stage).rank;
  const rightStage = getInnovationStageMeta(right?.stage).rank;
  if (leftStage !== rightStage) return leftStage - rightStage;

  const leftUpdatedAt = getTimestampMs(left?.updatedAt || left?.lastMovedAt || left?.createdAt);
  const rightUpdatedAt = getTimestampMs(right?.updatedAt || right?.lastMovedAt || right?.createdAt);
  if (leftUpdatedAt !== rightUpdatedAt) return rightUpdatedAt - leftUpdatedAt;

  return String(left?.title || "").localeCompare(String(right?.title || ""), "th");
};

export const buildInnovationSearchText = (innovation = {}) =>
  [
    innovation.title,
    innovation.teacherName,
    innovation.schoolName,
    innovation.summary,
    innovation.focusArea,
    innovation.supportNeed,
    Array.isArray(innovation.tags) ? innovation.tags.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const countInnovationsByStage = (innovations = []) =>
  innovationStageOptions.reduce(
    (result, stageOption) => {
      result.total += innovations.filter((innovation) => innovation.stage === stageOption.value).length;
      result[stageOption.value] = innovations.filter((innovation) => innovation.stage === stageOption.value).length;
      return result;
    },
    {
      total: 0,
      idea: 0,
      prototype: 0,
      funded: 0,
      best_practice: 0,
    },
  );

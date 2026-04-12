export const INNOVATIONS_COLLECTION = "innovations";

export const INNOVATION_STAGE_IDEA = "ไอเดียเบื้องต้น";
export const INNOVATION_STAGE_PROTOTYPE = "กำลังพัฒนาต้นแบบ";
export const INNOVATION_STAGE_FUNDED = "ได้รับทุนตั้งต้น";
export const INNOVATION_STAGE_BEST_PRACTICE = "แนวปฏิบัติที่เป็นเลิศ";

export const innovationStageOptions = [
  {
    value: INNOVATION_STAGE_IDEA,
    label: "ไอเดียเบื้องต้น",
    description: "รายการนวัตกรรมที่เพิ่งถูกรวบรวมเข้าระบบและพร้อมสำหรับการกลั่นกรองเป็นลำดับแรก",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    glow: "from-sky-500/18 via-sky-500/6 to-transparent",
  },
  {
    value: INNOVATION_STAGE_PROTOTYPE,
    label: "กำลังพัฒนาต้นแบบ",
    description: "รายการที่เริ่มลงมือสร้างต้นแบบแล้วและต้องติดตามการทดลองใช้หรือคำแนะนำเพิ่มเติม",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    glow: "from-amber-500/18 via-amber-500/6 to-transparent",
  },
  {
    value: INNOVATION_STAGE_FUNDED,
    label: "ได้รับทุนตั้งต้น",
    description: "รายการที่ได้รับการสนับสนุนด้านทรัพยากรหรือทุนและกำลังเตรียมขยายผลสู่การใช้งานจริง",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    glow: "from-emerald-500/18 via-emerald-500/6 to-transparent",
  },
  {
    value: INNOVATION_STAGE_BEST_PRACTICE,
    label: "แนวปฏิบัติที่เป็นเลิศ",
    description: "รายการที่พร้อมถอดบทเรียน สื่อสารต่อ และใช้เป็นต้นแบบให้ครูหรือโรงเรียนอื่นนำไปต่อยอด",
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

const normalizeInnovationStageKey = (value = "") => String(value || "").trim().toLowerCase();

const innovationStageAliasMap = new Map([
  ["idea", INNOVATION_STAGE_IDEA],
  [INNOVATION_STAGE_IDEA, INNOVATION_STAGE_IDEA],
  ["prototype", INNOVATION_STAGE_PROTOTYPE],
  ["กำลังพัฒนา (prototype)", INNOVATION_STAGE_PROTOTYPE],
  ["กำลังพัฒนาต้นแบบ", INNOVATION_STAGE_PROTOTYPE],
  ["funded", INNOVATION_STAGE_FUNDED],
  ["ได้รับทุน (seed funding)", INNOVATION_STAGE_FUNDED],
  ["ได้รับทุนตั้งต้น", INNOVATION_STAGE_FUNDED],
  ["best_practice", INNOVATION_STAGE_BEST_PRACTICE],
  ["best practice", INNOVATION_STAGE_BEST_PRACTICE],
  ["แนวปฏิบัติที่เป็นเลิศ", INNOVATION_STAGE_BEST_PRACTICE],
].map(([alias, canonical]) => [normalizeInnovationStageKey(alias), canonical]));

export const normalizeInnovationStage = (stage = "") =>
  innovationStageAliasMap.get(normalizeInnovationStageKey(stage)) || INNOVATION_STAGE_IDEA;

export const getInnovationStageMeta = (stage = "") =>
  innovationStageMetaByValue.get(normalizeInnovationStage(stage)) ||
  innovationStageMetaByValue.get(INNOVATION_STAGE_IDEA);

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
    innovation.description,
    innovation.focusArea,
    innovation.supportNeed,
    normalizeInnovationStage(innovation.stage),
    Array.isArray(innovation.tags) ? innovation.tags.join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const countInnovationsByStage = (innovations = []) =>
  innovations.reduce(
    (result, innovation) => {
      const stage = normalizeInnovationStage(innovation.stage);
      result.total += 1;
      result[stage] = (result[stage] || 0) + 1;
      return result;
    },
    innovationStageOptions.reduce(
      (base, stageOption) => ({
        ...base,
        [stageOption.value]: 0,
      }),
      { total: 0 },
    ),
  );

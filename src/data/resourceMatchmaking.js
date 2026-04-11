export const EXPERTS_COLLECTION = "experts";
export const MATCH_REQUESTS_COLLECTION = "match_requests";

export const matchRequestStatusOptions = [
  {
    value: "pending_match",
    label: "รอจับคู่",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "matched",
    label: "จับคู่สำเร็จ",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    value: "completed",
    label: "เสร็จสิ้น",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

export const preferredFormatOptions = [
  { value: "online", label: "ออนไลน์" },
  { value: "onsite", label: "ลงพื้นที่" },
  { value: "hybrid", label: "ผสมผสาน" },
];

export const expertCapacityStatusOptions = [
  {
    value: "available",
    label: "พร้อมรับงาน",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "limited",
    label: "คิวแน่น",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "paused",
    label: "พักรับงานชั่วคราว",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  },
];

export const getMatchRequestStatusMeta = (value = "") =>
  matchRequestStatusOptions.find((option) => option.value === value) || matchRequestStatusOptions[0];

export const getPreferredFormatMeta = (value = "") =>
  preferredFormatOptions.find((option) => option.value === value) || preferredFormatOptions[0];

export const getExpertCapacityMeta = (value = "") =>
  expertCapacityStatusOptions.find((option) => option.value === value) || expertCapacityStatusOptions[0];

const createExpertSelectionId = (sourceId = "", displayName = "", index = 0) => {
  const characters = Array.from(`${sourceId}:${displayName}:${index}`);
  const hash = characters.reduce(
    (result, character) => ((result * 31) + character.codePointAt(0)) % 2147483647,
    7,
  );

  return `expert_pick_${hash.toString(36)}`;
};

const normalizeServiceModes = (serviceModes = []) => {
  if (!Array.isArray(serviceModes) || serviceModes.length === 0) {
    return ["online", "onsite", "hybrid"];
  }

  return serviceModes
    .map((mode) => String(mode || "").trim().toLowerCase())
    .filter(Boolean)
    .map((mode) => {
      if (mode === "ออนไลน์") return "online";
      if (mode === "ลงพื้นที่") return "onsite";
      if (mode === "ผสมผสาน") return "hybrid";
      return mode;
    });
};

const normalizeCapacityStatus = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "limited" || normalized === "paused" || normalized === "available") {
    return normalized;
  }

  if (normalized === "คิวแน่น") return "limited";
  if (normalized === "พักรับงานชั่วคราว") return "paused";
  return "available";
};

const buildExpertSearchText = (expert = {}) =>
  [
    expert.displayName,
    expert.title,
    expert.primaryExpertise,
    Array.isArray(expert.expertiseTags) ? expert.expertiseTags.join(" ") : "",
    expert.organization,
    expert.region,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const buildSingleExpertRecord = ({
  sourceId,
  sourceData,
  displayName,
  primaryExpertise,
  index = 0,
}) => {
  const categoryLabel = String(
    sourceData.category ||
      sourceData.mainCategory ||
      sourceData.groupCategory ||
      "",
  ).trim();
  const title =
    String(
      sourceData.title ||
        sourceData.specialty ||
        sourceData.primaryExpertise ||
        primaryExpertise ||
        categoryLabel,
    ).trim() || "ผู้เชี่ยวชาญ DU";
  const expertiseTags = [
    ...(Array.isArray(sourceData.expertiseTags) ? sourceData.expertiseTags : []),
    ...(Array.isArray(sourceData.tags) ? sourceData.tags : []),
    primaryExpertise,
    categoryLabel,
  ]
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);

  const normalizedExpert = {
    id:
      String(sourceData.displayName || "").trim() === String(displayName || "").trim()
        ? sourceId
        : createExpertSelectionId(sourceId, displayName, index),
    sourceId,
    displayName: String(displayName || "").trim() || "ผู้เชี่ยวชาญ",
    title,
    organization: String(sourceData.organization || sourceData.orgName || "").trim() || "เครือข่ายผู้เชี่ยวชาญ DU",
    primaryExpertise: String(primaryExpertise || title).trim(),
    expertiseTags: [...new Set(expertiseTags)],
    serviceModes: normalizeServiceModes(sourceData.serviceModes || sourceData.serviceMode),
    region: String(sourceData.region || sourceData.area || "").trim() || "สนับสนุนได้ทั่วทั้งเครือข่าย",
    bio:
      String(sourceData.bio || sourceData.description || "").trim() ||
      `${String(displayName || "").trim() || "ผู้เชี่ยวชาญ"} พร้อมสนับสนุนครูในด้าน ${String(primaryExpertise || title).trim()}`,
    contactEmail: String(sourceData.contactEmail || sourceData.email || "").trim(),
    contactLine: String(sourceData.contactLine || sourceData.lineId || "").trim(),
    isActive: sourceData.isActive !== false && sourceData.active !== false,
    capacityStatus: normalizeCapacityStatus(sourceData.capacityStatus),
  };

  return {
    ...normalizedExpert,
    searchText: buildExpertSearchText(normalizedExpert),
  };
};

export const expandExpertDirectoryRecords = (records = []) =>
  records.flatMap((record) => {
    const sourceId = record.id;
    const sourceData = { ...record };
    const groupedExpertNames = Array.isArray(sourceData.experts)
      ? sourceData.experts.map((name) => String(name || "").trim()).filter(Boolean)
      : [];

    if (groupedExpertNames.length > 0) {
      const inferredPrimaryExpertise =
        String(sourceData.specialty || sourceData.title || sourceData.category || "").trim() ||
        "ผู้เชี่ยวชาญ DU";

      return groupedExpertNames.map((displayName, index) =>
        buildSingleExpertRecord({
          sourceId,
          sourceData,
          displayName,
          primaryExpertise: inferredPrimaryExpertise,
          index,
        }),
      );
    }

    const displayName = String(
      sourceData.displayName || sourceData.name || sourceData.fullName || sourceId,
    ).trim();
    const primaryExpertise = String(
      sourceData.primaryExpertise ||
        sourceData.specialty ||
        sourceData.title ||
        (Array.isArray(sourceData.expertiseTags) ? sourceData.expertiseTags[0] : "") ||
        sourceData.category ||
        "",
    ).trim();

    return [
      buildSingleExpertRecord({
        sourceId,
        sourceData,
        displayName,
        primaryExpertise,
      }),
    ];
  });

export const formatExpertServiceModes = (serviceModes = []) =>
  normalizeServiceModes(serviceModes).map((mode) => getPreferredFormatMeta(mode).label);

export const toMarketplaceMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatMarketplaceDateTime = (value) => {
  const millis = toMarketplaceMillis(value);
  if (!millis) return "รอการซิงก์";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(millis);
};

export const sortMatchRequests = (left, right) =>
  toMarketplaceMillis(right.updatedAt || right.createdAt) -
  toMarketplaceMillis(left.updatedAt || left.createdAt);

export const sortExpertsByName = (left, right) =>
  String(left.displayName || "").localeCompare(String(right.displayName || ""), "th");

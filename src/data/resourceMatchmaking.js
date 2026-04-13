export const EXPERTS_COLLECTION = "experts";
export const MATCH_REQUESTS_COLLECTION = "match_requests";

export const DEFAULT_MATCH_REQUEST_STATUS = "pending_match";
export const DEFAULT_MATCH_REQUEST_PRIORITY = "medium";
export const DEFAULT_MATCH_RESOURCE_TYPE = "consultation";
export const DEFAULT_MATCH_CLOSED_REASON = "";

export const normalizeMarketplaceExpertName = (value = "") =>
  String(value || "").replace(/\s+/g, " ").trim();

export const matchRequestStatusOptions = [
  {
    value: "pending_match",
    label: "รอจับคู่",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "matched",
    label: "กำลังประสานงาน",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    value: "completed",
    label: "ปิดงานแล้ว",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

export const preferredFormatOptions = [
  { value: "online", label: "ออนไลน์" },
  { value: "onsite", label: "ลงพื้นที่" },
  { value: "hybrid", label: "ผสมผสาน" },
];

export const requestPriorityOptions = [
  {
    value: "high",
    label: "เร่งด่วน",
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    value: "medium",
    label: "สำคัญ",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "low",
    label: "วางแผนได้",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  },
];

export const resourceTypeOptions = [
  { value: "consultation", label: "ปรึกษา/วางแผน" },
  { value: "coaching", label: "โค้ชชิงในชั้นเรียน" },
  { value: "workshop", label: "อบรม/เวิร์กช็อป" },
  { value: "resource_pack", label: "ชุดสื่อ/ทรัพยากร" },
];

export const closeReasonOptions = [
  { value: "resolved", label: "ช่วยได้แล้ว" },
  { value: "follow_up", label: "นัดติดตามต่อ" },
  { value: "handoff", label: "ส่งต่อทีม/ผู้เชี่ยวชาญ" },
  { value: "teacher_withdrew", label: "ครูยกเลิกคำขอ" },
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

const normalizeSimpleString = (value = "") => String(value || "").trim();

const normalizeTagValue = (value = "") => normalizeSimpleString(value).toLowerCase();

const tokenizeSearchInput = (value = "") =>
  normalizeSimpleString(value)
    .split(/[,/\n|]+/g)
    .map((item) => normalizeSimpleString(item))
    .filter(Boolean);

const uniqueStrings = (...values) =>
  Array.from(
    new Set(
      values
        .flat()
        .map((value) => normalizeSimpleString(value))
        .filter(Boolean),
    ),
  );

const normalizeServiceModes = (serviceModes = []) => {
  if (!Array.isArray(serviceModes) || serviceModes.length === 0) {
    return ["online", "onsite", "hybrid"];
  }

  return serviceModes
    .map((mode) => normalizeSimpleString(mode).toLowerCase())
    .filter(Boolean)
    .map((mode) => {
      if (mode === "ออนไลน์") return "online";
      if (mode === "ลงพื้นที่") return "onsite";
      if (mode === "ผสมผสาน") return "hybrid";
      return mode;
    });
};

export const normalizeMatchRequestStatus = (value = "") => {
  const normalized = normalizeSimpleString(value).toLowerCase();
  return matchRequestStatusOptions.some((option) => option.value === normalized)
    ? normalized
    : DEFAULT_MATCH_REQUEST_STATUS;
};

export const normalizePreferredFormat = (value = "") => {
  const normalized = normalizeSimpleString(value).toLowerCase();
  return preferredFormatOptions.some((option) => option.value === normalized)
    ? normalized
    : "online";
};

export const normalizeRequestPriority = (value = "") => {
  const normalized = normalizeSimpleString(value).toLowerCase();
  return requestPriorityOptions.some((option) => option.value === normalized)
    ? normalized
    : DEFAULT_MATCH_REQUEST_PRIORITY;
};

export const normalizeResourceType = (value = "") => {
  const normalized = normalizeSimpleString(value).toLowerCase();
  return resourceTypeOptions.some((option) => option.value === normalized)
    ? normalized
    : DEFAULT_MATCH_RESOURCE_TYPE;
};

export const normalizeClosedReason = (value = "") => {
  const normalized = normalizeSimpleString(value).toLowerCase();
  return closeReasonOptions.some((option) => option.value === normalized)
    ? normalized
    : DEFAULT_MATCH_CLOSED_REASON;
};

export const getMatchRequestStatusMeta = (value = "") =>
  matchRequestStatusOptions.find((option) => option.value === normalizeMatchRequestStatus(value))
  || matchRequestStatusOptions[0];

export const getPreferredFormatMeta = (value = "") =>
  preferredFormatOptions.find((option) => option.value === normalizePreferredFormat(value))
  || preferredFormatOptions[0];

export const getRequestPriorityMeta = (value = "") =>
  requestPriorityOptions.find((option) => option.value === normalizeRequestPriority(value))
  || requestPriorityOptions[1];

export const getResourceTypeMeta = (value = "") =>
  resourceTypeOptions.find((option) => option.value === normalizeResourceType(value))
  || resourceTypeOptions[0];

export const getClosedReasonMeta = (value = "") =>
  closeReasonOptions.find((option) => option.value === normalizeClosedReason(value))
  || closeReasonOptions[0];

export const getExpertCapacityMeta = (value = "") =>
  expertCapacityStatusOptions.find((option) => option.value === normalizeSimpleString(value).toLowerCase())
  || expertCapacityStatusOptions[0];

const createExpertSelectionId = (sourceId = "", displayName = "", index = 0) => {
  const characters = Array.from(`${sourceId}:${displayName}:${index}`);
  const hash = characters.reduce(
    (result, character) => ((result * 31) + character.codePointAt(0)) % 2147483647,
    7,
  );

  return `expert_pick_${hash.toString(36)}`;
};

const normalizeCapacityStatus = (value = "") => {
  const normalized = normalizeSimpleString(value).toLowerCase();
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
  const categoryLabel = normalizeSimpleString(
    sourceData.category
      || sourceData.mainCategory
      || sourceData.groupCategory
      || "",
  );
  const title =
    normalizeSimpleString(
      sourceData.title
        || sourceData.specialty
        || sourceData.primaryExpertise
        || primaryExpertise
        || categoryLabel,
    ) || "ผู้เชี่ยวชาญ DU";
  const expertiseTags = uniqueStrings(
    Array.isArray(sourceData.expertiseTags) ? sourceData.expertiseTags : [],
    Array.isArray(sourceData.tags) ? sourceData.tags : [],
    primaryExpertise,
    categoryLabel,
  );

  const normalizedExpert = {
    id:
      normalizeMarketplaceExpertName(sourceData.displayName) === normalizeMarketplaceExpertName(displayName)
        ? sourceId
        : createExpertSelectionId(sourceId, displayName, index),
    sourceId,
    displayName: normalizeMarketplaceExpertName(displayName) || "ผู้เชี่ยวชาญ",
    title,
    organization: normalizeSimpleString(sourceData.organization || sourceData.orgName) || "เครือข่ายผู้เชี่ยวชาญ DU",
    primaryExpertise: normalizeSimpleString(primaryExpertise || title),
    expertiseTags,
    serviceModes: normalizeServiceModes(sourceData.serviceModes || sourceData.serviceMode),
    region: normalizeSimpleString(sourceData.region || sourceData.area) || "สนับสนุนได้ทั่วทั้งเครือข่าย",
    bio:
      normalizeSimpleString(sourceData.bio || sourceData.description)
      || `${normalizeSimpleString(displayName) || "ผู้เชี่ยวชาญ"} พร้อมสนับสนุนครูในด้าน ${normalizeSimpleString(primaryExpertise || title)}`,
    contactEmail: normalizeSimpleString(sourceData.contactEmail || sourceData.email),
    contactLine: normalizeSimpleString(sourceData.contactLine || sourceData.lineId),
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
      ? sourceData.experts.map((name) => normalizeSimpleString(name)).filter(Boolean)
      : [];

    if (groupedExpertNames.length > 0) {
      const inferredPrimaryExpertise =
        normalizeSimpleString(sourceData.specialty || sourceData.title || sourceData.category)
        || "ผู้เชี่ยวชาญ DU";

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

    const hasStandaloneIdentity = Boolean(
      normalizeSimpleString(sourceData.displayName || sourceData.name || sourceData.fullName),
    );

    if (!hasStandaloneIdentity) {
      return [];
    }

    const displayName = normalizeMarketplaceExpertName(
      sourceData.displayName || sourceData.name || sourceData.fullName || sourceId,
    );
    const primaryExpertise = normalizeSimpleString(
      sourceData.primaryExpertise
        || sourceData.specialty
        || sourceData.title
        || (Array.isArray(sourceData.expertiseTags) ? sourceData.expertiseTags[0] : "")
        || sourceData.category
        || "",
    );

    return [
      buildSingleExpertRecord({
        sourceId,
        sourceData,
        displayName,
        primaryExpertise,
      }),
    ];
  });

export const normalizeNeedTags = (values = []) =>
  uniqueStrings(values.flatMap((value) => tokenizeSearchInput(value))).slice(0, 8);

export const buildRequestNeedTags = ({
  desiredExpertise = "",
  requestTitle = "",
  requestDetails = "",
  needTags = [],
} = {}) =>
  normalizeNeedTags([
    needTags,
    desiredExpertise,
    requestTitle,
    tokenizeSearchInput(requestDetails).slice(0, 4),
  ]);

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
  toMarketplaceMillis(right.updatedAt || right.createdAt)
  - toMarketplaceMillis(left.updatedAt || left.createdAt);

export const sortExpertsByName = (left, right) =>
  String(left.displayName || "").localeCompare(String(right.displayName || ""), "th");

const hasTextOverlap = (left = "", right = "") => {
  const normalizedLeft = normalizeTagValue(left);
  const normalizedRight = normalizeTagValue(right);

  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
};

export const rankExpertsForRequest = (request = {}, experts = []) => {
  if (!request || !Array.isArray(experts) || experts.length === 0) return [];

  const preferredFormat = normalizePreferredFormat(request.preferredFormat);
  const priority = normalizeRequestPriority(request.priority);
  const resourceType = normalizeResourceType(request.resourceType);
  const requestTags = buildRequestNeedTags({
    desiredExpertise: request.desiredExpertise,
    requestTitle: request.requestTitle,
    requestDetails: request.requestDetails,
    needTags: request.needTags,
  });

  return experts
    .map((expert) => {
      const reasons = [];
      const sharedTags = [];
      const expertiseTags = Array.isArray(expert.expertiseTags) ? expert.expertiseTags : [];
      const normalizedExpertText = [
        expert.displayName,
        expert.title,
        expert.primaryExpertise,
        expertiseTags.join(" "),
        expert.bio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      let score = 0;

      if (expert.isActive === false) {
        score -= 60;
        reasons.push("ผู้เชี่ยวชาญคนนี้พักรับงาน");
      }

      if (expert.capacityStatus === "available") {
        score += 18;
        reasons.push("พร้อมรับงานทันที");
      } else if (expert.capacityStatus === "limited") {
        score += 8;
        reasons.push("ยังรับงานได้แต่คิวแน่น");
      } else if (expert.capacityStatus === "paused") {
        score -= 18;
      }

      if (Array.isArray(expert.serviceModes) && expert.serviceModes.includes(preferredFormat)) {
        score += 14;
        reasons.push(`รองรับรูปแบบ ${getPreferredFormatMeta(preferredFormat).label}`);
      } else if (preferredFormat === "hybrid" && Array.isArray(expert.serviceModes) && expert.serviceModes.length > 1) {
        score += 8;
      }

      if (resourceType === "coaching" && expert.serviceModes?.includes("onsite")) {
        score += 8;
      }

      if (resourceType === "resource_pack" && expert.serviceModes?.includes("online")) {
        score += 6;
      }

      if (priority === "high" && expert.capacityStatus === "available") {
        score += 6;
      }

      requestTags.forEach((tag) => {
        const matched = expertiseTags.some((expertTag) => hasTextOverlap(expertTag, tag))
          || hasTextOverlap(expert.primaryExpertise, tag)
          || hasTextOverlap(expert.title, tag)
          || normalizedExpertText.includes(normalizeTagValue(tag));

        if (matched) {
          sharedTags.push(tag);
          score += 12;
        }
      });

      if (sharedTags.length > 0) {
        reasons.unshift(`แท็กที่ตรงกัน: ${sharedTags.slice(0, 3).join(", ")}`);
      }

      if (
        request.desiredExpertise
        && (
          hasTextOverlap(expert.primaryExpertise, request.desiredExpertise)
          || hasTextOverlap(expert.title, request.desiredExpertise)
        )
      ) {
        score += 10;
      }

      return {
        expert,
        score,
        sharedTags: uniqueStrings(sharedTags).slice(0, 4),
        reasons: uniqueStrings(reasons).slice(0, 3),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return sortExpertsByName(left.expert, right.expert);
    });
};

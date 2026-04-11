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

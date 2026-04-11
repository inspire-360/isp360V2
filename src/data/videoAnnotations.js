export const VIDEOS_COLLECTION = "videos";
export const VIDEO_COMMENTS_SUBCOLLECTION = "video_comments";

export const videoReviewStatusOptions = [
  {
    value: "pending_feedback",
    label: "รอรับคำแนะนำ",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "coaching",
    label: "กำลังโค้ช",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    value: "reviewed",
    label: "สรุปข้อเสนอแนะแล้ว",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
];

export const getVideoReviewStatusMeta = (value = "") =>
  videoReviewStatusOptions.find((option) => option.value === value) || videoReviewStatusOptions[0];

export const buildVideoCommentPreview = (value = "") => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 117)}...`;
};

export const toVideoMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatVideoDateTime = (value) => {
  const millis = toVideoMillis(value);
  if (!millis) return "รอการซิงก์";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(millis);
};

export const formatVideoTimecode = (value = 0) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":");
};

export const sortVideoComments = (left, right) => {
  const leftSeconds = Number(left?.timestampSeconds || 0);
  const rightSeconds = Number(right?.timestampSeconds || 0);

  if (leftSeconds !== rightSeconds) {
    return leftSeconds - rightSeconds;
  }

  return toVideoMillis(left?.createdAt) - toVideoMillis(right?.createdAt);
};

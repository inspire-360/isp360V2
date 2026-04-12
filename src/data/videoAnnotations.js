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

const normalizeVideoUrl = (value = "") => String(value || "").trim();

const parseVideoUrl = (value = "") => {
  const normalized = normalizeVideoUrl(value);
  if (!normalized) return null;

  try {
    return new URL(normalized);
  } catch {
    return null;
  }
};

const extractYouTubeVideoId = (url) => {
  if (!url) return "";

  const host = String(url.hostname || "").toLowerCase();
  if (host.includes("youtu.be")) {
    return String(url.pathname || "")
      .split("/")
      .filter(Boolean)[0] || "";
  }

  if (!host.includes("youtube.com")) {
    return "";
  }

  if (url.searchParams.get("v")) {
    return url.searchParams.get("v") || "";
  }

  const segments = String(url.pathname || "")
    .split("/")
    .filter(Boolean);

  if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
    return segments[1] || "";
  }

  return "";
};

const extractGoogleDriveFileId = (url) => {
  if (!url) return "";

  const host = String(url.hostname || "").toLowerCase();
  if (!host.includes("drive.google.com") && !host.includes("docs.google.com")) {
    return "";
  }

  if (url.searchParams.get("id")) {
    return url.searchParams.get("id") || "";
  }

  const matched = String(url.pathname || "").match(/\/d\/([^/]+)/);
  return matched?.[1] || "";
};

const isDirectVideoUrl = (url) => {
  if (!url) return false;

  const normalized = String(url.pathname || "").toLowerCase();
  if (/\.(mp4|webm|ogg|m4v|mov)(?:$|\?)/.test(normalized)) {
    return true;
  }

  const host = String(url.hostname || "").toLowerCase();
  if (host.includes("firebasestorage.googleapis.com")) {
    return true;
  }

  if (url.searchParams.get("alt") === "media") {
    return true;
  }

  return false;
};

export const resolvePlayableVideoSource = (value = "") => {
  const rawUrl = normalizeVideoUrl(value);
  if (!rawUrl) {
    return {
      provider: "empty",
      providerLabel: "ยังไม่มีลิงก์",
      canPlay: false,
      canTrackTimeline: false,
      originalUrl: "",
      playbackUrl: "",
      embedUrl: "",
      videoId: "",
    };
  }

  const parsedUrl = parseVideoUrl(rawUrl);
  if (!parsedUrl) {
    return {
      provider: "unsupported",
      providerLabel: "ลิงก์รูปแบบพิเศษ",
      canPlay: false,
      canTrackTimeline: false,
      originalUrl: rawUrl,
      playbackUrl: "",
      embedUrl: "",
      videoId: "",
    };
  }

  const youtubeVideoId = extractYouTubeVideoId(parsedUrl);
  if (youtubeVideoId) {
    return {
      provider: "youtube",
      providerLabel: "ยูทูบ",
      canPlay: true,
      canTrackTimeline: true,
      originalUrl: rawUrl,
      playbackUrl: "",
      embedUrl: `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`,
      videoId: youtubeVideoId,
    };
  }

  const googleDriveFileId = extractGoogleDriveFileId(parsedUrl);
  if (googleDriveFileId) {
    return {
      provider: "google_drive",
      providerLabel: "กูเกิลไดรฟ์",
      canPlay: true,
      canTrackTimeline: false,
      originalUrl: rawUrl,
      playbackUrl: "",
      embedUrl: `https://drive.google.com/file/d/${googleDriveFileId}/preview`,
      videoId: googleDriveFileId,
    };
  }

  if (isDirectVideoUrl(parsedUrl)) {
    return {
      provider: "html5",
      providerLabel: "ไฟล์วิดีโอ",
      canPlay: true,
      canTrackTimeline: true,
      originalUrl: rawUrl,
      playbackUrl: rawUrl,
      embedUrl: "",
      videoId: "",
    };
  }

  return {
    provider: "unsupported",
    providerLabel: "ลิงก์ที่ต้องเปิดภายนอก",
    canPlay: false,
    canTrackTimeline: false,
    originalUrl: rawUrl,
    playbackUrl: "",
    embedUrl: "",
    videoId: "",
  };
};

export const parseVideoTimecodeInput = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    return Math.max(0, Math.floor(Number(normalized)));
  }

  const segments = normalized
    .split(":")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length < 2 || segments.length > 3 || segments.some((segment) => !/^\d+$/.test(segment))) {
    return null;
  }

  const numbers = segments.map((segment) => Number(segment));
  if (segments.length === 2) {
    const [minutes, seconds] = numbers;
    return (minutes * 60) + seconds;
  }

  const [hours, minutes, seconds] = numbers;
  return (hours * 3600) + (minutes * 60) + seconds;
};

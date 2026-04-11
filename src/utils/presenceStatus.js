export const PRESENCE_COLLECTION = "presence";
export const ACTIVE_WINDOW_MS = 45 * 1000;
export const PRESENCE_TICK_MS = 10 * 1000;

const OFFLINE_META = {
  status: "offline",
  label: "ออฟไลน์",
  isConnected: false,
  sortWeight: 0,
  tone: "border-slate-200 bg-slate-50 text-slate-500",
  dotTone: "bg-slate-300",
};

const ONLINE_META = {
  status: "online",
  label: "ออนไลน์",
  isConnected: true,
  sortWeight: 2,
  tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  dotTone: "bg-emerald-500",
};

const AWAY_META = {
  status: "away",
  label: "ไม่อยู่หน้าจอ",
  isConnected: false,
  sortWeight: 1,
  tone: "border-slate-200 bg-slate-100 text-slate-600",
  dotTone: "bg-slate-400",
};

const toDateValue = (value, fallbackTimestamp) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  if (typeof fallbackTimestamp === "number" && Number.isFinite(fallbackTimestamp)) {
    return new Date(fallbackTimestamp);
  }

  return null;
};

export const getPresenceTimestamp = (user = {}) =>
  toDateValue(
    user.lastActive || user.lastSeen || user.updatedAt,
    user.lastActiveMs || user.lastSeenMs || user.updatedAtMs,
  );

export const resolvePresenceMeta = (user = {}, referenceTime = Date.now()) => {
  const lastActive = getPresenceTimestamp(user);
  if (!lastActive) return OFFLINE_META;

  const presenceState = String(user.presenceState || "").toLowerCase();
  const isOnline = user.isOnline === true;
  const age = referenceTime - lastActive.getTime();
  const isFresh = age <= ACTIVE_WINDOW_MS;

  if (!isFresh || presenceState === "offline") {
    return OFFLINE_META;
  }

  if (!isOnline || presenceState === "away" || presenceState === "background") {
    return AWAY_META;
  }

  return ONLINE_META;
};

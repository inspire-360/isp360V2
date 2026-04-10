export const PRESENCE_COLLECTION = "presence";
export const ACTIVE_WINDOW_MS = 45 * 1000;
export const PRESENCE_TICK_MS = 10 * 1000;

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

export const resolvePresenceMeta = (user = {}, referenceTime = Date.now()) => {
  const lastSeen = toDateValue(user.lastSeen, user.lastSeenMs);
  const presenceState = String(user.presenceState || "").toLowerCase();

  if (presenceState === "offline") {
    return {
      status: "offline",
      label: "Offline",
      isConnected: false,
      sortWeight: 0,
      tone: "border-slate-200 bg-slate-50 text-slate-500",
      dotTone: "bg-slate-300",
    };
  }

  if (!lastSeen) {
    return {
      status: "offline",
      label: "Offline",
      isConnected: false,
      sortWeight: 0,
      tone: "border-slate-200 bg-slate-50 text-slate-500",
      dotTone: "bg-slate-300",
    };
  }

  const age = referenceTime - lastSeen.getTime();
  if (age > ACTIVE_WINDOW_MS) {
    return {
      status: "offline",
      label: "Offline",
      isConnected: false,
      sortWeight: 0,
      tone: "border-slate-200 bg-slate-50 text-slate-500",
      dotTone: "bg-slate-300",
    };
  }

  if (["away", "background", "idle"].includes(presenceState)) {
    return {
      status: "away",
      label: "Away",
      isConnected: true,
      sortWeight: 1,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      dotTone: "bg-amber-400",
    };
  }

  return {
    status: "online",
    label: "Online",
    isConnected: true,
    sortWeight: 2,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotTone: "bg-emerald-500",
  };
};

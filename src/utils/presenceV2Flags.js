const trueValues = new Set(["1", "true", "yes", "on", "enabled"]);

const parseBooleanFlag = (value) => trueValues.has(String(value || "").trim().toLowerCase());

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPresenceV2FlagState = ({ currentUser } = {}) => {
  const enabled = parseBooleanFlag(import.meta.env.VITE_PRESENCE_V2_ENABLED);
  const databaseURL = String(import.meta.env.VITE_FIREBASE_DATABASE_URL || "").trim();

  return {
    enabled,
    databaseURL,
    hasDatabaseURL: Boolean(databaseURL),
    allowed: Boolean(enabled && currentUser?.uid && databaseURL),
  };
};

export const isPresenceV2EnabledForUser = (context) => getPresenceV2FlagState(context).allowed;

export const getPresenceV2HeartbeatMs = () =>
  parsePositiveNumber(import.meta.env.VITE_PRESENCE_V2_HEARTBEAT_MS, 30_000);

export const ADMIN_AGGREGATE_DOC_IDS = {
  overview: "overview",
  learning: "learning",
  support: "support",
  reviews: "reviews",
  innovations: "innovations",
  matching: "matching",
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toTimestampLabel = (value) => {
  if (!value) return "";

  const dateValue =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);

  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dateValue);
};

const buildDefaultAggregateData = (docId) => ({
  id: docId,
  title: "",
  snapshotAt: null,
  snapshotAtLabel: "",
  sourceVersion: 1,
  counts: {},
  health: {},
  highlights: [],
  coverage: {},
  status: "missing",
});

export const normalizeAdminAggregateRecord = (record = {}, { id = "" } = {}) => {
  const docId = id || record.id || "";
  const defaultRecord = buildDefaultAggregateData(docId);
  const counts = Object.entries(record.counts || {}).reduce((accumulator, [key, value]) => {
    accumulator[key] = toNumber(value, 0);
    return accumulator;
  }, {});

  return {
    ...defaultRecord,
    ...record,
    id: docId,
    sourceVersion: toNumber(record.sourceVersion, defaultRecord.sourceVersion),
    snapshotAt: record.snapshotAt || null,
    snapshotAtLabel: toTimestampLabel(record.snapshotAt),
    counts,
    health: {
      ...(defaultRecord.health || {}),
      ...(record.health || {}),
    },
    highlights: Array.isArray(record.highlights) ? record.highlights : [],
    coverage: {
      ...(defaultRecord.coverage || {}),
      ...(record.coverage || {}),
    },
    status: String(record.status || defaultRecord.status).trim() || defaultRecord.status,
  };
};

export const buildDefaultAdminAggregateMap = () =>
  Object.values(ADMIN_AGGREGATE_DOC_IDS).reduce((accumulator, docId) => {
    accumulator[docId] = buildDefaultAggregateData(docId);
    return accumulator;
  }, {});

export const mergeAdminAggregateMap = (rows = []) => {
  const nextMap = buildDefaultAdminAggregateMap();

  rows.forEach((row) => {
    if (!row?.id) return;
    nextMap[row.id] = normalizeAdminAggregateRecord(row, { id: row.id });
  });

  return nextMap;
};

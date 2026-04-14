import assert from "node:assert/strict";
import {
  ACTIVE_WINDOW_MS,
  resolvePresenceMeta,
} from "../src/utils/presenceStatus.js";
import {
  ADMIN_AGGREGATE_DOC_IDS,
  buildDefaultAdminAggregateMap,
  mergeAdminAggregateMap,
  normalizeAdminAggregateRecord,
} from "../src/services/firebase/mappers/adminAggregateMapper.js";

const tests = [];

const addTest = (name, fn) => {
  tests.push({ name, fn });
};

addTest("presence meta resolves online for fresh active users", () => {
  const now = new Date("2026-04-14T10:00:00.000Z");
  const meta = resolvePresenceMeta(
    {
      isOnline: true,
      presenceState: "online",
      updatedAt: new Date(now.getTime() - 5_000),
    },
    now.getTime(),
  );

  assert.equal(meta.status, "online");
  assert.equal(meta.isConnected, true);
});

addTest("presence meta resolves away for fresh background users", () => {
  const now = new Date("2026-04-14T10:00:00.000Z");
  const meta = resolvePresenceMeta(
    {
      isOnline: false,
      presenceState: "background",
      updatedAt: new Date(now.getTime() - 10_000),
    },
    now.getTime(),
  );

  assert.equal(meta.status, "away");
  assert.equal(meta.isConnected, false);
});

addTest("presence meta resolves offline when heartbeat is stale", () => {
  const now = new Date("2026-04-14T10:00:00.000Z");
  const meta = resolvePresenceMeta(
    {
      isOnline: true,
      presenceState: "online",
      updatedAt: new Date(now.getTime() - ACTIVE_WINDOW_MS - 5_000),
    },
    now.getTime(),
  );

  assert.equal(meta.status, "offline");
  assert.equal(meta.isConnected, false);
});

addTest("admin aggregate default map includes all expected doc ids", () => {
  const map = buildDefaultAdminAggregateMap();

  assert.deepEqual(
    Object.keys(map).sort(),
    Object.values(ADMIN_AGGREGATE_DOC_IDS).sort(),
  );
  assert.equal(map.overview.status, "missing");
  assert.equal(map.learning.snapshotAtLabel, "");
});

addTest("admin aggregate normalization coerces numeric counts and snapshot labels", () => {
  const snapshotDate = new Date("2026-04-14T15:30:00.000Z");
  const record = normalizeAdminAggregateRecord(
    {
      counts: {
        memberCount: "12",
        onlineNowCount: 4,
      },
      snapshotAt: snapshotDate,
      status: "ready",
    },
    { id: "overview" },
  );

  assert.equal(record.id, "overview");
  assert.equal(record.counts.memberCount, 12);
  assert.equal(record.counts.onlineNowCount, 4);
  assert.equal(typeof record.snapshotAtLabel, "string");
  assert.ok(record.snapshotAtLabel.length > 0);
});

addTest("admin aggregate merge overlays normalized rows onto the default map", () => {
  const map = mergeAdminAggregateMap([
    {
      id: "support",
      counts: {
        openTicketCount: "7",
      },
      status: "ready",
    },
  ]);

  assert.equal(map.support.counts.openTicketCount, 7);
  assert.equal(map.support.status, "ready");
  assert.equal(map.reviews.status, "missing");
});

let failed = false;

for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${name}`);
    console.error(error instanceof Error ? error.stack || error.message : String(error));
  }
}

if (failed) {
  process.exit(1);
}

console.log(`\n${tests.length} checks passed.`);

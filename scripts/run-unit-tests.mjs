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
import {
  buildCourseCertificate,
  generateCourseCertificateSerial,
} from "../src/data/courseCompletion.js";
import {
  buildEnrollmentInsight,
  buildPainPointCloud,
  collectMissionPainPointSignals,
} from "../src/utils/duMemberInsights.js";
import {
  TEXT_ANSWER_MIN_CHARACTERS,
  getTextAnswerCharacterCount,
  isTextAnswerValid,
  validateTextAnswer,
} from "../src/utils/textValidation.js";
import {
  assertMissionTextValid,
  getMissionTextValidationErrors,
  isMissionTextValid,
} from "../src/utils/missionTextValidation.js";
import {
  isLinkAnswerValid,
  validateLinkAnswer,
} from "../src/utils/linkValidation.js";
import {
  assertMissionLinksValid,
  getMissionLinkValidationErrors,
  isMissionLinkValid,
} from "../src/utils/missionLinkValidation.js";

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

addTest("course certificate normalizes Firestore timestamps", () => {
  const generatedAt = {
    toMillis: () => Date.parse("2026-04-14T06:00:00.000Z"),
  };
  const certificate = buildCourseCertificate(
    {},
    {
      uid: "teacher-123",
      email: "teacher@example.com",
      displayName: "Teacher One",
    },
    { generatedAt },
  );

  assert.equal(certificate.issuedAt, "2026-04-14T06:00:00.000Z");
  assert.equal(certificate.serialNumber, "INSPIRE360-20260414-HER123");
});

addTest("course certificate serial accepts Firestore timestamp shapes", () => {
  const serial = generateCourseCertificateSerial("abc-789", {
    seconds: Date.parse("2026-04-14T06:00:00.000Z") / 1000,
    nanoseconds: 250000000,
  });

  assert.equal(serial, "INSPIRE360-20260414-ABC789");
});

addTest("member learning insight preserves enrollment progress", () => {
  const insight = buildEnrollmentInsight({
    id: "course-teacher",
    completedLessonsCount: 2,
    lessonCount: 4,
    status: "active",
  });

  assert.equal(insight.courseId, "course-teacher");
  assert.equal(insight.progressPercent, 50);
  assert.equal(insight.status, "active");
});

addTest("member learning pain point signals are collected from mission responses", () => {
  const signals = collectMissionPainPointSignals([
    {
      userId: "member-1",
      courseId: "course-teacher",
      missionResponsesMap: {
        "m1-mission-1": {
          missionId: "m1-mission-1",
          answers: {
            q1: "Teachers need clearer onboarding, students need faster feedback",
          },
        },
      },
    },
  ]);
  const cloud = buildPainPointCloud(signals);

  assert.equal(signals.length, 2);
  assert.equal(cloud[0].userCount, 1);
  assert.ok(cloud.some((item) => item.text.includes("Teachers need clearer onboarding")));
});

addTest("text answer validation enforces the 15 character minimum after trim", () => {
  assert.equal(isTextAnswerValid("12345678901234"), false);
  assert.equal(isTextAnswerValid("  123456789012345  "), true);
  assert.equal(isTextAnswerValid("1234567890123456"), true);
  assert.equal(getTextAnswerCharacterCount("  123456789012345  "), TEXT_ANSWER_MIN_CHARACTERS);
});

addTest("text answer validation rejects whitespace-only and whitespace-padded bypasses", () => {
  assert.equal(isTextAnswerValid("                    "), false);
  assert.equal(isTextAnswerValid("a              "), false);
  assert.equal(getTextAnswerCharacterCount("  ab cd ef  "), 6);
});

addTest("text answer validation supports Thai, English, numbers, punctuation, and unicode", () => {
  assert.equal(isTextAnswerValid("ก".repeat(TEXT_ANSWER_MIN_CHARACTERS)), true);
  assert.equal(isTextAnswerValid("Enterprise-ready answer! 123"), true);
  assert.equal(isTextAnswerValid("ตอบด้วยภาษาไทยครบแน่นอน"), true);
});

addTest("text answer validation returns localized field errors", () => {
  const result = validateTextAnswer("short", {
    field: "reflection",
    label: "reflection",
    language: "en",
  });

  assert.equal(result.isValid, false);
  assert.equal(result.field, "reflection");
  assert.equal(result.message, "Please enter at least 15 characters.");
});

addTest("mission text validation reports each invalid text field separately", () => {
  const validAnswer = "a".repeat(TEXT_ANSWER_MIN_CHARACTERS);
  const errors = getMissionTextValidationErrors({
    type: "pitch",
    projectName: "short",
    teaser: validAnswer,
    cards: [
      { answer: validAnswer },
      { answer: "   " },
      { answer: validAnswer },
    ],
  });

  assert.deepEqual(
    errors.map((error) => error.field),
    ["projectName", "cards.*.answer[1]"],
  );
});

addTest("mission text validation supports dynamic selected fields", () => {
  const validAnswer = "b".repeat(TEXT_ANSWER_MIN_CHARACTERS);
  const payload = {
    type: "dream-lab",
    selectedStrategyId: "selected",
    strategies: [
      { id: "ignored", answer: "short" },
      { id: "selected", answer: validAnswer },
    ],
    sparkNote: validAnswer,
  };

  assert.equal(isMissionTextValid(payload), true);
});

addTest("mission text validation throws API-ready validation errors", () => {
  const validAnswer = "c".repeat(TEXT_ANSWER_MIN_CHARACTERS);

  assert.throws(
    () =>
      assertMissionTextValid({
        type: "platform-survey",
        favoritePart: validAnswer,
        improvementIdea: " ",
        finalReflection: validAnswer,
      }),
    (error) => {
      assert.equal(error.name, "TextValidationError");
      assert.equal(error.code, "text/min-characters");
      assert.equal(error.validationErrors[0].field, "improvementIdea");
      return true;
    },
  );
});

addTest("link answer validation accepts only http and https URLs", () => {
  assert.equal(isLinkAnswerValid("https://drive.google.com/file/d/example/view"), true);
  assert.equal(isLinkAnswerValid("http://example.com/asset.png"), true);
  assert.equal(isLinkAnswerValid("drive.google.com/file/d/example/view"), false);
  assert.equal(isLinkAnswerValid("ftp://example.com/asset.png"), false);
  assert.equal(isLinkAnswerValid("https://..."), false);
});

addTest("link answer validation returns localized field errors", () => {
  const result = validateLinkAnswer("not-a-link", {
    field: "blueprintLink",
    label: "blueprint link",
    language: "en",
  });

  assert.equal(result.isValid, false);
  assert.equal(result.field, "blueprintLink");
  assert.equal(result.message, "Please enter a valid link starting with http:// or https://.");
});

addTest("mission link validation reports required link fields", () => {
  const errors = getMissionLinkValidationErrors({
    type: "mastermind-comments",
    commentOneEvidence: "https://drive.google.com/comment-one.png",
    commentTwoEvidence: "not-a-url",
  });

  assert.deepEqual(
    errors.map((error) => error.field),
    ["commentTwoEvidence"],
  );
});

addTest("mission link validation throws API-ready validation errors", () => {
  assert.throws(
    () =>
      assertMissionLinksValid({
        type: "spell-pitch",
        pitchLink: "voice-note-without-protocol",
      }),
    (error) => {
      assert.equal(error.name, "LinkValidationError");
      assert.equal(error.code, "link/invalid-url");
      assert.equal(error.validationErrors[0].field, "pitchLink");
      return true;
    },
  );
});

addTest("master blueprint metadata fields are exempt from the 15 character minimum", () => {
  const validAnswer = "d".repeat(TEXT_ANSWER_MIN_CHARACTERS);
  const payload = {
    type: "master-blueprint",
    innovationName: validAnswer,
    teacherName: "ครูเอ",
    subjectName: "AI",
    gradeLevel: "ม.2",
    durationLabel: "50 นาที",
    inspiration: validAnswer,
    objectives: validAnswer,
    innovationFormat: validAnswer,
    innovationMechanism: validAnswer,
    hookPhase: validAnswer,
    actionPhase: validAnswer,
    reflectPhase: validAnswer,
    creativeEvaluation: validAnswer,
    resourcesNeeded: validAnswer,
    blueprintLink: "https://drive.google.com/blueprint.pdf",
  };

  assert.equal(isMissionTextValid(payload), true);
  assert.equal(isMissionLinkValid(payload), true);
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

import { Timestamp } from "firebase-admin/firestore";
import {
  parseArgs,
  toBoolean,
  toPositiveInteger,
} from "./mission-response-migration-utils.mjs";

export { parseArgs, toBoolean, toPositiveInteger };

export const ADMIN_AGGREGATE_SOURCE_VERSION = 1;
export const ADMIN_AGGREGATE_DOC_IDS = Object.freeze({
  overview: "overview",
  learning: "learning",
  support: "support",
  reviews: "reviews",
  innovations: "innovations",
  matching: "matching",
});

export const ADMIN_AGGREGATE_DOC_LABELS = Object.freeze({
  [ADMIN_AGGREGATE_DOC_IDS.overview]: "สมาชิกและการเข้าใช้งาน",
  [ADMIN_AGGREGATE_DOC_IDS.learning]: "ความคืบหน้าการเรียน",
  [ADMIN_AGGREGATE_DOC_IDS.support]: "ศูนย์ SOS",
  [ADMIN_AGGREGATE_DOC_IDS.reviews]: "วิดีโอการสอน",
  [ADMIN_AGGREGATE_DOC_IDS.innovations]: "กระดานนวัตกรรม",
  [ADMIN_AGGREGATE_DOC_IDS.matching]: "การจับคู่ผู้เชี่ยวชาญ",
});

const ACTIVE_WINDOW_MS = 45 * 1000;
const STALLED_ENROLLMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_ENROLLMENT_WINDOW_MS = 48 * 60 * 60 * 1000;
const OVERDUE_SUPPORT_WINDOW_MS = 72 * 60 * 60 * 1000;
const STALE_REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const COMPLETED_ENROLLMENT_STATUS_SET = new Set([
  "completed",
  "complete",
  "done",
  "finished",
  "success",
  "ผ่าน",
  "ผ่านแล้ว",
  "สำเร็จ",
  "เสร็จสิ้น",
  "เสร็จแล้ว",
  "เรียนจบแล้ว",
  "จบแล้ว",
]);

const ACTIVE_ENROLLMENT_STATUS_SET = new Set([
  "active",
  "in_progress",
  "in progress",
  "learning",
  "ongoing",
  "กำลังเรียน",
  "กำลังดำเนินการ",
  "กำลังทำ",
]);

const NOT_STARTED_ENROLLMENT_STATUS_SET = new Set([
  "not_started",
  "not started",
  "pending",
  "ยังไม่เริ่ม",
  "รอเริ่ม",
]);

const VIDEO_STATUS_SET = new Set(["pending_feedback", "coaching", "reviewed"]);
const INNOVATION_STAGE_MAP = new Map([
  ["idea", "ไอเดียเบื้องต้น"],
  ["ไอเดียเบื้องต้น", "ไอเดียเบื้องต้น"],
  ["prototype", "กำลังพัฒนาต้นแบบ"],
  ["กำลังพัฒนาต้นแบบ", "กำลังพัฒนาต้นแบบ"],
  ["funded", "ได้รับทุนตั้งต้น"],
  ["ได้รับทุนตั้งต้น", "ได้รับทุนตั้งต้น"],
  ["best_practice", "แนวปฏิบัติที่เป็นเลิศ"],
  ["best practice", "แนวปฏิบัติที่เป็นเลิศ"],
  ["แนวปฏิบัติที่เป็นเลิศ", "แนวปฏิบัติที่เป็นเลิศ"],
]);
const MATCH_STATUS_SET = new Set(["pending_match", "matched", "completed"]);
const EXPERT_CAPACITY_SET = new Set(["available", "limited", "paused"]);

const normalizeString = (value = "") => String(value ?? "").trim();
const normalizeLower = (value = "") => normalizeString(value).toLowerCase();
const roundWhole = (value) => Math.max(0, Math.round(Number(value) || 0));

const limitHighlights = (values = [], limit = 3) =>
  values.map((value) => normalizeString(value)).filter(Boolean).slice(0, limit);

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && Number.isFinite(value.seconds)) {
    return (Number(value.seconds) * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1_000_000);
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const clampPercent = (value) => Math.max(0, Math.min(100, roundWhole(value)));

const normalizeUserRole = (value = "") => {
  const normalized = normalizeLower(value);
  if (["admin", "du admin", "du_admin", "duadmin", "super admin", "super_admin"].includes(normalized)) {
    return "admin";
  }
  if (["learner", "student"].includes(normalized)) return "learner";
  return "teacher";
};

const normalizeMemberStatus = (value = "") => {
  const normalized = normalizeLower(value);
  if (["pending", "invited", "waiting"].includes(normalized)) return "pending";
  if (["inactive", "disabled", "suspended", "archived"].includes(normalized)) return "inactive";
  return "active";
};

const normalizeEnrollmentStatus = (status = "", progressPercent = 0) => {
  const normalizedStatus = normalizeLower(status);
  if (progressPercent >= 100 || COMPLETED_ENROLLMENT_STATUS_SET.has(normalizedStatus)) return "completed";
  if (ACTIVE_ENROLLMENT_STATUS_SET.has(normalizedStatus)) return "active";
  if (NOT_STARTED_ENROLLMENT_STATUS_SET.has(normalizedStatus)) return "not_started";
  if (progressPercent > 0) return "active";
  return "not_started";
};

const resolveCompletedLessonsCount = (enrollment = {}) => {
  if (typeof enrollment.completedLessonsCount === "number") return enrollment.completedLessonsCount;
  if (Array.isArray(enrollment.completedLessons)) return enrollment.completedLessons.length;
  return 0;
};

const resolveLessonCount = (enrollment = {}) => {
  const lessonCount = Number(enrollment.lessonCount);
  return Number.isFinite(lessonCount) && lessonCount > 0 ? lessonCount : 0;
};

const resolveProgressPercent = (enrollment = {}) => {
  const storedPercent =
    typeof enrollment.progressPercent === "number"
      ? clampPercent(enrollment.progressPercent)
      : typeof enrollment.progress === "number"
        ? clampPercent(enrollment.progress)
        : 0;
  const lessonCount = resolveLessonCount(enrollment);
  const completedLessonsCount = resolveCompletedLessonsCount(enrollment);
  const countedPercent =
    lessonCount > 0 ? clampPercent((completedLessonsCount / lessonCount) * 100) : 0;

  return Math.max(storedPercent, countedPercent);
};

const normalizeSupportStatus = (value = "") => {
  const normalized = normalizeString(value);
  if (normalized === "ปิดงาน") return "closed";
  if (normalized === "กำลังช่วยเหลือ") return "in_progress";
  return "open";
};

const isUrgentSupportTicket = (value = "") => {
  const normalized = normalizeString(value);
  return normalized === "ฉุกเฉินวิกฤต"
    || normalized === "ฉุกเฉินหนัก"
    || normalized === "ฉุกเฉิน";
};

const normalizeVideoStatus = (value = "") => {
  const normalized = normalizeLower(value);
  return VIDEO_STATUS_SET.has(normalized) ? normalized : "pending_feedback";
};

const normalizeInnovationStage = (value = "") =>
  INNOVATION_STAGE_MAP.get(normalizeLower(value)) || "ไอเดียเบื้องต้น";

const normalizeMatchStatus = (value = "") => {
  const normalized = normalizeLower(value);
  return MATCH_STATUS_SET.has(normalized) ? normalized : "pending_match";
};

const normalizeExpertCapacity = (value = "") => {
  const normalized = normalizeLower(value);
  return EXPERT_CAPACITY_SET.has(normalized) ? normalized : "available";
};

const hasPlaceholderVideoUrlText = (value = "") => {
  const normalized = normalizeLower(value);
  return normalized.includes("ใส่ลิงก์")
    || normalized.includes("google drive / youtube")
    || normalized.includes("https://...");
};

const isUsableVideoUrl = (value = "") => {
  const normalized = normalizeString(value);
  if (!normalized) return false;
  if (normalized.toLowerCase().startsWith("file://")) return false;
  if (hasPlaceholderVideoUrlText(normalized)) return false;

  try {
    const parsed = new URL(normalized);
    const host = normalizeLower(parsed.hostname);
    const pathname = normalizeLower(parsed.pathname);

    if (host.includes("youtu.be") || host.includes("youtube.com")) return true;
    if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
      return pathname.includes("/file/") || parsed.searchParams.has("id");
    }
    if (/\.(mp4|webm|ogg|m4v|mov)$/.test(pathname)) return true;
    if (host.includes("firebasestorage.googleapis.com")) return true;
    return parsed.searchParams.get("alt") === "media";
  } catch {
    return false;
  }
};

const buildAggregateDoc = ({
  docId,
  snapshotAt = Timestamp.now(),
  counts = {},
  health = {},
  coverage = {},
  highlights = [],
} = {}) => ({
  title: ADMIN_AGGREGATE_DOC_LABELS[docId] || docId,
  snapshotAt,
  sourceVersion: ADMIN_AGGREGATE_SOURCE_VERSION,
  counts,
  health,
  coverage,
  highlights: limitHighlights(highlights),
  status: "ready",
});

export const normalizeAdminAggregateDocIds = (docId = "") => {
  const normalized = normalizeString(docId);
  if (!normalized) return Object.values(ADMIN_AGGREGATE_DOC_IDS);
  if (!Object.values(ADMIN_AGGREGATE_DOC_IDS).includes(normalized)) {
    throw new Error(`Unknown admin aggregate doc id: ${normalized}`);
  }
  return [normalized];
};

export const loadAdminMonitoringSources = async ({ db } = {}) => {
  const [
    usersSnapshot,
    presenceSnapshot,
    enrollmentsSnapshot,
    ticketsSnapshot,
    videosSnapshot,
    innovationsSnapshot,
    expertsSnapshot,
    matchRequestsSnapshot,
  ] = await Promise.all([
    db.collection("users").get(),
    db.collection("presence").get(),
    db.collectionGroup("enrollments").get(),
    db.collection("sos_tickets").get(),
    db.collection("videos").get(),
    db.collection("innovations").get(),
    db.collection("experts").get(),
    db.collection("match_requests").get(),
  ]);

  return {
    users: usersSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    presence: presenceSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    enrollments: enrollmentsSnapshot.docs.map((item) => ({
      id: item.id,
      userId: item.ref.parent.parent?.id || "",
      path: item.ref.path,
      ...item.data(),
    })),
    tickets: ticketsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    videos: videosSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    innovations: innovationsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    experts: expertsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    matchRequests: matchRequestsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
  };
};

const buildOverviewAggregate = ({ users = [], presence = [], snapshotAt, nowMs }) => {
  const onlineNowCount = presence.filter((item) => {
    const lastActiveMs = toMillis(item.lastActiveAt || item.lastActive || item.lastSeen || item.updatedAt);
    if (!lastActiveMs || (nowMs - lastActiveMs) > ACTIVE_WINDOW_MS) return false;

    const presenceState = normalizeLower(item.presenceState);
    if (presenceState === "offline" || presenceState === "away" || presenceState === "background") {
      return false;
    }

    return item.isOnline === true;
  }).length;

  const roleSummary = users.reduce(
    (accumulator, user) => {
      accumulator[normalizeUserRole(user.role)] += 1;
      return accumulator;
    },
    { admin: 0, teacher: 0, learner: 0 },
  );

  const memberStatusSummary = users.reduce(
    (accumulator, user) => {
      accumulator[normalizeMemberStatus(user.memberStatus || user.status)] += 1;
      return accumulator;
    },
    { active: 0, pending: 0, inactive: 0 },
  );

  const profileContractReadyCount = users.filter((user) =>
    normalizeString(user.memberStatus || user.status)
    && normalizeString(user.sourceProvider)
    && Boolean(user.lastLoginAt || user.lastLogin)
    && Number(user.profileVersion || 0) >= 2,
  ).length;

  return buildAggregateDoc({
    docId: ADMIN_AGGREGATE_DOC_IDS.overview,
    snapshotAt,
    counts: {
      memberCount: users.length,
      onlineNowCount,
      adminCount: roleSummary.admin,
      teacherCount: roleSummary.teacher,
      learnerCount: roleSummary.learner,
      activeMemberCount: memberStatusSummary.active,
      pendingMemberCount: memberStatusSummary.pending,
      inactiveMemberCount: memberStatusSummary.inactive,
      profileContractReadyCount,
    },
    health: {
      missingProfileContractCount: Math.max(0, users.length - profileContractReadyCount),
      missingSourceProviderCount: users.filter((user) => !normalizeString(user.sourceProvider)).length,
      missingLastLoginAtCount: users.filter((user) => !toMillis(user.lastLoginAt || user.lastLogin)).length,
    },
    coverage: {
      userCount: users.length,
      presenceCount: presence.length,
    },
    highlights: [
      `สมาชิกในระบบ ${users.length} คน`,
      `ออนไลน์ตอนนี้ ${onlineNowCount} คน`,
      `profile contract พร้อมใช้ ${profileContractReadyCount} คน`,
    ],
  });
};

const buildLearningAggregate = ({ enrollments = [], snapshotAt, nowMs }) => {
  const normalized = enrollments.map((enrollment) => {
    const progressPercent = resolveProgressPercent(enrollment);
    const status = normalizeEnrollmentStatus(enrollment.status, progressPercent);
    const activityMs = Math.max(
      toMillis(enrollment.lastSavedAt),
      toMillis(enrollment.lastAccessAt),
      toMillis(enrollment.lastAccess),
      toMillis(enrollment.updatedAt),
      toMillis(enrollment.enrolledAt),
    );

    return { ...enrollment, progressPercent, status, activityMs };
  });

  const activeEnrollmentCount = normalized.filter((item) => item.status === "active").length;
  const completedEnrollmentCount = normalized.filter((item) => item.status === "completed").length;
  const notStartedEnrollmentCount = normalized.filter((item) => item.status === "not_started").length;
  const stalledEnrollmentCount = normalized.filter((item) =>
    item.status !== "completed" && item.activityMs > 0 && (nowMs - item.activityMs) > STALLED_ENROLLMENT_WINDOW_MS,
  ).length;
  const recentlyActiveEnrollmentCount = normalized.filter((item) =>
    item.activityMs > 0 && (nowMs - item.activityMs) <= RECENT_ENROLLMENT_WINDOW_MS,
  ).length;
  const averageProgressPercent = normalized.length
    ? clampPercent(normalized.reduce((sum, item) => sum + item.progressPercent, 0) / normalized.length)
    : 0;

  return buildAggregateDoc({
    docId: ADMIN_AGGREGATE_DOC_IDS.learning,
    snapshotAt,
    counts: {
      enrollmentCount: normalized.length,
      activeEnrollmentCount,
      completedEnrollmentCount,
      notStartedEnrollmentCount,
      stalledEnrollmentCount,
      recentlyActiveEnrollmentCount,
      averageProgressPercent,
    },
    health: {
      missingCourseTitleCount: normalized.filter((item) => !normalizeString(item.courseTitle)).length,
      missingLastSavedCount: normalized.filter((item) => item.activityMs === 0).length,
      zeroProgressActiveCount: normalized.filter((item) => item.status === "active" && item.progressPercent === 0).length,
    },
    coverage: {
      enrollmentCount: normalized.length,
    },
    highlights: [
      `กำลังเรียน ${activeEnrollmentCount} รายการ`,
      `จบแล้ว ${completedEnrollmentCount} รายการ`,
      `ความคืบหน้าเฉลี่ย ${averageProgressPercent}%`,
    ],
  });
};

const buildSupportAggregate = ({ tickets = [], snapshotAt, nowMs }) => {
  const normalized = tickets.map((ticket) => ({
    ...ticket,
    status: normalizeSupportStatus(ticket.status),
    createdAtMs: toMillis(ticket.createdAt),
  }));

  const openTicketCount = normalized.filter((ticket) => ticket.status !== "closed").length;
  const inProgressTicketCount = normalized.filter((ticket) => ticket.status === "in_progress").length;
  const closedTicketCount = normalized.filter((ticket) => ticket.status === "closed").length;
  const urgentOpenTicketCount = normalized.filter((ticket) =>
    ticket.status !== "closed" && isUrgentSupportTicket(ticket.urgencyLevel),
  ).length;
  const overdueOpenTicketCount = normalized.filter((ticket) =>
    ticket.status !== "closed" && ticket.createdAtMs > 0 && (nowMs - ticket.createdAtMs) > OVERDUE_SUPPORT_WINDOW_MS,
  ).length;
  const unassignedOpenTicketCount = normalized.filter((ticket) =>
    ticket.status !== "closed" && !normalizeString(ticket.assignedTo),
  ).length;

  return buildAggregateDoc({
    docId: ADMIN_AGGREGATE_DOC_IDS.support,
    snapshotAt,
    counts: {
      ticketCount: normalized.length,
      openTicketCount,
      inProgressTicketCount,
      closedTicketCount,
      urgentOpenTicketCount,
      overdueOpenTicketCount,
      unassignedOpenTicketCount,
    },
    health: {
      missingRequesterIdCount: normalized.filter((ticket) => !normalizeString(ticket.requesterId)).length,
      missingUrgencyLevelCount: normalized.filter((ticket) => !normalizeString(ticket.urgencyLevel)).length,
      missingStatusCount: normalized.filter((ticket) => !normalizeString(ticket.status)).length,
    },
    coverage: {
      ticketCount: normalized.length,
    },
    highlights: [
      `ค้างดูแล ${openTicketCount} เคส`,
      `เร่งด่วน ${urgentOpenTicketCount} เคส`,
      `กำลังช่วยเหลือ ${inProgressTicketCount} เคส`,
    ],
  });
};

const buildReviewsAggregate = ({ videos = [], snapshotAt, nowMs }) => {
  const normalized = videos.map((video) => ({
    ...video,
    reviewStatus: normalizeVideoStatus(video.reviewStatus),
    activityMs: Math.max(
      toMillis(video.updatedAt),
      toMillis(video.lastCommentAt),
      toMillis(video.submittedAt),
    ),
  }));

  const pendingVideoReviewCount = normalized.filter((video) => video.reviewStatus === "pending_feedback").length;
  const coachingVideoCount = normalized.filter((video) => video.reviewStatus === "coaching").length;
  const reviewedVideoCount = normalized.filter((video) => video.reviewStatus === "reviewed").length;
  const stalePendingVideoCount = normalized.filter((video) =>
    video.reviewStatus !== "reviewed" && video.activityMs > 0 && (nowMs - video.activityMs) > STALE_REVIEW_WINDOW_MS,
  ).length;

  return buildAggregateDoc({
    docId: ADMIN_AGGREGATE_DOC_IDS.reviews,
    snapshotAt,
    counts: {
      totalVideoCount: normalized.length,
      pendingVideoReviewCount,
      coachingVideoCount,
      reviewedVideoCount,
      stalePendingVideoCount,
    },
    health: {
      invalidVideoUrlCount: normalized.filter((video) => !isUsableVideoUrl(video.videoUrl)).length,
      missingTeacherNameCount: normalized.filter((video) =>
        !normalizeString(video.teacherName) || normalizeString(video.teacherName) === normalizeString(video.teacherId),
      ).length,
      missingSchoolNameCount: normalized.filter((video) => !normalizeString(video.schoolName)).length,
    },
    coverage: {
      videoCount: normalized.length,
    },
    highlights: [
      `รอรีวิว ${pendingVideoReviewCount} รายการ`,
      `กำลังโค้ช ${coachingVideoCount} รายการ`,
      `รีวิวแล้ว ${reviewedVideoCount} รายการ`,
    ],
  });
};

const buildInnovationsAggregate = ({ innovations = [], snapshotAt }) => {
  const normalized = innovations.map((innovation) => ({
    ...innovation,
    stage: normalizeInnovationStage(innovation.stage),
  }));

  const ideaInnovationCount = normalized.filter((item) => item.stage === "ไอเดียเบื้องต้น").length;
  const prototypeInnovationCount = normalized.filter((item) => item.stage === "กำลังพัฒนาต้นแบบ").length;
  const fundedInnovationCount = normalized.filter((item) => item.stage === "ได้รับทุนตั้งต้น").length;
  const bestPracticeInnovationCount = normalized.filter((item) => item.stage === "แนวปฏิบัติที่เป็นเลิศ").length;

  return buildAggregateDoc({
    docId: ADMIN_AGGREGATE_DOC_IDS.innovations,
    snapshotAt,
    counts: {
      totalInnovationCount: normalized.length,
      ideaInnovationCount,
      prototypeInnovationCount,
      fundedInnovationCount,
      bestPracticeInnovationCount,
    },
    health: {
      missingTitleCount: normalized.filter((item) => !normalizeString(item.title)).length,
      missingTeacherNameCount: normalized.filter((item) => !normalizeString(item.teacherName)).length,
      missingSchoolNameCount: normalized.filter((item) => !normalizeString(item.schoolName)).length,
      missingSummaryCount: normalized.filter((item) =>
        !normalizeString(item.summary) && !normalizeString(item.description),
      ).length,
    },
    coverage: {
      innovationCount: normalized.length,
    },
    highlights: [
      `นวัตกรรมทั้งหมด ${normalized.length} รายการ`,
      `ต้นแบบ ${prototypeInnovationCount} รายการ`,
      `best practice ${bestPracticeInnovationCount} รายการ`,
    ],
  });
};

const buildMatchingAggregate = ({ experts = [], matchRequests = [], snapshotAt }) => {
  const normalizedExperts = experts.map((expert) => ({
    ...expert,
    capacityStatus: normalizeExpertCapacity(expert.capacityStatus),
  }));
  const normalizedRequests = matchRequests.map((request) => ({
    ...request,
    status: normalizeMatchStatus(request.status),
  }));

  const availableExpertCount = normalizedExperts.filter((expert) => expert.isActive !== false).length;
  const limitedExpertCount = normalizedExperts.filter((expert) => expert.capacityStatus === "limited").length;
  const pausedExpertCount = normalizedExperts.filter((expert) => expert.capacityStatus === "paused").length;
  const syncedExpertCount = normalizedExperts.filter((expert) => normalizeLower(expert.syncState) === "synced").length;
  const pendingMatchRequestCount = normalizedRequests.filter((request) => request.status === "pending_match").length;
  const matchedMatchRequestCount = normalizedRequests.filter((request) => request.status === "matched").length;
  const completedMatchRequestCount = normalizedRequests.filter((request) => request.status === "completed").length;
  const highPriorityPendingMatchRequestCount = normalizedRequests.filter((request) =>
    request.status === "pending_match" && normalizeLower(request.priority) === "high",
  ).length;

  return buildAggregateDoc({
    docId: ADMIN_AGGREGATE_DOC_IDS.matching,
    snapshotAt,
    counts: {
      totalMatchRequestCount: normalizedRequests.length,
      pendingMatchRequestCount,
      matchedMatchRequestCount,
      completedMatchRequestCount,
      highPriorityPendingMatchRequestCount,
      availableExpertCount,
      limitedExpertCount,
      pausedExpertCount,
      syncedExpertCount,
    },
    health: {
      missingRequesterSnapshotCount: normalizedRequests.filter((request) =>
        !normalizeString(request.requesterProfileSnapshot?.name),
      ).length,
      missingMatchedExpertSnapshotCount: normalizedRequests.filter((request) =>
        request.status !== "pending_match" && !normalizeString(request.matchedExpertSnapshot?.id),
      ).length,
      inactiveExpertCount: normalizedExperts.filter((expert) => expert.isActive === false).length,
    },
    coverage: {
      expertCount: normalizedExperts.length,
      matchRequestCount: normalizedRequests.length,
    },
    highlights: [
      `รอจับคู่ ${pendingMatchRequestCount} คำร้อง`,
      `ผู้เชี่ยวชาญพร้อมรับงาน ${availableExpertCount} คน`,
      `ปิดงานแล้ว ${completedMatchRequestCount} คำร้อง`,
    ],
  });
};

export const buildAdminAggregateDocuments = ({
  sources = {},
  snapshotAt = Timestamp.now(),
  docIds = Object.values(ADMIN_AGGREGATE_DOC_IDS),
} = {}) => {
  const nowMs = toMillis(snapshotAt) || Date.now();
  const byId = {
    [ADMIN_AGGREGATE_DOC_IDS.overview]: buildOverviewAggregate({
      users: sources.users || [],
      presence: sources.presence || [],
      snapshotAt,
      nowMs,
    }),
    [ADMIN_AGGREGATE_DOC_IDS.learning]: buildLearningAggregate({
      enrollments: sources.enrollments || [],
      snapshotAt,
      nowMs,
    }),
    [ADMIN_AGGREGATE_DOC_IDS.support]: buildSupportAggregate({
      tickets: sources.tickets || [],
      snapshotAt,
      nowMs,
    }),
    [ADMIN_AGGREGATE_DOC_IDS.reviews]: buildReviewsAggregate({
      videos: sources.videos || [],
      snapshotAt,
      nowMs,
    }),
    [ADMIN_AGGREGATE_DOC_IDS.innovations]: buildInnovationsAggregate({
      innovations: sources.innovations || [],
      snapshotAt,
    }),
    [ADMIN_AGGREGATE_DOC_IDS.matching]: buildMatchingAggregate({
      experts: sources.experts || [],
      matchRequests: sources.matchRequests || [],
      snapshotAt,
    }),
  };

  return docIds.reduce((accumulator, docId) => {
    accumulator[docId] = byId[docId];
    return accumulator;
  }, {});
};

const diffNumericKeys = (expected = {}, actual = {}) =>
  Object.keys(expected).filter((key) => Number(actual?.[key] ?? NaN) !== Number(expected[key] ?? NaN));

export const buildAdminAggregateQualityReport = ({
  expectedDocs = {},
  actualDocs = {},
  maxAgeHours = 24,
} = {}) => {
  const nowMs = Date.now();
  const report = {
    ok: true,
    totalExpectedDocs: Object.keys(expectedDocs).length,
    totalActualDocs: Object.keys(actualDocs).length,
    missingDocCount: 0,
    missingSnapshotCount: 0,
    staleSnapshotCount: 0,
    titleMismatchCount: 0,
    sourceVersionMismatchCount: 0,
    statusMismatchCount: 0,
    countMismatchCount: 0,
    healthMismatchCount: 0,
    coverageMismatchCount: 0,
    missingDocs: [],
    missingSnapshotDocs: [],
    staleSnapshotDocs: [],
    titleMismatchDocs: [],
    sourceVersionMismatchDocs: [],
    statusMismatchDocs: [],
    countMismatchDocs: [],
    healthMismatchDocs: [],
    coverageMismatchDocs: [],
  };

  Object.entries(expectedDocs).forEach(([docId, expectedDoc]) => {
    const actualDoc = actualDocs[docId];
    if (!actualDoc) {
      report.missingDocCount += 1;
      report.missingDocs.push(docId);
      return;
    }

    const snapshotMs = toMillis(actualDoc.snapshotAt);
    if (!snapshotMs) {
      report.missingSnapshotCount += 1;
      report.missingSnapshotDocs.push(docId);
    } else if (maxAgeHours > 0 && (nowMs - snapshotMs) > (maxAgeHours * 60 * 60 * 1000)) {
      report.staleSnapshotCount += 1;
      report.staleSnapshotDocs.push(docId);
    }

    if (normalizeString(actualDoc.title) !== normalizeString(expectedDoc.title)) {
      report.titleMismatchCount += 1;
      report.titleMismatchDocs.push(docId);
    }
    if (Number(actualDoc.sourceVersion || 0) !== Number(expectedDoc.sourceVersion || 0)) {
      report.sourceVersionMismatchCount += 1;
      report.sourceVersionMismatchDocs.push(docId);
    }
    if (normalizeString(actualDoc.status) !== normalizeString(expectedDoc.status)) {
      report.statusMismatchCount += 1;
      report.statusMismatchDocs.push(docId);
    }

    const countMismatchKeys = diffNumericKeys(expectedDoc.counts, actualDoc.counts);
    if (countMismatchKeys.length > 0) {
      report.countMismatchCount += 1;
      report.countMismatchDocs.push({ docId, keys: countMismatchKeys });
    }

    const healthMismatchKeys = diffNumericKeys(expectedDoc.health, actualDoc.health);
    if (healthMismatchKeys.length > 0) {
      report.healthMismatchCount += 1;
      report.healthMismatchDocs.push({ docId, keys: healthMismatchKeys });
    }

    const coverageMismatchKeys = diffNumericKeys(expectedDoc.coverage, actualDoc.coverage);
    if (coverageMismatchKeys.length > 0) {
      report.coverageMismatchCount += 1;
      report.coverageMismatchDocs.push({ docId, keys: coverageMismatchKeys });
    }
  });

  report.countMismatchDocs = report.countMismatchDocs.slice(0, 25);
  report.healthMismatchDocs = report.healthMismatchDocs.slice(0, 25);
  report.coverageMismatchDocs = report.coverageMismatchDocs.slice(0, 25);
  report.missingDocs = report.missingDocs.slice(0, 25);
  report.missingSnapshotDocs = report.missingSnapshotDocs.slice(0, 25);
  report.staleSnapshotDocs = report.staleSnapshotDocs.slice(0, 25);
  report.titleMismatchDocs = report.titleMismatchDocs.slice(0, 25);
  report.sourceVersionMismatchDocs = report.sourceVersionMismatchDocs.slice(0, 25);
  report.statusMismatchDocs = report.statusMismatchDocs.slice(0, 25);

  return report;
};

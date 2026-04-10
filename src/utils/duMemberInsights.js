import { serverTimestamp } from "firebase/firestore";
import { courseCatalog } from "../data/courseCatalog";

export const resolveCourseMeta = (courseId) =>
  courseCatalog.find((item) => item.id === courseId) || null;

export const resolveCompletedLessonsCount = (enrollment = {}) => {
  if (typeof enrollment.completedLessonsCount === "number") return enrollment.completedLessonsCount;
  if (Array.isArray(enrollment.completedLessons)) return enrollment.completedLessons.length;
  return 0;
};

export const resolveLessonCount = (enrollment = {}) => {
  if (typeof enrollment.lessonCount === "number" && enrollment.lessonCount > 0) {
    return enrollment.lessonCount;
  }
  const courseId = enrollment.courseId || enrollment.id;
  return resolveCourseMeta(courseId)?.lessonCount || 0;
};

const hasTrackedCompletionCount = (enrollment = {}) =>
  typeof enrollment.completedLessonsCount === "number" || Array.isArray(enrollment.completedLessons);

export const resolveProgressPercent = (enrollment = {}) => {
  const lessonCount = resolveLessonCount(enrollment);

  if (lessonCount > 0 && hasTrackedCompletionCount(enrollment)) {
    return Math.min(100, Math.round((resolveCompletedLessonsCount(enrollment) / lessonCount) * 100));
  }

  if (enrollment.status === "completed") return 100;
  if (typeof enrollment.progressPercent === "number") {
    return Math.max(0, Math.min(100, Math.round(enrollment.progressPercent)));
  }
  if (typeof enrollment.progress === "number") {
    return Math.max(0, Math.min(100, Math.round(enrollment.progress)));
  }
  return 0;
};

export const buildEnrollmentInsight = (enrollment = {}) => {
  const courseId = enrollment.courseId || enrollment.id || "";
  const courseMeta = resolveCourseMeta(courseId);
  const completedLessonsCount = resolveCompletedLessonsCount(enrollment);
  const lessonCount = resolveLessonCount(enrollment);
  const progressPercent = resolveProgressPercent(enrollment);

  return {
    ...enrollment,
    courseId,
    courseTitle: courseMeta?.title || courseId || "Untitled course",
    completedLessonsCount,
    lessonCount,
    progressPercent,
    activeModuleTitle: enrollment.activeModuleTitle || "",
    activeLessonTitle: enrollment.activeLessonTitle || "",
    activeLessonId: enrollment.activeLessonId || "",
    status: enrollment.status || (progressPercent >= 100 ? "completed" : "active"),
  };
};

export const resolveDisplayName = (user = {}) =>
  user.name ||
  [user.prefix, user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
  user.email ||
  "Unknown user";

export const buildUserDraft = (user = {}) => ({
  prefix: user.prefix || "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  position: user.position || "",
  school: user.school || "",
  role: user.role || "learner",
  resetTarget: "all",
});

export const buildResetPayload = (operatorName) => {
  const timestamp = serverTimestamp();

  return {
    completedLessons: [],
    completedLessonsCount: 0,
    currentModuleIndex: 0,
    activeModuleIndex: 0,
    activeLessonIndex: 0,
    activeModuleTitle: "",
    activeLessonId: "",
    activeLessonTitle: "",
    missionResponses: {},
    moduleReports: {},
    earnedBadges: [],
    postTestAttempts: 0,
    score: 0,
    progress: 0,
    progressPercent: 0,
    status: "active",
    lastAccess: timestamp,
    lastSavedAt: timestamp,
    resetAt: timestamp,
    resetBy: operatorName,
  };
};

const normalizePainFragment = (value = "") =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`~!@#$%^&*()_+\-=[\]{};:,.<>/?|\\]+|[\s"'`~!@#$%^&*()_+\-=[\]{};:,.<>/?|\\]+$/g, "")
    .trim();

const splitPainPointFragments = (value) => {
  if (typeof value !== "string") return [];

  return value
    .split(/[\n\r,;|/]+/g)
    .map((fragment) => fragment.replace(/\s+/g, " ").trim())
    .filter((fragment) => fragment.length >= 6)
    .map((fragment) => (fragment.length > 60 ? `${fragment.slice(0, 57)}...` : fragment));
};

const collectModuleOneMissionAnswerItems = (response = {}) =>
  response?.parts?.flatMap((part) => part.items || []).filter((item) => typeof item?.answer === "string") || [];

export const collectMissionPainPointSignals = (enrollmentRows = []) => {
  const signals = [];

  enrollmentRows.forEach((enrollment) => {
    const missionResponses = enrollment.missionResponses || {};

    ["m1-mission-1", "m1-mission-2"].forEach((missionId) => {
      collectModuleOneMissionAnswerItems(missionResponses[missionId]).forEach((item) => {
        splitPainPointFragments(item.answer).forEach((fragment) => {
          signals.push({
            text: fragment,
            missionId,
            questionId: item.id || "",
            lensCode: item.lensCode || "",
            userId: enrollment.userId || "",
            courseId: enrollment.courseId || enrollment.id || "",
          });
        });
      });
    });
  });

  return signals;
};

export const buildPainPointCloud = (signals = [], limit = 18) => {
  const phraseMap = new Map();

  signals.forEach((signal) => {
    const key = normalizePainFragment(signal.text);
    if (!key || key.length < 6) return;

    const current = phraseMap.get(key) || {
      text: signal.text.trim(),
      count: 0,
      users: new Set(),
      missions: new Set(),
    };

    current.count += 1;
    if (signal.userId) current.users.add(signal.userId);
    if (signal.missionId) current.missions.add(signal.missionId);
    if (signal.text.trim().length < current.text.length) current.text = signal.text.trim();

    phraseMap.set(key, current);
  });

  return [...phraseMap.values()]
    .map((item) => ({
      text: item.text,
      count: item.count,
      userCount: item.users.size,
      missionCount: item.missions.size,
      weight: item.users.size * 2 + item.count,
    }))
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        right.userCount - left.userCount ||
        right.count - left.count ||
        left.text.localeCompare(right.text),
    )
    .slice(0, limit);
};

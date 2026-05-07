import { serverTimestamp } from "firebase/firestore";
import { courseCatalog } from "../data/courseCatalog.js";

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

const normalizeEnrollmentStatusKey = (value = "") => String(value || "").trim().toLowerCase();

const completedEnrollmentStatusSet = new Set([
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

const activeEnrollmentStatusSet = new Set([
  "active",
  "in_progress",
  "in progress",
  "learning",
  "ongoing",
  "กำลังเรียน",
  "กำลังดำเนินการ",
  "กำลังทำ",
]);

const notStartedEnrollmentStatusSet = new Set([
  "not_started",
  "not started",
  "pending",
  "ยังไม่เริ่ม",
  "รอเริ่ม",
]);

export const normalizeEnrollmentStatus = (status = "", progressPercent = 0) => {
  const normalizedStatus = normalizeEnrollmentStatusKey(status);

  if (progressPercent >= 100 || completedEnrollmentStatusSet.has(normalizedStatus)) {
    return "completed";
  }

  if (activeEnrollmentStatusSet.has(normalizedStatus)) {
    return "active";
  }

  if (notStartedEnrollmentStatusSet.has(normalizedStatus)) {
    return "not_started";
  }

  if (progressPercent > 0) {
    return "active";
  }

  return "not_started";
};

export const resolveProgressPercent = (enrollment = {}) => {
  const lessonCount = resolveLessonCount(enrollment);
  const completedLessonsCount = resolveCompletedLessonsCount(enrollment);
  const countedPercent =
    lessonCount > 0 ? Math.min(100, Math.round((completedLessonsCount / lessonCount) * 100)) : 0;
  const storedPercent =
    typeof enrollment.progressPercent === "number"
      ? Math.max(0, Math.min(100, Math.round(enrollment.progressPercent)))
      : typeof enrollment.progress === "number"
        ? Math.max(0, Math.min(100, Math.round(enrollment.progress)))
        : 0;
  const normalizedStatus = normalizeEnrollmentStatus(enrollment.status, storedPercent);

  if (lessonCount > 0 && hasTrackedCompletionCount(enrollment)) {
    return Math.max(countedPercent, storedPercent, normalizedStatus === "completed" ? 100 : 0);
  }

  if (normalizedStatus === "completed") return 100;
  return storedPercent;
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
    courseTitle: courseMeta?.title || courseId || "หลักสูตรที่ยังไม่ตั้งชื่อ",
    completedLessonsCount,
    lessonCount,
    progressPercent,
    activeModuleTitle: enrollment.activeModuleTitle || "",
    activeLessonTitle: enrollment.activeLessonTitle || "",
    activeLessonId: enrollment.activeLessonId || "",
    sourceStatus: enrollment.status || "",
    status: normalizeEnrollmentStatus(enrollment.status, progressPercent),
  };
};

export const resolveDisplayName = (user = {}) =>
  user.name ||
  [user.prefix, user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
  user.email ||
  "ผู้ใช้ที่ยังไม่ระบุชื่อ";

export const buildUserDraft = (user = {}) => ({
  prefix: user.prefix || "",
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  position: user.position || "",
  school: user.school || "",
  role: user.role || "learner",
  memberStatus: user.memberStatus || "active",
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
    moduleReports: {},
    earnedBadges: [],
    postTestAttempts: 0,
    score: 0,
    progress: 0,
    progressPercent: 0,
    status: "not_started",
    lastAccess: timestamp,
    lastSavedAt: timestamp,
    resetAt: timestamp,
    resetBy: operatorName,
  };
};

export const resolveEnrollmentMissionResponses = (enrollment = {}) =>
  enrollment.missionResponsesMap || {};

const moduleOneMissionIds = ["m1-mission-1", "m1-mission-2"];

const moduleOneMissionTitles = {
  "m1-mission-1": "Mission 1: 9 classroom dimensions",
  "m1-mission-2": "Mission 2: Look Out Of The Room",
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

const collectModuleOneMissionAnswerItems = (response = {}) => {
  const partItems =
    response?.parts?.flatMap((part, partIndex) =>
      (part.items || []).map((item, itemIndex) => ({
        id: item?.id || "",
        partId: part?.id || "",
        partTitle: part?.title || "",
        partIndex,
        itemIndex,
        lensTitle: item?.lensTitle || "",
        focus: item?.focus || "",
        prompt: item?.prompt || "",
        lensCode: item?.lensCode || "",
        answer: item?.answer,
      })),
    ) || [];
  const answerMapItems =
    response?.answers && typeof response.answers === "object"
      ? Object.entries(response.answers).map(([id, answer], itemIndex) => ({
          id,
          partId: "answers",
          partTitle: "Saved answers",
          partIndex: 999,
          itemIndex,
          lensTitle: "",
          focus: "",
          prompt: "",
          lensCode: "",
          answer,
        }))
      : [];

  return [...partItems, ...answerMapItems].map((item) => ({
    ...item,
    answer:
      typeof item.answer === "string"
        ? item.answer
        : Array.isArray(item.answer)
          ? item.answer.filter(Boolean).join("\n")
          : item.answer && typeof item.answer === "object"
            ? JSON.stringify(item.answer, null, 2)
            : String(item.answer || "").trim(),
  }));
};

const dedupeAnswerItems = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.id || `${item.partId}:${item.itemIndex}:${item.answer}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const collectModuleOneAnswerResponseGroups = (enrollmentRows = []) => {
  const groups = [];

  enrollmentRows.forEach((enrollment) => {
    const missionResponses = resolveEnrollmentMissionResponses(enrollment);

    moduleOneMissionIds.forEach((missionId, missionIndex) => {
      const response = missionResponses[missionId];
      const answers = dedupeAnswerItems(collectModuleOneMissionAnswerItems(response))
        .map((item) => ({
          ...item,
          answer: String(item.answer || "").trim(),
        }))
        .filter((item) => item.answer)
        .sort(
          (left, right) =>
            (left.partIndex ?? 0) - (right.partIndex ?? 0) ||
            (left.itemIndex ?? 0) - (right.itemIndex ?? 0) ||
            String(left.id).localeCompare(String(right.id)),
        );

      const summary = String(response?.summary || "").trim();
      if (answers.length === 0 && !summary) return;

      groups.push({
        id: `${enrollment.courseId || enrollment.id || "course"}:${missionId}`,
        courseId: enrollment.courseId || enrollment.id || "",
        courseTitle: enrollment.courseTitle || enrollment.courseId || enrollment.id || "Tracked course",
        missionId,
        missionIndex,
        missionTitle: moduleOneMissionTitles[missionId] || missionId,
        saveState: response?.saveState || "",
        updatedAt: response?.updatedAt || null,
        updatedAtMs: response?.updatedAtMs || 0,
        submittedAt: response?.submittedAt || null,
        summary,
        answers,
        answerCount: answers.length,
        characterCount: answers.reduce((total, item) => total + item.answer.length, 0),
      });
    });
  });

  return groups.sort(
    (left, right) =>
      String(left.courseTitle).localeCompare(String(right.courseTitle)) ||
      left.missionIndex - right.missionIndex ||
      (right.updatedAtMs || 0) - (left.updatedAtMs || 0),
  );
};

export const collectMissionPainPointSignals = (enrollmentRows = []) => {
  const signals = [];

  enrollmentRows.forEach((enrollment) => {
    const missionResponses = resolveEnrollmentMissionResponses(enrollment);

    moduleOneMissionIds.forEach((missionId) => {
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

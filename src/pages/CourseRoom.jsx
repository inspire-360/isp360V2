import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Lock,
  Menu,
  PenTool,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { arrayUnion, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import SWOTBoard from "../components/activities/SWOTBoard";
import CourseCertificateCard from "../components/course/CourseCertificateCard";
import ModuleFourMission from "../components/course/ModuleFourMission";
import ModuleFourReportCard from "../components/course/ModuleFourReportCard";
import ModuleFiveMission from "../components/course/ModuleFiveMission";
import ModuleFiveReportCard from "../components/course/ModuleFiveReportCard";
import ModuleOneMission from "../components/course/ModuleOneMission";
import ModuleOneReportCard from "../components/course/ModuleOneReportCard";
import ModuleThreeMission from "../components/course/ModuleThreeMission";
import ModuleThreeReportCard from "../components/course/ModuleThreeReportCard";
import ModuleTwoMission from "../components/course/ModuleTwoMission";
import ModuleTwoReportCard from "../components/course/ModuleTwoReportCard";
import PlatformSurveyForm from "../components/course/PlatformSurveyForm";
import { useAuth } from "../contexts/AuthContext";
import { buildCourseCertificate } from "../data/courseCompletion";
import { getPostTestQuestions, getPreTestQuestions } from "../data/standardizedTests";
import {
  MODULE_FOUR_BADGE,
  MODULE_FOUR_REPORT_KEY,
  buildModuleFourReportCard,
  generateModuleFourCardSerial,
} from "../data/moduleFourCampaign";
import {
  MODULE_FIVE_BADGE,
  MODULE_FIVE_REPORT_KEY,
  buildModuleFiveReportCard,
  generateModuleFiveCardSerial,
} from "../data/moduleFiveCampaign";
import {
  MODULE_ONE_BADGE,
  MODULE_ONE_REPORT_KEY,
  buildModuleOneReportCard,
  generateModuleOneCardSerial,
  moduleOneStages,
} from "../data/moduleOneCampaign";
import {
  MODULE_THREE_BADGE,
  MODULE_THREE_REPORT_KEY,
  buildModuleThreeReportCard,
  generateModuleThreeCardSerial,
} from "../data/moduleThreeCampaign";
import {
  MODULE_TWO_BADGE,
  MODULE_TWO_REPORT_KEY,
  buildModuleTwoReportCard,
  generateModuleTwoCardSerial,
} from "../data/moduleTwoCampaign";
import { teacherCourseData } from "../data/teacherCourse";
import { db } from "../lib/firebase";
import { getIcon } from "../utils/iconHelper";

const defaultPointsByType = {
  video: 60,
  article: 70,
  activity: 120,
  quiz: 90,
  certificate: 140,
};

const rankMilestones = [
  { label: "Observer", minXp: 0 },
  { label: "Architect", minXp: 260 },
  { label: "Connector", minXp: 520 },
  { label: "Builder", minXp: 800 },
  { label: "Storyteller", minXp: 1080 },
];

const getLessonXp = (lesson) =>
  lesson?.content?.gamification?.xp ?? defaultPointsByType[lesson?.type] ?? 40;

const getRankLabel = (xp) =>
  [...rankMilestones].reverse().find((milestone) => xp >= milestone.minXp)?.label || "Observer";

const isMissionLesson = (lesson) =>
  lesson?.content?.gamification?.difficulty === "Heroic" || lesson?.id?.includes("mission");

const defaultProgressData = {
  completedLessons: [],
  currentModuleIndex: 0,
  postTestAttempts: 0,
  score: 0,
  quizAttempts: {},
  quizCooldowns: {},
  missionResponses: {},
  moduleReports: {},
  earnedBadges: [],
};

const courseId = "course-teacher";
const currentCourse = teacherCourseData;
const totalCourseLessons = currentCourse.modules.reduce(
  (sum, module) => sum + module.lessons.length,
  0,
);
const certificateLessonIds = currentCourse.modules.flatMap((module) =>
  module.lessons
    .filter((lesson) => lesson.type === "certificate")
    .map((lesson) => lesson.id),
);

const getEffectiveCompletedLessons = (completedLessons = []) => {
  const effectiveSet = new Set(completedLessons);
  const isCertificateUnlocked =
    effectiveSet.has("posttest-exam") && effectiveSet.has("final-survey");

  if (isCertificateUnlocked) {
    certificateLessonIds.forEach((lessonId) => effectiveSet.add(lessonId));
  }

  return Array.from(effectiveSet);
};

const isResettableMissionLesson = (lesson) =>
  Boolean(
    lesson?.activityType?.startsWith("module") ||
      lesson?.activityType === "final_platform_survey",
  );

const getFirstPendingLessonIndex = (moduleIndex, completedLessons) => {
  const lessonIndex = currentCourse.modules[moduleIndex]?.lessons.findIndex(
    (lesson) => !completedLessons.includes(lesson.id),
  );
  return lessonIndex === -1 ? 0 : lessonIndex;
};

const getSafeModuleIndex = (index) =>
  Math.min(Math.max(index ?? 0, 0), Math.max(currentCourse.modules.length - 1, 0));

const getSafeLessonIndex = (moduleIndex, lessonIndex) => {
  const safeModuleIndex = getSafeModuleIndex(moduleIndex);
  const lessons = currentCourse.modules[safeModuleIndex]?.lessons || [];
  if (lessons.length === 0) return 0;
  return Math.min(Math.max(lessonIndex ?? 0, 0), lessons.length - 1);
};

const getUnlockedModuleIndexFromLessons = (completedLessons = []) => {
  let unlockedIndex = 0;

  for (let moduleIndex = 0; moduleIndex < currentCourse.modules.length - 1; moduleIndex += 1) {
    const moduleLessons = currentCourse.modules[moduleIndex]?.lessons || [];
    const isModuleComplete =
      moduleLessons.length > 0 &&
      moduleLessons.every((lesson) => completedLessons.includes(lesson.id));

    if (!isModuleComplete) {
      return getSafeModuleIndex(moduleIndex);
    }

    unlockedIndex = moduleIndex + 1;
  }

  return getSafeModuleIndex(unlockedIndex);
};

const buildEnrollmentMeta = ({
  completedLessons = [],
  unlockedModuleIndex = 0,
  activeModule = 0,
  activeLesson = 0,
} = {}) => {
  const safeModuleIndex = getSafeModuleIndex(activeModule);
  const safeLessonIndex = getSafeLessonIndex(safeModuleIndex, activeLesson);
  const activeModuleData = currentCourse.modules[safeModuleIndex];
  const activeLessonData = activeModuleData?.lessons?.[safeLessonIndex];
  const effectiveCompletedLessons = getEffectiveCompletedLessons(completedLessons);
  const completedCount = effectiveCompletedLessons.length;
  const progressPercent = totalCourseLessons
    ? Math.min(100, Math.round((completedCount / totalCourseLessons) * 100))
    : 0;

  return {
    courseId,
    courseTitle: currentCourse.title,
    completedLessonsCount: completedCount,
    lessonCount: totalCourseLessons,
    moduleCount: currentCourse.modules.length,
    progressPercent,
    currentModuleIndex: getSafeModuleIndex(unlockedModuleIndex),
    activeModuleIndex: safeModuleIndex,
    activeLessonIndex: safeLessonIndex,
    activeModuleTitle: activeModuleData?.title || "",
    activeLessonId: activeLessonData?.id || "",
    activeLessonTitle: activeLessonData?.title || "",
    status: completedCount >= totalCourseLessons ? "completed" : "active",
  };
};

export default function CourseRoom() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [progressData, setProgressData] = useState(defaultProgressData);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [missionResetNonce, setMissionResetNonce] = useState(0);
  const [clearingMission, setClearingMission] = useState(false);

  const lessonMap = useMemo(() => {
    const nextMap = new Map();
    currentCourse.modules.forEach((module, moduleIndex) => {
      module.lessons.forEach((lesson, lessonIndex) => {
        nextMap.set(lesson.id, { lesson, module, moduleIndex, lessonIndex });
      });
    });
    return nextMap;
  }, []);

  const allLessons = useMemo(
    () =>
      currentCourse.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({ module, lesson })),
      ),
    [],
  );

  const currentModule = currentCourse.modules?.[activeModuleIndex];
  const currentLesson = currentModule?.lessons?.[activeLessonIndex];
  const currentGamification = currentLesson?.content?.gamification;
  const currentMissionResponse = currentLesson ? progressData.missionResponses?.[currentLesson.id] : null;
  const moduleFourReport = progressData.moduleReports?.[MODULE_FOUR_REPORT_KEY];
  const moduleFiveReport = progressData.moduleReports?.[MODULE_FIVE_REPORT_KEY];
  const moduleOneReport = progressData.moduleReports?.[MODULE_ONE_REPORT_KEY];
  const moduleThreeReport = progressData.moduleReports?.[MODULE_THREE_REPORT_KEY];
  const moduleTwoReport = progressData.moduleReports?.[MODULE_TWO_REPORT_KEY];
  const completedSet = useMemo(
    () => new Set(progressData.completedLessons),
    [progressData.completedLessons],
  );
  const effectiveCompletedLessons = useMemo(
    () => getEffectiveCompletedLessons(progressData.completedLessons),
    [progressData.completedLessons],
  );
  const effectiveCompletedSet = useMemo(
    () => new Set(effectiveCompletedLessons),
    [effectiveCompletedLessons],
  );
  const courseCertificate = useMemo(() => {
    if (!completedSet.has("posttest-exam") || !completedSet.has("final-survey")) return null;

    return buildCourseCertificate(
      progressData,
      {
        uid: currentUser?.uid,
        email: currentUser?.email,
        displayName: currentUser?.displayName,
        name: currentUser?.displayName || currentUser?.email?.split("@")[0],
      },
      {
        generatedAt:
          progressData.missionResponses?.["final-survey"]?.submittedAt ||
          progressData.missionResponses?.["final-survey"]?.updatedAt ||
          progressData.moduleReports?.[MODULE_FIVE_REPORT_KEY]?.generatedAt,
      },
    );
  }, [completedSet, currentUser, progressData]);

  const totalXp = useMemo(
    () => allLessons.reduce((sum, item) => sum + getLessonXp(item.lesson), 0),
    [allLessons],
  );
  const earnedXp = useMemo(
    () =>
      effectiveCompletedLessons.reduce((sum, lessonId) => {
        const entry = lessonMap.get(lessonId);
        return sum + (entry ? getLessonXp(entry.lesson) : 0);
      }, 0),
    [effectiveCompletedLessons, lessonMap],
  );
  const completedMissionCount = useMemo(
    () => allLessons.filter((item) => isMissionLesson(item.lesson) && completedSet.has(item.lesson.id)).length,
    [allLessons, completedSet],
  );
  const totalMissionCount = useMemo(
    () => allLessons.filter((item) => isMissionLesson(item.lesson)).length,
    [allLessons],
  );
  const courseProgressPercent =
    Math.round((effectiveCompletedLessons.length / allLessons.length) * 100) || 0;

  const getQuizAttemptCount = (lessonId) =>
    progressData.quizAttempts?.[lessonId] ??
    (lessonId === "posttest-exam" ? progressData.postTestAttempts || 0 : 0);

  const getQuizCooldownUntil = (lessonId) => progressData.quizCooldowns?.[lessonId] || null;

  const getQuizCooldownRemainingMs = (lessonId) => {
    const cooldownUntil = getQuizCooldownUntil(lessonId);
    if (!cooldownUntil) return 0;

    const remaining = new Date(cooldownUntil).getTime() - currentTime;
    return remaining > 0 ? remaining : 0;
  };

  const formatCooldown = (milliseconds) => {
    if (!milliseconds) return "0m";

    const totalMinutes = Math.ceil(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;

    const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);

    const unsubscribe = onSnapshot(
      enrollRef,
      async (snapshot) => {
        try {
          if (!snapshot.exists()) {
            await setDoc(
              enrollRef,
              {
                enrolledAt: new Date(),
                lastAccess: new Date(),
                ...defaultProgressData,
                ...buildEnrollmentMeta({
                  completedLessons: [],
                  unlockedModuleIndex: 0,
                  activeModule: 0,
                  activeLesson: 0,
                }),
              },
              { merge: true },
            );
            setLoading(false);
            return;
          }

          const data = snapshot.data();
          const completedLessons = Array.isArray(data.completedLessons) ? data.completedLessons : [];
          const storedUnlockedModuleIndex = getSafeModuleIndex(data.currentModuleIndex || 0);
          const derivedUnlockedModuleIndex = getUnlockedModuleIndexFromLessons(completedLessons);
          const unlockedModuleIndex = Math.max(storedUnlockedModuleIndex, derivedUnlockedModuleIndex);
          const requestedActiveModuleIndex =
            typeof data.activeModuleIndex === "number" ? data.activeModuleIndex : unlockedModuleIndex;
          const nextActiveModuleIndex = getSafeModuleIndex(
            Math.min(requestedActiveModuleIndex, unlockedModuleIndex),
          );
          const nextActiveLessonIndex =
            typeof data.activeLessonIndex === "number"
              ? getSafeLessonIndex(nextActiveModuleIndex, data.activeLessonIndex)
              : getFirstPendingLessonIndex(nextActiveModuleIndex, completedLessons);

          if (unlockedModuleIndex !== storedUnlockedModuleIndex) {
            await setDoc(
              enrollRef,
              {
                ...buildEnrollmentMeta({
                  completedLessons,
                  unlockedModuleIndex,
                  activeModule: nextActiveModuleIndex,
                  activeLesson: nextActiveLessonIndex,
                }),
                lastAccess: new Date(),
              },
              { merge: true },
            );
          }

          setProgressData({
            ...defaultProgressData,
            ...data,
            completedLessons,
            currentModuleIndex: unlockedModuleIndex,
            postTestAttempts: data.postTestAttempts || 0,
            score: data.score || 0,
            quizAttempts: data.quizAttempts || {},
            quizCooldowns: data.quizCooldowns || {},
            missionResponses: data.missionResponses || {},
            moduleReports: data.moduleReports || {},
            earnedBadges: data.earnedBadges || [],
          });
          setExpandedModules((previous) => ({
            ...previous,
            [unlockedModuleIndex]: true,
            [nextActiveModuleIndex]: true,
          }));
          setActiveModuleIndex(nextActiveModuleIndex);
          setActiveLessonIndex(nextActiveLessonIndex);
        } catch (error) {
          console.error("Error loading progress:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error subscribing progress:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentLesson || currentLesson.type !== "quiz") return;

    let questions = [];
    if (Array.isArray(currentLesson.content?.questions) && currentLesson.content.questions.length > 0) {
      questions = currentLesson.content.questions;
    } else if (currentLesson.content?.isPretest) {
      questions = getPreTestQuestions();
    } else if (currentLesson.content?.isPosttest) {
      questions = getPostTestQuestions(currentLesson.content.questionsCount || 10);
    }

    setQuizQuestions(questions);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  }, [currentLesson]);

  const handleLessonChange = (moduleIndex, lessonIndex) => {
    if (moduleIndex > progressData.currentModuleIndex) {
      alert("กรุณาเรียนตามลำดับก่อนเพื่อปลดล็อก module ถัดไป");
      return;
    }

    setActiveModuleIndex(moduleIndex);
    setActiveLessonIndex(lessonIndex);
    if (currentUser) {
      void setDoc(
        doc(db, "users", currentUser.uid, "enrollments", courseId),
        {
          ...buildEnrollmentMeta({
            completedLessons: progressData.completedLessons,
            unlockedModuleIndex: progressData.currentModuleIndex,
            activeModule: moduleIndex,
            activeLesson: lessonIndex,
          }),
          lastAccess: new Date(),
        },
        { merge: true },
      );
    }
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const toggleModule = (index) => {
    setExpandedModules((previous) => ({ ...previous, [index]: !previous[index] }));
  };

  const markLessonComplete = async ({ stayOnLesson = false } = {}) => {
    if (!currentUser || !currentLesson || completedSet.has(currentLesson.id)) return;

    try {
      const newCompleted = [...progressData.completedLessons, currentLesson.id];
      const previousUnlockedModuleIndex = progressData.currentModuleIndex;
      const nextModuleIndex = Math.max(
        previousUnlockedModuleIndex,
        getUnlockedModuleIndexFromLessons(newCompleted),
      );
      const isNewModuleUnlocked = nextModuleIndex > previousUnlockedModuleIndex;
      let nextActiveModuleIndex = activeModuleIndex;
      let nextActiveLessonIndex = activeLessonIndex;

      setProgressData((previous) => ({
        ...previous,
        completedLessons: newCompleted,
        currentModuleIndex: nextModuleIndex,
      }));

      if (isNewModuleUnlocked) {
        setExpandedModules((previous) => ({ ...previous, [nextModuleIndex]: true }));
        if (!stayOnLesson) {
          nextActiveModuleIndex = nextModuleIndex;
          nextActiveLessonIndex = getFirstPendingLessonIndex(nextModuleIndex, newCompleted);
        }
        alert(`ปลดล็อก ${currentCourse.modules[nextModuleIndex].title} แล้ว`);
      } else if (!stayOnLesson) {
        const nextLessonIndex = currentModule.lessons.findIndex(
          (lesson) => !newCompleted.includes(lesson.id),
        );
        if (nextLessonIndex !== -1) {
          nextActiveLessonIndex = nextLessonIndex;
        }
      }

      await mergeEnrollmentData(
        {
          completedLessons: arrayUnion(currentLesson.id),
        },
        {
          completedLessons: newCompleted,
          currentModuleIndex: nextModuleIndex,
          activeModuleIndex: nextActiveModuleIndex,
          activeLessonIndex: nextActiveLessonIndex,
        },
      );

      if (!stayOnLesson) {
        setActiveModuleIndex(nextActiveModuleIndex);
        setActiveLessonIndex(nextActiveLessonIndex);
      }
    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  };

  const mergeEnrollmentData = async (payload, options = {}) => {
    if (!currentUser) return;
    const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);
    await setDoc(
      enrollRef,
      {
        ...buildEnrollmentMeta({
          completedLessons: options.completedLessons ?? progressData.completedLessons,
          unlockedModuleIndex: options.currentModuleIndex ?? progressData.currentModuleIndex,
          activeModule: options.activeModuleIndex ?? activeModuleIndex,
          activeLesson: options.activeLessonIndex ?? activeLessonIndex,
        }),
        ...payload,
        lastAccess: new Date(),
        lastSavedAt: new Date(),
      },
      { merge: true },
    );
  };

  const replaceMissionResponse = async (lessonId, record, options = {}) => {
    if (!currentUser) return;

    const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);
    const timestamp = new Date();
    const enrollmentMeta = buildEnrollmentMeta({
      completedLessons: options.completedLessons ?? progressData.completedLessons,
      unlockedModuleIndex: options.currentModuleIndex ?? progressData.currentModuleIndex,
      activeModule: options.activeModuleIndex ?? activeModuleIndex,
      activeLesson: options.activeLessonIndex ?? activeLessonIndex,
    });

    try {
      await updateDoc(enrollRef, {
        ...enrollmentMeta,
        [`missionResponses.${lessonId}`]: record,
        lastAccess: timestamp,
        lastSavedAt: timestamp,
      });
    } catch (error) {
      if (error?.code !== "not-found") {
        throw error;
      }

      await setDoc(
        enrollRef,
        {
          ...enrollmentMeta,
          missionResponses: {
            [lessonId]: record,
          },
          lastAccess: timestamp,
          lastSavedAt: timestamp,
        },
        { merge: true },
      );
    }
  };

  const persistMissionResponse = async (payload, submitted = false) => {
    if (!currentUser || !currentLesson) return;

    const record = {
      ...payload,
      saveState: submitted || completedSet.has(currentLesson.id) ? "submitted" : "draft",
      updatedAt: new Date().toISOString(),
    };
    if (submitted) {
      record.submittedAt = new Date().toISOString();
    }

    await replaceMissionResponse(currentLesson.id, record);

    setProgressData((previous) => ({
      ...previous,
      missionResponses: {
        ...previous.missionResponses,
        [currentLesson.id]: record,
      },
    }));

    if (submitted && !completedSet.has(currentLesson.id)) {
      await markLessonComplete();
    }
  };

  const clearCurrentMissionResponse = async () => {
    if (!currentUser || !currentLesson || !isResettableMissionLesson(currentLesson)) return;

    setClearingMission(true);
    const timestamp = new Date().toISOString();
    const clearedRecord = {
      saveState: completedSet.has(currentLesson.id) ? "submitted" : "draft",
      updatedAt: timestamp,
      clearedAt: timestamp,
    };

    try {
      await replaceMissionResponse(currentLesson.id, clearedRecord);
      setProgressData((previous) => ({
        ...previous,
        missionResponses: {
          ...previous.missionResponses,
          [currentLesson.id]: clearedRecord,
        },
      }));
      setMissionResetNonce((previous) => previous + 1);
    } catch (error) {
      console.error("Error clearing mission response:", error);
    } finally {
      setClearingMission(false);
    }
  };

  const saveModuleOneMission = async (payload) => persistMissionResponse(payload, true);
  const saveModuleFourMission = async (payload) => persistMissionResponse(payload, true);
  const saveModuleFiveMission = async (payload) => persistMissionResponse(payload, true);
  const saveModuleTwoMission = async (payload) => persistMissionResponse(payload, true);
  const saveModuleThreeMission = async (payload) => {
    if (!currentUser || !currentLesson) return;

    if (currentLesson.id !== "m3-posttest") {
      await persistMissionResponse(payload, true);
      return;
    }

    const timestamp = new Date().toISOString();
    const record = {
      ...payload,
      saveState: "submitted",
      updatedAt: timestamp,
      submittedAt: timestamp,
    };
    const nextMissionResponses = {
      ...progressData.missionResponses,
      [currentLesson.id]: record,
    };

    await mergeEnrollmentData({
      missionResponses: {
        [currentLesson.id]: record,
      },
    });

    setProgressData((previous) => ({
      ...previous,
      missionResponses: {
        ...previous.missionResponses,
        [currentLesson.id]: record,
      },
    }));

    await saveModuleThreeReport(nextMissionResponses);

    if (!completedSet.has(currentLesson.id)) {
      await markLessonComplete({ stayOnLesson: true });
    }
  };

  const saveModuleOneDraft = async (payload) => {
    await persistMissionResponse(payload, false);
  };
  const saveModuleFourDraft = async (payload) => persistMissionResponse(payload, false);
  const saveModuleFiveDraft = async (payload) => persistMissionResponse(payload, false);
  const saveModuleTwoDraft = async (payload) => persistMissionResponse(payload, false);
  const saveModuleThreeDraft = async (payload) => persistMissionResponse(payload, false);
  const saveFinalSurvey = async (payload) => persistMissionResponse(payload, true);
  const saveFinalSurveyDraft = async (payload) => persistMissionResponse(payload, false);

  const saveModuleOneReport = async (score, totalQuestions) => {
    const existingSerial = progressData.moduleReports?.[MODULE_ONE_REPORT_KEY]?.cardSerial;
    const report = buildModuleOneReportCard(
      progressData.missionResponses,
      {
        score,
        totalQuestions,
      },
      {
        uid: currentUser?.uid,
        email: currentUser?.email,
        name: currentUser?.displayName || currentUser?.email?.split("@")[0],
        cardSerial: existingSerial || generateModuleOneCardSerial(currentUser?.uid),
      },
    );

    await mergeEnrollmentData({
      moduleReports: {
        [MODULE_ONE_REPORT_KEY]: report,
      },
      earnedBadges: arrayUnion(MODULE_ONE_BADGE),
    });

    setProgressData((previous) => ({
      ...previous,
      moduleReports: {
        ...previous.moduleReports,
        [MODULE_ONE_REPORT_KEY]: report,
      },
      earnedBadges: previous.earnedBadges.includes(MODULE_ONE_BADGE)
        ? previous.earnedBadges
        : [...previous.earnedBadges, MODULE_ONE_BADGE],
    }));

    return report;
  };

  const saveModuleFourReport = async (score, totalQuestions) => {
    const existingSerial = progressData.moduleReports?.[MODULE_FOUR_REPORT_KEY]?.cardSerial;
    const report = buildModuleFourReportCard(
      progressData.missionResponses,
      {
        score,
        totalQuestions,
      },
      {
        uid: currentUser?.uid,
        email: currentUser?.email,
        name: currentUser?.displayName || currentUser?.email?.split("@")[0],
        cardSerial: existingSerial || generateModuleFourCardSerial(currentUser?.uid),
      },
    );

    await mergeEnrollmentData({
      moduleReports: {
        [MODULE_FOUR_REPORT_KEY]: report,
      },
      earnedBadges: arrayUnion(MODULE_FOUR_BADGE),
    });

    setProgressData((previous) => ({
      ...previous,
      moduleReports: {
        ...previous.moduleReports,
        [MODULE_FOUR_REPORT_KEY]: report,
      },
      earnedBadges: previous.earnedBadges.includes(MODULE_FOUR_BADGE)
        ? previous.earnedBadges
        : [...previous.earnedBadges, MODULE_FOUR_BADGE],
    }));

    return report;
  };

  const saveModuleFiveReport = async (score, totalQuestions) => {
    const existingSerial = progressData.moduleReports?.[MODULE_FIVE_REPORT_KEY]?.cardSerial;
    const report = buildModuleFiveReportCard(
      progressData.missionResponses,
      {
        score,
        totalQuestions,
      },
      {
        uid: currentUser?.uid,
        email: currentUser?.email,
        name: currentUser?.displayName || currentUser?.email?.split("@")[0],
        cardSerial: existingSerial || generateModuleFiveCardSerial(currentUser?.uid),
      },
    );

    await mergeEnrollmentData({
      moduleReports: {
        [MODULE_FIVE_REPORT_KEY]: report,
      },
      earnedBadges: arrayUnion(MODULE_FIVE_BADGE),
    });

    setProgressData((previous) => ({
      ...previous,
      moduleReports: {
        ...previous.moduleReports,
        [MODULE_FIVE_REPORT_KEY]: report,
      },
      earnedBadges: previous.earnedBadges.includes(MODULE_FIVE_BADGE)
        ? previous.earnedBadges
        : [...previous.earnedBadges, MODULE_FIVE_BADGE],
    }));

    return report;
  };

  const saveModuleTwoReport = async (score, totalQuestions) => {
    const existingSerial = progressData.moduleReports?.[MODULE_TWO_REPORT_KEY]?.cardSerial;
    const report = buildModuleTwoReportCard(
      progressData.missionResponses,
      {
        score,
        totalQuestions,
      },
      {
        uid: currentUser?.uid,
        email: currentUser?.email,
        name: currentUser?.displayName || currentUser?.email?.split("@")[0],
        cardSerial: existingSerial || generateModuleTwoCardSerial(currentUser?.uid),
      },
    );

    await mergeEnrollmentData({
      moduleReports: {
        [MODULE_TWO_REPORT_KEY]: report,
      },
      earnedBadges: arrayUnion(MODULE_TWO_BADGE),
    });

    setProgressData((previous) => ({
      ...previous,
      moduleReports: {
        ...previous.moduleReports,
        [MODULE_TWO_REPORT_KEY]: report,
      },
      earnedBadges: previous.earnedBadges.includes(MODULE_TWO_BADGE)
        ? previous.earnedBadges
        : [...previous.earnedBadges, MODULE_TWO_BADGE],
    }));

    return report;
  };

  const saveModuleThreeReport = async (missionResponsesSource = progressData.missionResponses) => {
    const existingSerial = progressData.moduleReports?.[MODULE_THREE_REPORT_KEY]?.cardSerial;
    const report = buildModuleThreeReportCard(missionResponsesSource, {
      uid: currentUser?.uid,
      email: currentUser?.email,
      name: currentUser?.displayName || currentUser?.email?.split("@")[0],
      cardSerial: existingSerial || generateModuleThreeCardSerial(currentUser?.uid),
    });

    await mergeEnrollmentData({
      moduleReports: {
        [MODULE_THREE_REPORT_KEY]: report,
      },
      earnedBadges: arrayUnion(MODULE_THREE_BADGE),
    });

    setProgressData((previous) => ({
      ...previous,
      moduleReports: {
        ...previous.moduleReports,
        [MODULE_THREE_REPORT_KEY]: report,
      },
      earnedBadges: previous.earnedBadges.includes(MODULE_THREE_BADGE)
        ? previous.earnedBadges
        : [...previous.earnedBadges, MODULE_THREE_BADGE],
    }));

    return report;
  };

  const handleQuizSelect = (questionId, optionIndex) => {
    if (quizSubmitted) return;
    setQuizAnswers((previous) => ({ ...previous, [questionId]: optionIndex }));
  };

  const resetCourseProgress = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);
      const resetCompletedLessons = ["pretest-exam"];
      const resetModuleIndex = 1;
      const resetLessonIndex = getFirstPendingLessonIndex(resetModuleIndex, resetCompletedLessons);
      await setDoc(
        enrollRef,
        {
          enrolledAt: new Date(),
          ...defaultProgressData,
          completedLessons: resetCompletedLessons,
          currentModuleIndex: resetModuleIndex,
          ...buildEnrollmentMeta({
            completedLessons: resetCompletedLessons,
            unlockedModuleIndex: resetModuleIndex,
            activeModule: resetModuleIndex,
            activeLesson: resetLessonIndex,
          }),
          lastAccess: new Date(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("Reset failed:", error);
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!currentUser || !currentLesson) return;
    const lessonId = currentLesson.id;
    const cooldownRemainingMs = currentLesson.content?.isPosttest
      ? getQuizCooldownRemainingMs(lessonId)
      : 0;

    if (cooldownRemainingMs > 0) {
      alert(`ยังไม่สามารถทำ post-test นี้ได้ ต้องรออีก ${formatCooldown(cooldownRemainingMs)}`);
      return;
    }

    let score = 0;
    quizQuestions.forEach((question) => {
      if (quizAnswers[question.id] === question.correctAnswer) score += 1;
    });

    setQuizScore(score);
    setQuizSubmitted(true);

    const isPassed = score >= (currentLesson.content?.passScore || 0);
    const enrollRef = doc(db, "users", currentUser.uid, "enrollments", courseId);

    if (currentLesson.content?.isPretest) {
      await markLessonComplete();
      return;
    }

    if (currentLesson.content?.isPosttest) {
      const maxAttempts = currentLesson.content?.maxAttempts || 5;
      const cooldownHours = currentLesson.content?.cooldownHours || 0;
      const currentAttempts = getQuizAttemptCount(lessonId);
      const rawAttempts = currentAttempts + 1;
      const cooldownTriggered = !isPassed && cooldownHours > 0 && rawAttempts >= maxAttempts;
      const storedAttempts = cooldownTriggered ? 0 : rawAttempts;
      const cooldownUntil = cooldownTriggered
        ? new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString()
        : null;
      const updatePayload = {
        [`quizAttempts.${lessonId}`]: storedAttempts,
        [`quizCooldowns.${lessonId}`]: cooldownUntil,
        score,
        lastAccess: new Date(),
      };

      if (lessonId === "posttest-exam") {
        updatePayload.postTestAttempts = storedAttempts;
      }

      await updateDoc(enrollRef, updatePayload);
      setProgressData((previous) => ({
        ...previous,
        postTestAttempts: lessonId === "posttest-exam" ? storedAttempts : previous.postTestAttempts,
        score,
        quizAttempts: {
          ...previous.quizAttempts,
          [lessonId]: storedAttempts,
        },
        quizCooldowns: {
          ...previous.quizCooldowns,
          [lessonId]: cooldownUntil,
        },
      }));

      if (isPassed) {
        if (lessonId === "m1-posttest") {
          await saveModuleOneReport(score, quizQuestions.length);
          await markLessonComplete({ stayOnLesson: true });
        } else if (lessonId === "m4-posttest") {
          await saveModuleFourReport(score, quizQuestions.length);
          await markLessonComplete({ stayOnLesson: true });
        } else if (lessonId === "m5-posttest") {
          await saveModuleFiveReport(score, quizQuestions.length);
          await markLessonComplete({ stayOnLesson: true });
        } else if (lessonId === "m2-posttest") {
          await saveModuleTwoReport(score, quizQuestions.length);
          await markLessonComplete({ stayOnLesson: true });
        } else {
          await markLessonComplete();
        }
        alert("ยินดีด้วย คุณผ่าน post-test แล้ว");
      } else if (cooldownTriggered) {
        alert(`ยังไม่ผ่านครบ ${maxAttempts} ครั้ง ระบบจะเปิดให้ทำใหม่อีกใน ${cooldownHours} ชั่วโมง`);
      } else if (rawAttempts >= maxAttempts) {
        alert("คุณไม่ผ่านครบตามจำนวนครั้ง ระบบจะเริ่มต้นใหม่จาก Module 1");
        await resetCourseProgress();
      }
      return;
    }

    if (isPassed) await markLessonComplete();
  };

  const retryQuiz = () => {
    const cooldownRemainingMs = currentLesson?.content?.isPosttest
      ? getQuizCooldownRemainingMs(currentLesson.id)
      : 0;

    if (cooldownRemainingMs > 0) {
      alert(`ยังไม่สามารถทำ post-test นี้ได้ ต้องรออีก ${formatCooldown(cooldownRemainingMs)}`);
      return;
    }

    if (currentLesson.content?.isPosttest) {
      setQuizQuestions(
        Array.isArray(currentLesson.content?.questions) && currentLesson.content.questions.length > 0
          ? currentLesson.content.questions
          : getPostTestQuestions(currentLesson.content?.questionsCount || 10),
      );
    }
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  const renderQuestBrief = () => {
    if (!currentGamification) return null;

    const campaignStep = currentLesson.content?.campaignStep || 0;
    const campaignStages = currentLesson.content?.campaignStages || moduleOneStages;
    const mentor = currentLesson.content?.aiMentor;

    return (
      <div className="brand-panel-strong overflow-hidden p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="brand-chip border-white/[0.18] bg-white/[0.10] text-white/[0.80]">
              <Sparkles size={14} />
              {currentGamification.arc}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold">{currentLesson.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/[0.74]">
              {currentGamification.objective}
            </p>
          </div>
          <div className="rounded-[26px] border border-white/[0.12] bg-white/[0.10] px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-white/[0.50]">Reward</p>
            <p className="mt-2 text-lg font-semibold">{currentGamification.reward}</p>
          </div>
        </div>

        {campaignStep ? (
          <div className={`mt-6 grid gap-3 ${campaignStages.length > 4 ? "md:grid-cols-2 xl:grid-cols-6" : "md:grid-cols-4"}`}>
            {campaignStages.map((stage) => {
              const isActive = stage.step === campaignStep;
              const isDone = stage.step < campaignStep;
              return (
                <div
                  key={stage.step}
                  className={`rounded-[22px] border px-4 py-4 text-sm ${
                    isActive
                      ? "border-white/25 bg-white/14 text-white"
                      : isDone
                        ? "border-white/16 bg-white/10 text-white/90"
                        : "border-white/10 bg-white/[0.06] text-white/55"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                    {stage.label}
                  </p>
                  <p className="mt-2 font-semibold">{stage.title}</p>
                  <p className="mt-2 leading-6">{stage.helper}</p>
                </div>
              );
            })}
          </div>
        ) : null}

        {mentor?.intro ? (
          <div className="mt-5 rounded-[24px] border border-white/[0.12] bg-white/[0.10] px-4 py-4 text-sm leading-7 text-white/[0.82]">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="mt-0.5 flex-shrink-0" />
              <span>{mentor.intro}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/[0.12] bg-white/[0.10] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/[0.50]">Badge</p>
            <p className="mt-2 text-xl font-semibold">{currentGamification.badge}</p>
          </div>
          <div className="rounded-[24px] border border-white/[0.12] bg-white/[0.10] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/[0.50]">XP</p>
            <p className="mt-2 text-xl font-semibold">{currentGamification.xp}</p>
          </div>
          <div className="rounded-[24px] border border-white/[0.12] bg-white/[0.10] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/[0.50]">ระดับภารกิจ</p>
            <p className="mt-2 text-xl font-semibold">{currentGamification.difficulty}</p>
          </div>
        </div>

        {currentGamification.deliverable ? (
          <p className="mt-5 rounded-[24px] border border-white/[0.12] bg-white/[0.10] px-4 py-3 text-sm leading-7 text-white/[0.80]">
            สิ่งที่ต้องส่ง: {currentGamification.deliverable}
          </p>
        ) : null}

        {currentGamification.checkpoints?.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {currentGamification.checkpoints.map((checkpoint) => (
              <div key={checkpoint} className="rounded-[24px] border border-white/[0.12] bg-white/[0.10] p-4 text-sm leading-7 text-white/[0.78]">
                {checkpoint}
              </div>
            ))}
          </div>
        ) : null}

        {currentGamification.duSignal ? (
          <div className="mt-5 flex items-start gap-3 rounded-[24px] border border-white/[0.12] bg-white/[0.10] px-4 py-4 text-sm leading-7 text-white/[0.80]">
            <ShieldCheck size={18} className="mt-0.5 flex-shrink-0" />
            <span>{currentGamification.duSignal}</span>
          </div>
        ) : null}
      </div>
    );
  };

  const renderActionFooter = (label, icon) => (
    <div className="mt-6 flex justify-end">
      {completedSet.has(currentLesson.id) ? (
        <div className="flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
          <CheckCircle2 size={16} />
          เสร็จแล้ว
        </div>
      ) : (
        <button type="button" onClick={markLessonComplete} className="brand-button-primary">
          {icon}
          {label}
        </button>
      )}
    </div>
  );

  const renderVideo = () => (
    <div className="space-y-6">
      {renderQuestBrief()}
      <div className="brand-panel p-6">
        {(() => {
          const videoUrl = currentLesson.content?.videoUrl || "";
          const isCanvaEmbed = videoUrl.includes("canva.com");

          return (
            <>
              <div
                className={`overflow-hidden rounded-[28px] border border-slate-100 bg-black/5 ${
                  isCanvaEmbed ? "h-[560px] md:h-[760px]" : "aspect-video"
                }`}
              >
                {videoUrl ? (
                  <iframe
                    key={`${currentLesson.id}-${videoUrl}`}
                    src={videoUrl}
                    title={currentLesson.content?.frameLabel || currentLesson.title}
                    className="h-full w-full border-0"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : null}
              </div>
              {isCanvaEmbed ? (
                <div className="mt-4 rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm leading-7 text-slate-600">
                  บทเรียน Canva ถูกฝังด้วยลิงก์ `view?embed` ตามที่กำหนดแล้ว ถ้ายังเจอข้อจำกัดจากเบราว์เซอร์หรือเครือข่ายของโรงเรียน สามารถเปิดแท็บใหม่จากปุ่มด้านล่างได้ทันที
                </div>
              ) : null}
            </>
          );
        })()}
        <p className="mt-6 text-base leading-8 text-slate-600">{currentLesson.content?.description}</p>
        {currentLesson.content?.externalUrl ? (
          <a
            href={currentLesson.content.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brand-button-secondary mt-4"
          >
            เปิดบทเรียนในแท็บใหม่
            <ArrowRight size={16} />
          </a>
        ) : null}
        {renderActionFooter("ทำบทเรียนนี้เสร็จแล้ว", <PlayCircle size={16} />)}
      </div>
    </div>
  );

  const renderArticle = () => (
    <div className="space-y-6">
      {renderQuestBrief()}
      <div className="brand-panel p-6">
        <p className="text-base leading-8 text-slate-600">{currentLesson.content?.text}</p>

        {Array.isArray(currentLesson.content?.resources) && currentLesson.content.resources.length > 0 ? (
          <div className="mt-6 rounded-[28px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">แหล่งข้อมูลเพิ่มเติม</p>
            <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
              {currentLesson.content.resources.map((resource) => (
                <p key={resource}>{resource}</p>
              ))}
            </div>
          </div>
        ) : null}

        {currentLesson.id === "final-survey" ? (
          <div className="mt-6 rounded-[28px] border border-secondary/10 bg-secondary/5 p-6">
            <p className="text-base leading-8 text-slate-600">
              เมื่อทำแบบสอบถามแล้ว ให้กลับมากดเสร็จแล้ว เพื่อปลดล็อกคลัง Certificate
            </p>
            <a
              href={currentLesson.content?.surveyUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-button-secondary mt-4"
            >
              เปิดแบบสอบถาม
              <ArrowRight size={16} />
            </a>
          </div>
        ) : null}

        {renderActionFooter("ทำเนื้อหานี้เสร็จแล้ว", <CheckCircle2 size={16} />)}
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6">
      {renderQuestBrief()}
      <div className="brand-panel p-6">
        {isResettableMissionLesson(currentLesson) ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-100 bg-slate-50/80 px-4 py-4">
            <p className="text-sm leading-7 text-slate-600">
              {completedSet.has(currentLesson.id)
                ? "ภารกิจนี้ผ่านแล้ว ล้างคำตอบหรืออัปเดตข้อมูลใหม่ได้ทุกเมื่อ"
                : "ระบบบันทึกแบบร่างให้อัตโนมัติ และล้างคำตอบเพื่อเริ่มกรอกใหม่ได้ทันที"}
            </p>
            <button
              type="button"
              onClick={clearCurrentMissionResponse}
              disabled={clearingMission}
              className="brand-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {clearingMission ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              ล้างคำตอบ
            </button>
          </div>
        ) : null}
        {currentLesson.activityType?.startsWith("module1_") ? (
          <ModuleOneMission
            lesson={currentLesson}
            savedResponse={currentMissionResponse}
            allResponses={progressData.missionResponses}
            isCompleted={completedSet.has(currentLesson.id)}
            onDraftSave={saveModuleOneDraft}
            onSave={saveModuleOneMission}
          />
        ) : null}
        {currentLesson.activityType?.startsWith("module4_") ? (
          <ModuleFourMission
            lesson={currentLesson}
            savedResponse={currentMissionResponse}
            allResponses={progressData.missionResponses}
            clearNonce={missionResetNonce}
            isCompleted={completedSet.has(currentLesson.id)}
            onDraftSave={saveModuleFourDraft}
            onSave={saveModuleFourMission}
          />
        ) : null}
        {currentLesson.activityType?.startsWith("module5_") ? (
          <ModuleFiveMission
            lesson={currentLesson}
            savedResponse={currentMissionResponse}
            allResponses={progressData.missionResponses}
            clearNonce={missionResetNonce}
            isCompleted={completedSet.has(currentLesson.id)}
            onDraftSave={saveModuleFiveDraft}
            onSave={saveModuleFiveMission}
          />
        ) : null}
        {currentLesson.activityType?.startsWith("module2_") ? (
          <ModuleTwoMission
            lesson={currentLesson}
            savedResponse={currentMissionResponse}
            allResponses={progressData.missionResponses}
            clearNonce={missionResetNonce}
            isCompleted={completedSet.has(currentLesson.id)}
            onDraftSave={saveModuleTwoDraft}
            onSave={saveModuleTwoMission}
          />
        ) : null}
        {currentLesson.activityType?.startsWith("module3_") ? (
          <ModuleThreeMission
            lesson={currentLesson}
            savedResponse={currentMissionResponse}
            allResponses={progressData.missionResponses}
            clearNonce={missionResetNonce}
            isCompleted={completedSet.has(currentLesson.id)}
            onDraftSave={saveModuleThreeDraft}
            onSave={saveModuleThreeMission}
          />
        ) : null}
        {currentLesson.activityType === "final_platform_survey" ? (
          <PlatformSurveyForm
            savedResponse={currentMissionResponse}
            isCompleted={completedSet.has(currentLesson.id)}
            onDraftSave={saveFinalSurveyDraft}
            onSave={saveFinalSurvey}
          />
        ) : null}
        {currentLesson.activityType === "swot_board" ? <SWOTBoard /> : null}
        {!currentLesson.activityType?.startsWith("module1_") &&
        !currentLesson.activityType?.startsWith("module4_") &&
        !currentLesson.activityType?.startsWith("module5_") &&
        !currentLesson.activityType?.startsWith("module2_") &&
        !currentLesson.activityType?.startsWith("module3_") &&
        currentLesson.activityType !== "final_platform_survey"
          ? renderActionFooter("ส่งภารกิจ", <PenTool size={16} />)
          : null}
      </div>
      {currentLesson.id === "m3-posttest" && moduleThreeReport ? (
        <ModuleThreeReportCard report={moduleThreeReport} />
      ) : null}
      {currentLesson.id === "m5-posttest" && moduleFiveReport ? (
        <ModuleFiveReportCard report={moduleFiveReport} />
      ) : null}
    </div>
  );

  const renderQuizUI = () => {
    const isPosttest = currentLesson.content?.isPosttest;
    const isPassed = quizScore >= (currentLesson.content?.passScore || 0);
    const isCompleted = completedSet.has(currentLesson.id);
    const attemptCount = getQuizAttemptCount(currentLesson.id);
    const maxAttempts = currentLesson.content?.maxAttempts || 5;
    const cooldownRemainingMs = isPosttest ? getQuizCooldownRemainingMs(currentLesson.id) : 0;
    const posttestMeta =
      currentLesson.id === "m1-posttest"
        ? {
            badge: MODULE_ONE_BADGE,
            report: moduleOneReport,
            unlockMessage: "รายงานสรุปพร้อมแล้ว และ Module 2 ถูกปลดล็อกให้เรียบร้อย",
            ReportCardComponent: ModuleOneReportCard,
          }
        : currentLesson.id === "m4-posttest"
          ? {
              badge: MODULE_FOUR_BADGE,
              report: moduleFourReport,
              unlockMessage: "รายงานสรุปพร้อมแล้ว และ Module 5 ถูกปลดล็อกให้เรียบร้อย",
              ReportCardComponent: ModuleFourReportCard,
            }
          : currentLesson.id === "m5-posttest"
            ? {
                badge: MODULE_FIVE_BADGE,
                report: moduleFiveReport,
                unlockMessage: "รายงานสรุปพร้อมแล้ว และ post-test ปลายคอร์สถูกปลดล็อกให้เรียบร้อย",
                ReportCardComponent: ModuleFiveReportCard,
              }
        : currentLesson.id === "m2-posttest"
          ? {
              badge: MODULE_TWO_BADGE,
              report: moduleTwoReport,
              unlockMessage: "รายงานสรุปพร้อมแล้ว และ Module 3 ถูกปลดล็อกให้เรียบร้อย",
              ReportCardComponent: ModuleTwoReportCard,
            }
          : currentLesson.id === "posttest-exam"
            ? {
                badge: "InSPIRE360 Final Gate",
                report: null,
                unlockMessage: "ผ่านด่านปลายคอร์สแล้ว ไปต่อที่แบบประเมินความพึงพอใจเพื่อปลดล็อก Certificate of InSPIRE360",
                ReportCardComponent: null,
              }
          : null;
    const isSpecialPosttest = Boolean(posttestMeta);
    const storedSpecialScore =
      currentLesson.id === "posttest-exam"
        ? progressData.score || quizScore
        : posttestMeta?.report?.score || quizScore;
    const scoreValue =
      quizSubmitted || !isSpecialPosttest ? quizScore : storedSpecialScore;
    const scoreMax =
      quizQuestions.length ||
      posttestMeta?.report?.totalQuestions ||
      currentLesson.content?.questionsCount ||
      0;
    const ReportCardComponent = posttestMeta?.ReportCardComponent;
    const showUnlockMessage = Boolean(posttestMeta?.unlockMessage) && (isPassed || isCompleted);

    if (quizSubmitted || isCompleted) {
      return (
        <div className="space-y-6">
          {renderQuestBrief()}
          <div className="brand-panel p-8 text-center">
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${isPassed || isCompleted ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
              {isPassed || isCompleted ? <Award size={44} /> : <RotateCcw size={44} />}
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold text-ink">
              {isCompleted && !isSpecialPosttest ? "ผ่านด่านแล้ว" : `${scoreValue} / ${scoreMax}`}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {isPassed || isCompleted
                ? "คุณผ่าน checkpoint นี้แล้ว"
                : "ยังไม่ผ่านเกณฑ์ ลองทำใหม่ได้จากปุ่มด้านล่าง"}
            </p>
            {showUnlockMessage ? (
              <div className="mt-6 rounded-[28px] border border-primary/10 bg-primary/5 p-5 text-left">
                <p className="text-sm font-semibold text-primary">{posttestMeta.badge}</p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {posttestMeta.unlockMessage}
                </p>
              </div>
            ) : null}
            {!isPassed && !isCompleted ? (
              <button type="button" onClick={retryQuiz} className="brand-button-secondary mt-6">
                <RotateCcw size={16} />
                ทำแบบทดสอบอีกครั้ง
              </button>
            ) : null}
          </div>
          {isSpecialPosttest && posttestMeta?.report && ReportCardComponent && (isPassed || isCompleted) ? (
            <ReportCardComponent report={posttestMeta.report} />
          ) : null}
        </div>
      );
    }

    if (isPosttest && cooldownRemainingMs > 0) {
      return (
        <div className="space-y-6">
          {renderQuestBrief()}
          <div className="brand-panel p-8 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Lock size={44} />
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold text-ink">
              อยู่ในช่วงรอทำใหม่
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              คุณใช้สิทธิ์ครบแล้วสำหรับรอบนี้ ระบบจะเปิดให้ทำใหม่อีกใน {formatCooldown(cooldownRemainingMs)}
            </p>
            <button
              type="button"
              onClick={retryQuiz}
              className="brand-button-secondary mt-6"
            >
              <RotateCcw size={16} />
              ตรวจสอบอีกครั้ง
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {renderQuestBrief()}
        <div className="brand-panel p-6">
          <div className="rounded-[28px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">{currentLesson.title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              ตอบให้ครบ {quizQuestions.length} ข้อ
              {isPosttest ? ` • attempt ${attemptCount + 1}/${maxAttempts}` : ""}
            </p>
            {isPosttest && currentLesson.content?.cooldownHours ? (
              <p className="mt-2 text-xs leading-6 text-slate-500">
                หากไม่ผ่านครบ {maxAttempts} ครั้ง จะต้องรอ {currentLesson.content.cooldownHours} ชั่วโมงก่อนเริ่มรอบใหม่
              </p>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            {quizQuestions.map((question, index) => (
              <div key={question.id || index} className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
                <h3 className="text-lg font-semibold text-ink">{index + 1}. {question.question}</h3>
                <div className="mt-4 space-y-3">
                  {question.options.map((option, optionIndex) => (
                    <label key={`${question.id}-${option}`} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${quizAnswers[question.id] === optionIndex ? "border-primary/25 bg-primary/5" : "border-white bg-white hover:border-accent/20"}`}>
                      <input
                        type="radio"
                        name={`question-${question.id || index}`}
                        checked={quizAnswers[question.id] === optionIndex}
                        onChange={() => handleQuizSelect(question.id, optionIndex)}
                        className="h-4 w-4 text-primary"
                      />
                      <span className="text-sm text-slate-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={submitQuiz}
              disabled={Object.keys(quizAnswers).length < quizQuestions.length}
              className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckSquare size={16} />
              ส่งคำตอบ
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCertificate = () => {
    const isPostTestPassed = completedSet.has("posttest-exam");
    const isSurveyDone = completedSet.has("final-survey");

    return (
      <div className="space-y-6">
        {renderQuestBrief()}
        <div className="brand-panel p-8 text-center">
          {!isPostTestPassed ? (
            <>
              <Lock className="mx-auto text-slate-300" size={58} />
              <h2 className="mt-6 font-display text-3xl font-bold text-ink">ต้องผ่าน post-test ก่อน</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                ผ่าน post-test ก่อนจึงจะเปิดคลังใบประกาศได้
              </p>
            </>
          ) : !isSurveyDone ? (
            <>
              <Trophy className="mx-auto text-warm" size={58} />
              <h2 className="mt-6 font-display text-3xl font-bold text-ink">เกือบถึงแล้ว</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                ทำแบบสะท้อนผลให้เสร็จก่อน เพื่อปลดล็อกใบประกาศ
              </p>
              <button
                type="button"
                onClick={() => {
                  const finalModuleIndex = currentCourse.modules.length - 1;
                  const surveyIndex = currentCourse.modules[finalModuleIndex].lessons.findIndex(
                    (lesson) => lesson.id === "final-survey",
                  );
                  handleLessonChange(finalModuleIndex, surveyIndex);
                }}
                className="brand-button-secondary mt-6"
              >
                ไปที่แบบประเมิน
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <Award className="mx-auto text-primary" size={58} />
                <h2 className="mt-6 font-display text-3xl font-bold text-ink">Certificate พร้อมดาวน์โหลด</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  คุณผ่านทุก checkpoint แล้ว และสามารถดาวน์โหลด Certificate of InSPIRE360 ได้ทันที
                </p>
              </div>
              <CourseCertificateCard certificate={courseCertificate} />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={38} />
      </div>
    );
  }

  if (!currentModule || !currentLesson) {
    return <div className="p-8 text-center">ไม่พบข้อมูลบทเรียนที่ต้องการเปิด</div>;
  }

  return (
    <div className="overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-[0_30px_120px_rgba(13,17,100,0.12)]">
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className={`fixed inset-y-0 left-0 z-30 w-80 bg-ink px-4 py-4 text-white transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col rounded-[30px] border border-white/[0.12] bg-gradient-to-b from-primary via-secondary to-[#220f3f] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/[0.45]">ห้องภารกิจ</p>
                <h2 className="mt-1 font-display text-2xl font-bold">InSPIRE 360°</h2>
              </div>
              <button type="button" onClick={() => navigate("/dashboard")} className="rounded-2xl border border-white/[0.12] bg-white/[0.10] p-2 text-white/[0.72]">
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-[28px] border border-white/[0.12] bg-white/[0.10] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/[0.45]">ความก้าวหน้าของคอร์ส</p>
              <p className="mt-3 text-3xl font-bold">{courseProgressPercent}%</p>
              <div className="mt-4 h-2 rounded-full bg-white/[0.12]">
                <div className="h-full rounded-full bg-gradient-to-r from-warm via-accent to-white" style={{ width: `${courseProgressPercent}%` }} />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-white/[0.72]">
                <span>{earnedXp} XP</span>
                <span>{getRankLabel(earnedXp)}</span>
              </div>
            </div>

            <div className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
              {currentCourse.modules.map((module, moduleIndex) => {
                const isLocked = moduleIndex > progressData.currentModuleIndex;
            const completedInModule = module.lessons.filter((lesson) => effectiveCompletedSet.has(lesson.id)).length;
                const moduleProgress = Math.round((completedInModule / module.lessons.length) * 100);

                return (
                  <div key={module.id} className={`rounded-[26px] border border-white/10 bg-white/[0.06] ${isLocked ? "opacity-55" : ""}`}>
                    <button
                      type="button"
                      onClick={() => !isLocked && toggleModule(moduleIndex)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/[0.45]">{module.campaignName}</p>
                        <p className="mt-1 text-sm font-semibold text-white">{module.title}</p>
                        <p className="mt-2 text-xs text-white/[0.55]">สำเร็จแล้ว {moduleProgress}%</p>
                      </div>
                      {isLocked ? <Lock size={16} className="text-white/[0.45]" /> : expandedModules[moduleIndex] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {!isLocked && expandedModules[moduleIndex] ? (
                      <div className="space-y-2 px-3 pb-3">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const isActive = moduleIndex === activeModuleIndex && lessonIndex === activeLessonIndex;
                          const isCompleted = effectiveCompletedSet.has(lesson.id);
                          const xp = getLessonXp(lesson);

                          return (
                            <button
                              key={lesson.id}
                              type="button"
                              onClick={() => handleLessonChange(moduleIndex, lessonIndex)}
                              className={`flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left transition ${isActive ? "bg-white text-ink shadow-[0_16px_40px_rgba(13,17,100,0.18)]" : "text-white/[0.78] hover:bg-white/[0.10]"}`}
                            >
                              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.10]">
                                {isCompleted ? <CheckCircle2 size={16} className={isActive ? "text-primary" : "text-warm"} /> : getIcon(lesson.iconName, isActive ? "text-primary" : "text-white/[0.70]")}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{lesson.title}</span>
                                <span className={`mt-1 block text-xs ${isActive ? "text-slate-500" : "text-white/[0.45]"}`}>{xp} XP</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-surface/[0.35]">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/75 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setSidebarOpen(!isSidebarOpen)} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 md:hidden">
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{currentModule.campaignName}</p>
                <h1 className="font-display text-xl font-bold text-ink md:text-2xl">{currentLesson.title}</h1>
              </div>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <span className="brand-chip border-accent/10 bg-accent/5 text-accent">
                <Flame size={14} />
                {earnedXp}/{totalXp} XP
              </span>
              <span className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <Trophy size={14} />
                {completedMissionCount}/{totalMissionCount} ภารกิจ
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="brand-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">อันดับปัจจุบัน</p>
                  <p className="mt-3 text-2xl font-bold text-ink">{getRankLabel(earnedXp)}</p>
                </div>
                <div className="brand-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">XP ของภารกิจนี้</p>
                  <p className="mt-3 text-2xl font-bold text-ink">{getLessonXp(currentLesson)}</p>
                </div>
                <div className="brand-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">สถานะ</p>
                  <p className="mt-3 text-2xl font-bold text-ink">
                    {effectiveCompletedSet.has(currentLesson.id) ? "เสร็จแล้ว" : "กำลังทำอยู่"}
                  </p>
                </div>
              </div>

              {currentLesson.type === "video" ? renderVideo() : null}
              {currentLesson.type === "article" ? renderArticle() : null}
              {currentLesson.type === "activity" ? renderActivity() : null}
              {currentLesson.type === "quiz" ? renderQuizUI() : null}
              {currentLesson.type === "certificate" ? renderCertificate() : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


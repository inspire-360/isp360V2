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
import ModuleOneMission from "../components/course/ModuleOneMission";
import ModuleOneReportCard from "../components/course/ModuleOneReportCard";
import { useAuth } from "../contexts/AuthContext";
import { getPostTestQuestions, getPreTestQuestions } from "../data/standardizedTests";
import {
  MODULE_ONE_BADGE,
  MODULE_ONE_REPORT_KEY,
  buildModuleOneReportCard,
  generateModuleOneCardSerial,
  moduleOneStages,
} from "../data/moduleOneCampaign";
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
  missionResponses: {},
  moduleReports: {},
  earnedBadges: [],
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

  const courseId = "course-teacher";
  const currentCourse = teacherCourseData;

  const lessonMap = useMemo(() => {
    const nextMap = new Map();
    currentCourse.modules.forEach((module, moduleIndex) => {
      module.lessons.forEach((lesson, lessonIndex) => {
        nextMap.set(lesson.id, { lesson, module, moduleIndex, lessonIndex });
      });
    });
    return nextMap;
  }, [currentCourse.modules]);

  const allLessons = useMemo(
    () =>
      currentCourse.modules.flatMap((module) =>
        module.lessons.map((lesson) => ({ module, lesson })),
      ),
    [currentCourse.modules],
  );

  const currentModule = currentCourse.modules?.[activeModuleIndex];
  const currentLesson = currentModule?.lessons?.[activeLessonIndex];
  const currentGamification = currentLesson?.content?.gamification;
  const currentMissionResponse = currentLesson ? progressData.missionResponses?.[currentLesson.id] : null;
  const moduleOneReport = progressData.moduleReports?.[MODULE_ONE_REPORT_KEY];
  const isCurrentModuleOneLesson = currentLesson?.id?.startsWith("m1-");
  const completedSet = useMemo(
    () => new Set(progressData.completedLessons),
    [progressData.completedLessons],
  );

  const totalXp = useMemo(
    () => allLessons.reduce((sum, item) => sum + getLessonXp(item.lesson), 0),
    [allLessons],
  );
  const earnedXp = useMemo(
    () =>
      progressData.completedLessons.reduce((sum, lessonId) => {
        const entry = lessonMap.get(lessonId);
        return sum + (entry ? getLessonXp(entry.lesson) : 0);
      }, 0),
    [lessonMap, progressData.completedLessons],
  );
  const completedMissionCount = useMemo(
    () => allLessons.filter((item) => isMissionLesson(item.lesson) && completedSet.has(item.lesson.id)).length,
    [allLessons, completedSet],
  );
  const totalMissionCount = useMemo(
    () => allLessons.filter((item) => isMissionLesson(item.lesson)).length,
    [allLessons],
  );
  const courseProgressPercent = Math.round((progressData.completedLessons.length / allLessons.length) * 100) || 0;

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

  const buildEnrollmentMeta = ({
    completedLessons = progressData.completedLessons,
    unlockedModuleIndex = progressData.currentModuleIndex,
    activeModule = activeModuleIndex,
    activeLesson = activeLessonIndex,
  } = {}) => {
    const safeModuleIndex = getSafeModuleIndex(activeModule);
    const safeLessonIndex = getSafeLessonIndex(safeModuleIndex, activeLesson);
    const activeModuleData = currentCourse.modules[safeModuleIndex];
    const activeLessonData = activeModuleData?.lessons?.[safeLessonIndex];
    const completedCount = completedLessons.length;
    const progressPercent = allLessons.length
      ? Math.min(100, Math.round((completedCount / allLessons.length) * 100))
      : 0;

    return {
      courseId,
      courseTitle: currentCourse.title,
      completedLessonsCount: completedCount,
      lessonCount: allLessons.length,
      moduleCount: currentCourse.modules.length,
      progressPercent,
      currentModuleIndex: getSafeModuleIndex(unlockedModuleIndex),
      activeModuleIndex: safeModuleIndex,
      activeLessonIndex: safeLessonIndex,
      activeModuleTitle: activeModuleData?.title || "",
      activeLessonId: activeLessonData?.id || "",
      activeLessonTitle: activeLessonData?.title || "",
      status: completedCount >= allLessons.length ? "completed" : "active",
    };
  };

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
          const unlockedModuleIndex = getSafeModuleIndex(data.currentModuleIndex || 0);
          const nextActiveModuleIndex = getSafeModuleIndex(
            typeof data.activeModuleIndex === "number" ? data.activeModuleIndex : unlockedModuleIndex,
          );
          const nextActiveLessonIndex =
            typeof data.activeLessonIndex === "number"
              ? getSafeLessonIndex(nextActiveModuleIndex, data.activeLessonIndex)
              : getFirstPendingLessonIndex(nextActiveModuleIndex, completedLessons);

          setProgressData({
            ...defaultProgressData,
            ...data,
            completedLessons,
            currentModuleIndex: unlockedModuleIndex,
            postTestAttempts: data.postTestAttempts || 0,
            score: data.score || 0,
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
      const isModuleDone = currentModule.lessons.every((lesson) => newCompleted.includes(lesson.id));
      const unlockedModule = activeModuleIndex + 1;
      const nextModuleIndex =
        isModuleDone &&
        unlockedModule < currentCourse.modules.length &&
        unlockedModule > progressData.currentModuleIndex
          ? unlockedModule
          : progressData.currentModuleIndex;
      let nextActiveModuleIndex = activeModuleIndex;
      let nextActiveLessonIndex = activeLessonIndex;

      setProgressData((previous) => ({
        ...previous,
        completedLessons: newCompleted,
        currentModuleIndex: nextModuleIndex,
      }));

      if (isModuleDone) {
        const unlockedModule = activeModuleIndex + 1;
        if (unlockedModule < currentCourse.modules.length) {
          setExpandedModules((previous) => ({ ...previous, [unlockedModule]: true }));
          if (!stayOnLesson) {
            nextActiveModuleIndex = unlockedModule;
            nextActiveLessonIndex = getFirstPendingLessonIndex(unlockedModule, newCompleted);
          }
          alert(`ปลดล็อก ${currentCourse.modules[unlockedModule].title} แล้ว`);
        }
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

  const saveModuleOneMission = async (payload) => {
    if (!currentUser || !currentLesson) return;

    const record = {
      ...payload,
      saveState: "submitted",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

    if (!completedSet.has(currentLesson.id)) {
      await markLessonComplete();
    }
  };

  const saveModuleOneDraft = async (payload) => {
    if (!currentUser || !currentLesson) return;

    const record = {
      ...payload,
      saveState: completedSet.has(currentLesson.id) ? "submitted" : "draft",
      updatedAt: new Date().toISOString(),
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
  };

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
      const newAttempts = progressData.postTestAttempts + 1;
      await updateDoc(enrollRef, {
        postTestAttempts: newAttempts,
        score,
        lastAccess: new Date(),
      });
      setProgressData((previous) => ({ ...previous, postTestAttempts: newAttempts, score }));

      if (isPassed) {
        if (currentLesson.id === "m1-posttest") {
          await saveModuleOneReport(score, quizQuestions.length);
          await markLessonComplete({ stayOnLesson: true });
        } else {
          await markLessonComplete();
        }
        alert("ยินดีด้วย คุณผ่าน post-test แล้ว");
      } else if (newAttempts >= (currentLesson.content?.maxAttempts || 5)) {
        alert("คุณไม่ผ่านครบตามจำนวนครั้ง ระบบจะเริ่มต้นใหม่จาก Module 1");
        await resetCourseProgress();
      }
      return;
    }

    if (isPassed) await markLessonComplete();
  };

  const retryQuiz = () => {
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
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {moduleOneStages.map((stage) => {
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
            <p className="text-xs uppercase tracking-[0.18em] text-white/[0.50]">Difficulty</p>
            <p className="mt-2 text-xl font-semibold">{currentGamification.difficulty}</p>
          </div>
        </div>

        {currentGamification.deliverable ? (
          <p className="mt-5 rounded-[24px] border border-white/[0.12] bg-white/[0.10] px-4 py-3 text-sm leading-7 text-white/[0.80]">
            Deliverable: {currentGamification.deliverable}
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
          Completed
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
                  Canva lesson is embedded with the requested `watch?embed` URL. ถ้ายังเจอข้อจำกัดจากเบราว์เซอร์หรือเครือข่ายของโรงเรียน สามารถเปิดแท็บใหม่จากปุ่มด้านล่างได้ทันที
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
            Open lesson in new tab
            <ArrowRight size={16} />
          </a>
        ) : null}
        {renderActionFooter("Mark as completed", <PlayCircle size={16} />)}
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
            <p className="text-sm font-semibold text-primary">Resources</p>
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
              เมื่อทำแบบสอบถามแล้ว ให้กลับมากด completed เพื่อปลดล็อก certificate vault
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

        {renderActionFooter("Complete this brief", <CheckCircle2 size={16} />)}
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6">
      {renderQuestBrief()}
      <div className="brand-panel p-6">
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
        {currentLesson.activityType === "swot_board" ? <SWOTBoard /> : null}
        {!currentLesson.activityType?.startsWith("module1_")
          ? renderActionFooter("Submit mission", <PenTool size={16} />)
          : null}
      </div>
    </div>
  );

  const renderQuizUI = () => {
    const isPosttest = currentLesson.content?.isPosttest;
    const isPassed = quizScore >= (currentLesson.content?.passScore || 0);
    const isCompleted = completedSet.has(currentLesson.id);
    const isModuleOnePosttest = currentLesson.id === "m1-posttest";
    const scoreValue =
      quizSubmitted || !isModuleOnePosttest ? quizScore : moduleOneReport?.score || quizScore;
    const scoreMax = quizQuestions.length || moduleOneReport?.totalQuestions || 0;

    if (quizSubmitted || isCompleted) {
      return (
        <div className="space-y-6">
          {renderQuestBrief()}
          <div className="brand-panel p-8 text-center">
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${isPassed || isCompleted ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
              {isPassed || isCompleted ? <Award size={44} /> : <RotateCcw size={44} />}
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold text-ink">
              {isCompleted && !isModuleOnePosttest ? "Checkpoint cleared" : `${scoreValue} / ${scoreMax}`}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {isPassed || isCompleted
                ? "คุณผ่าน checkpoint นี้แล้ว"
                : "ยังไม่ผ่านเกณฑ์ ลองทำใหม่ได้จากปุ่มด้านล่าง"}
            </p>
            {isModuleOnePosttest && moduleOneReport && (isPassed || isCompleted) ? (
              <div className="mt-6 rounded-[28px] border border-primary/10 bg-primary/5 p-5 text-left">
                <p className="text-sm font-semibold text-primary">{MODULE_ONE_BADGE}</p>
                <p className="mt-2 text-base font-semibold text-ink">
                  Report card พร้อมแล้ว และ Module 2 ถูกปลดล็อกให้เรียบร้อย
                </p>
              </div>
            ) : null}
            {!isPassed && !isCompleted ? (
              <button type="button" onClick={retryQuiz} className="brand-button-secondary mt-6">
                <RotateCcw size={16} />
                Retry quiz
              </button>
            ) : null}
          </div>
          {isModuleOnePosttest && moduleOneReport && (isPassed || isCompleted) ? (
            <ModuleOneReportCard report={moduleOneReport} />
          ) : null}
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
              {isPosttest ? ` • attempt ${progressData.postTestAttempts + 1}/${currentLesson.content?.maxAttempts || 5}` : ""}
            </p>
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
              Submit answers
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
              <h2 className="mt-6 font-display text-3xl font-bold text-ink">Post-test required</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                ผ่าน post-test ก่อนจึงจะเปิด certificate vault ได้
              </p>
            </>
          ) : !isSurveyDone ? (
            <>
              <Trophy className="mx-auto text-warm" size={58} />
              <h2 className="mt-6 font-display text-3xl font-bold text-ink">Almost there</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                ทำ reflection survey ให้เสร็จก่อน เพื่อปลดล็อก certificate
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
                ไปที่ survey
                <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <Award className="mx-auto text-primary" size={58} />
              <h2 className="mt-6 font-display text-3xl font-bold text-ink">Certificate unlocked</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                คุณผ่านทุก checkpoint และพร้อมดาวน์โหลดใบรับรองแล้ว
              </p>
              <a
                href={currentLesson.content?.certificateUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="brand-button-primary mt-6"
              >
                <Award size={16} />
                {currentLesson.content?.certificateLabel || "Download certificate"}
              </a>
            </>
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
    return <div className="p-8 text-center">Data error: lesson not found</div>;
  }

  return (
    <div className="overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-[0_30px_120px_rgba(13,17,100,0.12)]">
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className={`fixed inset-y-0 left-0 z-30 w-80 bg-ink px-4 py-4 text-white transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col rounded-[30px] border border-white/[0.12] bg-gradient-to-b from-primary via-secondary to-[#220f3f] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/[0.45]">Quest room</p>
                <h2 className="mt-1 font-display text-2xl font-bold">InSPIRE 360°</h2>
              </div>
              <button type="button" onClick={() => navigate("/dashboard")} className="rounded-2xl border border-white/[0.12] bg-white/[0.10] p-2 text-white/[0.72]">
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-[28px] border border-white/[0.12] bg-white/[0.10] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/[0.45]">Course progress</p>
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
                const completedInModule = module.lessons.filter((lesson) => completedSet.has(lesson.id)).length;
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
                        <p className="mt-2 text-xs text-white/[0.55]">{moduleProgress}% complete</p>
                      </div>
                      {isLocked ? <Lock size={16} className="text-white/[0.45]" /> : expandedModules[moduleIndex] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>

                    {!isLocked && expandedModules[moduleIndex] ? (
                      <div className="space-y-2 px-3 pb-3">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const isActive = moduleIndex === activeModuleIndex && lessonIndex === activeLessonIndex;
                          const isCompleted = completedSet.has(lesson.id);
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
                {completedMissionCount}/{totalMissionCount} missions
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="brand-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current rank</p>
                  <p className="mt-3 text-2xl font-bold text-ink">{getRankLabel(earnedXp)}</p>
                </div>
                <div className="brand-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mission XP</p>
                  <p className="mt-3 text-2xl font-bold text-ink">{getLessonXp(currentLesson)}</p>
                </div>
                <div className="brand-panel p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <p className="mt-3 text-2xl font-bold text-ink">
                    {completedSet.has(currentLesson.id) ? "Completed" : "In progress"}
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


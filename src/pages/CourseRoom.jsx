import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Menu,
  PlayCircle,
  Sparkles,
  Wand2,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { teacherCourseData } from "../data/teacherCourse";
import {
  createInitialTeacherEnrollment,
  normalizeTeacherEnrollment,
} from "../data/teacherProgress";
import { getIcon } from "../utils/iconHelper";

const COURSE_ID = teacherCourseData.id;
const STAGE_ITEMS = [
  { id: 1, label: "Step 1", title: "ประเมินก่อนเรียน" },
  { id: 2, label: "Step 2", title: "เรียนรู้ต้นแบบ" },
  { id: 3, label: "Step 3", title: "ลงมือทำภารกิจ" },
  { id: 4, label: "Step 4", title: "สรุปผลและปลดล็อก" },
];

function isFilled(value) {
  if (typeof value === "number") {
    return value >= 1;
  }
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function unique(values) {
  return Array.from(new Set(values));
}

function formatThaiDate(value) {
  if (!value) {
    return "-";
  }

  const date = value?.toDate ? value.toDate() : value;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStartingPosition(course, progress) {
  for (let moduleIndex = 0; moduleIndex <= progress.currentModuleIndex; moduleIndex += 1) {
    const module = course.modules[moduleIndex];
    if (!module) {
      continue;
    }

    const lessonIndex = module.lessons.findIndex(
      (lesson) => !progress.completedLessons.includes(lesson.id),
    );

    if (lessonIndex !== -1) {
      return { moduleIndex, lessonIndex };
    }
  }

  return {
    moduleIndex: Math.min(progress.currentModuleIndex, course.modules.length - 1),
    lessonIndex: 0,
  };
}

function getModuleProgress(module, completedLessons) {
  const done = module.lessons.filter((lesson) =>
    completedLessons.includes(lesson.id),
  ).length;
  const total = module.lessons.length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function findNextPosition(moduleIndex, lessonIndex) {
  const module = teacherCourseData.modules[moduleIndex];
  if (!module) {
    return null;
  }

  if (lessonIndex < module.lessons.length - 1) {
    return { moduleIndex, lessonIndex: lessonIndex + 1 };
  }

  if (moduleIndex < teacherCourseData.modules.length - 1) {
    return { moduleIndex: moduleIndex + 1, lessonIndex: 0 };
  }

  return null;
}

function buildLessonSummary(lesson, progress) {
  const response = progress.responses?.[lesson.id] || {};
  const quizResult = progress.quizResults?.[lesson.id];

  if (lesson.type === "iframe") {
    return [{ label: "สถานะ", value: "ศึกษาบทเรียนแล้ว" }];
  }

  if (lesson.type === "quiz") {
    return quizResult
      ? [
          {
            label: "ผลการทำแบบทดสอบ",
            value: `${quizResult.score}/${quizResult.total} ${
              quizResult.passed ? "(ผ่าน)" : "(ยังไม่ผ่าน)"
            }`,
          },
        ]
      : [{ label: "ผลการทำแบบทดสอบ", value: "ยังไม่มีข้อมูล" }];
  }

  if (lesson.content?.renderType === "strategyChoice") {
    const strategyKeys = lesson.content.sourceFields || [];
    const ratings = response.ratings || {};
    const selected = response.selectedStrategy || "";

    return strategyKeys
      .map((key) => {
        const label =
          progress.responses?.[lesson.content.sourceLessonId]?.[key] || "";

        if (!label) {
          return null;
        }

        const row = ratings[key] || {};
        const total =
          Number(row.impact || 0) +
          Number(row.feasibility || 0) +
          Number(row.urgency || 0);

        return {
          label: `${selected === key ? "กลยุทธ์ที่เลือก" : "กลยุทธ์"}`,
          value: `${label} (รวม ${total} คะแนน)`,
        };
      })
      .filter(Boolean);
  }

  const summaries = [];
  lesson.content?.sections?.forEach((section) => {
    section.fields.forEach((field) => {
      const value = response[field.id];
      if (isFilled(value)) {
        summaries.push({
          label: field.label,
          value: typeof value === "number" ? `${value}/5` : value,
        });
      }
    });
  });
  return summaries;
}

function getLockRemaining(lockUntil) {
  if (!lockUntil) {
    return null;
  }

  const diff = lockUntil.getTime() - Date.now();
  if (diff <= 0) {
    return null;
  }

  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  return `${hours} ชม. ${minutes} นาที`;
}

export default function CourseRoom() {
  const navigate = useNavigate();
  const { currentUser, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(createInitialTeacherEnrollment());
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [expandedModules, setExpandedModules] = useState({ 0: true });
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);
  const [reward, setReward] = useState(null);

  const currentModule = teacherCourseData.modules[activeModuleIndex];
  const currentLesson = currentModule?.lessons?.[activeLessonIndex];
  const currentResponse = progress.responses?.[currentLesson?.id] || {};
  const finalLockRemaining = getLockRemaining(progress.finalExamLockedUntil);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    async function loadProgress() {
      setLoading(true);
      try {
        const enrollRef = doc(db, "users", currentUser.uid, "enrollments", COURSE_ID);
        const snapshot = await getDoc(enrollRef);
        const nextProgress = snapshot.exists()
          ? normalizeTeacherEnrollment(snapshot.data())
          : createInitialTeacherEnrollment();

        if (!snapshot.exists()) {
          await setDoc(enrollRef, nextProgress, { merge: true });
        }

        setProgress(nextProgress);
        const start = getStartingPosition(teacherCourseData, nextProgress);
        setActiveModuleIndex(start.moduleIndex);
        setActiveLessonIndex(start.lessonIndex);
        setExpandedModules({ [start.moduleIndex]: true });
      } catch (error) {
        console.error("Error loading teacher course progress:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [currentUser]);

  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  }, [currentLesson?.id]);

  const stageProgress = useMemo(() => {
    const step = currentLesson?.step || 1;
    return Math.round((step / STAGE_ITEMS.length) * 100);
  }, [currentLesson]);

  const saveProgress = async (nextProgress) => {
    if (!currentUser) {
      return;
    }

    const payload = { ...nextProgress, lastAccess: new Date() };
    setProgress(payload);
    await setDoc(
      doc(db, "users", currentUser.uid, "enrollments", COURSE_ID),
      payload,
      { merge: true },
    );
  };

  const triggerReward = (message) => {
    setReward(message);
    window.clearTimeout(window.__inspireRewardTimer);
    window.__inspireRewardTimer = window.setTimeout(() => setReward(null), 2200);
  };

  const goToLesson = (moduleIndex, lessonIndex) => {
    if (moduleIndex > progress.currentModuleIndex) {
      window.alert("กรุณาเรียนรู้ให้ครบตามลำดับก่อนนะครับ");
      return;
    }

    setActiveModuleIndex(moduleIndex);
    setActiveLessonIndex(lessonIndex);
    setExpandedModules((prev) => ({ ...prev, [moduleIndex]: true }));
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const openLesson = (moduleIndex, lessonIndex) => {
    setActiveModuleIndex(moduleIndex);
    setActiveLessonIndex(lessonIndex);
    setExpandedModules((prev) => ({ ...prev, [moduleIndex]: true }));
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const updateResponse = (fieldId, value) => {
    setProgress((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [currentLesson.id]: {
          ...(prev.responses?.[currentLesson.id] || {}),
          [fieldId]: value,
        },
      },
    }));
  };

  const updateStrategyRating = (strategyKey, criterion, value) => {
    setProgress((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [currentLesson.id]: {
          ...(prev.responses?.[currentLesson.id] || {}),
          ratings: {
            ...(prev.responses?.[currentLesson.id]?.ratings || {}),
            [strategyKey]: {
              ...(prev.responses?.[currentLesson.id]?.ratings?.[strategyKey] || {}),
              [criterion]: value,
            },
          },
        },
      },
    }));
  };

  const validateCurrentLesson = () => {
    if (currentLesson.type !== "form") {
      return true;
    }

    if (currentLesson.content.renderType === "strategyChoice") {
      const strategies = currentLesson.content.sourceFields
        .map((key) => ({
          key,
          value: progress.responses?.[currentLesson.content.sourceLessonId]?.[key] || "",
        }))
        .filter((item) => item.value);

      if (strategies.length === 0) {
        window.alert("กรุณาสร้างกลยุทธ์ใน Mission 3 ก่อนครับ");
        return false;
      }

      const ratings = currentResponse.ratings || {};
      const completed = strategies.every((strategy) =>
        currentLesson.content.criteria.every((criterion) =>
          isFilled(ratings?.[strategy.key]?.[criterion.id]),
        ),
      );

      if (!completed || !currentResponse.selectedStrategy) {
        window.alert("กรุณาให้คะแนนทุกกลยุทธ์และเลือก 1 กลยุทธ์หลักก่อนส่งภารกิจ");
        return false;
      }

      return true;
    }

    for (const section of currentLesson.content.sections || []) {
      for (const field of section.fields) {
        if (field.required !== false && !isFilled(currentResponse[field.id])) {
          window.alert(`กรุณากรอกหัวข้อ "${field.label}" ให้ครบก่อนนะครับ`);
          return false;
        }
      }
    }

    return true;
  };

  const completeCurrentLesson = async (extra = {}) => {
    if (!currentLesson) {
      return;
    }

    const nextCompleted = unique([...progress.completedLessons, currentLesson.id]);
    const nextBadges = unique([...(progress.badges || []), ...(extra.badges || [])]);
    const moduleDone = currentModule.lessons.every((lesson) =>
      nextCompleted.includes(lesson.id),
    );

    const nextProgress = {
      ...progress,
      ...extra,
      completedLessons: nextCompleted,
      badges: nextBadges,
      currentModuleIndex: moduleDone
        ? Math.min(
            teacherCourseData.modules.length - 1,
            Math.max(progress.currentModuleIndex, activeModuleIndex + 1),
          )
        : progress.currentModuleIndex,
    };

    setSaving(true);
    try {
      await saveProgress(nextProgress);
      triggerReward(`เยี่ยมมากครับ บันทึก "${currentLesson.title}" เรียบร้อยแล้ว`);
      const next = findNextPosition(activeModuleIndex, activeLessonIndex);
      if (next) {
        openLesson(next.moduleIndex, next.lessonIndex);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!validateCurrentLesson()) {
      return;
    }

    const badges =
      currentLesson.type === "report" && currentModule.badgeName
        ? [currentModule.badgeName]
        : [];
    await completeCurrentLesson({ badges });
  };

  const submitQuiz = async () => {
    const questions = currentLesson.content.questions || [];
    const unanswered = questions.some((question) => quizAnswers[question.id] === undefined);

    if (unanswered) {
      window.alert("กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งคำตอบ");
      return;
    }

    const score = questions.reduce(
      (total, question) =>
        total + (quizAnswers[question.id] === question.correctAnswer ? 1 : 0),
      0,
    );

    const passed = score >= (currentLesson.content.passScore || 0);
    const result = {
      score,
      total: questions.length,
      passed,
      completedAt: new Date(),
    };

    setQuizScore(score);
    setQuizSubmitted(true);

    let nextProgress = {
      ...progress,
      quizResults: {
        ...progress.quizResults,
        [currentLesson.id]: result,
      },
    };

    if (currentLesson.content.mode === "pretest") {
      nextProgress.completedLessons = unique([...progress.completedLessons, currentLesson.id]);
    }

    if (currentLesson.content.mode === "posttest" && passed) {
      nextProgress.completedLessons = unique([...progress.completedLessons, currentLesson.id]);
    }

    if (currentLesson.content.mode === "finalExam") {
      if (passed) {
        nextProgress.completedLessons = unique([...progress.completedLessons, currentLesson.id]);
        nextProgress.finalExamAttempts = 0;
        nextProgress.finalExamLockedUntil = null;
      } else {
        const usedAttempts = (progress.finalExamAttempts || 0) + 1;
        if (usedAttempts >= 3) {
          nextProgress.finalExamAttempts = 0;
          nextProgress.finalExamLockedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
        } else {
          nextProgress.finalExamAttempts = usedAttempts;
        }
      }
    }

    setSaving(true);
    try {
      await saveProgress(nextProgress);
      if (passed) {
        triggerReward(`ยอดเยี่ยมครับ ผ่าน "${currentLesson.title}" แล้ว`);
      }
    } finally {
      setSaving(false);
    }
  };

  const retryQuiz = () => {
    if (currentLesson.content.mode === "finalExam" && finalLockRemaining) {
      return;
    }
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const downloadReportCard = () => {
    const rows = currentModule.lessons
      .filter((lesson) => lesson.id !== currentLesson.id)
      .flatMap((lesson) =>
        buildLessonSummary(lesson, progress).map((item) => ({
          lessonTitle: lesson.title,
          ...item,
        })),
      );

    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8" /><title>${escapeHtml(
      currentModule.title,
    )} Report Card</title></head><body>${rows
      .map(
        (row) =>
          `<h2>${escapeHtml(row.lessonTitle)}</h2><p>${escapeHtml(
            row.label,
          )}</p><pre>${escapeHtml(row.value)}</pre>`,
      )
      .join("")}</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentModule.id}-report-card.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCertificate = () => {
    const learnerName =
      profile?.name || currentUser?.displayName || currentUser?.email || "ผู้ใช้งาน";
    const certSvg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900"><rect width="1400" height="900" fill="#f8fafc" /><rect x="48" y="48" width="1304" height="804" rx="32" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" /><text x="700" y="240" font-size="30" font-family="Arial" text-anchor="middle" fill="#475569">Certificate of Completion</text><text x="700" y="330" font-size="62" font-family="Arial" font-weight="700" text-anchor="middle" fill="#0f172a">InSPIRE360</text><text x="700" y="500" font-size="48" font-family="Arial" font-weight="700" text-anchor="middle" fill="#1d4ed8">${escapeHtml(
      learnerName,
    )}</text><text x="700" y="620" font-size="24" font-family="Arial" text-anchor="middle" fill="#475569">${escapeHtml(
      formatThaiDate(new Date()),
    )}</text></svg>`;

    const blob = new Blob([certSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inspire360-certificate.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderField = (field) => {
    const value = currentResponse[field.id] || "";

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(event) => updateResponse(field.id, event.target.value)}
          rows={field.rows || 4}
          className="field-input min-h-[128px]"
          placeholder={field.placeholder}
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          value={value}
          onChange={(event) => updateResponse(field.id, event.target.value)}
          className="field-select"
        >
          <option value="">เลือกคำตอบ</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "rating") {
      return (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => updateResponse(field.id, score)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
                Number(value) === score
                  ? "border-sky-400 bg-sky-400 text-slate-950"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {score}
            </button>
          ))}
        </div>
      );
    }

    return (
      <input
        type={field.type || "text"}
        value={value}
        onChange={(event) => updateResponse(field.id, event.target.value)}
        className="field-input"
        placeholder={field.placeholder}
      />
    );
  };

  const renderQuestionnaire = () => (
    <div className="space-y-6">
      {currentLesson.content.sections.map((section) => (
        <section key={section.title} className="surface-panel p-5 sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {section.title}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {section.description}
          </p>
          <div className="mt-6 space-y-5">
            {section.fields.map((field) => (
              <div key={field.id}>
                <label className="field-label">{field.label}</label>
                {renderField(field)}
                {field.helper && (
                  <p className="mt-2 text-xs text-slate-400">{field.helper}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={saving}
          className="primary-button"
        >
          บันทึกภารกิจนี้
        </button>
      </div>
    </div>
  );

  const renderStrategyChoice = () => {
    const sourceResponse = progress.responses?.[currentLesson.content.sourceLessonId] || {};
    const strategies = currentLesson.content.sourceFields
      .map((key) => ({ key, text: sourceResponse[key] || "" }))
      .filter((item) => item.text);
    const ratings = currentResponse.ratings || {};

    if (strategies.length === 0) {
      return (
        <div className="surface-panel p-8 text-center">
          <Lock className="mx-auto text-slate-300" size={36} />
          <p className="mt-4 text-slate-500">
            กรุณากลับไปทำ Mission 3 ให้ครบก่อน จึงจะให้คะแนนกลยุทธ์ในขั้นนี้ได้
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {strategies.map((strategy) => {
          const total = currentLesson.content.criteria.reduce(
            (sum, criterion) => sum + Number(ratings?.[strategy.key]?.[criterion.id] || 0),
            0,
          );

          return (
            <section key={strategy.key} className="surface-panel p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    กลยุทธ์
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-950">
                    {strategy.text}
                  </h3>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    checked={currentResponse.selectedStrategy === strategy.key}
                    onChange={() => updateResponse("selectedStrategy", strategy.key)}
                  />
                  เลือกกลยุทธ์นี้
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {currentLesson.content.criteria.map((criterion) => (
                  <div key={criterion.id}>
                    <p className="field-label">{criterion.label}</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() =>
                            updateStrategyRating(strategy.key, criterion.id, score)
                          }
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition ${
                            Number(ratings?.[strategy.key]?.[criterion.id]) === score
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                คะแนนรวม: <span className="font-semibold text-slate-950">{total}</span>
              </div>
            </section>
          );
        })}

        <section className="surface-panel p-5 sm:p-6">
          <label className="field-label">เหตุผลที่เลือกกลยุทธ์หลัก</label>
          <textarea
            value={currentResponse.selection_reason || ""}
            onChange={(event) => updateResponse("selection_reason", event.target.value)}
            rows={4}
            className="field-input min-h-[120px]"
            placeholder="อธิบายว่าทำไมกลยุทธ์นี้จึงเหมาะที่สุดกับบริบทของคุณครู"
          />
        </section>

        <div className="flex justify-end">
          <button type="button" onClick={handleFormSubmit} className="primary-button">
            ยืนยันกลยุทธ์หลัก
          </button>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    const storedResult = progress.quizResults?.[currentLesson.id];
    const result = quizSubmitted
      ? {
          score: quizScore,
          total: currentLesson.content.questions.length,
          passed: quizScore >= (currentLesson.content.passScore || 0),
        }
      : storedResult;

    if (result) {
      const isCompleted = progress.completedLessons.includes(currentLesson.id);
      return (
        <div className="surface-panel mx-auto max-w-3xl p-8 text-center">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              result.passed || isCompleted
                ? "bg-emerald-100 text-emerald-600"
                : "bg-red-100 text-red-500"
            }`}
          >
            {result.passed || isCompleted ? <Sparkles size={36} /> : <Loader2 size={36} />}
          </div>
          <h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
            {result.passed || isCompleted ? "ผ่านเกณฑ์แล้ว" : "ยังไม่ผ่านเกณฑ์"}
          </h2>
          <p className="mt-3 text-base text-slate-500">
            คะแนน {result.score}/{result.total}
          </p>
          {currentLesson.content.mode === "finalExam" && !result.passed && (
            <p className="mt-3 text-sm text-red-500">
              {finalLockRemaining
                ? `ครบ 3 ครั้งแล้ว กรุณารออีก ${finalLockRemaining} ก่อนลองใหม่`
                : `เหลือโอกาสอีก ${3 - (progress.finalExamAttempts || 0)} ครั้งก่อนพัก 12 ชั่วโมง`}
            </p>
          )}
          <div className="mt-8 flex justify-center gap-3">
            {!result.passed && !finalLockRemaining && (
              <button type="button" onClick={retryQuiz} className="secondary-button">
                ลองทำใหม่
              </button>
            )}
            {result.passed && (
              <button
                type="button"
                onClick={() => {
                  const next = findNextPosition(activeModuleIndex, activeLessonIndex);
                  if (next) {
                    goToLesson(next.moduleIndex, next.lessonIndex);
                  }
                }}
                className="primary-button"
              >
                ไปต่อ
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {currentLesson.content.mode === "finalExam" && finalLockRemaining && (
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            คุณใช้สิทธิ์ครบ 3 ครั้งแล้ว กรุณารออีก {finalLockRemaining} ก่อนเริ่ม Post-test สุดท้ายใหม่
          </div>
        )}
        {currentLesson.content.questions.map((question, index) => (
          <section key={question.id} className="surface-panel p-5 sm:p-6">
            <p className="text-sm font-semibold text-slate-500">ข้อ {index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              {question.question}
            </h3>
            <div className="mt-5 space-y-3">
              {question.options.map((option, optionIndex) => (
                <label
                  key={`${question.id}-${option}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 text-sm transition ${
                    quizAnswers[question.id] === optionIndex
                      ? "border-sky-400 bg-sky-50 text-slate-950"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    checked={quizAnswers[question.id] === optionIndex}
                    onChange={() =>
                      setQuizAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submitQuiz}
            disabled={saving || Boolean(finalLockRemaining)}
            className="primary-button"
          >
            ส่งคำตอบ
          </button>
        </div>
      </div>
    );
  };

  const renderIframeLesson = () => (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-slate-950/10">
        <iframe
          src={currentLesson.content.url}
          title={currentLesson.title}
          className="h-[calc(100vh-18rem)] min-h-[540px] w-full border-0"
          loading="lazy"
          allowFullScreen
        />
      </div>
      <div className="flex flex-wrap justify-between gap-4">
        <a
          href={currentLesson.content.url.replace("?embed", "")}
          target="_blank"
          rel="noreferrer"
          className="secondary-button"
        >
          เปิดบทเรียนในแท็บใหม่
        </a>
        <button type="button" onClick={() => completeCurrentLesson()} className="primary-button">
          ทำเครื่องหมายว่าเรียนจบแล้ว
        </button>
      </div>
    </div>
  );

  const renderReport = () => {
    const ready = currentModule.lessons
      .filter((lesson) => lesson.id !== currentLesson.id)
      .every((lesson) => progress.completedLessons.includes(lesson.id));

    if (!ready) {
      return (
        <div className="surface-panel p-8 text-center">
          <Lock className="mx-auto text-slate-300" size={40} />
          <h3 className="mt-4 text-2xl font-semibold text-slate-950">
            ยังไม่ปลดล็อก Report Card
          </h3>
          <p className="mt-3 text-slate-500">
            กรุณาทำภารกิจและ Post-test ของโมดูลนี้ให้ครบก่อนนะครับ
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="surface-panel p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-tag">Badge พร้อมปลดล็อก</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                {currentLesson.content.badgeName}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                {currentLesson.content.description}
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={downloadReportCard} className="secondary-button">
                ดาวน์โหลด Report Card
              </button>
              <button type="button" onClick={handleFormSubmit} className="primary-button">
                รับ Badge
              </button>
            </div>
          </div>
        </div>

        {currentModule.lessons
          .filter((lesson) => lesson.id !== currentLesson.id)
          .map((lesson) => {
            const items = buildLessonSummary(lesson, progress);
            return (
              <section key={lesson.id} className="surface-panel p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-slate-950">{lesson.title}</h3>
                <div className="mt-4 space-y-4">
                  {items.map((item) => (
                    <div key={`${lesson.id}-${item.label}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    );
  };

  const renderCertificate = () => {
    const finalExamDone = progress.completedLessons.includes("final-exam");
    const surveyDone = progress.completedLessons.includes("final-survey");

    if (!finalExamDone || !surveyDone) {
      return (
        <div className="surface-panel p-8 text-center">
          <Lock className="mx-auto text-slate-300" size={40} />
          <h3 className="mt-4 text-2xl font-semibold text-slate-950">
            ยังไม่ปลดล็อก Certificate
          </h3>
          <p className="mt-3 text-slate-500">
            กรุณาผ่าน Post-test สุดท้ายและทำแบบประเมินความพึงพอใจให้ครบก่อนครับ
          </p>
        </div>
      );
    }

    return (
      <div className="surface-panel p-8 text-center">
        <Sparkles className="mx-auto text-amber-500" size={56} />
        <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.08em] text-slate-950">
          Certificate of InSPIRE360
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500">
          ยินดีด้วยครับ คุณครูผ่านเส้นทางการเรียนรู้ครบถ้วนแล้ว ระบบพร้อมออก Certificate ให้ดาวน์โหลดทันที
        </p>
        <div className="mt-8 flex justify-center gap-3">
          {!progress.completedLessons.includes(currentLesson.id) && (
            <button type="button" onClick={() => completeCurrentLesson()} className="primary-button">
              ยืนยันการจบหลักสูตร
            </button>
          )}
          <button type="button" onClick={downloadCertificate} className="secondary-button">
            ดาวน์โหลด Certificate
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentLesson = () => {
    if (currentLesson.type === "quiz") {
      return renderQuiz();
    }
    if (currentLesson.type === "iframe") {
      return renderIframeLesson();
    }
    if (currentLesson.type === "report") {
      return renderReport();
    }
    if (currentLesson.type === "certificate") {
      return renderCertificate();
    }
    if (currentLesson.content.renderType === "strategyChoice") {
      return renderStrategyChoice();
    }
    return renderQuestionnaire();
  };

  if (loading || !currentModule || !currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-white" size={36} />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/65">
      <AnimatePresence>
        {reward && (
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="fixed right-4 top-4 z-[80] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-xl"
          >
            {reward}
          </motion.div>
        )}
      </AnimatePresence>

      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-950/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[21rem] border-r border-white/10 bg-slate-950/92 p-4 backdrop-blur transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              InSPIRE360
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
              เส้นทางครู
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-full p-2 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-2 overflow-y-auto pr-1">
          {teacherCourseData.modules.map((module, moduleIndex) => {
            const isLocked = moduleIndex > progress.currentModuleIndex;
            const moduleProgress = getModuleProgress(module, progress.completedLessons);
            return (
              <div
                key={module.id}
                className={`rounded-[24px] border ${
                  isLocked ? "border-white/5 bg-white/5 opacity-50" : "border-white/10 bg-white/5"
                }`}
              >
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() =>
                    setExpandedModules((prev) => ({
                      ...prev,
                      [moduleIndex]: !prev[moduleIndex],
                    }))
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                      {module.id === "final-stage" ? "ช่วงสรุป" : `Module ${moduleIndex + 1}`}
                    </p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-white">
                      {module.shortTitle}
                    </h3>
                    <p className="mt-2 text-xs text-slate-400">
                      {moduleProgress.done}/{moduleProgress.total} บทเรียน
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLocked && <Lock size={14} className="text-slate-500" />}
                    {expandedModules[moduleIndex] ? (
                      <ChevronDown size={16} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={16} className="text-slate-400" />
                    )}
                  </div>
                </button>

                {!isLocked && expandedModules[moduleIndex] && (
                  <div className="space-y-1 px-3 pb-3">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const isActive =
                        moduleIndex === activeModuleIndex &&
                        lessonIndex === activeLessonIndex;
                      const isDone = progress.completedLessons.includes(lesson.id);
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => goToLesson(moduleIndex, lessonIndex)}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                            isActive
                              ? "bg-white text-slate-950"
                              : "bg-transparent text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {isDone ? (
                            <Sparkles size={16} className="text-emerald-400" />
                          ) : isActive ? (
                            <PlayCircle size={16} />
                          ) : (
                            getIcon(lesson.iconName, "h-4 w-4")
                          )}
                          <span className="truncate">{lesson.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-white lg:hidden"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                  {currentModule.title}
                </p>
                <h1 className="truncate font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                  {currentLesson.title}
                </h1>
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              {progress.completedLessons.includes(currentLesson.id) ? "เสร็จแล้ว" : "กำลังดำเนินการ"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="dark-panel p-5 sm:p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-4xl">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
                    AI Mentor
                  </p>
                  <div className="mt-3 flex items-start gap-3">
                    <div className="rounded-2xl bg-amber-300/15 p-3 text-amber-200">
                      <Wand2 size={18} />
                    </div>
                    <div>
                      <h2 className="font-display text-3xl font-semibold tracking-[-0.06em] text-white">
                        {currentModule.shortTitle}
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        {currentLesson.content.mentorTip}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
                  <p>ผู้เรียน: {profile?.name || currentUser?.displayName || "ไม่ระบุชื่อ"}</p>
                  <p className="mt-2">Badge ที่ปลดล็อก: {progress.badges?.length || 0}</p>
                  <p className="mt-2">เข้าใช้งานล่าสุด: {formatThaiDate(progress.lastAccess)}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.26em] text-slate-400">
                  <span>{STAGE_ITEMS[currentLesson.step - 1]?.label}</span>
                  <span>{stageProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 via-sky-400 to-indigo-400"
                    style={{ width: `${stageProgress}%` }}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  {STAGE_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        currentLesson.step === item.id
                          ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                          : currentLesson.step > item.id
                            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                            : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      <div className="font-medium">{item.label}</div>
                      <div className="mt-1 text-xs text-current/80">{item.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <AnimatePresence mode="wait">
              <motion.section
                key={currentLesson.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="surface-panel p-5 sm:p-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    ภาพรวมบทเรียน
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {currentLesson.content.description}
                  </p>
                </div>
                {renderCurrentLesson()}
              </motion.section>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

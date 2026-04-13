import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { courseCatalog } from "../data/courseCatalog";
import { subscribeToUserEnrollmentSummaries } from "../services/firebase/repositories/enrollmentRepository";
import { getCourseIcon } from "../utils/courseIcons";

export default function MyCourses() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState(null);

  useEffect(() => {
    if (!currentUser) return undefined;

    const unsubscribe = subscribeToUserEnrollmentSummaries(currentUser.uid, {
      onNext: (rows) => {
        setEnrollments(rows);
      },
      onError: (error) => {
        console.error("Error fetching enrollments:", error);
        setEnrollments([]);
      },
    });

    return () => unsubscribe();
  }, [currentUser]);

  const loading = Boolean(currentUser) && enrollments === null;

  const enrollmentMap = useMemo(
    () =>
      (currentUser ? enrollments || [] : []).reduce((accumulator, enrollment) => {
        accumulator[enrollment.id] = enrollment;
        return accumulator;
      }, {}),
    [currentUser, enrollments],
  );

  const myCourses = courseCatalog
    .filter((course) => enrollmentMap[course.id])
    .map((course) => {
      const enrollment = enrollmentMap[course.id];
      const completedLessons =
        typeof enrollment.completedLessonsCount === "number"
          ? enrollment.completedLessonsCount
          : Array.isArray(enrollment.completedLessons)
            ? enrollment.completedLessons.length
            : 0;
      const progressPercent =
        typeof enrollment.progressPercent === "number"
          ? Math.round(enrollment.progressPercent)
          : completedLessons
            ? Math.min(100, Math.round((completedLessons / course.lessonCount) * 100))
            : Math.round(enrollment.progress || 0);

      return {
        ...course,
        progressPercent,
        completedLessons,
        lastAccess: enrollment.lastAccess,
      };
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={38} />
      </div>
    );
  }

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
              <Sparkles size={14} />
              Active learning
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold text-ink md:text-4xl">
              คอร์สของฉัน
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              ติดตามว่าคุณอยู่ตรงไหนของแต่ละ track และกลับเข้า mission ต่อได้ทันที
            </p>
          </div>

          {myCourses.length > 0 ? (
            <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary">
              กำลังเรียน {myCourses.length} track
            </div>
          ) : null}
        </div>
      </section>

      {myCourses.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {myCourses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_18px_60px_rgba(13,17,100,0.06)]"
            >
              <div className={`bg-gradient-to-r ${course.gradientClass} p-5 text-white`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="brand-chip border-white/[0.20] bg-white/[0.12] text-white">
                      {course.statusLabel}
                    </span>
                    <h2 className="mt-4 font-display text-2xl font-bold">{course.title}</h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/[0.12]">
                    {getCourseIcon(course.iconKey, { size: 26 })}
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm leading-7 text-slate-600">{course.desc}</p>

                <div className="mt-5 rounded-[26px] border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p>
                      <p className="mt-2 text-2xl font-bold text-ink">{course.progressPercent}%</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>{course.completedLessons} lessons done</p>
                      <p>{course.lessonCount} planned</p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${course.gradientClass}`}
                      style={{ width: `${course.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Modules</p>
                    <p className="mt-2 text-xl font-bold text-ink">{course.modules}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Missions</p>
                    <p className="mt-2 text-xl font-bold text-ink">{course.missionCount}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hours</p>
                    <p className="mt-2 text-xl font-bold text-ink">{course.hours}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(course.path)}
                  className="brand-button-primary mt-6 w-full"
                >
                  <ArrowUpRight size={16} />
                  Continue mission
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="brand-panel p-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Search size={36} />
          </div>
          <h2 className="mt-6 font-display text-3xl font-bold text-ink">ยังไม่มีคอร์สที่ลงทะเบียน</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
            ไปที่ Dashboard เพื่อเลือก track ที่เหมาะกับคุณ แล้วเริ่มต้น mission แรกได้เลย
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="brand-button-primary mt-8"
          >
            <BookOpen size={16} />
            Explore tracks
          </button>
        </div>
      )}
    </div>
  );
}


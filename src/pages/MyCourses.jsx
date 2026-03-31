import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Loader2, Search } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { courseCatalog } from "../data/courseCatalog";
import { getIcon } from "../utils/iconHelper";

function formatDate(value) {
  if (!value?.toDate) {
    return "เพิ่งลงทะเบียน";
  }

  return value.toDate().toLocaleDateString("th-TH");
}

export default function MyCourses() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchEnrollments() {
      if (!currentUser) {
        return;
      }

      try {
        const querySnapshot = await getDocs(
          collection(db, "users", currentUser.uid, "enrollments"),
        );

        if (!isMounted) {
          return;
        }

        setEnrollments(
          querySnapshot.docs.map((docItem) => ({
            id: docItem.id,
            ...docItem.data(),
          })),
        );
      } catch (error) {
        console.error("Error fetching enrollments:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchEnrollments();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const courses = useMemo(
    () =>
      enrollments
        .map((enrollment) => {
          const course = courseCatalog.find((item) => item.id === enrollment.id);
          return course ? { ...course, enrollment } : null;
        })
        .filter(Boolean),
    [enrollments],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={36} className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="page-wrap space-y-6">
      <section className="dark-panel p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
          คอร์สของฉัน
        </p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
          ทุกเส้นทางที่คุณปลดล็อกแล้ว
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          กลับเข้าสู่คอร์สได้รวดเร็ว เห็นเวลาที่เข้าใช้ล่าสุด และรู้ทันทีว่าควรไปต่อที่ไหน
        </p>
      </section>

      {courses.length > 0 ? (
        <div className="space-y-4">
          {courses.map((course) => (
            <article
              key={course.id}
              className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/65"
            >
              <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
                <div
                  className={`relative border-b border-white/10 bg-gradient-to-br ${course.theme.glow} p-6 lg:border-b-0 lg:border-r`}
                >
                  <div className="flex h-full flex-col justify-between gap-10">
                    <div>
                      <div
                        className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${course.theme.iconWrap}`}
                      >
                        {getIcon(course.iconName, "h-6 w-6")}
                      </div>
                      <p
                        className={`mt-5 text-[11px] uppercase tracking-[0.28em] ${course.theme.text}`}
                      >
                        {course.eyebrow}
                      </p>
                      <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.06em] text-white">
                        {course.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                      <span className="rounded-full border border-white/10 px-4 py-2">
                        {course.modules} โมดูล
                      </span>
                      <span className="rounded-full border border-white/10 px-4 py-2">
                        กำลังเรียน
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm leading-7 text-slate-300">
                    {course.description}
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        วันที่เข้าร่วม
                      </div>
                      <div className="mt-2 text-sm text-slate-200">
                        {formatDate(course.enrollment.enrolledAt)}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        เข้าใช้งานล่าสุด
                      </div>
                      <div className="mt-2 text-sm text-slate-200">
                        {formatDate(course.enrollment.lastAccess)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Clock size={16} />
                      ใช้เวลาประมาณ {course.hours} ชั่วโมง
                    </span>
                    <span className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                      {course.enrollment.status || "active"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(course.path)}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    เรียนต่อ
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="surface-panel p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Search size={36} />
          </div>
          <h3 className="mt-6 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
            ยังไม่มีคอร์สที่ปลดล็อก
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">
            กลับไปที่แดชบอร์ดเพื่อเลือกเส้นทางที่เหมาะกับคุณ แล้วเริ่มต้นการเรียนรู้ได้ทันที
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="primary-button mt-8"
          >
            สำรวจเส้นทางเรียนรู้
            <ArrowRight size={16} />
          </button>
        </section>
      )}
    </div>
  );
}

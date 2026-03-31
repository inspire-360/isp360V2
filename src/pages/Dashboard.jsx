import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  LifeBuoy,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  setDoc,
} from "firebase/firestore";
import OnlineUsers from "../components/OnlineUsers";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { courseCatalog, operatorNotes } from "../data/courseCatalog";
import { getRoleLabel } from "../data/profileOptions";
import { getIcon } from "../utils/iconHelper";

export default function Dashboard() {
  const { currentUser, userRole, isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [sosCount, setSosCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [modalError, setModalError] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  const displayName =
    profile?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "ผู้ใช้งาน";
  const displayRole = getRoleLabel(userRole || "teacher");

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!currentUser) {
        return;
      }

      try {
        const [enrollmentSnapshot, usersSnapshot, sosSnapshot] = await Promise.all([
          getDocs(collection(db, "users", currentUser.uid, "enrollments")),
          getCountFromServer(collection(db, "users")),
          getDocs(collection(db, "sosRequests")),
        ]);

        if (!isMounted) {
          return;
        }

        setEnrolledCourses(enrollmentSnapshot.docs.map((docItem) => docItem.id));
        setTotalUsers(usersSnapshot.data().count);
        setSosCount(
          isAdmin
            ? sosSnapshot.docs.length
            : sosSnapshot.docs.filter(
                (docItem) => docItem.data().requesterId === currentUser.uid,
              ).length,
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, isAdmin]);

  const enrolledSet = useMemo(() => new Set(enrolledCourses), [enrolledCourses]);
  const recommendedCourse = useMemo(
    () =>
      courseCatalog.find((course) => !enrolledSet.has(course.id)) ?? courseCatalog[0],
    [enrolledSet],
  );

  const systemStats = [
    {
      label: "ผู้ใช้ในระบบ",
      value: totalUsers.toLocaleString(),
      icon: <Users size={18} />,
    },
    {
      label: "เส้นทางเรียนรู้",
      value: courseCatalog.length,
      icon: <BookOpen size={18} />,
    },
    {
      label: "คอร์สที่ปลดล็อกแล้ว",
      value: enrolledCourses.length,
      icon: <GraduationCap size={18} />,
    },
    {
      label: isAdmin ? "คำร้อง SOS ทั้งหมด" : "คำร้อง SOS ของฉัน",
      value: sosCount,
      icon: <LifeBuoy size={18} />,
    },
  ];

  const openEnrollModal = (course) => {
    if (enrolledSet.has(course.id)) {
      navigate(course.path);
      return;
    }

    if (!course.requiresCode) {
      processEnrollment(course, "open-access");
      return;
    }

    setSelectedCourse(course);
    setAccessCode("");
    setModalError("");
    setShowModal(true);
  };

  const handleConfirmEnroll = async () => {
    if (!selectedCourse) {
      return;
    }

    if (!accessCode.trim()) {
      setModalError("กรุณากรอกรหัสเข้าร่วมรุ่น");
      return;
    }

    if (accessCode.trim().toUpperCase() !== selectedCourse.accessCode) {
      setModalError("รหัสเข้าร่วมไม่ถูกต้อง");
      return;
    }

    await processEnrollment(selectedCourse, accessCode.trim().toUpperCase());
    setShowModal(false);
  };

  const processEnrollment = async (course, codeUsed) => {
    setEnrollLoading(true);

    try {
      await setDoc(doc(db, "users", currentUser.uid, "enrollments", course.id), {
        enrolledAt: new Date(),
        progress: 0,
        status: "active",
        lastAccess: new Date(),
        accessCodeUsed: codeUsed,
      });

      setEnrolledCourses((prev) =>
        prev.includes(course.id) ? prev : [...prev, course.id],
      );
      navigate(course.path);
    } catch (error) {
      console.error("Enrollment failed:", error);
      setModalError("ไม่สามารถลงทะเบียนคอร์สได้ในขณะนี้");
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={36} className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="page-wrap space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="dark-panel relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,163,95,0.14),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.18),transparent_24%)]" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
              บัญชี {displayRole}
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.08em] text-white sm:text-5xl">
              ยินดีต้อนรับกลับ, {displayName}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              เลือกคอร์สที่ต้องไปต่อ ติดตามคำร้อง SOS และกลับเข้าสู่พื้นที่ทำงานที่สำคัญได้จากหน้าเดียว
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/courses")}
                className="primary-button"
              >
                ไปที่คอร์สของฉัน
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/sos")}
                className="secondary-button border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                ส่ง SOS to DU
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="secondary-button border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  ดูแลระบบ
                </button>
              )}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {systemStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-2 text-amber-200">
                    {stat.icon}
                    <span className="text-xs uppercase tracking-[0.24em]">
                      {stat.label}
                    </span>
                  </div>
                  <div className="mt-3 font-display text-3xl font-semibold tracking-[-0.06em] text-white">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="surface-panel p-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            คำแนะนำถัดไป
          </p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
            {recommendedCourse.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {recommendedCourse.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {recommendedCourse.modules} โมดูล
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {recommendedCourse.hours} ชั่วโมง
            </span>
          </div>
          <button
            type="button"
            onClick={() => openEnrollModal(recommendedCourse)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            {enrolledSet.has(recommendedCourse.id) ? "เรียนต่อ" : "เข้าสู่เส้นทางนี้"}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              พื้นที่เรียนรู้ที่เปิดให้เข้าใช้
            </p>
            <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-white">
              เลือกห้องเรียนที่ตรงกับบริบทของคุณ
            </h3>
          </div>

          {courseCatalog.map((course) => {
            const isEnrolled = enrolledSet.has(course.id);

            return (
              <article
                key={course.id}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/65"
              >
                <div className="grid gap-0 lg:grid-cols-[0.84fr_1.16fr]">
                  <div
                    className={`relative border-b border-white/10 bg-gradient-to-br ${course.theme.glow} p-6 lg:border-b-0 lg:border-r`}
                  >
                    <div className="relative flex h-full flex-col justify-between gap-10">
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
                        <h4 className="mt-3 font-display text-3xl font-semibold tracking-[-0.06em] text-white">
                          {course.title}
                        </h4>
                        <p className="mt-3 text-sm leading-7 text-slate-300">
                          {course.audience}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                        <span className="rounded-full border border-white/10 px-4 py-2">
                          {course.modules} โมดูล
                        </span>
                        <span className="rounded-full border border-white/10 px-4 py-2">
                          {course.hours} ชั่วโมง
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${course.theme.chip}`}
                      >
                        {course.accessLabel}
                      </span>
                      {isEnrolled && (
                        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                          ปลดล็อกแล้ว
                        </span>
                      )}
                    </div>

                    <p className="mt-5 text-sm leading-7 text-slate-300">
                      {course.description}
                    </p>

                    <div className="mt-6 grid gap-3">
                      {course.outcomes.map((item) => (
                        <div
                          key={item}
                          className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200"
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <BookOpen size={16} />
                        {course.modules} หน่วยเรียนรู้
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock size={16} />
                        ใช้เวลาประมาณ {course.hours} ชั่วโมง
                      </span>
                    </div>

                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={() => openEnrollModal(course)}
                        className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${course.theme.button}`}
                      >
                        {isEnrolled ? (
                          <>
                            <CheckCircle2 size={16} />
                            เรียนต่อ
                          </>
                        ) : course.requiresCode ? (
                          <>
                            <Lock size={16} />
                            ปลดล็อกด้วยรหัส
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            เข้าใช้งานได้ทันที
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="space-y-6">
          <OnlineUsers />

          <section className="surface-panel p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              หมายเหตุสำหรับการใช้งาน
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
              สิ่งที่ถูกยกระดับในเวอร์ชันนี้
            </h3>
            <div className="mt-6 space-y-3">
              {operatorNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600"
                >
                  {note}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      {showModal && selectedCourse && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="surface-panel relative z-10 w-full max-w-lg p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>

            <div className="space-y-4">
              <div className="section-tag">รุ่นเฉพาะ</div>
              <h3 className="font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                ปลดล็อก {selectedCourse.title}
              </h3>
              <p className="text-sm leading-7 text-slate-500">
                คอร์สนี้จำกัดเฉพาะรุ่นที่ได้รับสิทธิ์ กรุณากรอกรหัสเข้าร่วมที่ผู้ดูแลโครงการให้มา
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <label className="field-label" htmlFor="access-code">
                รหัสเข้าร่วม
              </label>
              <input
                id="access-code"
                type="text"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="field-input text-center text-lg font-semibold uppercase tracking-[0.24em]"
                placeholder="TEACHER360"
                autoFocus
              />

              {modalError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {modalError}
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmEnroll}
                disabled={enrollLoading}
                className="primary-button w-full justify-center"
              >
                {enrollLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    กำลังปลดล็อกคอร์ส
                  </>
                ) : (
                  <>
                    เข้าสู่คอร์ส
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

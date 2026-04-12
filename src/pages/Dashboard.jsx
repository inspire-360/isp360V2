import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { collection, doc, limit, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import OnlineUsers from "../components/OnlineUsers";
import { useAuth } from "../contexts/AuthContext";
import { courseCatalog } from "../data/courseCatalog";
import { db } from "../lib/firebase";
import { getCourseIcon } from "../utils/courseIcons";
import { PRESENCE_COLLECTION, resolvePresenceMeta } from "../utils/presenceStatus";

const duCoreRoles = [
  {
    title: "Data Analyst",
    detail: "วิเคราะห์ข้อมูลเชิงพื้นที่เพื่อสร้าง Area-based Needs Map และระบุกลุ่มครูที่ต้องการความช่วยเหลือเร่งด่วน",
  },
  {
    title: "Coach & Mentor",
    detail: "ลงพื้นที่ประกบครูในห้องเรียน ติดตามการสอนจริง และให้ feedback ผ่าน DU Dashboard",
  },
  {
    title: "Strategic Matchmaker",
    detail: "จับคู่ความต้องการพัฒนาของครูกับผู้เชี่ยวชาญหรือภาคีเครือข่ายที่เหมาะสม",
  },
  {
    title: "Innovation Scout",
    detail: "คัดเลือกนวัตกรรมครูที่มีศักยภาพ สนับสนุนทรัพยากรตั้งต้น และผลักดันสู่ Best Practice",
  },
  {
    title: "Facilitator",
    detail: "อำนวยความสะดวกด้านเทคนิคและกระบวนการ PLC เพื่อเร่งการแลกเปลี่ยนเรียนรู้เชิงโต้ตอบ",
  },
  {
    title: "Community Builder",
    detail: "สร้างผู้นำเครือข่ายครูในแต่ละกลุ่มสาระ เพื่อความยั่งยืนของระบบพัฒนาครู",
  },
];

const inspireFlow = [
  { step: "In", title: "Insight & Identification", detail: "วิเคราะห์ข้อมูลรายบุคคลเพื่อระบุจุดวิกฤตและจุดแข็ง" },
  { step: "S", title: "Synergy & Strategic Alignment", detail: "เชื่อมภาคีเครือข่ายและจัดการ Resource Sharing ให้ตรงโจทย์" },
  { step: "P", title: "Professional Empowerment", detail: "พัฒนาครูด้วย Micro-Learning และ On-the-job Coaching" },
  { step: "I", title: "Innovation-Driven Pedagogy", detail: "สร้าง Innovation Lab เพื่อทดลอง ต้นแบบ และต่อยอดนวัตกรรม" },
  { step: "R", title: "Real-time Monitoring & Reflexivity", detail: "ติดตามผลแบบต่อเนื่องด้วย Dashboard และ Feedback Loop 360°" },
  { step: "E", title: "Ecosystem for Excellence", detail: "สร้างวัฒนธรรม PLC ถอดบทเรียน และขยายผลอย่างยั่งยืน" },
];

export default function Dashboard() {
  const { currentUser, userRole, userProfile } = useAuth();
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityPulse, setCommunityPulse] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [modalError, setModalError] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  const displayName =
    userProfile?.name ||
    [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "User";
  const displayRole = userProfile?.role || userRole || "Learner";

  const completedTracks = enrollments.filter(
    (enrollment) =>
      enrollment.status === "completed" ||
      (typeof enrollment.progressPercent === "number" && enrollment.progressPercent >= 100) ||
      (typeof enrollment.progress === "number" && enrollment.progress >= 100),
  ).length;

  const averageProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((total, enrollment) => {
            if (typeof enrollment.progressPercent === "number") return total + enrollment.progressPercent;
            if (Array.isArray(enrollment.completedLessons)) {
              const courseMeta = courseCatalog.find((course) => course.id === enrollment.id);
              if (courseMeta?.lessonCount) {
                return total + Math.round((enrollment.completedLessons.length / courseMeta.lessonCount) * 100);
              }
            }
            if (typeof enrollment.progress === "number") return total + enrollment.progress;
            return total;
          }, 0) / enrollments.length,
        )
      : 0;

  useEffect(() => {
    if (!currentUser) {
      setEnrollments([]);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, "users", currentUser.uid, "enrollments"),
      (snapshot) => {
        setEnrollments(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const presenceQuery = query(
      collection(db, PRESENCE_COLLECTION),
      orderBy("lastActive", "desc"),
      limit(40),
    );

    const unsubscribe = onSnapshot(
      presenceQuery,
      (snapshot) => {
        const liveCount = snapshot.docs
          .map((item) => resolvePresenceMeta(item.data(), Date.now()))
          .filter((presence) => presence.isConnected).length;
        setCommunityPulse(liveCount);
      },
      (error) => {
        console.error("Error fetching community pulse:", error);
        setCommunityPulse(0);
      },
    );

    return () => unsubscribe();
  }, []);

  const stats = [
    {
      label: "กำลังออนไลน์",
      value: communityPulse.toLocaleString(),
      icon: <Users size={18} />,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Tracks available",
      value: courseCatalog.length,
      icon: <LayoutDashboard size={18} />,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      label: "Enrolled now",
      value: enrollments.length,
      icon: <GraduationCap size={18} />,
      tone: "bg-accent/10 text-accent",
    },
    {
      label: "Completed tracks",
      value: `${completedTracks} | ${averageProgress}%`,
      icon: <CheckCircle2 size={18} />,
      tone: "bg-warm/15 text-[#a24619]",
    },
  ];

  const openEnrollModal = (course) => {
    if (enrollments.some((item) => item.id === course.id)) {
      navigate(course.path);
      return;
    }

    if (!course.requiresCode) {
      processEnrollment(course);
      return;
    }

    setSelectedCourse(course);
    setAccessCode("");
    setModalError("");
    setShowModal(true);
  };

  const handleConfirmEnroll = async () => {
    if (!selectedCourse) return;

    if (!accessCode.trim()) {
      setModalError("กรุณากรอกรหัสเข้าร่วมก่อน");
      return;
    }

    if (accessCode.trim().toUpperCase() !== selectedCourse.accessCode) {
      setModalError("รหัสไม่ถูกต้อง");
      return;
    }

    await processEnrollment(selectedCourse);
    setShowModal(false);
  };

  const processEnrollment = async (course) => {
    if (!currentUser) return;

    setEnrollLoading(true);

    try {
      await setDoc(doc(db, "users", currentUser.uid, "enrollments", course.id), {
        courseId: course.id,
        courseTitle: course.title,
        completedLessons: [],
        completedLessonsCount: 0,
        enrolledAt: new Date(),
        progress: 0,
        progressPercent: 0,
        lessonCount: Number(course.lessonCount || 0),
        moduleCount: Number(course.modules || 0),
        currentModuleIndex: 0,
        activeModuleIndex: 0,
        activeLessonIndex: 0,
        activeModuleTitle: "",
        activeLessonId: "",
        activeLessonTitle: "",
        status: "not_started",
        lastAccess: new Date(),
        lastSavedAt: new Date(),
        accessCodeUsed: course.requiresCode ? accessCode.trim().toUpperCase() : "none",
      });

      setEnrollments((previous) => [
        ...previous,
        {
          id: course.id,
          courseId: course.id,
          courseTitle: course.title,
          completedLessons: [],
          completedLessonsCount: 0,
          progress: 0,
          progressPercent: 0,
          lessonCount: Number(course.lessonCount || 0),
          moduleCount: Number(course.modules || 0),
          currentModuleIndex: 0,
          activeModuleIndex: 0,
          activeLessonIndex: 0,
          activeModuleTitle: "",
          activeLessonId: "",
          activeLessonTitle: "",
          status: "not_started",
        },
      ]);
      navigate(course.path);
    } catch (error) {
      console.error("Enrollment failed:", error);
      alert("เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={38} />
      </div>
    );
  }

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.18] bg-white/[0.10] text-white/[0.80]">
              <Sparkles size={14} />
              {displayRole} dashboard
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                ยินดีต้อนรับกลับ, {displayName}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
                เลือกเส้นทางการเรียนรู้ของคุณ จัดการภารกิจ และเชื่อมต่อกับ DU support ได้จากหน้าเดียว
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate("/du/sos")}
              className="rounded-[28px] border border-white/[0.12] bg-white/[0.10] p-5 text-left text-white transition hover:bg-white/[0.14]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.12]">
                <LifeBuoy size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">SOS to DU</h2>
              <p className="mt-2 text-sm leading-6 text-white/[0.72]">
                ส่งเรื่องด่วนหรือขอการติดตามแบบต่อเนื่อง
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate("/du/admin")}
              className="rounded-[28px] border border-white/[0.12] bg-white/[0.10] p-5 text-left text-white transition hover:bg-white/[0.14]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.12]">
                <ShieldCheck size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold">DU Admin Console</h2>
              <p className="mt-2 text-sm leading-6 text-white/[0.72]">
                ดู queue งาน ติดตามเคส และดู pulse ของระบบ
              </p>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="brand-panel p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.tone}`}>
              {stat.icon}
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <section className="brand-panel p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <BookOpen size={14} />
                Mission tracks
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                เลือกเส้นทางที่ใช่สำหรับรอบการพัฒนานี้
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              แต่ละ track ใช้ palette ใหม่และมีสถานะ enrollment ชัดเจน
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {courseCatalog.map((course) => {
              const isEnrolled = enrollments.some((item) => item.id === course.id);
              return (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_16px_50px_rgba(13,17,100,0.06)]"
                >
                  <div className={`bg-gradient-to-r ${course.gradientClass} p-5 text-white`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="brand-chip border-white/[0.20] bg-white/[0.12] text-white">
                          {course.statusLabel}
                        </span>
                        <h3 className="mt-4 font-display text-2xl font-bold">{course.title}</h3>
                      </div>
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/[0.12] ${course.glowClass}`}
                      >
                        {getCourseIcon(course.iconKey, { size: 26 })}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-sm leading-7 text-slate-600">{course.desc}</p>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Modules</p>
                        <p className="mt-2 text-xl font-bold text-ink">{course.modules}</p>
                      </div>
                      <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hours</p>
                        <p className="mt-2 text-xl font-bold text-ink">{course.hours}</p>
                      </div>
                      <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Missions</p>
                        <p className="mt-2 text-xl font-bold text-ink">{course.missionCount}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${course.chipClass}`}
                      >
                        {isEnrolled ? "Already enrolled" : course.requiresCode ? "Access code needed" : "Open access"}
                      </span>

                      <button
                        type="button"
                        onClick={() => openEnrollModal(course)}
                        className={isEnrolled ? "brand-button-secondary" : "brand-button-primary"}
                      >
                        {isEnrolled ? <PlayCircle size={16} /> : <ArrowUpRight size={16} />}
                        {isEnrolled ? "Continue track" : "Start this track"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <article className="brand-panel p-6">
            <p className="brand-chip border-accent/10 bg-accent/5 text-accent">
              <Sparkles size={14} />
              Command deck
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              สิ่งที่ทำได้ทันทีจากหน้านี้
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>1. เลือก track และเข้าสู่ mission room ได้ทันที</p>
              <p>2. ส่ง SOS ถึง DU เมื่อเจอปัญหาที่ต้องการการช่วยเหลือ</p>
              <p>3. เปิด DU console เพื่อดูภาพรวมคิวงานและ follow-up</p>
            </div>
          </article>

          <div className="brand-panel p-4">
            <OnlineUsers />
          </div>
        </section>
      </div>

      <section className="brand-panel p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <ShieldCheck size={14} />
              DU Console + DU Dashboard framework
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              บทบาททีม DU และวงจร InSPIRE360 ที่ใช้ขับเคลื่อนจริง
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            โครงสร้างนี้ช่วยให้ทีม DU ติดตามครูรายบุคคลได้ไว เชื่อมทรัพยากรได้ตรง และยกระดับคุณภาพผู้เรียนอย่างต่อเนื่อง
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {duCoreRoles.map((role) => (
            <article key={role.title} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">DU role</p>
              <h3 className="mt-2 font-display text-xl font-bold text-ink">{role.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{role.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="font-display text-xl font-bold text-ink">InSPIRE 360° Innovation System Guidelines</h3>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {inspireFlow.map((item) => (
              <article key={item.step} className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-primary">Stage {item.step}</p>
                <h4 className="mt-2 text-lg font-semibold text-ink">{item.title}</h4>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {showModal && selectedCourse ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/[0.55] backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="brand-panel relative z-10 w-full max-w-md p-8">
            <div className={`rounded-[26px] bg-gradient-to-r ${selectedCourse.gradientClass} p-5 text-white`}>
              <h3 className="font-display text-2xl font-bold">{selectedCourse.title}</h3>
              <p className="mt-2 text-sm text-white/[0.78]">
                กรอกรหัสเพื่อปลดล็อก mission track นี้
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <input
                type="text"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-center text-lg font-bold uppercase tracking-[0.22em] outline-none transition focus:border-accent/[0.35] focus:ring-4 focus:ring-accent/10"
                placeholder="ENTER CODE"
                autoFocus
              />
              {modalError ? (
                <div className="rounded-2xl border border-accent/10 bg-accent/5 px-4 py-3 text-sm text-accent">
                  {modalError}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleConfirmEnroll}
                disabled={enrollLoading}
                className="brand-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
              >
                {enrollLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Confirm and enroll
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

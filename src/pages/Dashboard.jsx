import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Lock,
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
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [accessCode, setAccessCode] = useState("");
  const [modalError, setModalError] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  const displayName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Learner";
  const displayRole = getRoleLabel(userRole || "learner");

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!currentUser) {
        return;
      }

      try {
        const [enrollmentSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, "users", currentUser.uid, "enrollments")),
          getCountFromServer(collection(db, "users")),
        ]);

        if (!isMounted) {
          return;
        }

        setEnrolledCourses(enrollmentSnapshot.docs.map((docItem) => docItem.id));
        setTotalUsers(usersSnapshot.data().count);
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
  }, [currentUser]);

  const enrolledSet = useMemo(() => new Set(enrolledCourses), [enrolledCourses]);
  const recommendedCourse = useMemo(
    () => courseCatalog.find((course) => !enrolledSet.has(course.id)) ?? courseCatalog[0],
    [enrolledSet],
  );

  const systemStats = [
    {
      label: "Platform users",
      value: totalUsers.toLocaleString(),
      icon: <Users size={18} />,
    },
    {
      label: "Available pathways",
      value: courseCatalog.length,
      icon: <BookOpen size={18} />,
    },
    {
      label: "Enrolled courses",
      value: enrolledCourses.length,
      icon: <GraduationCap size={18} />,
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
      setModalError("Please enter the access code for this cohort.");
      return;
    }

    if (accessCode.trim().toUpperCase() !== selectedCourse.accessCode) {
      setModalError("That access code is incorrect.");
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
      setModalError("We could not enroll you right now. Please try again.");
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
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="dark-panel relative overflow-hidden p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,163,95,0.14),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.18),transparent_24%)]" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
              {displayRole} workspace
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.08em] text-white sm:text-5xl">
              Welcome back, {displayName}.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Keep your learning pathways visible, enroll into the right cohort,
              and return to the exact space that needs attention.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/courses")}
                className="primary-button"
              >
                Open my courses
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="secondary-button border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Update profile
              </button>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
            Suggested next move
          </p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
            {recommendedCourse.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            {recommendedCourse.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {recommendedCourse.modules} modules
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {recommendedCourse.hours} hours
            </span>
          </div>
          <button
            type="button"
            onClick={() => openEnrollModal(recommendedCourse)}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            {enrolledSet.has(recommendedCourse.id) ? "Continue" : "Enter pathway"}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                Available learning spaces
              </p>
              <h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-white">
                Access the right room with less friction.
              </h3>
            </div>
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
                          {course.modules} modules
                        </span>
                        <span className="rounded-full border border-white/10 px-4 py-2">
                          {course.hours} hours
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
                          Enrolled
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
                        {course.modules} learning units
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock size={16} />
                        {course.hours} hours estimated
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
                            Continue learning
                          </>
                        ) : course.requiresCode ? (
                          <>
                            <Lock size={16} />
                            Unlock with code
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Enter space
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
              Operator notes
            </p>
            <h3 className="mt-3 font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
              Useful improvements behind the redesign.
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
              <div className="section-tag">Private cohort</div>
              <h3 className="font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                Unlock {selectedCourse.title}
              </h3>
              <p className="text-sm leading-7 text-slate-500">
                This pathway is protected by an access code so only the intended
                cohort can enter. Use the code provided by the facilitator.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <label className="field-label" htmlFor="access-code">
                Access code
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
                    Enrolling...
                  </>
                ) : (
                  <>
                    Enter pathway
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

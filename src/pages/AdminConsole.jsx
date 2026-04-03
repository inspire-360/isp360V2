import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Filter,
  Loader2,
  RadioTower,
  Search,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { courseCatalog } from "../data/courseCatalog";
import {
  SOS_COLLECTION,
  SOS_USER_SUBCOLLECTION,
  createTimelineEntry,
  formatCaseNumber,
  formatDateTime,
  getApprovalMeta,
  getCategoryMeta,
  getRiskMeta,
  getStatusMeta,
  normalizeRiskLevel,
  riskSortValue,
  sosApprovalOptions,
  sosApprovalTone,
  sosRiskTone,
  sosStatusOptions,
  sosStatusTone,
  toUnixTime,
} from "../data/sosConfig";

const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

const resolveProgressPercent = (enrollment) => {
  if (typeof enrollment.progressPercent === "number") return enrollment.progressPercent;
  if (typeof enrollment.progress === "number") return Math.round(enrollment.progress);

  const course = courseCatalog.find((item) => item.id === enrollment.id);
  const completedLessonsCount =
    enrollment.completedLessonsCount ||
    (Array.isArray(enrollment.completedLessons) ? enrollment.completedLessons.length : 0);

  if (course?.lessonCount) {
    return Math.min(100, Math.round((completedLessonsCount / course.lessonCount) * 100));
  }

  return 0;
};

const resolveIsOnline = (user = {}) => {
  const lastSeen = user.lastSeen?.toDate?.() || null;
  if (!lastSeen) return false;
  return user.isOnline !== false && Date.now() - lastSeen.getTime() <= ACTIVE_WINDOW_MS;
};

export default function AdminConsole() {
  const { currentUser } = useAuth();
  const [usersData, setUsersData] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const operatorName = currentUser?.displayName || currentUser?.email || "DU Operations";

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          setUsersData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
        (error) => console.error("Failed to subscribe users:", error),
      ),
      onSnapshot(
        collectionGroup(db, "enrollments"),
        (snapshot) => {
          setEnrollments(
            snapshot.docs.map((item) => ({
              id: item.id,
              path: item.ref.path,
              userId: item.ref.parent.parent?.id,
              ...item.data(),
            })),
          );
        },
        (error) => console.error("Failed to subscribe enrollments:", error),
      ),
      onSnapshot(
        collectionGroup(db, SOS_USER_SUBCOLLECTION),
        (snapshot) => {
          const nextCases = snapshot.docs.map((item) => ({
            id: item.id,
            path: item.ref.path,
            requesterId: item.ref.parent.parent?.id,
            ...item.data(),
          }));
          setCases(nextCases);
          setDrafts((previous) => {
            const nextDrafts = { ...previous };
            nextCases.forEach((caseItem) => {
              nextDrafts[caseItem.id] = {
                status: nextDrafts[caseItem.id]?.status || caseItem.status || "new",
                approvalState:
                  nextDrafts[caseItem.id]?.approvalState || caseItem.approvalState || "pending_review",
                duResponse: nextDrafts[caseItem.id]?.duResponse ?? caseItem.duResponse ?? "",
                helpDetails: nextDrafts[caseItem.id]?.helpDetails ?? caseItem.helpDetails ?? "",
              };
            });
            return nextDrafts;
          });
          setLoading(false);
        },
        (error) => {
          console.error("Failed to subscribe SOS cases:", error);
          setLoading(false);
        },
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const filteredCases = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...cases]
      .filter((caseItem) => {
        const riskValue = normalizeRiskLevel(caseItem.riskLevel || caseItem.urgency);
        if (statusFilter !== "all" && caseItem.status !== statusFilter) return false;
        if (approvalFilter !== "all" && (caseItem.approvalState || "pending_review") !== approvalFilter) {
          return false;
        }
        if (riskFilter !== "all" && riskValue !== riskFilter) return false;
        if (!keyword) return true;

        const haystack = [
          caseItem.summary,
          caseItem.details,
          caseItem.requesterName,
          caseItem.location,
          ...(caseItem.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((left, right) => {
        const riskGap = riskSortValue(right) - riskSortValue(left);
        if (riskGap !== 0) return riskGap;
        return toUnixTime(right.updatedAt || right.createdAt) - toUnixTime(left.updatedAt || left.createdAt);
      });
  }, [approvalFilter, cases, riskFilter, search, statusFilter]);

  const stats = useMemo(
    () => ({
      totalUsers: usersData.length,
      onlineNow: usersData.filter((user) => resolveIsOnline(user)).length,
      totalEnrollments: enrollments.length,
      pendingReview: cases.filter((item) => (item.approvalState || "pending_review") === "pending_review").length,
      approved: cases.filter((item) => item.approvalState === "approved").length,
      resolvedCases: cases.filter((item) => item.status === "resolved").length,
    }),
    [cases, enrollments.length, usersData],
  );

  const coursePulse = useMemo(
    () =>
      courseCatalog.map((course) => {
        const relatedEnrollments = enrollments.filter((item) => item.id === course.id);
        const averageProgress = relatedEnrollments.length
          ? Math.round(
              relatedEnrollments.reduce((sum, item) => sum + resolveProgressPercent(item), 0) /
                relatedEnrollments.length,
            )
          : 0;

        return {
          ...course,
          count: relatedEnrollments.length,
          averageProgress,
        };
      }),
    [enrollments],
  );

  const learnerProgressRows = useMemo(() => {
    return usersData
      .map((user) => {
        const userEnrollments = enrollments.filter((item) => item.userId === user.id);
        const spotlightEnrollment = userEnrollments.find((item) => item.id === "course-teacher") || userEnrollments[0] || null;
        const averageProgress = userEnrollments.length
          ? Math.round(userEnrollments.reduce((sum, item) => sum + resolveProgressPercent(item), 0) / userEnrollments.length)
          : 0;

        return {
          id: user.id,
          name: user.name || user.email || "Unknown user",
          email: user.email || "",
          role: user.role || "learner",
          isOnline: resolveIsOnline(user),
          lastSeen: user.lastSeen,
          activePath: user.activePath || "",
          enrollmentsCount: userEnrollments.length,
          averageProgress,
          spotlightCourse: spotlightEnrollment
            ? courseCatalog.find((course) => course.id === spotlightEnrollment.id)?.title || spotlightEnrollment.id
            : "No course yet",
          spotlightProgress: spotlightEnrollment ? resolveProgressPercent(spotlightEnrollment) : 0,
          activeModuleTitle: spotlightEnrollment?.activeModuleTitle || "",
          activeLessonTitle: spotlightEnrollment?.activeLessonTitle || "",
        };
      })
      .sort((left, right) => {
        if (left.isOnline !== right.isOnline) return Number(right.isOnline) - Number(left.isOnline);
        if (left.averageProgress !== right.averageProgress) return right.averageProgress - left.averageProgress;
        return left.name.localeCompare(right.name);
      });
  }, [enrollments, usersData]);

  const saveCaseUpdate = async (caseItem) => {
    const draft = drafts[caseItem.id];
    if (!draft) return;

    const response = draft.duResponse.trim();
    const helpDetails = draft.helpDetails.trim();
    const statusChanged = draft.status !== caseItem.status;
    const approvalChanged = draft.approvalState !== (caseItem.approvalState || "pending_review");

    if (!response && !helpDetails && !statusChanged && !approvalChanged) return;

    setSavingId(caseItem.id);
    try {
      const payload = {
        status: draft.status,
        approvalState: draft.approvalState,
        duResponse: response,
        helpDetails,
        updatedAt: serverTimestamp(),
        assignedTeam: "DU Ops",
        lastTouchedBy: operatorName,
        updates: arrayUnion(
          createTimelineEntry({
            type: "admin-update",
            by: operatorName,
            message:
              response ||
              helpDetails ||
              `Status ${draft.status} / Approval ${draft.approvalState}`,
            status: draft.status,
            approvalState: draft.approvalState,
          }),
        ),
      };

      await Promise.allSettled([
        setDoc(doc(db, "users", caseItem.requesterId, SOS_USER_SUBCOLLECTION, caseItem.id), payload, { merge: true }),
        setDoc(doc(db, SOS_COLLECTION, caseItem.id), payload, { merge: true }),
      ]);
    } catch (error) {
      console.error("Failed to update SOS case:", error);
    } finally {
      setSavingId("");
    }
  };

  const statCards = [
    { label: "Users", value: stats.totalUsers, icon: <Users size={18} />, tone: "bg-primary/10 text-primary" },
    {
      label: "Online Now",
      value: stats.onlineNow,
      icon: <Activity size={18} />,
      tone: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Enrollments",
      value: stats.totalEnrollments,
      icon: <BookOpen size={18} />,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      label: "Pending Review",
      value: stats.pendingReview,
      icon: <AlertTriangle size={18} />,
      tone: "bg-accent/10 text-accent",
    },
    { label: "Approved", value: stats.approved, icon: <CheckCircle2 size={18} />, tone: "bg-warm/15 text-[#a24619]" },
  ];

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.80]">
              <ShieldCheck size={14} />
              DU Admin Console
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                Friendly operations view for triage, approval, and follow-through
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
                ดู pulse ของหลักสูตร คัดลำดับ SOS ตามความเสี่ยง อนุมัติการช่วยเหลือ ส่งคำแนะนำกลับ และติดตามการขยับของแต่ละเคสจากหน้าจอเดียว
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/du/sos"
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              Open SOS Center
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <article key={card.label} className="brand-panel p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>
              {card.icon}
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{card.value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.86fr)_minmax(380px,1.14fr)]">
        <section className="space-y-6">
          <article className="brand-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
                  <Activity size={14} />
                  Course Pulse
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">ภาพรวมการใช้งานหลักสูตร</h2>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resolved SOS</p>
                <p className="text-2xl font-bold text-ink">{stats.resolvedCases}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {coursePulse.map((course) => (
                <div key={course.id} className="overflow-hidden rounded-[28px] border border-slate-100 bg-white">
                  <div className={`h-2 bg-gradient-to-r ${course.gradientClass}`} />
                  <div className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="text-lg font-semibold text-ink">{course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.missionCount} mission checkpoints | Avg progress {course.averageProgress}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Enrollments</p>
                      <p className="mt-2 text-3xl font-bold text-ink">{course.count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="brand-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="brand-chip border-accent/10 bg-accent/5 text-accent">
                  <Users size={14} />
                  Learner Progress
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">ติดตามความก้าวหน้าของผู้ใช้แบบ real-time</h2>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tracked users</p>
                <p className="text-2xl font-bold text-ink">{learnerProgressRows.length}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {learnerProgressRows.length === 0 ? (
                <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-6 text-sm leading-7 text-slate-500">
                  ยังไม่มีข้อมูลผู้ใช้หรือ enrollment สำหรับแสดง progress ในมุมมองนี้
                </div>
              ) : (
                learnerProgressRows.slice(0, 12).map((user) => (
                  <div key={user.id} className="rounded-[26px] border border-slate-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink">{user.name}</p>
                          <span
                            className={`brand-chip ${
                              user.isOnline
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            {user.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{user.email || "No email"}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {user.spotlightCourse} | {user.activeModuleTitle || "Waiting module"}
                        </p>
                        {user.activePath ? (
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            Active path: {user.activePath}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Course progress</p>
                        <p className="mt-2 text-2xl font-bold text-ink">{user.spotlightProgress}%</p>
                        <p className="mt-1 text-sm text-slate-500">{user.enrollmentsCount} active enrollment(s)</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
                        style={{ width: `${user.spotlightProgress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                      <span>{user.activeLessonTitle || "No active lesson yet"}</span>
                      <span>
                        Last seen {user.lastSeen ? formatDateTime(user.lastSeen) : "Not available"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="brand-panel p-6">
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <RadioTower size={14} />
              DU Playbook
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">วิธีใช้ console นี้ให้ตอบเร็วและช่วยได้จริง</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>1. เปิดดูเคสที่สีเข้มและยัง Pending Review ก่อนเสมอ</p>
              <p>2. เปลี่ยน approval ให้ชัด แล้วส่ง DU response แบบที่ผู้ใช้เอาไปทำต่อได้ทันที</p>
              <p>3. ถ้าต้องการข้อมูลเพิ่ม ให้ใช้ Need More Info พร้อมคำถามที่เจาะจงแทนข้อความกว้างๆ</p>
            </div>
          </article>
        </section>

        <section className="brand-panel p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="brand-chip border-accent/10 bg-accent/5 text-accent">
                <AlertTriangle size={14} />
                Priority Queue
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">เคสที่ DU ต้องติดตาม</h2>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Queue size</p>
              <p className="text-2xl font-bold text-ink">{filteredCases.length}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px_160px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาจากหัวข้อ ผู้ใช้ สถานที่ หรือแท็ก"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            >
              <option value="all">All status</option>
              {sosStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={approvalFilter}
              onChange={(event) => setApprovalFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            >
              <option value="all">All approval</option>
              {sosApprovalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            >
              <option value="all">All risk</option>
              {[...new Set(cases.map((item) => normalizeRiskLevel(item.riskLevel || item.urgency)))].map((risk) => (
                <option key={risk} value={risk}>
                  {getRiskMeta(risk).label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-slate-100 bg-slate-50/80 p-8 text-center">
              <Filter className="mx-auto text-slate-300" size={30} />
              <h3 className="mt-4 text-xl font-semibold text-ink">No active cases in this view</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                ลองปรับ filter หรือค้นหาด้วยคำอื่นเพื่อดูเคสที่ต้องการ
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredCases.map((caseItem) => {
                const draft = drafts[caseItem.id] || {};
                const riskMeta = getRiskMeta(normalizeRiskLevel(caseItem.riskLevel || caseItem.urgency));
                const categoryMeta = getCategoryMeta(caseItem.category);
                const statusMeta = getStatusMeta(caseItem.status);
                const approvalMeta = getApprovalMeta(caseItem.approvalState);
                const updates = [...(caseItem.updates || [])].sort(
                  (left, right) => toUnixTime(right.at) - toUnixTime(left.at),
                );
                const latestUpdate = updates[0];

                return (
                  <article key={caseItem.id} className="overflow-hidden rounded-[30px] border border-slate-100 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                            {formatCaseNumber(caseItem.id)}
                          </span>
                          <span
                            className={`brand-chip ${sosRiskTone[riskMeta.value]}`}
                            style={{ background: riskMeta.tone.includes("border-transparent") ? riskMeta.colors[0] : undefined }}
                          >
                            {riskMeta.label}
                          </span>
                          <span className={`brand-chip ${sosApprovalTone[approvalMeta.value]}`}>{approvalMeta.label}</span>
                          <span className={`brand-chip ${sosStatusTone[statusMeta.value]}`}>{statusMeta.label}</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-ink">{caseItem.summary}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {caseItem.requesterName || "Unknown requester"} | {categoryMeta.label}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{formatDateTime(caseItem.updatedAt || caseItem.createdAt)}</p>
                        <p className="mt-1">{caseItem.location || "No location"}</p>
                      </div>
                    </div>

                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.84fr)_minmax(280px,0.76fr)]">
                      <div className="space-y-4">
                        <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current context</p>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{caseItem.details}</p>
                          {(caseItem.tags || []).length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {(caseItem.tags || []).map((tag) => (
                                <span key={tag} className="brand-chip border-slate-200 bg-white text-slate-500">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {latestUpdate ? (
                          <div className="rounded-[26px] border border-primary/10 bg-primary/5 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-primary/60">Latest timeline note</p>
                            <p className="mt-3 text-sm font-semibold text-ink">{latestUpdate.by}</p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">{latestUpdate.message}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4 rounded-[26px] border border-slate-100 bg-slate-50/70 p-4">
                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Status</span>
                          <select
                            value={draft.status || caseItem.status || "new"}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: { ...previous[caseItem.id], status: event.target.value },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          >
                            {sosStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Approval</span>
                          <select
                            value={draft.approvalState || caseItem.approvalState || "pending_review"}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: {
                                  ...previous[caseItem.id],
                                  approvalState: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          >
                            {sosApprovalOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>DU response to user</span>
                          <textarea
                            rows={4}
                            value={draft.duResponse ?? ""}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: { ...previous[caseItem.id], duResponse: event.target.value },
                              }))
                            }
                            placeholder="ตอบกลับแบบสั้น ชัด และใช้งานต่อได้"
                            className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          />
                        </label>

                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Helpful details / next steps</span>
                          <textarea
                            rows={5}
                            value={draft.helpDetails ?? ""}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: { ...previous[caseItem.id], helpDetails: event.target.value },
                              }))
                            }
                            placeholder="ใส่คำแนะนำ ขั้นตอนช่วยเหลือ หรือสิ่งที่ผู้ใช้ควรเตรียม"
                            className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => saveCaseUpdate(caseItem)}
                          disabled={savingId === caseItem.id}
                          className="brand-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {savingId === caseItem.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Send size={18} />
                          )}
                          Save DU response
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  RadioTower,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  documentId,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { courseCatalog } from "../data/courseCatalog";
import {
  SOS_COLLECTION,
  createTimelineEntry,
  formatCaseNumber,
  formatDateTime,
  sosStatusOptions,
  sosStatusTone,
  sosUrgencyTone,
  toUnixTime,
} from "../data/sosConfig";

export default function AdminConsole() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEnrollments: 0,
    newCases: 0,
    activeCases: 0,
    resolvedCases: 0,
  });
  const [coursePulse, setCoursePulse] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState({});

  const operatorName =
    currentUser?.displayName || currentUser?.email || "DU Operations";

  const refreshConsoleStats = async () => {
    try {
      const [usersCount, enrollmentCount, newCasesCount, activeCasesCount, resolvedCasesCount] =
        await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collectionGroup(db, "enrollments")),
          getCountFromServer(query(collection(db, SOS_COLLECTION), where("status", "==", "new"))),
          getCountFromServer(
            query(collection(db, SOS_COLLECTION), where("status", "==", "in_progress")),
          ),
          getCountFromServer(
            query(collection(db, SOS_COLLECTION), where("status", "==", "resolved")),
          ),
        ]);

      const courseCounts = await Promise.all(
        courseCatalog.map(async (course) => {
          try {
            const count = await getCountFromServer(
              query(
                collectionGroup(db, "enrollments"),
                where(documentId(), "==", course.id),
              ),
            );

            return {
              courseId: course.id,
              title: course.title,
              count: count.data().count,
              missionCount: course.missionCount,
              gradientClass: course.gradientClass,
            };
          } catch (error) {
            console.error(`Failed to count enrollments for ${course.id}:`, error);
            return {
              courseId: course.id,
              title: course.title,
              count: 0,
              missionCount: course.missionCount,
              gradientClass: course.gradientClass,
            };
          }
        }),
      );

      setStats({
        totalUsers: usersCount.data().count,
        totalEnrollments: enrollmentCount.data().count,
        newCases: newCasesCount.data().count,
        activeCases: activeCasesCount.data().count,
        resolvedCases: resolvedCasesCount.data().count,
      });
      setCoursePulse(courseCounts);
    } catch (error) {
      console.error("Failed to refresh admin console stats:", error);
    }
  };

  useEffect(() => {
    refreshConsoleStats();

    const casesQuery = query(
      collection(db, SOS_COLLECTION),
      orderBy("updatedAt", "desc"),
      limit(12),
    );

    const unsubscribe = onSnapshot(
      casesQuery,
      (snapshot) => {
        const nextCases = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setCases(nextCases);
        setDrafts((previous) => {
          const nextDrafts = { ...previous };
          nextCases.forEach((caseItem) => {
            if (!nextDrafts[caseItem.id]) {
              nextDrafts[caseItem.id] = { status: caseItem.status || "new", note: "" };
            } else {
              nextDrafts[caseItem.id] = {
                ...nextDrafts[caseItem.id],
                status: nextDrafts[caseItem.id].status || caseItem.status || "new",
              };
            }
          });
          return nextDrafts;
        });
        setLoading(false);
        refreshConsoleStats();
      },
      (error) => {
        console.error("Failed to subscribe SOS cases:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const queueCases = useMemo(
    () =>
      [...cases].sort(
        (left, right) =>
          toUnixTime(right.updatedAt || right.createdAt) -
          toUnixTime(left.updatedAt || left.createdAt),
      ),
    [cases],
  );

  const saveCaseUpdate = async (caseItem) => {
    const draft = drafts[caseItem.id];
    if (!draft) return;

    const note = draft.note.trim();
    const statusChanged = draft.status !== caseItem.status;

    if (!note && !statusChanged) return;

    setSavingId(caseItem.id);

    try {
      const statusLabel =
        sosStatusOptions.find((option) => option.value === draft.status)?.label || draft.status;

      await updateDoc(doc(db, SOS_COLLECTION, caseItem.id), {
        status: draft.status,
        updatedAt: serverTimestamp(),
        assignedTeam: "DU Ops",
        lastTouchedBy: operatorName,
        updates: arrayUnion(
          createTimelineEntry({
            type: "admin-update",
            by: operatorName,
            message: note || `Status updated to ${statusLabel}`,
            status: draft.status,
          }),
        ),
      });

      setDrafts((previous) => ({
        ...previous,
        [caseItem.id]: { ...previous[caseItem.id], note: "" },
      }));
    } catch (error) {
      console.error("Failed to update SOS case:", error);
    } finally {
      setSavingId("");
    }
  };

  const statCards = [
    {
      label: "Users",
      value: stats.totalUsers,
      icon: <Users size={18} />,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Enrollments",
      value: stats.totalEnrollments,
      icon: <BookOpen size={18} />,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      label: "New SOS",
      value: stats.newCases,
      icon: <AlertTriangle size={18} />,
      tone: "bg-accent/10 text-accent",
    },
    {
      label: "Active Follow-up",
      value: stats.activeCases,
      icon: <RadioTower size={18} />,
      tone: "bg-warm/15 text-[#a24619]",
    },
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
                Operations view สำหรับ triage, follow-up และผลลัพธ์ที่ขยับได้จริง
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
                ใช้ console นี้เพื่อตรวจ pulse ของระบบ เรียงลำดับเคส SOS ติดตามการตอบกลับ
                และมองการขยับของหลักสูตรโดยไม่ต้องเปิดหลายหน้า
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/du/sos" className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white">
              Open SOS Center
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                  ภาพรวมการใช้งานหลักสูตร
                </h2>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Resolved SOS</p>
                <p className="text-2xl font-bold text-ink">{stats.resolvedCases}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {coursePulse.map((course) => (
                <div
                  key={course.courseId}
                  className="overflow-hidden rounded-[28px] border border-slate-100 bg-white"
                >
                  <div className={`h-2 bg-gradient-to-r ${course.gradientClass}`} />
                  <div className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <p className="text-lg font-semibold text-ink">{course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.missionCount} mission checkpoints
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
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <RadioTower size={14} />
              DU Playbook
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              วิธีใช้ console นี้ให้เร็วและมีคุณภาพ
            </h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>1. ตรวจเคสใหม่ก่อน แล้วให้ acknowledgement ภายในรอบแรกของวัน</p>
              <p>2. เมื่อสถานะขยับ ให้เขียน follow-up สั้นแต่ชัดใน timeline เดิมแทนการสร้างแชตใหม่</p>
              <p>3. ใช้ course pulse ดูว่ากลุ่มใดกำลังขยับช้าและควรได้รับแรงสนับสนุนเชิงระบบ</p>
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
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                เคสที่ต้องติดตาม
              </h2>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Queue size</p>
              <p className="text-2xl font-bold text-ink">{queueCases.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[340px] items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : queueCases.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-slate-100 bg-slate-50/80 p-8 text-center">
              <CheckCircle2 className="mx-auto text-primary" size={30} />
              <h3 className="mt-4 text-xl font-semibold text-ink">No active cases in the queue</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                เมื่อมี SOS ใหม่หรือมีการติดตามจากผู้ใช้ รายการนี้จะอัปเดตให้อัตโนมัติ
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {queueCases.map((caseItem) => {
                const draft = drafts[caseItem.id] || { status: caseItem.status, note: "" };
                const updates = [...(caseItem.updates || [])].sort(
                  (left, right) => toUnixTime(right.at) - toUnixTime(left.at),
                );
                const latestUpdate = updates[0];

                return (
                  <article
                    key={caseItem.id}
                    className="overflow-hidden rounded-[30px] border border-slate-100 bg-white"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                            {formatCaseNumber(caseItem.id)}
                          </span>
                          <span className={`brand-chip ${sosUrgencyTone[caseItem.urgency]}`}>
                            {caseItem.urgency}
                          </span>
                          <span className={`brand-chip ${sosStatusTone[caseItem.status]}`}>
                            {caseItem.status}
                          </span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-ink">{caseItem.summary}</h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {caseItem.requesterName || "Unknown requester"} •{" "}
                          {caseItem.preferredChannel || "LINE"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{formatDateTime(caseItem.updatedAt || caseItem.createdAt)}</p>
                        <p className="mt-1">{caseItem.location || "No location"}</p>
                      </div>
                    </div>

                    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(260px,0.7fr)]">
                      <div className="space-y-4">
                        <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Current context
                          </p>
                          <p className="mt-3 text-sm leading-7 text-slate-600">{caseItem.details}</p>
                        </div>

                        {latestUpdate ? (
                          <div className="rounded-[26px] border border-primary/10 bg-primary/5 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-primary/60">
                              Latest timeline note
                            </p>
                            <p className="mt-3 text-sm font-semibold text-ink">{latestUpdate.by}</p>
                            <p className="mt-2 text-sm leading-7 text-slate-600">
                              {latestUpdate.message}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4 rounded-[26px] border border-slate-100 bg-slate-50/70 p-4">
                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Status</span>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: {
                                  ...previous[caseItem.id],
                                  status: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/[0.35] focus:ring-4 focus:ring-accent/10"
                          >
                            {sosStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>Follow-up note</span>
                          <textarea
                            rows={5}
                            value={draft.note}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [caseItem.id]: {
                                  ...previous[caseItem.id],
                                  note: event.target.value,
                                },
                              }))
                            }
                            placeholder="บันทึกสิ่งที่ DU ได้ดำเนินการหรือสิ่งที่ต้องการให้ผู้ใช้ตอบกลับ"
                            className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/[0.35] focus:ring-4 focus:ring-accent/10"
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
                          Save update
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


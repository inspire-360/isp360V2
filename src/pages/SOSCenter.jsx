import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Loader2,
  MapPin,
  MessageSquareText,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  SOS_COLLECTION,
  createTimelineEntry,
  formatCaseNumber,
  formatDateTime,
  sosCategoryOptions,
  sosStatusOptions,
  sosStatusTone,
  sosUrgencyOptions,
  sosUrgencyTone,
  toUnixTime,
} from "../data/sosConfig";

const defaultForm = {
  category: "wellbeing",
  urgency: "high",
  summary: "",
  details: "",
  location: "",
  preferredChannel: "LINE",
};

export default function SOSCenter() {
  const { currentUser, userRole } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [followUpDrafts, setFollowUpDrafts] = useState({});
  const [submittingFollowUp, setSubmittingFollowUp] = useState("");

  const requesterName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "InSPIRE user";

  useEffect(() => {
    if (!currentUser) return undefined;

    const casesQuery = query(
      collection(db, SOS_COLLECTION),
      where("requesterId", "==", currentUser.uid),
    );

    const unsubscribe = onSnapshot(
      casesQuery,
      (snapshot) => {
        const nextCases = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(
            (left, right) =>
              toUnixTime(right.updatedAt || right.createdAt) -
              toUnixTime(left.updatedAt || left.createdAt),
          );
        setCases(nextCases);
        setLoadingCases(false);
      },
      () => {
        setLoadingCases(false);
      },
    );

    return unsubscribe;
  }, [currentUser]);

  const activeCases = useMemo(
    () => cases.filter((item) => item.status !== "resolved"),
    [cases],
  );

  const resolvedCases = useMemo(
    () => cases.filter((item) => item.status === "resolved"),
    [cases],
  );

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!currentUser || !form.summary.trim() || !form.details.trim()) return;

    setSubmitting(true);
    setMessage("");

    try {
      await addDoc(collection(db, SOS_COLLECTION), {
        requesterId: currentUser.uid,
        requesterName,
        requesterEmail: currentUser.email || "",
        requesterRole: userRole || "learner",
        category: form.category,
        urgency: form.urgency,
        summary: form.summary.trim(),
        details: form.details.trim(),
        location: form.location.trim(),
        preferredChannel: form.preferredChannel.trim() || "LINE",
        status: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updates: [
          createTimelineEntry({
            type: "submitted",
            by: requesterName,
            message: "SOS request sent to DU and queued for triage",
            status: "new",
          }),
        ],
      });

      setForm(defaultForm);
      setMessage("ส่ง SOS ถึง DU แล้ว ตอนนี้คุณสามารถติดตามสถานะและเพิ่มข้อมูลต่อได้จากรายการด้านขวา");
    } catch (error) {
      console.error("Failed to create SOS case:", error);
      setMessage("ไม่สามารถส่ง SOS ได้ในขณะนี้ โปรดลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFollowUp = async (caseId) => {
    const note = followUpDrafts[caseId]?.trim();
    if (!note) return;

    setSubmittingFollowUp(caseId);

    try {
      await updateDoc(doc(db, SOS_COLLECTION, caseId), {
        status: "in_progress",
        updatedAt: serverTimestamp(),
        updates: arrayUnion(
          createTimelineEntry({
            type: "follow-up",
            by: requesterName,
            message: note,
            status: "in_progress",
          }),
        ),
      });

      setFollowUpDrafts((previous) => ({ ...previous, [caseId]: "" }));
    } catch (error) {
      console.error("Failed to add follow-up:", error);
    } finally {
      setSubmittingFollowUp("");
    }
  };

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.80]">
              <ShieldAlert size={14} />
              SOS to DU
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                ส่งเรื่องด่วนและติดตามการช่วยเหลือได้ในที่เดียว
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
                ใช้พื้นที่นี้ส่งสัญญาณถึง DU เมื่อคุณต้องการความช่วยเหลือเรื่อง wellbeing,
                safety, learning support หรือการประสานงาน และติดตามผลแบบต่อเนื่องโดยไม่หลุดบริบท
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/[0.12] bg-white/[0.10] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/[0.55]">Open cases</p>
              <p className="mt-3 text-3xl font-bold">{activeCases.length}</p>
            </div>
            <div className="rounded-3xl border border-white/[0.12] bg-white/[0.10] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/[0.55]">Resolved</p>
              <p className="mt-3 text-3xl font-bold">{resolvedCases.length}</p>
            </div>
            <div className="rounded-3xl border border-white/[0.12] bg-white/[0.10] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/[0.55]">Follow-up</p>
              <p className="mt-3 text-sm leading-6 text-white/75">
                ทุกเคสเก็บ timeline เพื่อให้ DU ตอบกลับต่อเนื่อง
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <section className="brand-panel p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <LifeBuoy size={14} />
                New Request
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                ส่งเรื่องถึง DU พร้อมรายละเอียดที่ช่วยให้ตอบเร็วขึ้น
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                ยิ่งสรุปปัญหา สถานที่ และช่องทางติดต่อชัด DU จะยิ่ง triage และ follow-up ได้เร็วขึ้น
              </p>
            </div>

            <Link to="/du/admin" className="brand-button-secondary">
              DU Admin Console
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink">หมวดเรื่อง</label>
              <div className="grid gap-3 md:grid-cols-2">
                {sosCategoryOptions.map((option) => {
                  const isActive = form.category === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange("category", option.value)}
                      className={`rounded-[24px] border p-4 text-left transition-all ${
                        isActive
                          ? "border-primary/20 bg-primary/5 shadow-[0_16px_50px_rgba(13,17,100,0.08)]"
                          : "border-slate-200/80 bg-white hover:border-accent/20 hover:bg-accent/5"
                      }`}
                    >
                      <p className="font-semibold text-ink">{option.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{option.helper}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink">ระดับความเร่งด่วน</label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {sosUrgencyOptions.map((option) => {
                  const isActive = form.urgency === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange("urgency", option.value)}
                      className={`rounded-3xl border px-4 py-4 text-left transition-all ${
                        isActive
                          ? "border-transparent bg-gradient-to-r from-primary via-secondary to-accent text-white shadow-[0_18px_45px_rgba(100,13,95,0.2)]"
                          : "border-slate-200/80 bg-white hover:border-accent/25"
                      }`}
                    >
                      <p className="font-semibold">{option.label}</p>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          isActive ? "text-white/[0.80]" : "text-slate-500"
                        }`}
                      >
                        {option.helper}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>หัวข้อสรุป</span>
                <input
                  value={form.summary}
                  onChange={(event) => handleChange("summary", event.target.value)}
                  placeholder="เช่น ต้องการความช่วยเหลือกรณีนักเรียนเครียดสูง"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
                />
              </label>

              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>สถานที่ / หน่วยงาน</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
                  <input
                    value={form.location}
                    onChange={(event) => handleChange("location", event.target.value)}
                    placeholder="เช่น อาคาร 2 หรือ Grade 7 Team"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
                  />
                </div>
              </label>
            </div>

            <label className="space-y-2 text-sm font-semibold text-ink">
              <span>รายละเอียดสำหรับ DU</span>
              <textarea
                rows={6}
                value={form.details}
                onChange={(event) => handleChange("details", event.target.value)}
                placeholder="เล่าเหตุการณ์ สิ่งที่เกิดขึ้นตอนนี้ ผลกระทบ และสิ่งที่คุณต้องการให้ DU ช่วย"
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-ink">
              <span>ช่องทางที่ติดต่อสะดวกที่สุด</span>
              <div className="relative">
                <MessageSquareText className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
                <input
                  value={form.preferredChannel}
                  onChange={(event) => handleChange("preferredChannel", event.target.value)}
                  placeholder="LINE / โทรศัพท์ / อีเมล"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
                />
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="rounded-3xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary">
                DU จะได้รับ timeline แรกทันทีที่คุณกดส่ง และสามารถตอบกลับต่อในเคสเดิมได้
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                ส่ง SOS ถึง DU
              </button>
            </div>

            {message ? (
              <div className="rounded-3xl border border-accent/[0.15] bg-accent/5 px-4 py-4 text-sm leading-7 text-slate-700">
                {message}
              </div>
            ) : null}
          </form>
        </section>

        <section className="space-y-6">
          <div className="brand-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
                  <Sparkles size={14} />
                  My Queue
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                  ติดตามสถานะและเติมข้อมูลต่อ
                </h2>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Cases</p>
                <p className="text-2xl font-bold text-ink">{cases.length}</p>
              </div>
            </div>
          </div>

          {loadingCases ? (
            <div className="brand-panel flex min-h-[260px] items-center justify-center p-6">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : cases.length === 0 ? (
            <div className="brand-panel p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldAlert size={28} />
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-ink">ยังไม่มีเคส SOS</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                เมื่อคุณส่งเรื่องแล้ว รายการติดตามและ timeline จะปรากฏที่นี่ทันที
              </p>
            </div>
          ) : (
            cases.map((caseItem) => {
              const statusLabel =
                sosStatusOptions.find((option) => option.value === caseItem.status)?.label ||
                caseItem.status;
              const updates = [...(caseItem.updates || [])].sort(
                (left, right) => toUnixTime(right.at) - toUnixTime(left.at),
              );

              return (
                <article key={caseItem.id} className="brand-panel overflow-hidden p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                          {formatCaseNumber(caseItem.id)}
                        </span>
                        <span className={`brand-chip ${sosUrgencyTone[caseItem.urgency]}`}>
                          {caseItem.urgency}
                        </span>
                        <span className={`brand-chip ${sosStatusTone[caseItem.status]}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <h3 className="mt-4 text-xl font-bold text-ink">{caseItem.summary}</h3>
                    </div>

                    <div className="text-right text-sm text-slate-500">
                      <p>{formatDateTime(caseItem.updatedAt || caseItem.createdAt)}</p>
                      <p className="mt-1 capitalize">{caseItem.preferredChannel || "LINE"}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 rounded-[26px] border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Category</p>
                      <p className="mt-2 font-semibold text-ink">{caseItem.category}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Location</p>
                      <p className="mt-2 font-semibold text-ink">{caseItem.location || "Not specified"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Details</p>
                      <p className="mt-2 leading-7 text-slate-600">{caseItem.details}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Clock3 size={16} className="text-secondary" />
                      Timeline
                    </div>
                    <div className="space-y-3">
                      {updates.slice(0, 4).map((update) => (
                        <div
                          key={update.id}
                          className="rounded-3xl border border-slate-100 bg-white px-4 py-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-ink">{update.by}</p>
                            <span className="text-xs text-slate-400">{formatDateTime(update.at)}</span>
                          </div>
                          <p className="mt-2 leading-7 text-slate-600">{update.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {caseItem.status !== "resolved" ? (
                    <div className="mt-5 rounded-[26px] border border-primary/10 bg-primary/5 p-4">
                      <label className="space-y-2 text-sm font-semibold text-ink">
                        <span>เพิ่มข้อมูลติดตาม</span>
                        <textarea
                          rows={3}
                          value={followUpDrafts[caseItem.id] || ""}
                          onChange={(event) =>
                            setFollowUpDrafts((previous) => ({
                              ...previous,
                              [caseItem.id]: event.target.value,
                            }))
                          }
                          placeholder="อัปเดตสถานการณ์ล่าสุดหรือข้อมูลที่ DU ควรรู้เพิ่ม"
                          className="w-full rounded-3xl border border-white/70 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                        />
                      </label>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => submitFollowUp(caseItem.id)}
                          disabled={submittingFollowUp === caseItem.id}
                          className="brand-button-secondary"
                        >
                          {submittingFollowUp === caseItem.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                          ส่ง follow-up
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex items-center gap-3 rounded-[26px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm text-primary">
                      <CheckCircle2 size={18} />
                      เคสนี้ปิดแล้ว หากต้องการความช่วยเหลือเพิ่มเติมสามารถเปิดเคสใหม่หรือเพิ่มข้อมูลผ่าน DU Admin ได้
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}


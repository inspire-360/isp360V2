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
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
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
  mergeSosCases,
  normalizeRiskLevel,
  normalizeTags,
  sosApprovalTone,
  sosCategoryOptions,
  sosRiskOptions,
  sosRiskTone,
  sosStatusTone,
  toUnixTime,
} from "../data/sosConfig";

const defaultForm = {
  category: "workload",
  riskLevel: "urgent",
  tags: [],
  summary: "",
  details: "",
  location: "",
  preferredChannel: "LINE",
};

const getSosSubmitMessage = (error) => {
  if (error?.code === "permission-denied") {
    return "ยังส่ง SOS ไม่สำเร็จ เพราะ Firestore rules ของโปรเจกต์ยังไม่อนุญาต flow นี้สำหรับ learner กรุณา deploy rules ล่าสุดก่อนแล้วลองส่งอีกครั้ง";
  }

  if (error?.code === "unavailable") {
    return "ยังส่ง SOS ไม่สำเร็จเพราะเชื่อมต่อ Firebase ไม่ได้ในตอนนี้ ลองอีกครั้งเมื่อเครือข่ายพร้อม";
  }

  return "ยังส่ง SOS ไม่สำเร็จในตอนนี้ ลองอีกครั้งได้เลยครับ";
};

export default function SOSCenter() {
  const { currentUser, userRole } = useAuth();
  const [form, setForm] = useState(defaultForm);
  const [userCases, setUserCases] = useState([]);
  const [rootCases, setRootCases] = useState([]);
  const [sourceReady, setSourceReady] = useState({ user: false, root: false });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [followUpDrafts, setFollowUpDrafts] = useState({});
  const [submittingFollowUp, setSubmittingFollowUp] = useState("");

  const requesterName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "InSPIRE user";
  const selectedCategory = getCategoryMeta(form.category);

  useEffect(() => {
    if (!currentUser) return undefined;

    setSourceReady({ user: false, root: false });

    const userCasesQuery = collection(db, "users", currentUser.uid, SOS_USER_SUBCOLLECTION);
    const rootCasesQuery = query(
      collection(db, SOS_COLLECTION),
      where("requesterId", "==", currentUser.uid),
    );

    const unsubscribeUserCases = onSnapshot(
      userCasesQuery,
      (snapshot) => {
        setUserCases(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setSourceReady((previous) => ({ ...previous, user: true }));
      },
      () => setSourceReady((previous) => ({ ...previous, user: true })),
    );

    const unsubscribeRootCases = onSnapshot(
      rootCasesQuery,
      (snapshot) => {
        setRootCases(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setSourceReady((previous) => ({ ...previous, root: true }));
      },
      () => setSourceReady((previous) => ({ ...previous, root: true })),
    );

    return () => {
      unsubscribeUserCases();
      unsubscribeRootCases();
    };
  }, [currentUser]);

  const cases = useMemo(() => mergeSosCases(userCases, rootCases), [rootCases, userCases]);
  const loadingCases = !sourceReady.user || !sourceReady.root;
  const activeCases = useMemo(() => cases.filter((item) => item.status !== "resolved"), [cases]);
  const resolvedCases = useMemo(() => cases.filter((item) => item.status === "resolved"), [cases]);

  const handleChange = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const toggleTag = (tag) =>
    setForm((previous) => ({
      ...previous,
      tags: previous.tags.includes(tag)
        ? previous.tags.filter((item) => item !== tag)
        : [...previous.tags, tag],
    }));

  const handleCategoryChange = (value) =>
    setForm((previous) => ({
      ...previous,
      category: value,
      tags: [],
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentUser || !form.summary.trim() || !form.details.trim()) return;

    setSubmitting(true);
    setMessage("");

    try {
      const riskMeta = getRiskMeta(form.riskLevel);

      const caseId = doc(collection(db, "users", currentUser.uid, SOS_USER_SUBCOLLECTION)).id;
      const baseCase = {
        requesterId: currentUser.uid,
        requesterName,
        requesterEmail: currentUser.email || "",
        requesterRole: userRole || "learner",
        category: form.category,
        tags: normalizeTags(form.tags),
        riskLevel: riskMeta.value,
        riskSort: riskMeta.sort,
        summary: form.summary.trim(),
        details: form.details.trim(),
        location: form.location.trim(),
        preferredChannel: form.preferredChannel.trim() || "LINE",
        approvalState: "pending_review",
        status: "new",
        duResponse: "",
        helpDetails: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updates: [
          createTimelineEntry({
            type: "submitted",
            by: requesterName,
            message: "SOS request sent to DU and waiting for review",
            status: "new",
            approvalState: "pending_review",
          }),
        ],
      };

      const userCaseRef = doc(db, "users", currentUser.uid, SOS_USER_SUBCOLLECTION, caseId);
      const rootCaseRef = doc(db, SOS_COLLECTION, caseId);
      const [userWrite, rootWrite] = await Promise.allSettled([
        setDoc(userCaseRef, baseCase, { merge: true }),
        setDoc(rootCaseRef, baseCase, { merge: true }),
      ]);

      if (userWrite.status !== "fulfilled" && rootWrite.status !== "fulfilled") {
        throw userWrite.reason || rootWrite.reason;
      }

      if (rootWrite.status !== "fulfilled") {
        console.warn("Root SOS mirror is pending:", rootWrite.reason);
      }

      setForm(defaultForm);
      if (rootWrite.status !== "fulfilled") {
        setMessage(
          rootWrite.reason?.code === "permission-denied"
            ? "SOS ถูกบันทึกในบัญชีผู้เรียนแล้ว แต่ mirror กลางของ DU ยังไม่ sync เพราะ Firestore rules ของโปรเจกต์ยังไม่อัปเดต"
            : "SOS ถูกบันทึกแล้ว แต่ mirror กลางของ DU ยัง sync ไม่ครบ ระบบยังเก็บเคสฝั่งผู้เรียนไว้ให้แล้ว",
        );
        return;
      }
      setMessage("SOS ถูกส่งถึง DU แล้ว ตอนนี้คุณครูติดตามสถานะ คำแนะนำ และอัปเดตข้อมูลต่อได้จากคิวด้านขวา");
      return;
    } catch (error) {
      console.error("Failed to create SOS case:", error);
      setMessage(getSosSubmitMessage(error));
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const submitFollowUp = async (caseId) => {
    const note = followUpDrafts[caseId]?.trim();
    if (!note) return;

    setSubmittingFollowUp(caseId);

    try {
      const payload = {
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
      };

      const results = await Promise.allSettled([
        setDoc(doc(db, "users", currentUser.uid, SOS_USER_SUBCOLLECTION, caseId), payload, { merge: true }),
        setDoc(doc(db, SOS_COLLECTION, caseId), payload, { merge: true }),
      ]);

      if (results.every((result) => result.status !== "fulfilled")) {
        throw new Error("Unable to sync follow-up to Firebase.");
      }

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
                ส่งเรื่องด่วนพร้อมระดับความเสี่ยง และตามงานกับ DU ในที่เดียว
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
                เลือกหมวดปัญหาและแท็กให้เร็วที่สุด ระบุระดับความเร่งด่วนด้วยสีที่ชัดเจน แล้วติดตามการอนุมัติ คำแนะนำ และการช่วยเหลือต่อเนื่องจาก DU ได้ทันที
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
              <p className="mt-3 text-sm leading-6 text-white/75">ทุกเคสเก็บ timeline และ feedback ไว้ใน Firebase</p>
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
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">ส่งคำขอช่วยเหลือแบบพร้อม triage</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                เลือกหมวดปัญหา แท็กย่อย และระดับความเสี่ยงให้ชัดก่อนส่ง DU จะได้คัดลำดับ ช่วยตอบกลับ และต่อความช่วยเหลือได้เร็วขึ้น
              </p>
            </div>
            <Link to="/du/admin" className="brand-button-secondary">
              DU Admin Console
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink">หมวดปัญหา</label>
              <div className="grid gap-3 md:grid-cols-2">
                {sosCategoryOptions.map((option) => {
                  const active = form.category === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleCategoryChange(option.value)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        active
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
              <label className="text-sm font-semibold text-ink">แท็กปัญหาแบบเร็ว</label>
              <div className="rounded-[26px] border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-sm text-slate-500">หมวดที่เลือก: {selectedCategory.label}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedCategory.tags.map((tag) => {
                    const active = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-accent/25"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-ink">ระดับความเร่งด่วนของปัญหา</label>
              <div className="grid gap-3 lg:grid-cols-2">
                {sosRiskOptions.map((option) => {
                  const active = form.riskLevel === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange("riskLevel", option.value)}
                      className={`rounded-[26px] border p-4 text-left transition ${
                        active ? "scale-[1.01] shadow-[0_22px_60px_rgba(13,17,100,0.16)]" : "border-slate-200 bg-white"
                      }`}
                      style={{
                        borderColor: active ? option.colors[0] : undefined,
                        background: active
                          ? `linear-gradient(135deg, ${option.colors.join(", ")})`
                          : undefined,
                        color: active ? option.tone.includes("text-white") ? "#ffffff" : "#231F20" : undefined,
                      }}
                    >
                      <p className={`font-semibold ${active ? "" : "text-ink"}`}>{option.label}</p>
                      <p className={`mt-1 text-sm ${active ? "opacity-90" : "text-slate-500"}`}>{option.level}</p>
                      <p className={`mt-3 text-sm leading-6 ${active ? "opacity-90" : "text-slate-500"}`}>
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
                  placeholder="เช่น ต้องการช่วยรับมือภาวะหมดไฟและภาระงานล้น"
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
                placeholder="เล่าเหตุการณ์ ผลกระทบ สิ่งที่ได้ลองทำไปแล้ว และสิ่งที่อยากให้ DU ช่วย"
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-ink">
              <span>ช่องทางติดต่อที่สะดวก</span>
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
                DU จะเห็นระดับความเสี่ยง หมวดปัญหา และแท็กที่เลือกทันที เพื่อจัดลำดับการช่วยเหลือ
              </div>
              <button type="submit" disabled={submitting} className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70">
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
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">ติดตามการอนุมัติ คำแนะนำ และการตอบกลับ</h2>
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
              <p className="mt-3 text-sm leading-7 text-slate-500">เมื่อคุณครูส่งเรื่องแล้ว คิวติดตามและ timeline จะปรากฏที่นี่ทันที</p>
            </div>
          ) : (
            cases.map((caseItem) => {
              const riskMeta = getRiskMeta(normalizeRiskLevel(caseItem.riskLevel || caseItem.urgency));
              const categoryMeta = getCategoryMeta(caseItem.category);
              const statusMeta = getStatusMeta(caseItem.status);
              const approvalMeta = getApprovalMeta(caseItem.approvalState);
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
                        <span
                          className={`brand-chip ${sosRiskTone[riskMeta.value]}`}
                          style={{ background: riskMeta.tone.includes("border-transparent") ? riskMeta.colors[0] : undefined }}
                        >
                          {riskMeta.label}
                        </span>
                        <span className={`brand-chip ${sosApprovalTone[approvalMeta.value]}`}>{approvalMeta.label}</span>
                        <span className={`brand-chip ${sosStatusTone[statusMeta.value]}`}>{statusMeta.label}</span>
                      </div>
                      <h3 className="mt-4 text-xl font-bold text-ink">{caseItem.summary}</h3>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                      <p>{formatDateTime(caseItem.updatedAt || caseItem.createdAt)}</p>
                      <p className="mt-1 capitalize">{caseItem.preferredChannel || "LINE"}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 rounded-[26px] border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Category</p>
                        <p className="mt-2 font-semibold text-ink">{categoryMeta.label}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Location</p>
                        <p className="mt-2 font-semibold text-ink">{caseItem.location || "Not specified"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tags</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(caseItem.tags || []).map((tag) => (
                          <span key={tag} className="brand-chip border-slate-200 bg-white text-slate-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Details</p>
                      <p className="mt-2 leading-7 text-slate-600">{caseItem.details}</p>
                    </div>
                    {caseItem.duResponse ? (
                      <div className="rounded-[22px] border border-primary/10 bg-primary/5 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-primary/60">DU Feedback</p>
                        <p className="mt-2 font-semibold text-ink">{caseItem.duResponse}</p>
                        {caseItem.helpDetails ? (
                          <p className="mt-3 leading-7 text-slate-600">{caseItem.helpDetails}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Clock3 size={16} className="text-secondary" />
                      Timeline
                    </div>
                    <div className="space-y-3">
                      {updates.slice(0, 5).map((update) => (
                        <div key={update.id} className="rounded-3xl border border-slate-100 bg-white px-4 py-3 text-sm">
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
                        <span>ส่งข้อมูลเพิ่มเติมถึง DU</span>
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
                      เคสนี้ปิดแล้ว หากต้องการความช่วยเหลือเพิ่มเติมสามารถเปิดเคสใหม่หรืออัปเดตผ่าน DU ได้อีกครั้ง
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




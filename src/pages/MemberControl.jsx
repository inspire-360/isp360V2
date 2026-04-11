import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Loader2, RefreshCcw, Save, Search, UserCog, Users, Wifi } from "lucide-react";
import { doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { formatDateTime } from "../data/sosConfig";
import { useDuMemberData } from "../hooks/useDuMemberData";
import { db } from "../lib/firebase";
import { getPresenceTimestamp, resolvePresenceMeta } from "../utils/presenceStatus";
import {
  buildEnrollmentInsight,
  buildPainPointCloud,
  buildResetPayload,
  buildUserDraft,
  collectMissionPainPointSignals,
  resolveDisplayName,
} from "../utils/duMemberInsights";
import { getRoleLabel, normalizeUserRole, userRoleOptions } from "../utils/userRoles";

const formatLastSeen = (value) => {
  const unix = getPresenceTimestamp({ lastActive: value, lastSeen: value })?.getTime?.() || 0;
  if (!unix) return "ยังไม่มีข้อมูลสถานะ";
  const diff = Date.now() - unix;
  if (diff < 60_000) return "เมื่อสักครู่";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} นาทีที่แล้ว`;
  if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))} ชั่วโมงที่แล้ว`;
  return formatDateTime(value);
};

export default function MemberControl() {
  const { currentUser } = useAuth();
  const { usersData, presenceRows, enrollments, loading, now, refreshMembers, refreshingMembers } = useDuMemberData();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");
  const [memberPresenceFilter, setMemberPresenceFilter] = useState("all");
  const [memberCourseFilter, setMemberCourseFilter] = useState("all");
  const [userDrafts, setUserDrafts] = useState({});
  const [savingUserId, setSavingUserId] = useState("");
  const [resettingUserId, setResettingUserId] = useState("");

  const operatorName = currentUser?.displayName || currentUser?.email || "DU Operations";
  const enrollmentInsights = useMemo(() => enrollments.map((item) => buildEnrollmentInsight(item)), [enrollments]);
  const enrollmentsByUser = useMemo(() => {
    const nextMap = new Map();
    enrollmentInsights.forEach((item) => {
      const bucket = nextMap.get(item.userId) || [];
      bucket.push(item);
      nextMap.set(item.userId, bucket);
    });
    return nextMap;
  }, [enrollmentInsights]);
  const presenceMap = useMemo(() => new Map(presenceRows.map((item) => [item.uid || item.id, item])), [presenceRows]);

  const memberRows = useMemo(
    () =>
      usersData.map((user) => {
        const presenceRecord = presenceMap.get(user.id) || {};
        const userEnrollments = enrollmentsByUser.get(user.id) || [];
        const spotlightEnrollment =
          userEnrollments.find((item) => (item.courseId || item.id) === "course-teacher") || userEnrollments[0] || null;
        return {
          ...user,
          id: user.id,
          name: resolveDisplayName(user),
          email: user.email || "",
          role: normalizeUserRole(user.role),
          roleLabel: getRoleLabel(user.role),
          presence: resolvePresenceMeta(presenceRecord, now),
          lastSeen: presenceRecord.lastActive || presenceRecord.lastSeen,
          activePath: presenceRecord.activePath || "",
          spotlightCourseId: spotlightEnrollment?.courseId || spotlightEnrollment?.id || "",
          spotlightCourse: spotlightEnrollment?.courseTitle || "No course yet",
          spotlightProgress: spotlightEnrollment?.progressPercent || 0,
          activeModuleTitle: spotlightEnrollment?.activeModuleTitle || "",
          activeLessonTitle: spotlightEnrollment?.activeLessonTitle || "",
        };
      }),
    [enrollmentsByUser, now, presenceMap, usersData],
  );

  const memberCourseOptions = useMemo(
    () =>
      [...new Map(memberRows.filter((item) => item.spotlightCourseId).map((item) => [item.spotlightCourseId, item.spotlightCourse])).entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [memberRows],
  );

  const filteredMembers = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    return memberRows.filter((user) => {
      if (memberRoleFilter !== "all" && user.role !== memberRoleFilter) return false;
      if (memberPresenceFilter !== "all" && user.presence.status !== memberPresenceFilter) return false;
      if (memberCourseFilter !== "all" && user.spotlightCourseId !== memberCourseFilter) return false;
      if (!keyword) return true;
      return [user.name, user.email, user.roleLabel, user.spotlightCourse, user.activeLessonTitle, user.activePath]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [memberCourseFilter, memberPresenceFilter, memberRoleFilter, memberRows, memberSearch]);

  const painPointCloudByUser = useMemo(() => {
    const nextMap = new Map();
    enrollmentsByUser.forEach((items, userId) => nextMap.set(userId, buildPainPointCloud(collectMissionPainPointSignals(items), 8)));
    return nextMap;
  }, [enrollmentsByUser]);

  useEffect(() => {
    setUserDrafts((previous) => {
      const nextDrafts = {};
      usersData.forEach((user) => {
        nextDrafts[user.id] = { ...buildUserDraft({ ...user, role: normalizeUserRole(user.role) }), ...(previous[user.id] || {}) };
      });
      return nextDrafts;
    });
  }, [usersData]);

  useEffect(() => {
    if (selectedUserId && usersData.some((user) => user.id === selectedUserId)) return;
    setSelectedUserId(usersData[0]?.id || "");
  }, [selectedUserId, usersData]);

  const selectedUser = useMemo(() => memberRows.find((user) => user.id === selectedUserId) || null, [memberRows, selectedUserId]);
  const selectedUserDraft = userDrafts[selectedUserId] || buildUserDraft(selectedUser || {});
  const selectedUserEnrollments = useMemo(() => enrollmentsByUser.get(selectedUserId) || [], [enrollmentsByUser, selectedUserId]);
  const selectedUserPainPointCloud = painPointCloudByUser.get(selectedUserId) || [];

  const updateUserDraft = (field, value) => {
    if (!selectedUserId) return;
    setUserDrafts((previous) => ({ ...previous, [selectedUserId]: { ...(previous[selectedUserId] || buildUserDraft(selectedUser || {})), [field]: value } }));
  };

  const saveSelectedUser = async () => {
    if (!selectedUser) return;
    const draft = userDrafts[selectedUser.id] || buildUserDraft(selectedUser);
    const fullName = [draft.prefix, draft.firstName, draft.lastName].filter(Boolean).join(" ").trim();
    setSavingUserId(selectedUser.id);
    try {
      await setDoc(doc(db, "users", selectedUser.id), {
        prefix: draft.prefix.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        name: fullName || selectedUser.name,
        position: draft.position.trim(),
        school: draft.school.trim(),
        role: normalizeUserRole(draft.role),
        updatedAt: serverTimestamp(),
        updatedBy: operatorName,
      }, { merge: true });
    } finally {
      setSavingUserId("");
    }
  };

  const resetSelectedUserLearning = async () => {
    if (!selectedUser) return;
    const draft = userDrafts[selectedUser.id] || buildUserDraft(selectedUser);
    const targetEnrollments = selectedUserEnrollments.filter((enrollment) => draft.resetTarget === "all" || (enrollment.courseId || enrollment.id) === draft.resetTarget);
    if (targetEnrollments.length === 0) return;
    setResettingUserId(selectedUser.id);
    try {
      const batch = writeBatch(db);
      const resetPayload = buildResetPayload(operatorName);
      targetEnrollments.forEach((enrollment) => batch.set(doc(db, enrollment.path), resetPayload, { merge: true }));
      await batch.commit();
    } finally {
      setResettingUserId("");
    }
  };

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.80]"><UserCog size={14} />Member Control</span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">Dedicated member workspace</h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">แยกงานจัดการสมาชิกออกจาก DU Console และดึงข้อมูล roster, progress, pain point จาก Firebase แบบสดขึ้น</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={refreshMembers} disabled={refreshingMembers} className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white disabled:cursor-not-allowed disabled:opacity-70">{refreshingMembers ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}Refresh members</button>
            <Link to="/du/admin" className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white">Back to DU Console<ArrowUpRight size={16} /></Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.88fr)_minmax(0,1.12fr)]">
        <section className="brand-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="brand-chip border-primary/10 bg-primary/5 text-primary"><Users size={14} />Live roster</p><h2 className="mt-3 font-display text-2xl font-bold text-ink">Realtime member list</h2></div>
            <span className="brand-chip border-slate-200 bg-white text-slate-500">{filteredMembers.length} members</span>
          </div>
          <div className="mt-5 space-y-3">
            <label className="relative block"><Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} /><input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search member, role, lesson, or path" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10" /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <select value={memberRoleFilter} onChange={(event) => setMemberRoleFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"><option value="all">All roles</option>{userRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <select value={memberPresenceFilter} onChange={(event) => setMemberPresenceFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"><option value="all">All presence</option><option value="online">Online</option><option value="away">Away</option><option value="offline">Offline</option></select>
              <select value={memberCourseFilter} onChange={(event) => setMemberCourseFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"><option value="all">All spotlight courses</option>{memberCourseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </div>
          </div>
          <div className="mt-5 max-h-[760px] space-y-3 overflow-y-auto pr-1">
            {loading ? <div className="flex min-h-[260px] items-center justify-center"><Loader2 className="animate-spin text-primary" size={28} /></div> : filteredMembers.map((user) => <button key={user.id} type="button" onClick={() => setSelectedUserId(user.id)} className={`w-full rounded-[24px] border p-4 text-left transition ${selectedUserId === user.id ? "border-primary/25 bg-primary/5" : "border-slate-100 bg-white hover:border-primary/20"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{user.name}</p><span className={`brand-chip ${user.presence.tone}`}>{user.presence.label}</span></div><p className="mt-1 text-sm text-slate-500">{user.roleLabel} | {user.email || "No email"}</p><p className="mt-2 text-sm text-slate-600">{user.spotlightCourse} | {user.activeLessonTitle || "No active lesson"}</p></div><div className="text-right"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p><p className="mt-2 text-2xl font-bold text-ink">{user.spotlightProgress}%</p><p className="mt-1 text-sm text-slate-500">{formatLastSeen(user.lastSeen)}</p></div></div></button>)}
          </div>
        </section>

        <section className="space-y-6">
          <article className="brand-panel p-6">
            <div className="flex items-center justify-between gap-3"><div><p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary"><UserCog size={14} />Selected member</p><h2 className="mt-3 font-display text-2xl font-bold text-ink">Profile and recovery tools</h2></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Wifi size={18} /></div></div>
            {!selectedUser ? <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm leading-7 text-slate-500">Select a member from the roster.</div> : <div className="mt-5 space-y-4"><div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-lg font-semibold text-ink">{selectedUser.name}</p><span className={`brand-chip ${selectedUser.presence.tone}`}>{selectedUser.presence.label}</span></div><p className="mt-1 text-sm text-slate-500">{selectedUser.email || "No email"}</p><p className="mt-2 text-sm text-slate-600">{selectedUser.spotlightCourse} | {selectedUser.activeModuleTitle || "No active module"}</p></div><div className="text-right"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current path</p><p className="mt-2 text-sm text-slate-600">{selectedUser.activePath || "-"}</p></div></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-ink"><span>Prefix</span><input value={selectedUserDraft.prefix} onChange={(event) => updateUserDraft("prefix", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10" /></label><label className="space-y-2 text-sm font-semibold text-ink"><span>Role</span><select value={selectedUserDraft.role} onChange={(event) => updateUserDraft("role", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10">{userRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="space-y-2 text-sm font-semibold text-ink"><span>First name</span><input value={selectedUserDraft.firstName} onChange={(event) => updateUserDraft("firstName", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10" /></label><label className="space-y-2 text-sm font-semibold text-ink"><span>Last name</span><input value={selectedUserDraft.lastName} onChange={(event) => updateUserDraft("lastName", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10" /></label><label className="space-y-2 text-sm font-semibold text-ink"><span>Position</span><input value={selectedUserDraft.position} onChange={(event) => updateUserDraft("position", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10" /></label><label className="space-y-2 text-sm font-semibold text-ink"><span>School</span><input value={selectedUserDraft.school} onChange={(event) => updateUserDraft("school", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10" /></label></div><label className="space-y-2 text-sm font-semibold text-ink"><span>Reset target</span><select value={selectedUserDraft.resetTarget} onChange={(event) => updateUserDraft("resetTarget", event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"><option value="all">All enrollments</option>{selectedUserEnrollments.map((enrollment) => <option key={enrollment.path} value={enrollment.courseId || enrollment.id}>{enrollment.courseTitle}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={saveSelectedUser} disabled={savingUserId === selectedUser.id} className="brand-button-primary w-full disabled:cursor-not-allowed disabled:opacity-70">{savingUserId === selectedUser.id ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}Save profile</button><button type="button" onClick={resetSelectedUserLearning} disabled={resettingUserId === selectedUser.id} className="brand-button-secondary w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50">{resettingUserId === selectedUser.id ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}Reset learning</button></div></div>}
          </article>

          <article className="brand-panel p-6">
            <p className="brand-chip border-accent/10 bg-accent/5 text-accent"><BookOpen size={14} />Live Firebase progress</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">Current enrollment state</h2>
            <div className="mt-5 grid gap-3 xl:grid-cols-2">{selectedUserEnrollments.map((enrollment) => <div key={enrollment.path} className="rounded-[24px] border border-slate-100 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-ink">{enrollment.courseTitle}</p><p className="mt-1 text-sm text-slate-500">{enrollment.activeModuleTitle || "Waiting module"} | {enrollment.activeLessonTitle || "No active lesson"}</p></div><div className="text-right"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p><p className="mt-1 text-xl font-bold text-ink">{enrollment.progressPercent}%</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent" style={{ width: `${enrollment.progressPercent}%` }} /></div><p className="mt-3 text-sm text-slate-500">Last saved: {formatDateTime(enrollment.lastSavedAt || enrollment.lastAccess)}</p></div>)}</div>
          </article>

          <article className="brand-panel p-6">
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary"><BookOpen size={14} />Pain point focus</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">Module 1 Mission 1-2 answers</h2>
            <div className="mt-5 flex flex-wrap gap-2">{selectedUserPainPointCloud.map((item) => <span key={`${selectedUserId}-${item.text}`} className={`max-w-full break-words rounded-full border px-3 py-2 font-semibold ${item.weight >= 6 ? "border-primary/20 bg-primary/10 text-base text-primary" : "border-slate-200 bg-white text-sm text-slate-700"}`}>{item.text}</span>)}</div>
          </article>
        </section>
      </div>
    </div>
  );
}

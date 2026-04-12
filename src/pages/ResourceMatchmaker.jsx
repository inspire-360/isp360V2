import React, { memo, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Handshake,
  Loader2,
  SearchCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  formatExpertServiceModes,
  formatMarketplaceDateTime,
  getExpertCapacityMeta,
  getMatchRequestStatusMeta,
  getPreferredFormatMeta,
  matchRequestStatusOptions,
  preferredFormatOptions,
} from "../data/resourceMatchmaking";
import {
  buildExpertDirectoryExperts,
  buildExpertDirectorySections,
  buildExpertSeedSummary,
} from "../data/expertSeedCatalog";
import { useResourceMarketplace } from "../hooks/useResourceMarketplace";
import { isAdminRole, isTeacherRole } from "../utils/userRoles";

const initialRequestForm = {
  requestTitle: "",
  desiredExpertise: "",
  preferredFormat: "online",
  requestDetails: "",
};

const expertSeedSummary = buildExpertSeedSummary();

const MatchRequestListItem = memo(function MatchRequestListItem({
  request,
  isActive,
  onSelect,
}) {
  const statusMeta = getMatchRequestStatusMeta(request.status);
  const formatMeta = getPreferredFormatMeta(request.preferredFormat);

  return (
    <button
      type="button"
      onClick={() => onSelect(request.id)}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        isActive
          ? "border-primary/25 bg-primary/5 shadow-[0_18px_40px_rgba(13,17,100,0.10)]"
          : "border-slate-200 bg-white hover:border-secondary/20 hover:bg-secondary/5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {formatMeta.label}
        </span>
      </div>
      <p className="mt-3 font-semibold text-ink">{request.requestTitle}</p>
      <p className="mt-2 text-sm text-slate-500">{request.requesterName || "ครูผู้ส่งคำร้อง"}</p>
      <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">
        {request.latestUpdateText || request.requestDetails || "ยังไม่มีความคืบหน้าล่าสุด"}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{request.desiredExpertise || "ยังไม่ได้ระบุความเชี่ยวชาญที่ต้องการ"}</span>
        <span>{formatMarketplaceDateTime(request.updatedAt || request.createdAt)}</span>
      </div>
    </button>
  );
});

const ExpertDirectoryCard = memo(function ExpertDirectoryCard({ expert, isSelected, onSelect }) {
  const capacityMeta = getExpertCapacityMeta(expert.capacityStatus);

  return (
    <button
      type="button"
      onClick={() => onSelect(expert.id)}
      className={`w-full rounded-[26px] border p-5 text-left transition ${
        isSelected
          ? "border-primary/25 bg-primary/5 shadow-[0_18px_40px_rgba(13,17,100,0.10)]"
          : "border-slate-200 bg-white hover:border-secondary/20 hover:bg-secondary/5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-ink">{expert.displayName || "ผู้เชี่ยวชาญ"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {(expert.title || "ยังไม่ได้ระบุตำแหน่ง") +
              " | " +
              (expert.organization || "ยังไม่ได้ระบุหน่วยงาน")}
          </p>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${capacityMeta.tone}`}>
          {capacityMeta.label}
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink">
        ความเชี่ยวชาญหลัก: {expert.primaryExpertise || "ยังไม่ได้ระบุ"}
      </p>
      {Array.isArray(expert.expertiseTags) && expert.expertiseTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {expert.expertiseTags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {expert.bio || "ยังไม่มีคำอธิบายเพิ่มเติมของผู้เชี่ยวชาญคนนี้"}
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>พื้นที่ดูแล: {expert.region || "ไม่จำกัดพื้นที่"}</span>
        <span>
          รูปแบบงาน: {Array.isArray(expert.serviceModes) && expert.serviceModes.length > 0 ? formatExpertServiceModes(expert.serviceModes).join(" | ") : "ยังไม่ได้ระบุ"}
        </span>
      </div>
    </button>
  );
});

const ExpertRosterRow = memo(function ExpertRosterRow({
  entry,
  isSelected,
  onSelect,
}) {
  const expert = entry.resolvedExpert;
  const capacityMeta = getExpertCapacityMeta(expert.capacityStatus);

  return (
    <button
      type="button"
      onClick={() => onSelect(expert.id)}
      className={`group w-full rounded-[24px] border px-4 py-4 text-left transition ${
        isSelected
          ? "border-primary/30 bg-primary/[0.06] shadow-[0_18px_45px_rgba(13,17,100,0.10)]"
          : "border-slate-200 bg-white hover:border-secondary/20 hover:bg-secondary/[0.04]"
      }`}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)] xl:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-ink">{expert.displayName}</p>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                entry.isSynced
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {entry.isSynced ? "เชื่อมฐานข้อมูลแล้ว" : "ใช้จากรายชื่อมาตรฐาน"}
            </span>
          </div>
          <p className="text-sm leading-7 text-slate-600">
            {expert.bio || "พร้อมสนับสนุนครูตามสาขาความเชี่ยวชาญที่ระบุ"}
          </p>
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <p className="font-semibold text-ink">{expert.primaryExpertise || entry.displayName}</p>
          <p>{expert.organization || "เครือข่ายผู้เชี่ยวชาญ DU"}</p>
          <p>พื้นที่ดูแล: {expert.region || "สนับสนุนได้ทั่วทั้งเครือข่าย"}</p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${capacityMeta.tone}`}>
              {capacityMeta.label}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {entry.specialty}
            </span>
          </div>
          <p className="text-xs leading-6 text-slate-500 xl:text-right">
            รูปแบบงาน: {formatExpertServiceModes(expert.serviceModes).join(" / ")}
          </p>
        </div>
      </div>
    </button>
  );
});

const DirectoryCategoryButton = memo(function DirectoryCategoryButton({
  label,
  count,
  isActive,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
        isActive
          ? "border-white/20 bg-white/12 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
          : "border-white/10 bg-white/5 text-white/72 hover:border-white/16 hover:bg-white/10"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={`inline-flex min-w-[38px] justify-center rounded-full px-2 py-1 text-xs font-semibold ${
          isActive ? "bg-white/16 text-white" : "bg-white/10 text-white/70"
        }`}
      >
        {count}
      </span>
    </button>
  );
});

const SelectedExpertPanel = memo(function SelectedExpertPanel({
  expert,
  entry,
}) {
  if (!expert) {
    return (
      <div className="rounded-[30px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm leading-7 text-slate-500">
        ยังไม่ได้เลือกผู้เชี่ยวชาญสำหรับคำร้องนี้
      </div>
    );
  }

  const capacityMeta = getExpertCapacityMeta(expert.capacityStatus);

  return (
    <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-100 bg-slate-950 px-5 py-5 text-white">
        <p className="text-xs tracking-[0.16em] text-white/56">ผู้เชี่ยวชาญที่กำลังเลือก</p>
        <h3 className="mt-3 text-2xl font-semibold">{expert.displayName}</h3>
        <p className="mt-2 text-sm leading-7 text-white/70">
          {expert.primaryExpertise || "ยังไม่ได้ระบุความเชี่ยวชาญหลัก"}
        </p>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${capacityMeta.tone}`}>
            {capacityMeta.label}
          </span>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {entry?.specialty || expert.title || "ยังไม่ได้ระบุสาขา"}
          </span>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              entry?.isSynced
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {entry?.isSynced ? "เชื่อมฐานข้อมูลแล้ว" : "ใช้จากรายชื่อมาตรฐาน"}
          </span>
        </div>

        <div className="grid gap-4">
          <div>
            <p className="text-xs tracking-[0.12em] text-slate-400">หมวดหลัก</p>
            <p className="mt-1 text-sm font-medium text-ink">{entry?.category || "ยังไม่ได้ระบุ"}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-slate-400">หน่วยงาน</p>
            <p className="mt-1 text-sm font-medium text-ink">{expert.organization || "เครือข่ายผู้เชี่ยวชาญ DU"}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-slate-400">พื้นที่ดูแล</p>
            <p className="mt-1 text-sm font-medium text-ink">{expert.region || "สนับสนุนได้ทั่วทั้งเครือข่าย"}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.12em] text-slate-400">รูปแบบงาน</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {formatExpertServiceModes(expert.serviceModes).join(" / ")}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs tracking-[0.12em] text-slate-400">ภาพรวมผู้เชี่ยวชาญ</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {expert.bio || "พร้อมสนับสนุนครูตามสาขาความเชี่ยวชาญที่ระบุ"}
          </p>
        </div>
      </div>
    </article>
  );
});

export default function ResourceMatchmaker() {
  const { currentUser, userProfile, userRole } = useAuth();
  const adminView = isAdminRole(userRole);
  const teacherView = isTeacherRole(userRole);
  const canUseMarketplace = adminView || teacherView;

  const [requestForm, setRequestForm] = useState(initialRequestForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignForm, setAssignForm] = useState({
    requestId: "",
    expertId: "",
    adminNote: "",
  });
  const [requestFormError, setRequestFormError] = useState("");
  const [assignFormError, setAssignFormError] = useState("");
  const [seedFeedback, setSeedFeedback] = useState("");
  const [seedError, setSeedError] = useState("");
  const [directoryKeyword, setDirectoryKeyword] = useState("");
  const [directoryCategory, setDirectoryCategory] = useState("all");

  const {
    requests,
    experts,
    activeRequest,
    activeRequestId,
    setActiveRequestId,
    loadingRequests,
    loadingExperts,
    creatingRequest,
    assigningExpert,
    completingRequest,
    seedingExperts,
    expertsError,
    createRequest,
    assignExpertToRequest,
    completeRequest,
    seedExpertsDirectory,
  } = useResourceMarketplace({
    currentUser,
    userProfile,
    userRole,
    isAdminView: adminView,
  });

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const requestSummary = useMemo(
    () =>
      requests.reduce(
        (accumulator, request) => {
          accumulator.total += 1;
          if (request.status === "pending_match") accumulator.pending += 1;
          if (request.status === "matched") accumulator.matched += 1;
          if (request.status === "completed") accumulator.completed += 1;
          return accumulator;
        },
        { total: 0, pending: 0, matched: 0, completed: 0 },
      ),
    [requests],
  );

  const expertDirectorySections = useMemo(
    () => buildExpertDirectorySections(experts),
    [experts],
  );
  const directoryExperts = useMemo(
    () => buildExpertDirectoryExperts(experts),
    [experts],
  );
  const directorySummary = useMemo(
    () =>
      directoryExperts.reduce(
        (accumulator, expert) => {
          accumulator.total += 1;
          if (expert.isActive !== false) accumulator.available += 1;
          if (expert.capacityStatus === "limited") accumulator.limited += 1;
          if (expert.syncState === "synced") accumulator.synced += 1;
          return accumulator;
        },
        { total: 0, available: 0, limited: 0, synced: 0 },
      ),
    [directoryExperts],
  );
  const directoryCategoryOptions = useMemo(
    () =>
      expertDirectorySections.map((section) => ({
        value: section.category,
        label: section.category,
        count: section.groups.reduce((sum, group) => sum + group.experts.length, 0),
      })),
    [expertDirectorySections],
  );
  const expertSelectGroups = useMemo(
    () =>
      expertDirectorySections
        .map((section) => ({
          category: section.category,
          groups: section.groups
            .map((group) => ({
              specialty: group.specialty,
              options: group.experts
                .map((item) => item.resolvedExpert)
                .filter((expert) => expert && expert.isActive !== false),
            }))
            .filter((group) => group.options.length > 0),
        }))
        .filter((section) => section.groups.length > 0),
    [expertDirectorySections],
  );
  const filteredExpertDirectorySections = useMemo(() => {
    const keyword = directoryKeyword.trim().toLowerCase();

    return expertDirectorySections
      .filter((section) => directoryCategory === "all" || section.category === directoryCategory)
      .map((section) => ({
        ...section,
        groups: section.groups
          .map((group) => ({
            ...group,
            experts: group.experts.filter((entry) => {
              if (!keyword) return true;

              const expert = entry.resolvedExpert;
              const haystack = [
                section.category,
                group.specialty,
                entry.displayName,
                expert?.displayName,
                expert?.primaryExpertise,
                expert?.organization,
                Array.isArray(expert?.expertiseTags) ? expert.expertiseTags.join(" ") : "",
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return haystack.includes(keyword);
            }),
          }))
          .filter((group) => group.experts.length > 0 || (!keyword && group.description)),
      }))
      .filter((section) => section.groups.length > 0);
  }, [directoryCategory, directoryKeyword, expertDirectorySections]);
  const hasDirectoryMatches = filteredExpertDirectorySections.length > 0;
  const directoryEntries = useMemo(
    () =>
      expertDirectorySections.flatMap((section) =>
        section.groups.flatMap((group) =>
          group.experts.map((entry) => ({
            ...entry,
            category: section.category,
            categoryDescription: section.description,
            specialty: group.specialty,
            specialtyDescription: group.description,
          })),
        ),
      ),
    [expertDirectorySections],
  );
  const filteredDirectorySummary = useMemo(
    () =>
      filteredExpertDirectorySections.reduce(
        (accumulator, section) => {
          accumulator.categories += 1;
          section.groups.forEach((group) => {
            accumulator.groups += 1;
            accumulator.experts += group.experts.length;
          });
          return accumulator;
        },
        { categories: 0, groups: 0, experts: 0 },
      ),
    [filteredExpertDirectorySections],
  );

  const currentAssignForm =
    assignForm.requestId === (activeRequest?.id || "")
      ? assignForm
      : {
          requestId: activeRequest?.id || "",
          expertId: activeRequest?.matchedExpertId || "",
          adminNote: activeRequest?.adminNote || "",
        };
  const selectedDirectoryEntry = useMemo(
    () =>
      directoryEntries.find((entry) => entry.resolvedExpert?.id === currentAssignForm.expertId) || null,
    [currentAssignForm.expertId, directoryEntries],
  );

  const selectedExpert = useMemo(
    () => directoryExperts.find((expert) => expert.id === currentAssignForm.expertId) || null,
    [directoryExperts, currentAssignForm.expertId],
  );

  const handleCreateRequest = async (event) => {
    event.preventDefault();

    if (!teacherView) return;

    if (!requestForm.requestTitle.trim() || !requestForm.desiredExpertise.trim() || !requestForm.requestDetails.trim()) {
      setRequestFormError("กรุณากรอกหัวข้อ ความเชี่ยวชาญที่ต้องการ และรายละเอียดคำร้องให้ครบ");
      return;
    }

    try {
      await createRequest(requestForm);
      setRequestForm(initialRequestForm);
      setRequestFormError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างสร้างคำร้องจับคู่ผู้เชี่ยวชาญ", error);
      setRequestFormError("ไม่สามารถส่งคำร้องได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleAssignExpert = async () => {
    if (!activeRequest?.id) {
      setAssignFormError("กรุณาเลือกคำร้องที่ต้องการจับคู่ก่อน");
      return;
    }

    if (!currentAssignForm.expertId) {
      setAssignFormError("กรุณาเลือกผู้เชี่ยวชาญก่อนบันทึกการจับคู่");
      return;
    }

    const expert = directoryExperts.find((item) => item.id === currentAssignForm.expertId);
    if (!expert) {
      setAssignFormError("ไม่พบข้อมูลผู้เชี่ยวชาญที่เลือก");
      return;
    }

    try {
      await assignExpertToRequest({
        request: activeRequest,
        expert,
        adminNote: currentAssignForm.adminNote,
      });
      setAssignFormError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างจับคู่ผู้เชี่ยวชาญ", error);
      setAssignFormError("ไม่สามารถบันทึกการจับคู่ได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleCompleteRequest = async () => {
    if (!activeRequest?.id) {
      setAssignFormError("กรุณาเลือกคำร้องที่ต้องการปิดงานก่อน");
      return;
    }

    if (!activeRequest.matchedExpertId) {
      setAssignFormError("กรุณาจับคู่ผู้เชี่ยวชาญก่อนจึงจะปิดงานได้");
      return;
    }

    try {
      await completeRequest({
        request: activeRequest,
        adminNote: currentAssignForm.adminNote,
      });
      setAssignFormError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างปิดงานคำร้อง", error);
      setAssignFormError("ไม่สามารถปิดงานคำร้องได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleSeedExperts = async () => {
    try {
      const result = await seedExpertsDirectory();
      const placeholderText =
        result.placeholderCategories.length > 0
          ? ` หมวดที่เตรียมโครงไว้แล้ว: ${result.placeholderCategories.join(" / ")}`
          : "";

      setSeedFeedback(
        `นำเข้าฐานผู้เชี่ยวชาญสำเร็จ ${result.totalCount} รายการ สร้างใหม่ ${result.createdCount} รายการ และอัปเดต ${result.updatedCount} รายการ.${placeholderText}`,
      );
      setSeedError("");
    } catch (error) {
      console.error("ไม่สามารถนำเข้าฐานผู้เชี่ยวชาญได้", error);
      setSeedFeedback("");
      setSeedError(error?.message || "ไม่สามารถนำเข้าฐานผู้เชี่ยวชาญได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.82]">
              {adminView ? <ShieldCheck size={14} /> : <Handshake size={14} />}
              ระบบจับคู่ผู้เชี่ยวชาญและทรัพยากร
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                เชื่อมคำร้องของครูกับผู้เชี่ยวชาญที่ตรงโจทย์อย่างเป็นระบบ
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.74] md:text-base">
                ครูสามารถส่งคำร้องความช่วยเหลือพร้อมบริบทของปัญหา ส่วนทีม DU เห็นคิวงานแบบเรียลไทม์
                และเลือกผู้เชี่ยวชาญจากฐานข้อมูลเพื่อจับคู่และติดตามงานจนเสร็จสิ้น
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">คำร้องทั้งหมด</p>
              <p className="mt-2 text-3xl font-bold">{requestSummary.total}</p>
            </div>
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">รอจับคู่</p>
              <p className="mt-2 text-3xl font-bold">{requestSummary.pending}</p>
            </div>
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">จับคู่สำเร็จ</p>
              <p className="mt-2 text-3xl font-bold">{requestSummary.matched}</p>
            </div>
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">
                {adminView ? "ผู้เชี่ยวชาญที่พร้อมรับงาน" : "เสร็จสิ้นแล้ว"}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {adminView ? directorySummary.available : requestSummary.completed}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!canUseMarketplace ? (
        <section className="brand-panel p-8 text-center">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
            <Users size={28} className="text-slate-300" />
            <h2 className="font-display text-2xl font-bold text-ink">พื้นที่นี้เปิดให้ครูและทีม DU เท่านั้น</h2>
            <p className="text-sm leading-7 text-slate-600">
              บทบาทปัจจุบันยังไม่สามารถใช้งานระบบจับคู่ผู้เชี่ยวชาญได้ หากต้องการสิทธิ์เพิ่มกรุณาติดต่อผู้ดูแล DU
            </p>
          </div>
        </section>
      ) : null}

      {teacherView ? (
        <section className="brand-panel p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <Sparkles size={14} />
                ส่งคำร้องใหม่
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">ระบุโจทย์ที่ต้องการผู้เชี่ยวชาญช่วยสนับสนุน</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                อธิบายบริบทของห้องเรียน ปัญหาที่พบ และประเภทผู้เชี่ยวชาญที่ต้องการให้ชัดเจน
                เพื่อให้ทีม DU จับคู่ได้เร็วและตรงความต้องการมากที่สุด
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleCreateRequest}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>หัวข้อคำร้อง</span>
                <input
                  value={requestForm.requestTitle}
                  onChange={(event) =>
                    setRequestForm((previous) => ({ ...previous, requestTitle: event.target.value }))
                  }
                  placeholder="ตัวอย่าง: อยากได้ผู้เชี่ยวชาญด้านปัญญาประดิษฐ์ช่วยออกแบบกิจกรรมการเรียนรู้เชิงรุก"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                />
              </label>
              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>ความเชี่ยวชาญที่ต้องการ</span>
                <input
                  value={requestForm.desiredExpertise}
                  onChange={(event) =>
                    setRequestForm((previous) => ({ ...previous, desiredExpertise: event.target.value }))
                  }
                  placeholder="ตัวอย่าง: AI เพื่อการสอน, จิตวิทยาเด็ก, การประเมินสมรรถนะ"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-semibold text-ink">
              <span>รูปแบบการช่วยเหลือที่ต้องการ</span>
              <select
                value={requestForm.preferredFormat}
                onChange={(event) =>
                  setRequestForm((previous) => ({ ...previous, preferredFormat: event.target.value }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              >
                {preferredFormatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-ink">
              <span>รายละเอียดคำร้อง</span>
              <textarea
                rows={5}
                value={requestForm.requestDetails}
                onChange={(event) =>
                  setRequestForm((previous) => ({ ...previous, requestDetails: event.target.value }))
                }
                placeholder="เล่าปัญหาที่พบในห้องเรียน เป้าหมายที่อยากแก้ และเงื่อนไขที่ผู้เชี่ยวชาญควรรู้ก่อนเริ่มช่วยเหลือ"
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            {requestFormError ? <p className="text-sm font-medium text-rose-600">{requestFormError}</p> : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingRequest}
                className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creatingRequest ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                ส่งคำร้องถึงทีม DU
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {canUseMarketplace ? (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="brand-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
                  <SearchCheck size={14} />
                  {adminView ? "คิวรอจับคู่" : "คำร้องของฉัน"}
                </p>
                <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                  {adminView ? "ติดตามคำร้องทั้งหมด" : "ติดตามสถานะคำร้องแบบเรียลไทม์"}
                </h2>
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10"
              >
                <option value="all">ทุกสถานะ</option>
                {matchRequestStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 max-h-[820px] space-y-3 overflow-y-auto pr-1">
              {loadingRequests ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm leading-7 text-slate-500">
                  ยังไม่มีคำร้องในมุมมองนี้
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <MatchRequestListItem
                    key={request.id}
                    request={request}
                    isActive={activeRequestId === request.id}
                    onSelect={setActiveRequestId}
                  />
                ))
              )}
            </div>
          </section>

          <section className="brand-panel p-6 md:p-8">
            {!activeRequest ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
                <Handshake size={30} className="text-slate-300" />
                <p className="text-xl font-semibold text-ink">เลือกคำร้องจากรายการด้านซ้าย</p>
                <p className="max-w-xl text-sm leading-7 text-slate-500">
                  เมื่อเลือกคำร้องแล้ว รายละเอียดคำร้อง สถานะล่าสุด และการจับคู่ผู้เชี่ยวชาญจะปรากฏที่นี่ทันที
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getMatchRequestStatusMeta(activeRequest.status).tone}`}
                      >
                        {getMatchRequestStatusMeta(activeRequest.status).label}
                      </span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        {getPreferredFormatMeta(activeRequest.preferredFormat).label}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-bold text-ink">{activeRequest.requestTitle}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {(activeRequest.requesterName || "ครูผู้ส่งคำร้อง") +
                        " | " +
                        (activeRequest.schoolName || "ยังไม่ได้ระบุโรงเรียน")}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                    <p>ส่งคำร้องเมื่อ {formatMarketplaceDateTime(activeRequest.createdAt)}</p>
                    <p className="mt-2">อัปเดตล่าสุด {formatMarketplaceDateTime(activeRequest.updatedAt)}</p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-ink">รายละเอียดคำร้อง</p>
                    <p className="mt-3 text-sm leading-8 text-slate-600">{activeRequest.requestDetails}</p>
                    <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                        ความเชี่ยวชาญที่ต้องการ: {activeRequest.desiredExpertise || "ยังไม่ได้ระบุ"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                        รูปแบบที่ต้องการ: {getPreferredFormatMeta(activeRequest.preferredFormat).label}
                      </span>
                    </div>
                    <div className="mt-5 rounded-[24px] border border-white bg-white px-4 py-4">
                      <p className="text-sm font-semibold text-ink">ความคืบหน้าล่าสุด</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {activeRequest.latestUpdateText || "ทีม DU ยังไม่ได้อัปเดตความคืบหน้าล่าสุด"}
                      </p>
                      {activeRequest.adminNote ? (
                        <>
                          <p className="mt-4 text-sm font-semibold text-ink">บันทึกจากทีม DU</p>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{activeRequest.adminNote}</p>
                        </>
                      ) : null}
                    </div>
                  </article>

                  <aside className="space-y-4">
                    <article className="rounded-[28px] border border-slate-200 bg-white p-5">
                      <p className="text-sm font-semibold text-ink">ผู้เชี่ยวชาญที่จับคู่แล้ว</p>
                      {activeRequest.matchedExpertId ? (
                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-lg font-semibold text-ink">{activeRequest.matchedExpertName}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {activeRequest.matchedExpertTitle || "ยังไม่ได้ระบุตำแหน่ง"}
                            </p>
                          </div>
                          <p className="text-sm text-slate-600">
                            ความเชี่ยวชาญหลัก: {activeRequest.matchedExpertPrimaryExpertise || "ยังไม่ได้ระบุ"}
                          </p>
                          <p className="text-sm text-slate-500">
                            จับคู่โดย {activeRequest.matchedByAdminName || "ทีม DU"} เมื่อ{" "}
                            {formatMarketplaceDateTime(activeRequest.matchedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm leading-7 text-slate-500">
                          คำร้องนี้ยังอยู่ในคิวรอจับคู่ผู้เชี่ยวชาญ
                        </p>
                      )}
                    </article>

                    {adminView ? (
                      <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <p className="text-sm font-semibold text-ink">จับคู่และติดตามงาน</p>
                        <div className="mt-4 space-y-4">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-600">เลือกผู้เชี่ยวชาญ</span>
                            <select
                              value={currentAssignForm.expertId}
                              onChange={(event) =>
                                setAssignForm((previous) => ({
                                  ...previous,
                                  requestId: activeRequest?.id || "",
                                  expertId: event.target.value,
                                }))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                            >
                              <option value="">กรุณาเลือกผู้เชี่ยวชาญ</option>
                              {expertSelectGroups.map((section) =>
                                section.groups.map((group) => (
                                  <optgroup
                                    key={`${section.category}-${group.specialty}`}
                                    label={`${group.specialty} • ${section.category}`}
                                  >
                                    {group.options.map((expert) => (
                                      <option key={`${group.specialty}-${expert.id}`} value={expert.id}>
                                        {(expert.displayName || "ผู้เชี่ยวชาญ") +
                                          " • " +
                                          group.specialty}
                                      </option>
                                    ))}
                                  </optgroup>
                                )),
                              )}
                            </select>
                          </label>

                          {expertSelectGroups.length === 0 ? (
                            <p className="rounded-[20px] border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-7 text-slate-500">
                              ยังไม่มีรายชื่อผู้เชี่ยวชาญที่พร้อมเลือกในดรอปดาวน์ กรุณานำเข้าฐานข้อมูลผู้เชี่ยวชาญก่อน
                            </p>
                          ) : null}

                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-600">บันทึกจากทีม DU</span>
                            <textarea
                              rows={4}
                              value={currentAssignForm.adminNote}
                              onChange={(event) =>
                                setAssignForm((previous) => ({
                                  ...previous,
                                  requestId: activeRequest?.id || "",
                                  adminNote: event.target.value,
                                }))
                              }
                              placeholder="สรุปเหตุผลที่เลือกผู้เชี่ยวชาญคนนี้ หรือบันทึกความคืบหน้าที่ครูควรเห็น"
                              className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                            />
                          </label>

                          {assignFormError ? <p className="text-sm font-medium text-rose-600">{assignFormError}</p> : null}

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={handleAssignExpert}
                              disabled={assigningExpert}
                              className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {assigningExpert ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
                              จับคู่และบันทึก
                            </button>
                            <button
                              type="button"
                              onClick={handleCompleteRequest}
                              disabled={completingRequest || activeRequest.status === "completed"}
                              className="brand-button-secondary border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {completingRequest ? <Loader2 size={16} className="animate-spin" /> : <BriefcaseBusiness size={16} />}
                              ปิดงานคำร้องนี้
                            </button>
                          </div>

                          {selectedExpert ? (
                            <div className="rounded-[24px] border border-white bg-white px-4 py-4">
                              <p className="text-sm font-semibold text-ink">ตัวอย่างผู้เชี่ยวชาญที่เลือก</p>
                              <p className="mt-3 text-base font-semibold text-ink">{selectedExpert.displayName}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {(selectedExpert.title || "ยังไม่ได้ระบุตำแหน่ง") +
                                  " | " +
                                  (selectedExpert.organization || "ยังไม่ได้ระบุหน่วยงาน")}
                              </p>
                              <p className="mt-3 text-sm leading-7 text-slate-600">
                                {selectedExpert.bio || "ยังไม่มีคำอธิบายเพิ่มเติมของผู้เชี่ยวชาญคนนี้"}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ) : null}
                  </aside>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {adminView ? (
        <section className="brand-panel overflow-hidden p-0">
          <div className="grid xl:grid-cols-[290px_minmax(0,1fr)]">
            <aside className="border-b border-white/10 bg-slate-950 px-6 py-6 text-white md:px-8 xl:border-b-0 xl:border-r">
              <div className="space-y-6 xl:sticky xl:top-6">
                <div className="space-y-4">
                  <span className="brand-chip border-white/12 bg-white/10 text-white/78">
                    <Users size={14} />
                    สารบบผู้เชี่ยวชาญ
                  </span>
                  <div className="space-y-3">
                    <h2 className="font-display text-3xl font-bold leading-tight">
                      ไดเรกทอรีผู้เชี่ยวชาญ
                    </h2>
                    <p className="text-sm leading-7 text-white/68">
                      เลือกหมวดก่อน แล้วค่อยไล่รายชื่อในพื้นที่ทำงานด้านขวา เพื่อจับคู่คำร้องได้เป็นระบบและเร็วขึ้น
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={handleSeedExperts}
                    disabled={seedingExperts}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {seedingExperts ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    นำเข้าฐานผู้เชี่ยวชาญเริ่มต้น
                  </button>
                  <p className="text-xs leading-6 text-white/52">
                    ชุดข้อมูลนี้เตรียมผู้เชี่ยวชาญ {expertSeedSummary.expertCount} รายการ และเว้นโครงหมวดที่รอเพิ่มข้อมูลอีก{" "}
                    {expertSeedSummary.placeholderCategories.length} หมวด
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-4">
                    <p className="text-xs tracking-[0.14em] text-white/45">รายชื่อในสารบบ</p>
                    <p className="mt-2 text-3xl font-bold">{directorySummary.total}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[22px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-4">
                      <p className="text-xs tracking-[0.14em] text-emerald-100/80">พร้อมจับคู่</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-100">{directorySummary.available}</p>
                    </div>
                    <div className="rounded-[22px] border border-sky-400/30 bg-sky-400/10 px-4 py-4">
                      <p className="text-xs tracking-[0.14em] text-sky-100/80">ซิงก์แล้ว</p>
                      <p className="mt-2 text-2xl font-bold text-sky-100">{directorySummary.synced}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs tracking-[0.16em] text-white/42">หมวดสำหรับนำทาง</p>
                  <div className="space-y-2">
                    <DirectoryCategoryButton
                      label="ทุกหมวด"
                      count={directorySummary.total}
                      isActive={directoryCategory === "all"}
                      onClick={() => setDirectoryCategory("all")}
                    />
                    {directoryCategoryOptions.map((option) => (
                      <DirectoryCategoryButton
                        key={option.value}
                        label={option.label}
                        count={option.count}
                        isActive={directoryCategory === option.value}
                        onClick={() => setDirectoryCategory(option.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <div className="px-6 py-6 md:px-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs tracking-[0.16em] text-slate-400">พื้นที่ทำงานหลัก</p>
                  <h3 className="mt-3 text-2xl font-semibold text-ink">
                    ค้นหา สำรวจ และเลือกผู้เชี่ยวชาญจากสารบบชุดเดียวกันกับดรอปดาวน์จับคู่
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    รายการนี้ยึดรายชื่อมาตรฐานของเครือข่ายเป็นฐานก่อนเสมอ จึงไม่ปล่อยให้หน้าโล่งแม้ระหว่างซิงก์ข้อมูลจริงจาก Firestore
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  <p>หมวดที่แสดงอยู่ {filteredDirectorySummary.categories} หมวด</p>
                  <p className="mt-1">สาขาย่อยที่กำลังเห็น {filteredDirectorySummary.groups} กลุ่ม</p>
                  <p className="mt-1">รายชื่อที่พบ {filteredDirectorySummary.experts} คน</p>
                </div>
              </div>

              {seedFeedback ? (
                <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-700">
                  {seedFeedback}
                </div>
              ) : null}

              {seedError ? (
                <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-700">
                  {seedError}
                </div>
              ) : null}

              {expertsError ? (
                <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-800">
                  {expertsError} ระบบยังคงแสดงรายชื่อจากชุดมาตรฐานให้เลือกจับคู่ได้ตามปกติ
                </div>
              ) : null}

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-5">
                  <div className="rounded-[28px] border border-slate-200 bg-slate-50/85 p-5">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                      <label className="space-y-2 text-sm font-semibold text-ink">
                        <span>ค้นหารายชื่อหรือสาขาความเชี่ยวชาญ</span>
                        <input
                          value={directoryKeyword}
                          onChange={(event) => setDirectoryKeyword(event.target.value)}
                          placeholder="พิมพ์ชื่อผู้เชี่ยวชาญ สาขา หรือหมวดงาน"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                        />
                      </label>

                      <div className="rounded-[22px] border border-white bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                        <p>ดรอปดาวน์จับคู่จะใช้รายชื่อชุดเดียวกับสารบบนี้</p>
                        <p className="mt-1">
                          {loadingExperts ? "กำลังเชื่อมข้อมูลจริงจากฐานข้อมูล" : "พร้อมเลือกผู้เชี่ยวชาญจากรายการนี้ได้ทันที"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {hasDirectoryMatches ? (
                    filteredExpertDirectorySections.map((section) => (
                      <article key={section.category} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
                        <div className="border-b border-slate-100 px-5 py-5">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-3xl">
                              <p className="text-lg font-semibold text-ink">{section.category}</p>
                              <p className="mt-2 text-sm leading-7 text-slate-600">{section.description}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                สาขาย่อย {section.groups.length} กลุ่ม
                              </span>
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
                                ซิงก์แล้ว {section.groups.reduce((sum, group) => sum + group.syncedCount, 0)} คน
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {section.groups.map((group, index) => (
                            <div
                              key={`${section.category}-${group.specialty}`}
                              className={`grid gap-5 px-5 py-5 xl:grid-cols-[280px_minmax(0,1fr)] ${
                                index === 0 ? "" : "border-t border-slate-100"
                              }`}
                            >
                              <div className="space-y-3">
                                <div>
                                  <p className="text-base font-semibold text-ink">{group.specialty}</p>
                                  <p className="mt-2 text-sm leading-7 text-slate-600">{group.description}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                                    รายชื่อ {group.experts.length} คน
                                  </span>
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                                    พร้อมเลือก {group.availableCount} คน
                                  </span>
                                </div>
                              </div>

                              {group.experts.length > 0 ? (
                                <div className="space-y-3">
                                  {group.experts.map((entry) => (
                                    <ExpertRosterRow
                                      key={`${group.specialty}-${entry.displayName}`}
                                      entry={entry}
                                      isSelected={currentAssignForm.expertId === entry.resolvedExpert?.id}
                                      onSelect={(expertId) =>
                                        setAssignForm((previous) => ({
                                          ...previous,
                                          requestId: activeRequest?.id || "",
                                          expertId,
                                        }))
                                      }
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500">
                                  กลุ่มนี้เตรียมโครงสร้างไว้แล้วและยังรอการเพิ่มรายชื่อผู้เชี่ยวชาญในอนาคต
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[30px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                      <p className="text-lg font-semibold text-ink">ยังไม่พบรายชื่อที่ตรงกับคำค้นนี้</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        ลองเปลี่ยนคำค้นหรือสลับหมวดจากแถบนำทางด้านซ้ายเพื่อดูรายชื่อกลุ่มอื่น
                      </p>
                    </div>
                  )}
                </div>

                <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                  <div className="rounded-[30px] border border-slate-200 bg-slate-50/80 p-5">
                    <p className="text-xs tracking-[0.16em] text-slate-400">สถานะการเลือก</p>
                    <h4 className="mt-3 text-xl font-semibold text-ink">ผู้เชี่ยวชาญที่กำลังจะถูกจับคู่</h4>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      คลิกจากรายชื่อหลักเพื่ออัปเดตแผงนี้ แล้วค่อยกลับไปกดบันทึกในกล่องจับคู่ด้านบน
                    </p>
                  </div>

                  <SelectedExpertPanel
                    expert={selectedExpert}
                    entry={selectedDirectoryEntry}
                  />
                </aside>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

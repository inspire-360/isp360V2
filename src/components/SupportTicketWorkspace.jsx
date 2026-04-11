import React, { memo, useMemo, useState } from "react";
import {
  LifeBuoy,
  Loader2,
  LockKeyhole,
  MapPinned,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  buildUrgencyBadgeStyle,
  formatSupportTicketDateTime,
  formatSupportTicketNumber,
  getSupportTicketMainCategoryMeta,
  getSupportTicketStatusMeta,
  getSupportTicketSubCategoryOptions,
  supportTicketMainCategoryOptions,
  supportTicketStatusOptions,
  supportTicketUrgencyOptions,
  shouldSuggestConfidentialMode,
} from "../data/supportTickets";
import { useSupportTickets } from "../hooks/useSupportTickets";
import { isTeacherRole } from "../utils/userRoles";

const defaultMainCategory = supportTicketMainCategoryOptions[0];

const initialTicketForm = {
  topic: "",
  mainCategory: defaultMainCategory.value,
  subCategory: defaultMainCategory.subCategories[0],
  urgencyLevel: "ฉุกเฉิน",
  location: "",
  details: "",
  contactInfo: "",
  isConfidential: false,
};

const resolveMessageRoleLabel = (message = {}) =>
  message.authorRole === "admin" ? "ผู้ดูแล DU" : "ครูผู้ส่งคำร้อง";

const TeacherTicketListItem = memo(function TeacherTicketListItem({
  ticket,
  isActive,
  onSelect,
}) {
  const statusMeta = getSupportTicketStatusMeta(ticket.status);
  const urgencyStyle = buildUrgencyBadgeStyle(ticket.urgencyLevel);

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        isActive
          ? "border-primary/25 bg-primary/5 shadow-[0_18px_40px_rgba(13,17,100,0.10)]"
          : "border-slate-200 bg-white hover:border-secondary/20 hover:bg-secondary/5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {formatSupportTicketNumber(ticket.id)}
        </span>
        <span
          className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
          style={urgencyStyle}
        >
          {ticket.urgencyLevel}
        </span>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
      </div>
      <p className="mt-3 font-semibold text-ink">{ticket.topic}</p>
      <p className="mt-2 text-sm text-slate-500">
        {ticket.mainCategory} | {ticket.subCategory}
      </p>
      <p className="mt-3 line-clamp-2 text-sm leading-7 text-slate-600">
        {ticket.lastMessagePreview || ticket.details || "ยังไม่มีรายละเอียดเพิ่มเติม"}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{ticket.assignedTo || "ยังไม่ได้ระบุผู้รับผิดชอบ"}</span>
        <span>{formatSupportTicketDateTime(ticket.updatedAt || ticket.createdAt)}</span>
      </div>
    </button>
  );
});

const AdminTicketTableRow = memo(function AdminTicketTableRow({
  ticket,
  isActive,
  onSelect,
}) {
  const statusMeta = getSupportTicketStatusMeta(ticket.status);
  const urgencyStyle = buildUrgencyBadgeStyle(ticket.urgencyLevel);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(ticket.id);
    }
  };

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => onSelect(ticket.id)}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer border-b border-slate-100 text-sm transition hover:bg-slate-50 ${
        isActive ? "bg-primary/5" : "bg-white"
      }`}
    >
      <td className="px-4 py-3 font-semibold text-ink">{formatSupportTicketNumber(ticket.id)}</td>
      <td className="px-4 py-3 text-slate-500">{formatSupportTicketDateTime(ticket.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="min-w-[240px]">
          <p className="font-semibold text-ink">{ticket.topic}</p>
          <p className="mt-1 text-xs text-slate-400">
            {ticket.isConfidential ? "ข้อมูลไม่ระบุชื่อ" : ticket.requesterDisplayName || "ครูผู้ส่งคำร้อง"}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600">{ticket.mainCategory}</td>
      <td className="px-4 py-3 text-slate-600">{ticket.subCategory}</td>
      <td className="px-4 py-3">
        <span
          className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
          style={urgencyStyle}
        >
          {ticket.urgencyLevel}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{ticket.location || "ยังไม่ระบุ"}</td>
      <td className="px-4 py-3 text-slate-600">{ticket.assignedTo || "ยังไม่ระบุ"}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
          {statusMeta.label}
        </span>
      </td>
    </tr>
  );
});

export default function SupportTicketWorkspace({ isAdminView = false }) {
  const { currentUser, userProfile, userRole } = useAuth();
  const teacherView = isTeacherRole(userRole);
  const canCreateTicket = !isAdminView && teacherView;
  const [ticketForm, setTicketForm] = useState({
    ...initialTicketForm,
    location: userProfile?.school || "",
    contactInfo: currentUser?.email || "",
  });
  const [replyDraft, setReplyDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [urgencyFilter, setUrgencyFilter] = useState("ทั้งหมด");
  const [formError, setFormError] = useState("");
  const [replyError, setReplyError] = useState("");
  const [adminDraft, setAdminDraft] = useState({
    ticketId: "",
    status: supportTicketStatusOptions[0].value,
    assignedTo: "",
    note: "",
  });

  const {
    tickets,
    activeTicketId,
    setActiveTicketId,
    activeTicket,
    messages,
    loadingTickets,
    loadingMessages,
    creatingTicket,
    sendingMessage,
    updatingTicket,
    createTicket,
    sendMessage,
    updateTicketAdminMeta,
  } = useSupportTickets({
    currentUser,
    userProfile,
    userRole,
    isAdminView,
  });

  const subCategoryOptions = useMemo(
    () => getSupportTicketSubCategoryOptions(ticketForm.mainCategory),
    [ticketForm.mainCategory],
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const statusMatched = statusFilter === "ทั้งหมด" || ticket.status === statusFilter;
        const urgencyMatched = urgencyFilter === "ทั้งหมด" || ticket.urgencyLevel === urgencyFilter;
        return statusMatched && urgencyMatched;
      }),
    [statusFilter, tickets, urgencyFilter],
  );

  const summary = useMemo(
    () =>
      tickets.reduce(
        (result, ticket) => {
          result.total += 1;
          if (ticket.status === "รอดำเนินการ") result.pending += 1;
          if (ticket.status === "กำลังช่วยเหลือ") result.inProgress += 1;
          if (ticket.status === "ปิดงาน") result.closed += 1;
          return result;
        },
        {
          total: 0,
          pending: 0,
          inProgress: 0,
          closed: 0,
        },
      ),
    [tickets],
  );

  const currentAdminDraft =
    adminDraft.ticketId === (activeTicket?.id || "")
      ? adminDraft
      : {
          ticketId: activeTicket?.id || "",
          status: activeTicket?.status || supportTicketStatusOptions[0].value,
          assignedTo: activeTicket?.assignedTo || "",
          note: "",
        };

  const suggestedConfidentialMode = shouldSuggestConfidentialMode({
    mainCategory: ticketForm.mainCategory,
    subCategory: ticketForm.subCategory,
  });

  const handleMainCategoryChange = (nextMainCategory) => {
    const nextSubCategories = getSupportTicketSubCategoryOptions(nextMainCategory);
    const nextSubCategory = nextSubCategories[0] || "";
    const nextConfidential = shouldSuggestConfidentialMode({
      mainCategory: nextMainCategory,
      subCategory: nextSubCategory,
    });

    setTicketForm((previous) => ({
      ...previous,
      mainCategory: nextMainCategory,
      subCategory: nextSubCategory,
      isConfidential: nextConfidential ? true : previous.isConfidential,
    }));
  };

  const handleSubCategoryChange = (nextSubCategory) => {
    const nextConfidential = shouldSuggestConfidentialMode({
      mainCategory: ticketForm.mainCategory,
      subCategory: nextSubCategory,
    });

    setTicketForm((previous) => ({
      ...previous,
      subCategory: nextSubCategory,
      isConfidential: nextConfidential ? true : previous.isConfidential,
    }));
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    if (
      !ticketForm.topic.trim() ||
      !ticketForm.location.trim() ||
      !ticketForm.details.trim() ||
      !ticketForm.contactInfo.trim()
    ) {
      setFormError("กรุณากรอกหัวข้อ สถานที่ รายละเอียด และช่องทางติดต่อให้ครบ");
      return;
    }

    try {
      await createTicket(ticketForm);
      setTicketForm({
        ...initialTicketForm,
        location: userProfile?.school || "",
        contactInfo: currentUser?.email || "",
      });
      setFormError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างสร้างคำร้อง SOS", error);
      setFormError(error?.userMessage || "ไม่สามารถส่งคำร้องได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleSendReply = async (event) => {
    event.preventDefault();

    if (!activeTicket?.id || !replyDraft.trim()) {
      setReplyError("กรุณาเลือกคำร้องและพิมพ์ข้อความก่อนส่ง");
      return;
    }

    try {
      await sendMessage({
        ticket: activeTicket,
        body: replyDraft,
      });
      setReplyDraft("");
      setReplyError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างส่งข้อความตอบกลับ", error);
      setReplyError(error?.userMessage || "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleSaveAdminMeta = async () => {
    if (!activeTicket?.id) {
      setReplyError("กรุณาเลือกคำร้องจากตารางก่อน");
      return;
    }

    try {
      await updateTicketAdminMeta({
        ticket: activeTicket,
        nextStatus: currentAdminDraft.status,
        assignedTo: currentAdminDraft.assignedTo,
        note: currentAdminDraft.note,
      });
      setAdminDraft({
        ticketId: activeTicket.id,
        status: currentAdminDraft.status,
        assignedTo: currentAdminDraft.assignedTo,
        note: "",
      });
      setReplyError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างบันทึกการคัดกรอง", error);
      setReplyError(error?.userMessage || "ไม่สามารถบันทึกสถานะหรือผู้รับผิดชอบได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const detailCategoryMeta = getSupportTicketMainCategoryMeta(activeTicket?.mainCategory);

  return (
    <section className="space-y-6">
      {!isAdminView ? (
        <article className="brand-panel p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <LifeBuoy size={14} />
                แบบฟอร์มส่งคำร้องถึง DU
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">เล่าเรื่องให้ครบตั้งแต่ครั้งแรก เพื่อให้ DU เข้าช่วยได้ตรงจุด</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                แบบฟอร์มนี้รองรับการคัดกรองปัญหาแบบละเอียด พร้อมตัวเลือกข้อมูลความลับสำหรับเคสสุขภาพจิตหรือความขัดแย้งที่ต้องการความระมัดระวังเป็นพิเศษ
              </p>
            </div>
          </div>

          {canCreateTicket ? (
            <form className="mt-6 space-y-5" onSubmit={handleCreateTicket}>
              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>หัวข้อสรุป</span>
                <input
                  value={ticketForm.topic}
                  onChange={(event) =>
                    setTicketForm((previous) => ({ ...previous, topic: event.target.value }))
                  }
                  placeholder="สรุปประเด็นหลักที่ต้องการให้ DU รับรู้"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                />
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>หมวดหมู่หลัก</span>
                  <select
                    value={ticketForm.mainCategory}
                    onChange={(event) => handleMainCategoryChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  >
                    {supportTicketMainCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs font-normal leading-6 text-slate-500">
                    {getSupportTicketMainCategoryMeta(ticketForm.mainCategory).helper}
                  </p>
                </label>

                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>ปัญหาย่อย</span>
                  <select
                    value={ticketForm.subCategory}
                    onChange={(event) => handleSubCategoryChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  >
                    {subCategoryOptions.map((subCategory) => (
                      <option key={subCategory} value={subCategory}>
                        {subCategory}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>ระดับความเร่งด่วน</span>
                  <select
                    value={ticketForm.urgencyLevel}
                    onChange={(event) =>
                      setTicketForm((previous) => ({ ...previous, urgencyLevel: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  >
                    {supportTicketUrgencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs font-normal leading-6 text-slate-500">
                    {
                      supportTicketUrgencyOptions.find(
                        (option) => option.value === ticketForm.urgencyLevel,
                      )?.helper
                    }
                  </p>
                </label>

                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>สถานที่ / หน่วยงาน</span>
                  <input
                    value={ticketForm.location}
                    onChange={(event) =>
                      setTicketForm((previous) => ({ ...previous, location: event.target.value }))
                    }
                    placeholder="เช่น โรงเรียน ห้องเรียน กลุ่มสาระ หรือหน่วยงานที่เกี่ยวข้อง"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>รายละเอียด</span>
                <textarea
                  rows={6}
                  value={ticketForm.details}
                  onChange={(event) =>
                    setTicketForm((previous) => ({ ...previous, details: event.target.value }))
                  }
                  placeholder="เล่าเหตุการณ์ ผลกระทบ สิ่งที่ลองทำไปแล้ว และสิ่งที่อยากให้ DU ช่วย"
                  className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                />
              </label>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>ช่องทางติดต่อที่สะดวก</span>
                  <input
                    value={ticketForm.contactInfo}
                    onChange={(event) =>
                      setTicketForm((previous) => ({ ...previous, contactInfo: event.target.value }))
                    }
                    placeholder="เช่น อีเมล เบอร์โทร หรือไลน์ที่สะดวก"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <label className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={ticketForm.isConfidential}
                    onChange={(event) =>
                      setTicketForm((previous) => ({
                        ...previous,
                        isConfidential: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <span className="space-y-1 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <LockKeyhole size={16} />
                      ส่งข้อมูลแบบไม่ระบุชื่อ / ข้อมูลความลับ
                    </span>
                    <span className="block leading-7 text-slate-600">
                      ใช้สำหรับกรณีสุขภาพจิต ความขัดแย้ง หรือเคสที่ต้องการลดการเปิดเผยตัวตนบนหน้ารายการ
                    </span>
                  </span>
                </label>
              </div>

              {suggestedConfidentialMode ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800">
                  หมวดหมู่นี้มีความละเอียดอ่อน ระบบจึงแนะนำให้เปิดโหมดข้อมูลความลับเพื่อปกป้องตัวตนของผู้ส่ง
                </div>
              ) : null}

              {formError ? (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creatingTicket ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  ส่งคำร้องถึง DU
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
              บัญชีนี้ยังไม่มีสิทธิ์สร้างคำร้องถึง DU ระบบจะเปิดแบบฟอร์มนี้ให้เฉพาะผู้ใช้บทบาทครูเท่านั้น หากควรมีสิทธิ์ใช้งาน กรุณาตรวจสอบบทบาทผู้ใช้ในโปรไฟล์และกฎ Firestore อีกครั้ง
            </div>
          )}
        </article>
      ) : null}

      <article className="brand-panel p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              {isAdminView ? <ShieldCheck size={14} /> : <Sparkles size={14} />}
              {isAdminView ? "แดชบอร์ดรับเรื่อง SOS สำหรับ DU" : "คำร้อง SOS ของฉัน"}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              {isAdminView ? "ดูคิวคำร้องแบบเรียลไทม์และคัดกรองจากตารางเดียว" : "ติดตามสถานะคำร้องและคุยกับ DU ได้ต่อเนื่อง"}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs tracking-[0.08em] text-slate-400">คำร้องทั้งหมด</p>
              <p className="mt-2 text-2xl font-bold text-ink">{summary.total}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs tracking-[0.08em] text-slate-400">รอดำเนินการ</p>
              <p className="mt-2 text-2xl font-bold text-ink">{summary.pending}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs tracking-[0.08em] text-slate-400">กำลังช่วยเหลือ / ปิดงาน</p>
              <p className="mt-2 text-2xl font-bold text-ink">
                {summary.inProgress} / {summary.closed}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10"
              >
                <option value="ทั้งหมด">ทุกสถานะ</option>
                {supportTicketStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={urgencyFilter}
                onChange={(event) => setUrgencyFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10"
              >
                <option value="ทั้งหมด">ทุกระดับความเร่งด่วน</option>
                {supportTicketUrgencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-slate-500">แสดงผล {filteredTickets.length} รายการ</span>
            </div>

            {loadingTickets ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-100 bg-slate-50/70">
                <Loader2 size={22} className="animate-spin text-primary" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm leading-7 text-slate-500">
                ยังไม่มีคำร้องที่ตรงกับตัวกรองนี้
              </div>
            ) : isAdminView ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="min-w-[1120px] w-full border-collapse">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">เลขที่</th>
                        <th className="px-4 py-3 font-semibold">เวลารับเรื่อง</th>
                        <th className="px-4 py-3 font-semibold">หัวข้อสรุป</th>
                        <th className="px-4 py-3 font-semibold">หมวดหมู่หลัก</th>
                        <th className="px-4 py-3 font-semibold">ปัญหาย่อย</th>
                        <th className="px-4 py-3 font-semibold">ความเร่งด่วน</th>
                        <th className="px-4 py-3 font-semibold">สถานที่ / หน่วยงาน</th>
                        <th className="px-4 py-3 font-semibold">ผู้รับผิดชอบ</th>
                        <th className="px-4 py-3 font-semibold">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <AdminTicketTableRow
                          key={ticket.id}
                          ticket={ticket}
                          isActive={activeTicketId === ticket.id}
                          onSelect={setActiveTicketId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <TeacherTicketListItem
                    key={ticket.id}
                    ticket={ticket}
                    isActive={activeTicketId === ticket.id}
                    onSelect={setActiveTicketId}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {!activeTicket ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-6 text-center text-slate-500">
                <MessageSquareText size={28} className="text-slate-300" />
                <p>เลือกคำร้องจากรายการเพื่ออ่านรายละเอียดและตอบกลับ</p>
              </div>
            ) : (
              <>
                <article className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {formatSupportTicketNumber(activeTicket.id)}
                        </span>
                        <span
                          className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
                          style={buildUrgencyBadgeStyle(activeTicket.urgencyLevel)}
                        >
                          {activeTicket.urgencyLevel}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSupportTicketStatusMeta(activeTicket.status).tone}`}
                        >
                          {activeTicket.status}
                        </span>
                        {activeTicket.isConfidential ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                            <LockKeyhole size={12} />
                            ข้อมูลความลับ
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-ink">{activeTicket.topic}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {activeTicket.mainCategory} | {activeTicket.subCategory}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm leading-7 text-slate-600">
                    <p>
                      <span className="font-semibold text-ink">ผู้ส่งคำร้อง:</span>{" "}
                      {activeTicket.isConfidential
                        ? "ผู้ส่งแบบไม่ระบุชื่อ"
                        : activeTicket.requesterDisplayName || "ครูผู้ส่งคำร้อง"}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">สถานที่ / หน่วยงาน:</span>{" "}
                      {activeTicket.location || "ยังไม่ระบุ"}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">คำอธิบายหมวด:</span>{" "}
                      {detailCategoryMeta.helper}
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPinned size={16} className="mt-1 text-slate-400" />
                      <span>{activeTicket.details || "ยังไม่มีรายละเอียด"}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-ink">ช่องทางติดต่อที่สะดวก:</span>{" "}
                      {activeTicket.contactInfo || "ยังไม่ระบุ"}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">สร้างเมื่อ:</span>{" "}
                      {formatSupportTicketDateTime(activeTicket.createdAt)}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">ผู้รับผิดชอบ:</span>{" "}
                      {activeTicket.assignedTo || "ยังไม่ระบุ"}
                    </p>
                  </div>
                </article>

                {isAdminView ? (
                  <article className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold text-ink">คัดกรองและอัปเดตการรับเรื่อง</p>
                    <div className="mt-4 space-y-4">
                      <label className="space-y-2 text-sm font-semibold text-ink">
                        <span>สถานะ</span>
                        <select
                          value={currentAdminDraft.status}
                          onChange={(event) =>
                            setAdminDraft((previous) => ({
                              ...previous,
                              ticketId: activeTicket.id,
                              status: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10"
                        >
                          {supportTicketStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-semibold text-ink">
                        <span>มอบหมายให้</span>
                        <input
                          value={currentAdminDraft.assignedTo}
                          onChange={(event) =>
                            setAdminDraft((previous) => ({
                              ...previous,
                              ticketId: activeTicket.id,
                              assignedTo: event.target.value,
                            }))
                          }
                          placeholder="ระบุชื่อบุคคล ทีม หรือหน่วยงานที่รับผิดชอบ"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10"
                        />
                      </label>

                      <label className="space-y-2 text-sm font-semibold text-ink">
                        <span>บันทึกจาก DU</span>
                        <textarea
                          rows={3}
                          value={currentAdminDraft.note}
                          onChange={(event) =>
                            setAdminDraft((previous) => ({
                              ...previous,
                              ticketId: activeTicket.id,
                              note: event.target.value,
                            }))
                          }
                          placeholder="บันทึกแนวทางช่วยเหลือหรือข้อมูลคัดกรองเพิ่มเติม"
                          className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSaveAdminMeta}
                        disabled={updatingTicket}
                        className="brand-button-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {updatingTicket ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                        บันทึกการคัดกรอง
                      </button>
                    </div>
                  </article>
                ) : null}

                <article className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <p className="text-sm font-semibold text-ink">ลำดับการสื่อสาร</p>
                  <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {loadingMessages ? (
                      <div className="flex min-h-[180px] items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        ยังไม่มีข้อความในคำร้องนี้
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isAdminMessage = message.authorRole === "admin";
                        const isOwnMessage = message.authorId === currentUser?.uid;

                        return (
                          <div
                            key={message.id}
                            className={`rounded-[22px] border px-4 py-3 ${
                              isAdminMessage
                                ? "border-primary/10 bg-primary/5"
                                : isOwnMessage
                                  ? "border-secondary/10 bg-secondary/5"
                                  : "border-slate-100 bg-slate-50"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold text-ink">{message.authorName || "ผู้ส่งข้อความ"}</p>
                                <p className="mt-1 text-xs tracking-[0.08em] text-slate-400">
                                  {resolveMessageRoleLabel(message)}
                                </p>
                              </div>
                              <span className="text-xs text-slate-400">
                                {formatSupportTicketDateTime(message.createdAt)}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                              {message.body}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>

                <form className="rounded-[28px] border border-slate-200 bg-white p-5" onSubmit={handleSendReply}>
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>{isAdminView ? "ตอบกลับหรือสอบถามเพิ่มเติม" : "ส่งข้อมูลเพิ่มเติมถึง DU"}</span>
                    <textarea
                      rows={4}
                      value={replyDraft}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      placeholder={
                        isAdminView
                          ? "พิมพ์แนวทางช่วยเหลือ คำถามเพิ่มเติม หรือข้อสื่อสารที่ต้องการส่งกลับ"
                          : "พิมพ์ข้อมูลเพิ่มเติม ความคืบหน้า หรือคำตอบที่ทีม DU ขอเพิ่ม"
                      }
                      className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>

                  {replyError ? (
                    <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {replyError}
                    </div>
                  ) : null}

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingMessage}
                      className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {sendingMessage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      ส่งข้อความ
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

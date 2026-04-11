import React, { useMemo, useState } from "react";
import {
  LifeBuoy,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  formatSupportTicketDateTime,
  formatSupportTicketNumber,
  getSupportTicketCategoryMeta,
  getSupportTicketPriorityMeta,
  getSupportTicketStatusMeta,
  supportTicketCategoryOptions,
  supportTicketPriorityOptions,
  supportTicketPriorityTone,
  supportTicketStatusOptions,
  supportTicketStatusTone,
} from "../data/supportTickets";
import { useSupportTickets } from "../hooks/useSupportTickets";
import { getRoleLabel } from "../utils/userRoles";

const initialTicketForm = {
  subject: "",
  category: "learning",
  priority: "medium",
  body: "",
};

const resolveMessageAuthor = (message = {}) => {
  if (message.authorRole === "admin") return "ผู้ดูแล DU";
  return getRoleLabel(message.authorRole);
};

export default function SupportTicketWorkspace({ isAdminView = false }) {
  const { currentUser, userProfile, userRole } = useAuth();
  const [ticketForm, setTicketForm] = useState(initialTicketForm);
  const [replyDraft, setReplyDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    updatingStatus,
    createTicket,
    sendMessage,
    updateTicketStatus,
  } = useSupportTickets({
    currentUser,
    userProfile,
    userRole,
    isAdminView,
  });

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((ticket) => ticket.status === statusFilter);
  }, [statusFilter, tickets]);

  const ticketSummary = useMemo(
    () =>
      tickets.reduce(
        (accumulator, ticket) => {
          accumulator.total += 1;
          if (ticket.status === "pending") accumulator.pending += 1;
          if (ticket.status === "investigating") accumulator.investigating += 1;
          if (ticket.status === "resolved") accumulator.resolved += 1;
          return accumulator;
        },
        {
          total: 0,
          pending: 0,
          investigating: 0,
          resolved: 0,
        },
      ),
    [tickets],
  );

  const handleCreateTicket = async (event) => {
    event.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.body.trim()) return;

    await createTicket(ticketForm);
    setTicketForm(initialTicketForm);
  };

  const handleSendReply = async (event) => {
    event.preventDefault();
    if (!activeTicket || !replyDraft.trim()) return;

    await sendMessage({
      ticket: activeTicket,
      body: replyDraft,
    });
    setReplyDraft("");
  };

  return (
    <section className="space-y-6">
      {!isAdminView ? (
        <article className="brand-panel p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <LifeBuoy size={14} />
                เปิดทิกเก็ตใหม่
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold text-ink">
                ส่งเรื่องขอความช่วยเหลือถึง DU
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                อธิบายปัญหาให้ครบในครั้งแรก แล้วติดตามการตอบกลับผ่านห้องสนทนาเดียวกันแบบเรียลไทม์
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleCreateTicket}>
            <label className="space-y-2 text-sm font-semibold text-ink">
              <span>หัวข้อ</span>
              <input
                value={ticketForm.subject}
                onChange={(event) =>
                  setTicketForm((previous) => ({ ...previous, subject: event.target.value }))
                }
                placeholder="สรุปปัญหาสั้น ๆ ให้ทีม DU มองเห็นได้ทันที"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>หมวดหมู่</span>
                <select
                  value={ticketForm.category}
                  onChange={(event) =>
                    setTicketForm((previous) => ({ ...previous, category: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                >
                  {supportTicketCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold text-ink">
                <span>ระดับความเร่งด่วน</span>
                <select
                  value={ticketForm.priority}
                  onChange={(event) =>
                    setTicketForm((previous) => ({ ...previous, priority: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                >
                  {supportTicketPriorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-semibold text-ink">
              <span>รายละเอียด</span>
              <textarea
                rows={5}
                value={ticketForm.body}
                onChange={(event) =>
                  setTicketForm((previous) => ({ ...previous, body: event.target.value }))
                }
                placeholder="เล่าปัญหา สิ่งที่เจอ ผลกระทบ และสิ่งที่อยากให้ทีม DU ช่วย"
                className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creatingTicket}
                className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creatingTicket ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                ส่งทิกเก็ต
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="brand-panel p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              {isAdminView ? <ShieldCheck size={14} /> : <Sparkles size={14} />}
              {isAdminView ? "ศูนย์ทิกเก็ตสำหรับผู้ดูแล" : "ทิกเก็ตของฉัน"}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              {isAdminView ? "ติดตามและตอบกลับทิกเก็ตทั้งหมด" : "ติดตามสถานะและตอบกลับแบบเรียลไทม์"}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs tracking-[0.08em] text-slate-400">ทั้งหมด</p>
              <p className="mt-2 text-2xl font-bold text-ink">{ticketSummary.total}</p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs tracking-[0.08em] text-amber-700">รอดำเนินการ</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">{ticketSummary.pending}</p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs tracking-[0.08em] text-emerald-700">แก้ไขแล้ว</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">{ticketSummary.resolved}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">รายการทิกเก็ต</p>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10"
              >
                <option value="all">ทุกสถานะ</option>
                {supportTicketStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {loadingTickets ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-slate-100 bg-slate-50/70">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm leading-7 text-slate-500">
                  ยังไม่มีทิกเก็ตในมุมมองนี้
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const statusMeta = getSupportTicketStatusMeta(ticket.status);
                  const priorityMeta = getSupportTicketPriorityMeta(ticket.priority);
                  const categoryMeta = getSupportTicketCategoryMeta(ticket.category);

                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => setActiveTicketId(ticket.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        activeTicketId === ticket.id
                          ? "border-primary/20 bg-primary/5"
                          : "border-slate-100 bg-white hover:border-primary/15"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                          {formatSupportTicketNumber(ticket.id)}
                        </span>
                        <span className={`brand-chip ${supportTicketStatusTone[statusMeta.value]}`}>
                          {statusMeta.label}
                        </span>
                        <span className={`brand-chip ${supportTicketPriorityTone[priorityMeta.value]}`}>
                          {priorityMeta.label}
                        </span>
                      </div>
                      <p className="mt-3 font-semibold text-ink">{ticket.subject}</p>
                      <p className="mt-2 text-sm text-slate-500">{categoryMeta.label}</p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {ticket.lastMessagePreview || "ยังไม่มีข้อความ"}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>{ticket.requesterName || "ผู้ใช้งาน"}</span>
                        <span>{formatSupportTicketDateTime(ticket.updatedAt || ticket.createdAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-slate-50/60 p-4 md:p-5">
            {!activeTicket ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center text-slate-500">
                <MessageSquareText size={28} className="text-slate-300" />
                <p>เลือกทิกเก็ตจากรายการด้านซ้ายเพื่ออ่านและตอบกลับ</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                          {formatSupportTicketNumber(activeTicket.id)}
                        </span>
                        <span
                          className={`brand-chip ${supportTicketStatusTone[activeTicket.status]}`}
                        >
                          {getSupportTicketStatusMeta(activeTicket.status).label}
                        </span>
                        <span
                          className={`brand-chip ${supportTicketPriorityTone[activeTicket.priority]}`}
                        >
                          {getSupportTicketPriorityMeta(activeTicket.priority).label}
                        </span>
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-ink">{activeTicket.subject}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {getSupportTicketCategoryMeta(activeTicket.category).label} |{" "}
                        {activeTicket.requesterName || "ผู้ใช้งาน"} |{" "}
                        {formatSupportTicketDateTime(activeTicket.createdAt)}
                      </p>
                    </div>

                    {isAdminView ? (
                      <div className="min-w-[220px]">
                        <label className="space-y-2 text-sm font-semibold text-ink">
                          <span>อัปเดตสถานะ</span>
                          <select
                            value={activeTicket.status}
                            onChange={(event) =>
                              updateTicketStatus({
                                ticket: activeTicket,
                                nextStatus: event.target.value,
                              })
                            }
                            disabled={updatingStatus}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-secondary/30 focus:ring-4 focus:ring-secondary/10 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {supportTicketStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-[24px] border border-slate-100 bg-white p-4">
                  {loadingMessages ? (
                    <div className="flex min-h-[180px] items-center justify-center">
                      <Loader2 size={22} className="animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                      ยังไม่มีข้อความในทิกเก็ตนี้
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = message.authorId === currentUser?.uid;
                      const isAdminMessage = message.authorRole === "admin";

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
                              <p className="font-semibold text-ink">{message.authorName || "ผู้ใช้งาน"}</p>
                              <p className="mt-1 text-xs tracking-[0.08em] text-slate-400">
                                {resolveMessageAuthor(message)}
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

                <form
                  className="rounded-[24px] border border-slate-100 bg-white p-4"
                  onSubmit={handleSendReply}
                >
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>{isAdminView ? "ตอบกลับผู้ใช้งาน" : "ส่งข้อมูลเพิ่มเติมถึง DU"}</span>
                    <textarea
                      rows={4}
                      value={replyDraft}
                      onChange={(event) => setReplyDraft(event.target.value)}
                      placeholder={
                        isAdminView
                          ? "พิมพ์แนวทางช่วยเหลือ คำถามเพิ่มเติม หรือคำตอบให้ผู้ใช้งาน"
                          : "พิมพ์รายละเอียดเพิ่มเติม ผลลัพธ์ล่าสุด หรือข้อมูลที่อยากให้ทีม DU รับทราบ"
                      }
                      className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
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
              </div>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Handshake, Lightbulb, Loader2, PlayCircle, ShieldCheck, Users } from "lucide-react";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import LearningProgressDashboard from "../components/LearningProgressDashboard";
import OnlineUsers from "../components/OnlineUsers";
import SupportTicketWorkspace from "../components/SupportTicketWorkspace";
import { db } from "../lib/firebase";
import { buildEnrollmentInsight, resolveDisplayName } from "../utils/duMemberInsights";
import { downloadCsvFile } from "../utils/csvExport";

const serializeExportValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeExportValue(item)).filter(Boolean).join(" | ");
  }
  if (typeof value.toDate === "function") {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value.toDate());
  }
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${serializeExportValue(item)}`)
      .filter(Boolean)
      .join(" | ");
  }
  return String(value);
};

const buildMissionResponseRows = ({ enrollments, userNameById }) =>
  enrollments.flatMap((enrollment) => {
    const missionResponses = enrollment.missionResponses || {};

    return Object.entries(missionResponses).flatMap(([missionId, response]) => {
      if (!response || typeof response !== "object") return [];

      return Object.entries(response)
        .filter(([, value]) => value != null && value !== "")
        .map(([field, value]) => ({
          userId: enrollment.userId || "",
          learnerName: userNameById.get(enrollment.userId) || "",
          courseId: enrollment.courseId || enrollment.id || "",
          courseTitle: enrollment.courseTitle || "",
          missionId,
          field,
          answer: serializeExportValue(value),
          enrollmentStatus: enrollment.status || "",
          lastSavedAt: serializeExportValue(enrollment.lastSavedAt || enrollment.updatedAt || enrollment.lastAccess),
        }));
    });
  });

export default function AdminConsole() {
  const [exporting, setExporting] = useState(false);

  const handleExportAnswers = async () => {
    setExporting(true);

    try {
      const [usersSnapshot, enrollmentsSnapshot] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collectionGroup(db, "enrollments")),
      ]);

      const userNameById = new Map(
        usersSnapshot.docs.map((item) => [
          item.id,
          resolveDisplayName({
            id: item.id,
            ...item.data(),
          }),
        ]),
      );

      const enrollments = enrollmentsSnapshot.docs.map((item) =>
        buildEnrollmentInsight({
          id: item.id,
          userId: item.ref.parent.parent?.id,
          path: item.ref.path,
          ...item.data(),
        }),
      );

      const rows = buildMissionResponseRows({
        enrollments,
        userNameById,
      });

      if (rows.length === 0) {
        window.alert("ยังไม่มีคำตอบของผู้ใช้งานสำหรับการส่งออก");
        return;
      }

      downloadCsvFile({
        fileName: `คำตอบผู้ใช้งาน-${new Date().toISOString().slice(0, 10)}.csv`,
        columns: [
          { key: "userId", label: "รหัสผู้ใช้" },
          { key: "learnerName", label: "ชื่อผู้ตอบ" },
          { key: "courseId", label: "รหัสหลักสูตร" },
          { key: "courseTitle", label: "ชื่อหลักสูตร" },
          { key: "missionId", label: "รหัสภารกิจ" },
          { key: "field", label: "ฟิลด์คำถาม" },
          { key: "answer", label: "คำตอบ" },
          { key: "enrollmentStatus", label: "สถานะการเรียน" },
          { key: "lastSavedAt", label: "บันทึกล่าสุด" },
        ],
        rows,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.80]">
              <ShieldCheck size={14} />
              คอนโซลผู้ดูแล DU
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                ติดตามความคืบหน้าและดูแลทิกเก็ตจากจอเดียว
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.72] md:text-base">
                หน้านี้รวมแดชบอร์ดการเรียนแบบเรียลไทม์ การส่งออกคำตอบเป็น CSV และศูนย์ทิกเก็ตที่เชื่อมต่อกับผู้ใช้โดยตรง
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/du/matchmaker"
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              เปิดศูนย์จับคู่ผู้เชี่ยวชาญ
              <Handshake size={16} />
            </Link>
            <Link
              to="/du/video-coach"
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              เปิดห้องโค้ชวิดีโอ
              <PlayCircle size={16} />
            </Link>
            <Link
              to="/du/innovations"
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              เปิดกระดานนวัตกรรม
              <Lightbulb size={16} />
            </Link>
            <button
              type="button"
              onClick={handleExportAnswers}
              disabled={exporting}
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              ส่งออกคำตอบเป็น CSV
            </button>
            <Link
              to="/du/members"
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              พื้นที่ดูแลสมาชิก
              <Users size={16} />
            </Link>
            <Link
              to="/du/sos"
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white"
            >
              เปิดศูนย์ทิกเก็ต
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <LearningProgressDashboard />
        <div className="space-y-6">
          <OnlineUsers />
          <article className="brand-panel p-6">
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <ShieldCheck size={14} />
              โครงสร้างข้อมูลที่ใช้
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>
                ฟีเจอร์ความคืบหน้าใช้ข้อมูลจาก{" "}
                <code>users/&lt;รหัสผู้ใช้&gt;/enrollments/&lt;รหัสหลักสูตร&gt;</code>
              </p>
              <p>
                ฟีเจอร์ทิกเก็ตใช้ <code>supportTickets/&lt;ticketId&gt;</code> และ{" "}
                <code>messages</code> ใต้ทิกเก็ตแต่ละใบ
              </p>
              <p>ทุก listener ทำงานแบบเรียลไทม์ และฝั่งแอดมินจะเห็นการอัปเดตทันทีโดยไม่ต้องรีเฟรชหน้า</p>
            </div>
          </article>
        </div>
      </div>

      <SupportTicketWorkspace isAdminView />
    </div>
  );
}

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Handshake, Lightbulb, Loader2, PlayCircle, RefreshCcw, ShieldCheck, Users } from "lucide-react";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import LearningProgressDashboard from "../components/LearningProgressDashboard";
import OnlineUsers from "../components/OnlineUsers";
import SupportTicketWorkspace from "../components/SupportTicketWorkspace";
import { db } from "../lib/firebase";
import { getMissionResponseEnrollmentKey } from "../services/firebase/mappers/missionResponseMapper";
import { listMissionResponseCollectionGroup } from "../services/firebase/repositories/missionResponseRepository";
import { buildEnrollmentInsight, resolveDisplayName } from "../utils/duMemberInsights";
import { downloadCsvFile } from "../utils/csvExport";
import { ซ่อมโปรไฟล์ครูเก่า } from "../utils/repairTeacherProfiles";

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

const ADMIN_EXPORT_EXCLUDED_FIELDS = new Set([
  "id",
  "path",
  "userId",
  "courseId",
  "enrollmentId",
  "enrollmentPath",
  "missionId",
  "lessonId",
  "updatedAtMs",
  "submittedAtMs",
]);

const buildMissionResponseRecordKey = (response = {}) =>
  [
    String(response.userId || "").trim(),
    String(response.courseId || response.enrollmentId || "").trim(),
    String(response.missionId || response.id || "").trim(),
  ].join("::");

const buildLegacyMissionResponseRows = (enrollmentMetaByKey) =>
  [...enrollmentMetaByKey.values()].flatMap((enrollment) => {
    const missionResponses = enrollment.missionResponses || {};

    return Object.entries(missionResponses).map(([missionId, response]) => ({
      ...(response && typeof response === "object" ? response : {}),
      id: missionId,
      missionId,
      userId: enrollment.userId || "",
      courseId: enrollment.courseId || enrollment.id || "",
      enrollmentId: enrollment.courseId || enrollment.id || "",
    }));
  });

const buildMissionResponseRows = ({
  missionResponses,
  userNameById,
  enrollmentMetaByKey,
}) =>
  missionResponses.flatMap((response) => {
    if (!response || typeof response !== "object") return [];

    const enrollmentMeta =
      enrollmentMetaByKey.get(
        getMissionResponseEnrollmentKey({
          userId: response.userId,
          courseId: response.courseId || response.enrollmentId,
        }),
      ) || {};

    return Object.entries(response)
      .filter(
        ([field, value]) =>
          !ADMIN_EXPORT_EXCLUDED_FIELDS.has(field) &&
          value != null &&
          value !== "",
      )
      .map(([field, value]) => ({
        userId: response.userId || "",
        learnerName: userNameById.get(response.userId) || "",
        courseId: response.courseId || response.enrollmentId || "",
        courseTitle: enrollmentMeta.courseTitle || "",
        missionId: response.missionId || response.id || "",
        field,
        answer: serializeExportValue(value),
        enrollmentStatus: enrollmentMeta.status || "",
        lastSavedAt: serializeExportValue(
          enrollmentMeta.lastSavedAt || enrollmentMeta.updatedAt || enrollmentMeta.lastAccess,
        ),
      }));
  });

export default function AdminConsole() {
  const [exporting, setExporting] = useState(false);
  const [repairingProfiles, setRepairingProfiles] = useState(false);

  const handleExportAnswers = async () => {
    setExporting(true);

    try {
      const [usersSnapshot, enrollmentsSnapshot, missionResponses] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collectionGroup(db, "enrollments")),
        listMissionResponseCollectionGroup(),
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

      const enrollmentMetaByKey = new Map(
        enrollmentsSnapshot.docs.map((item) => {
          const enrollment = buildEnrollmentInsight({
            id: item.id,
            userId: item.ref.parent.parent?.id,
            path: item.ref.path,
            ...item.data(),
          });

          return [
            getMissionResponseEnrollmentKey({
              userId: enrollment.userId,
              courseId: enrollment.courseId || enrollment.id,
            }),
            enrollment,
          ];
        }),
      );

      const missionResponseByKey = new Map(
        buildLegacyMissionResponseRows(enrollmentMetaByKey).map((response) => [
          buildMissionResponseRecordKey(response),
          response,
        ]),
      );

      missionResponses.forEach((response) => {
        missionResponseByKey.set(buildMissionResponseRecordKey(response), response);
      });

      const rows = buildMissionResponseRows({
        missionResponses: [...missionResponseByKey.values()],
        userNameById,
        enrollmentMetaByKey,
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

  const handleRepairTeacherProfiles = async () => {
    const shouldContinue = window.confirm(
      "ยืนยันการซ่อมข้อมูลผู้ใช้งานเก่าที่ขาดบทบาทครูหรือเส้นทางเริ่มต้นหรือไม่",
    );

    if (!shouldContinue) return;

    setRepairingProfiles(true);

    try {
      const summary = await ซ่อมโปรไฟล์ครูเก่า(db);
      window.alert(
        summary.repairedCount > 0
          ? `ซ่อมข้อมูลผู้ใช้สำเร็จ ${summary.repairedCount} รายการ จากที่ตรวจสอบทั้งหมด ${summary.scannedCount} รายการ`
          : `ตรวจสอบข้อมูลผู้ใช้ทั้งหมด ${summary.scannedCount} รายการแล้ว ไม่พบข้อมูลที่ต้องซ่อมเพิ่ม`,
      );
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างซ่อมข้อมูลผู้ใช้เก่า", error);
      window.alert("เกิดข้อผิดพลาดระหว่างซ่อมข้อมูลผู้ใช้เก่า กรุณาลองใหม่อีกครั้ง");
    } finally {
      setRepairingProfiles(false);
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
            <button
              type="button"
              onClick={handleRepairTeacherProfiles}
              disabled={repairingProfiles}
              className="brand-button-secondary border-white/[0.20] bg-white/[0.10] text-white hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {repairingProfiles ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCcw size={16} />
              )}
              ซ่อมข้อมูลผู้ใช้เก่า
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
                ฟีเจอร์ทิกเก็ตใช้ <code>sos_tickets/&lt;ticketId&gt;</code> และ{" "}
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

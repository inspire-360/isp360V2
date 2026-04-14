import React, { Suspense, lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  DatabaseZap,
  Download,
  Handshake,
  LifeBuoy,
  Lightbulb,
  Loader2,
  PlayCircle,
  RadioTower,
  RefreshCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { useAdminMonitoringSummary } from "../hooks/useAdminMonitoringSummary";
import { db } from "../lib/firebase";
import { ADMIN_AGGREGATE_DOC_IDS } from "../services/firebase/mappers/adminAggregateMapper";
import { getMissionResponseEnrollmentKey } from "../services/firebase/mappers/missionResponseMapper";
import { listMissionResponseCollectionGroup } from "../services/firebase/repositories/missionResponseRepository";
import { buildEnrollmentInsight, resolveDisplayName } from "../utils/duMemberInsights";
import { downloadCsvFile } from "../utils/csvExport";
import { ซ่อมโปรไฟล์ครูเก่า } from "../utils/repairTeacherProfiles";

const LearningProgressDashboard = lazy(() => import("../components/LearningProgressDashboard"));
const OnlineUsers = lazy(() => import("../components/OnlineUsers"));
const SupportTicketWorkspace = lazy(() => import("../components/SupportTicketWorkspace"));

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

const getAggregateCount = (aggregateMap, docId, key) =>
  Number(aggregateMap?.[docId]?.counts?.[key] || 0);

const initialWorkspaceState = {
  learning: false,
  presence: true,
  support: false,
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

const aggregateLabels = {
  overview: "สมาชิกและการเข้าใช้งาน",
  learning: "ความคืบหน้าการเรียน",
  support: "ศูนย์ SOS",
  reviews: "วิดีโอการสอน",
  innovations: "กระดานนวัตกรรม",
  matching: "การจับคู่ผู้เชี่ยวชาญ",
};

function AdminSummaryCard({ title, value, helper }) {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-7 text-slate-500">{helper}</p>
    </article>
  );
}

function MonitoringRouteCard({ title, metric, description, path }) {
  return (
    <Link
      to={path}
      className="group rounded-[26px] border border-slate-200 bg-white p-5 transition hover:border-primary/15 hover:bg-primary/[0.03]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="mt-3 text-2xl font-bold text-ink">{metric}</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition group-hover:border-primary/15 group-hover:text-primary">
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}

function WorkspacePanelLoader({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin text-primary" />
      <span>{label}</span>
    </div>
  );
}

function AdminWorkspaceSection({
  title,
  subtitle,
  summary,
  helper,
  icon,
  isOpen,
  onToggle,
  children,
}) {
  const Icon = icon;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full flex-col gap-5 px-6 py-5 text-left transition hover:bg-slate-50/80 md:px-7"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary">
                <Icon size={18} />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-7 text-slate-500">{subtitle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">{helper}</p>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {summary.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                <span className="text-slate-400">{item.label}</span>
                <span className="text-ink">{item.value}</span>
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isOpen ? "ซ่อนรายละเอียด" : "เปิดพื้นที่ทำงาน"}
            </span>
          </div>
        </div>
      </button>

      {isOpen ? <div className="border-t border-slate-100 px-4 py-4 md:px-5 md:py-5">{children}</div> : null}
    </section>
  );
}

export default function AdminConsole() {
  const [exporting, setExporting] = useState(false);
  const [repairingProfiles, setRepairingProfiles] = useState(false);
  const [workspaceState, setWorkspaceState] = useState(initialWorkspaceState);
  const {
    aggregateMap,
    headlineCards,
    systemCards,
    latestSnapshotLabel,
    missingAggregateIds,
    loading: loadingAggregates,
    listenerError: aggregateListenerError,
  } = useAdminMonitoringSummary();

  const workspaceSections = useMemo(
    () => [
      {
        id: "learning",
        title: "ศูนย์ติดตามความคืบหน้าการเรียน",
        subtitle: "เปิดเมื่ออยากดูรายชื่อผู้เรียน บทเรียนล่าสุด และสถานะแบบเรียลไทม์",
        helper:
          "ส่วนนี้ใช้ realtime listeners กับข้อมูลผู้ใช้และ enrollment โดยตรง จึงถูกตั้งค่าให้เปิดเฉพาะตอนที่ต้องการตรวจสอบเชิงลึก",
        icon: BarChart3,
        summary: [
          {
            label: "กำลังเรียน",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.learning,
              "activeEnrollmentCount",
            )} รายการ`,
          },
          {
            label: "เรียนจบ",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.learning,
              "completedEnrollmentCount",
            )} รายการ`,
          },
          {
            label: "เฉลี่ย",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.learning,
              "averageProgressPercent",
            )}%`,
          },
        ],
        render: () => (
          <Suspense fallback={<WorkspacePanelLoader label="กำลังเปิด dashboard ความคืบหน้าการเรียน" />}>
            <LearningProgressDashboard />
          </Suspense>
        ),
      },
      {
        id: "presence",
        title: "สถานะผู้ใช้งานแบบเรียลไทม์",
        subtitle: "ใช้ดูว่าใครกำลังออนไลน์อยู่ตอนนี้และกำลังทำงานอยู่บนหน้าใด",
        helper:
          "ส่วนนี้เบากว่า workspace อื่นเพราะจำกัดไว้เฉพาะ presence ล่าสุด 20 รายการ แต่ยังคงแยกเป็น panel เปิด-ปิดเพื่อคุมภาระหน้าแอดมินได้",
        icon: RadioTower,
        summary: [
          {
            label: "ออนไลน์ตอนนี้",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.overview,
              "onlineNowCount",
            )} คน`,
          },
          {
            label: "สมาชิกทั้งหมด",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.overview,
              "memberCount",
            )} คน`,
          },
        ],
        render: () => (
          <Suspense fallback={<WorkspacePanelLoader label="กำลังเปิดสถานะผู้ใช้งานแบบเรียลไทม์" />}>
            <OnlineUsers />
          </Suspense>
        ),
      },
      {
        id: "support",
        title: "SOS Workspace",
        subtitle: "เปิดเมื่ออยากติดตามเคสเร่งด่วน ตอบกลับ และจัดการ ticket แบบเต็มหน้า",
        helper:
          "ส่วนนี้มี listener หลายจุดทั้ง ticket และข้อความย่อย จึงถูกย้ายมาอยู่ใน panel ที่ขยายตามต้องการเพื่อให้หน้าแอดมินโหลดเบาและนิ่งขึ้น",
        icon: LifeBuoy,
        summary: [
          {
            label: "เปิดอยู่",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.support,
              "openTicketCount",
            )} เคส`,
          },
          {
            label: "เร่งด่วน",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.support,
              "urgentOpenTicketCount",
            )} เคส`,
          },
          {
            label: "กำลังช่วยเหลือ",
            value: `${getAggregateCount(
              aggregateMap,
              ADMIN_AGGREGATE_DOC_IDS.support,
              "inProgressTicketCount",
            )} เคส`,
          },
        ],
        render: () => (
          <Suspense fallback={<WorkspacePanelLoader label="กำลังเปิด SOS workspace" />}>
            <SupportTicketWorkspace isAdminView />
          </Suspense>
        ),
      },
    ],
    [aggregateMap],
  );

  const expandedWorkspaceCount = Object.values(workspaceState).filter(Boolean).length;
  const workspaceSectionById = useMemo(
    () =>
      Object.fromEntries(workspaceSections.map((section) => [section.id, section])),
    [workspaceSections],
  );

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

      const rows = buildMissionResponseRows({
        missionResponses,
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

  const toggleWorkspace = (workspaceId) => {
    setWorkspaceState((previous) => ({
      ...previous,
      [workspaceId]: !previous[workspaceId],
    }));
  };

  const expandAllWorkspaces = () => {
    setWorkspaceState({
      learning: true,
      presence: true,
      support: true,
    });
  };

  const collapseAllWorkspaces = () => {
    setWorkspaceState({
      learning: false,
      presence: false,
      support: false,
    });
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

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
              <ShieldCheck size={14} />
              สรุประดับผู้ดูแล
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              เห็นภาพรวมของสมาชิก การเรียน SOS วิดีโอ และการจับคู่ในจอเดียว
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              การ์ดชุดนี้อ่านจาก `admin_aggregates` เพื่อให้แอดมินเห็นสัญญาณสำคัญของระบบก่อนกดลงไปดูรายละเอียดรายโมดูล
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            <p>{loadingAggregates ? "กำลังโหลด aggregate snapshot" : "aggregate snapshot พร้อมใช้งาน"}</p>
            <p className="mt-1">{latestSnapshotLabel ? `อัปเดตล่าสุด ${latestSnapshotLabel}` : "ยังไม่พบ snapshot ล่าสุด"}</p>
          </div>
        </div>

        {aggregateListenerError ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-800">
            {aggregateListenerError} ระบบจะยังคงแสดงเครื่องมือแอดมินชุดเดิมด้านล่างได้ตามปกติ
          </div>
        ) : null}

        {missingAggregateIds.length > 0 ? (
          <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-7 text-sky-800">
            ยังไม่พบ aggregate docs บางส่วน:
            {" "}
            {missingAggregateIds.map((docId) => aggregateLabels[docId] || docId).join(" / ")}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {headlineCards.map((card) => (
            <AdminSummaryCard
              key={card.id}
              title={card.title}
              value={card.value}
              helper={card.helper}
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
          {systemCards.map((card) => (
            <MonitoringRouteCard
              key={card.id}
              title={card.title}
              metric={card.metric}
              description={card.description}
              path={card.path}
            />
          ))}
        </div>
      </section>

      <section className="brand-panel p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <DatabaseZap size={14} />
              Progressive Admin Workspace
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              เปิดเฉพาะพื้นที่ที่ต้องใช้ เพื่อลดภาระ realtime listeners
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              หน้าแอดมินจะเริ่มจาก aggregate summary ก่อน ส่วน realtime workspace จะเริ่มทำงานเมื่อขยาย panel เท่านั้น ทำให้หน้าโหลดนิ่งขึ้นและลด query พร้อมกันใน production
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600">
              เปิดอยู่ {expandedWorkspaceCount}/{workspaceSections.length} พื้นที่
            </span>
            <button
              type="button"
              onClick={expandAllWorkspaces}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/20 hover:text-primary"
            >
              เปิดทั้งหมด
            </button>
            <button
              type="button"
              onClick={collapseAllWorkspaces}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/20 hover:text-primary"
            >
              เหลือเฉพาะสรุป
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminWorkspaceSection
          title={workspaceSectionById.learning.title}
          subtitle={workspaceSectionById.learning.subtitle}
          summary={workspaceSectionById.learning.summary}
          helper={workspaceSectionById.learning.helper}
          icon={workspaceSectionById.learning.icon}
          isOpen={workspaceState.learning}
          onToggle={() => toggleWorkspace("learning")}
        >
          {workspaceState.learning ? workspaceSectionById.learning.render() : null}
        </AdminWorkspaceSection>
        <div className="space-y-6">
          <AdminWorkspaceSection
            title={workspaceSectionById.presence.title}
            subtitle={workspaceSectionById.presence.subtitle}
            summary={workspaceSectionById.presence.summary}
            helper={workspaceSectionById.presence.helper}
            icon={workspaceSectionById.presence.icon}
            isOpen={workspaceState.presence}
            onToggle={() => toggleWorkspace("presence")}
          >
            {workspaceState.presence ? workspaceSectionById.presence.render() : null}
          </AdminWorkspaceSection>
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

      <AdminWorkspaceSection
        title={workspaceSectionById.support.title}
        subtitle={workspaceSectionById.support.subtitle}
        summary={workspaceSectionById.support.summary}
        helper={workspaceSectionById.support.helper}
        icon={workspaceSectionById.support.icon}
        isOpen={workspaceState.support}
        onToggle={() => toggleWorkspace("support")}
      >
        {workspaceState.support ? workspaceSectionById.support.render() : null}
      </AdminWorkspaceSection>
    </div>
  );
}

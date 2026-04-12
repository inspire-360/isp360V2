import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { collection, collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  buildEnrollmentInsight,
  normalizeEnrollmentStatus,
  resolveDisplayName,
} from "../utils/duMemberInsights";
import { getRoleLabel, isLearnerRole } from "../utils/userRoles";
import { formatSupportTicketDateTime, toSupportTicketMillis } from "../data/supportTickets";

const createStatusMeta = (enrollment = {}) => {
  const progressPercent = enrollment.progressPercent || 0;
  const normalizedStatus = normalizeEnrollmentStatus(enrollment.status, progressPercent);
  const score = Number.isFinite(enrollment.score)
    ? Math.max(0, Math.min(100, Math.round(enrollment.score)))
    : 0;

  if (normalizedStatus === "completed") {
    return {
      value: "completed",
      label: "เรียนจบแล้ว",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      sortWeight: 2,
      score,
      rawStatus: enrollment.status || "completed",
    };
  }

  if (normalizedStatus === "active") {
    return {
      value: "active",
      label: "กำลังเรียน",
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      sortWeight: 1,
      score,
      rawStatus: enrollment.status || "active",
    };
  }

  return {
    value: "not_started",
    label: "ยังไม่เริ่ม",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
    sortWeight: 0,
    score,
    rawStatus: enrollment.status || "not_started",
  };
};

const buildSpotlightEnrollment = (enrollments = []) =>
  [...enrollments]
    .map((enrollment) => buildEnrollmentInsight(enrollment))
    .sort((left, right) => {
      const leftStatus = normalizeEnrollmentStatus(left.status, left.progressPercent);
      const rightStatus = normalizeEnrollmentStatus(right.status, right.progressPercent);
      const completionGap = Number(rightStatus === "completed") - Number(leftStatus === "completed");

      if (completionGap !== 0) return completionGap;
      if (left.progressPercent !== right.progressPercent) {
        return right.progressPercent - left.progressPercent;
      }

      return (
        toSupportTicketMillis(right.lastSavedAt || right.updatedAt || right.lastAccess) -
        toSupportTicketMillis(left.lastSavedAt || left.updatedAt || left.lastAccess)
      );
    })[0] || null;

const sortRows = (left, right) => {
  if (left.status.sortWeight !== right.status.sortWeight) {
    return right.status.sortWeight - left.status.sortWeight;
  }

  if (left.progressPercent !== right.progressPercent) {
    return right.progressPercent - left.progressPercent;
  }

  return left.name.localeCompare(right.name, "th");
};

const buildDashboardRow = ({ userId, userRecord, spotlightEnrollment }) => {
  const status = createStatusMeta(spotlightEnrollment || {});
  const progressPercent = spotlightEnrollment?.progressPercent || 0;
  const score = status.score;
  const name = resolveDisplayName(userRecord || { email: userId });
  const roleLabel = getRoleLabel(userRecord?.role);
  const latestActivityTimestamp =
    spotlightEnrollment?.lastSavedAt ||
    spotlightEnrollment?.updatedAt ||
    spotlightEnrollment?.lastAccess ||
    null;

  return {
    userId,
    name,
    roleLabel,
    courseTitle: spotlightEnrollment?.courseTitle || "ยังไม่เริ่มหลักสูตร",
    progressPercent,
    status,
    scoreText: `คะแนน: ${score}/100`,
    scoreValue: score,
    completedLessonsCount: spotlightEnrollment?.completedLessonsCount || 0,
    lessonCount: spotlightEnrollment?.lessonCount || 0,
    activeLessonTitle: spotlightEnrollment?.activeLessonTitle || "",
    updatedAtLabel: latestActivityTimestamp
      ? formatSupportTicketDateTime(latestActivityTimestamp)
      : "ยังไม่มีการบันทึก",
    updatedAtMillis: latestActivityTimestamp ? toSupportTicketMillis(latestActivityTimestamp) : 0,
    enrollmentDocumentId: spotlightEnrollment?.id || "",
    enrollmentPath: spotlightEnrollment?.path || "",
    sourceStatus: spotlightEnrollment?.sourceStatus || spotlightEnrollment?.status || "",
    searchText: [
      name,
      roleLabel,
      spotlightEnrollment?.courseTitle || "ยังไม่เริ่มหลักสูตร",
      spotlightEnrollment?.activeLessonTitle || "",
      status.label,
      spotlightEnrollment?.sourceStatus || spotlightEnrollment?.status || "",
    ]
      .join(" ")
      .toLowerCase(),
  };
};

const initialListenerInfo = {
  usersCollection: "users",
  enrollmentsCollectionGroup: "enrollments",
  lastChangedUserId: "",
  lastChangedEnrollmentId: "",
  lastChangedEnrollmentPath: "",
  lastChangedStatusText: "",
};

export function useLearningDashboard() {
  const [rowsById, setRowsById] = useState({});
  const [rowOrder, setRowOrder] = useState([]);
  const [loadingState, setLoadingState] = useState({
    users: true,
    enrollments: true,
  });
  const [listenerError, setListenerError] = useState("");
  const [listenerInfo, setListenerInfo] = useState(initialListenerInfo);

  const usersByIdRef = useRef(new Map());
  const enrollmentsByPathRef = useRef(new Map());
  const userEnrollmentPathsRef = useRef(new Map());
  const rowsByIdRef = useRef(new Map());

  const rebuildRows = (affectedUserIds) => {
    if (affectedUserIds.size === 0) return;

    const nextRowsByIdMap = new Map(rowsByIdRef.current);

    affectedUserIds.forEach((userId) => {
      const userRecord = usersByIdRef.current.get(userId);
      const enrollmentPaths = [...(userEnrollmentPathsRef.current.get(userId) || [])];
      const enrollments = enrollmentPaths
        .map((path) => enrollmentsByPathRef.current.get(path))
        .filter(Boolean);

      if (enrollments.length === 0 && !isLearnerRole(userRecord?.role)) {
        nextRowsByIdMap.delete(userId);
        return;
      }

      const spotlightEnrollment = buildSpotlightEnrollment(enrollments);
      nextRowsByIdMap.set(
        userId,
        buildDashboardRow({
          userId,
          userRecord,
          spotlightEnrollment,
        }),
      );
    });

    rowsByIdRef.current = nextRowsByIdMap;
    const nextRowOrder = [...nextRowsByIdMap.values()].sort(sortRows).map((row) => row.userId);

    startTransition(() => {
      setRowsById((previous) => {
        const next = { ...previous };
        const validIds = new Set(nextRowOrder);

        Object.keys(next).forEach((userId) => {
          if (!validIds.has(userId)) {
            delete next[userId];
          }
        });

        nextRowOrder.forEach((userId) => {
          next[userId] = nextRowsByIdMap.get(userId);
        });

        return next;
      });
      setRowOrder(nextRowOrder);
    });
  };

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const affectedUserIds = new Set();

        snapshot.docChanges().forEach((change) => {
          const userId = change.doc.id;
          affectedUserIds.add(userId);

          if (change.type === "removed") {
            usersByIdRef.current.delete(userId);
            return;
          }

          usersByIdRef.current.set(userId, {
            id: change.doc.id,
            ...change.doc.data(),
          });
        });

        const latestChange = snapshot.docChanges().at(-1);

        setListenerError("");
        setLoadingState((previous) => ({ ...previous, users: false }));
        setListenerInfo((previous) => ({
          ...previous,
          lastChangedUserId: latestChange?.doc?.id || previous.lastChangedUserId,
        }));
        rebuildRows(affectedUserIds);
      },
      (error) => {
        console.error("ไม่สามารถติดตามคอลเลกชันผู้ใช้สำหรับแดชบอร์ดผู้เรียนได้", {
          รหัสข้อผิดพลาด: error?.code || "ไม่ทราบรหัส",
          ข้อความระบบ: error?.message || "ไม่พบข้อความระบบ",
          คอลเลกชัน: "users",
        });
        setListenerError("ไม่สามารถซิงก์ข้อมูลผู้เรียนจากคอลเลกชันผู้ใช้ได้");
        setLoadingState((previous) => ({ ...previous, users: false }));
      },
    );

    const unsubscribeEnrollments = onSnapshot(
      collectionGroup(db, "enrollments"),
      (snapshot) => {
        const affectedUserIds = new Set();

        snapshot.docChanges().forEach((change) => {
          const enrollmentPath = change.doc.ref.path;
          const userId = change.doc.ref.parent.parent?.id;
          if (!userId) return;

          affectedUserIds.add(userId);

          if (change.type === "removed") {
            enrollmentsByPathRef.current.delete(enrollmentPath);
            const previousSet = new Set(userEnrollmentPathsRef.current.get(userId) || []);
            previousSet.delete(enrollmentPath);
            userEnrollmentPathsRef.current.set(userId, previousSet);
            return;
          }

          enrollmentsByPathRef.current.set(enrollmentPath, {
            id: change.doc.id,
            path: enrollmentPath,
            userId,
            ...change.doc.data(),
          });

          const nextSet = new Set(userEnrollmentPathsRef.current.get(userId) || []);
          nextSet.add(enrollmentPath);
          userEnrollmentPathsRef.current.set(userId, nextSet);
        });

        const latestChange = snapshot.docChanges().at(-1);
        const latestChangeData = latestChange?.doc?.data() || {};
        const latestChangeStatus = createStatusMeta({
          status: latestChangeData.status,
          progressPercent:
            typeof latestChangeData.progressPercent === "number"
              ? latestChangeData.progressPercent
              : typeof latestChangeData.progress === "number"
                ? latestChangeData.progress
                : 0,
          score: latestChangeData.score,
        }).label;

        setListenerError("");
        setLoadingState((previous) => ({ ...previous, enrollments: false }));
        setListenerInfo((previous) => ({
          ...previous,
          lastChangedEnrollmentId: latestChange?.doc?.id || previous.lastChangedEnrollmentId,
          lastChangedEnrollmentPath:
            latestChange?.doc?.ref?.path || previous.lastChangedEnrollmentPath,
          lastChangedStatusText: latestChange ? latestChangeStatus : previous.lastChangedStatusText,
        }));
        rebuildRows(affectedUserIds);
      },
      (error) => {
        console.error("ไม่สามารถติดตามกลุ่มย่อยบทเรียนของผู้เรียนแบบเรียลไทม์ได้", {
          รหัสข้อผิดพลาด: error?.code || "ไม่ทราบรหัส",
          ข้อความระบบ: error?.message || "ไม่พบข้อความระบบ",
          กลุ่มย่อย: "enrollments",
        });
        setListenerError("ไม่สามารถซิงก์ข้อมูลความคืบหน้าจากกลุ่มย่อยบทเรียนได้");
        setLoadingState((previous) => ({ ...previous, enrollments: false }));
      },
    );

    return () => {
      unsubscribeUsers();
      unsubscribeEnrollments();
    };
  }, []);

  const rows = useMemo(
    () => rowOrder.map((userId) => rowsById[userId]).filter(Boolean),
    [rowOrder, rowsById],
  );

  const summary = useMemo(
    () =>
      rows.reduce(
        (accumulator, row) => {
          accumulator.total += 1;
          if (row.status.value === "not_started") accumulator.notStarted += 1;
          if (row.status.value === "active") accumulator.active += 1;
          if (row.status.value === "completed") accumulator.completed += 1;
          return accumulator;
        },
        {
          total: 0,
          notStarted: 0,
          active: 0,
          completed: 0,
        },
      ),
    [rows],
  );

  return {
    rowsById,
    rowOrder,
    rows,
    summary,
    loading: Object.values(loadingState).some(Boolean),
    listenerError,
    listenerInfo,
  };
}

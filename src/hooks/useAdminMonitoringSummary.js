import { useEffect, useMemo, useState } from "react";
import {
  ADMIN_AGGREGATE_DOC_IDS,
  buildDefaultAdminAggregateMap,
} from "../services/firebase/mappers/adminAggregateMapper";
import { subscribeToAdminAggregates } from "../services/firebase/repositories/adminAggregateRepository";

const getAggregateValue = (aggregateMap, docId, key) =>
  Number(aggregateMap?.[docId]?.counts?.[key] || 0);

const buildHeadlineCards = (aggregateMap) => [
  {
    id: "members",
    title: "สมาชิกในระบบ",
    value: getAggregateValue(aggregateMap, ADMIN_AGGREGATE_DOC_IDS.overview, "memberCount"),
    helper: `ออนไลน์ตอนนี้ ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.overview,
      "onlineNowCount",
    )} คน`,
  },
  {
    id: "learning",
    title: "ผู้เรียนที่กำลังเรียน",
    value: getAggregateValue(aggregateMap, ADMIN_AGGREGATE_DOC_IDS.learning, "activeEnrollmentCount"),
    helper: `จบแล้ว ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.learning,
      "completedEnrollmentCount",
    )} รายการ`,
  },
  {
    id: "support",
    title: "SOS ค้างดูแล",
    value: getAggregateValue(aggregateMap, ADMIN_AGGREGATE_DOC_IDS.support, "openTicketCount"),
    helper: `เร่งด่วน ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.support,
      "urgentOpenTicketCount",
    )} เคส`,
  },
  {
    id: "pending-actions",
    title: "งานที่ต้องติดตามต่อ",
    value:
      getAggregateValue(aggregateMap, ADMIN_AGGREGATE_DOC_IDS.reviews, "pendingVideoReviewCount")
      + getAggregateValue(aggregateMap, ADMIN_AGGREGATE_DOC_IDS.matching, "pendingMatchRequestCount")
      + getAggregateValue(aggregateMap, ADMIN_AGGREGATE_DOC_IDS.support, "urgentOpenTicketCount"),
    helper: "รวม video review, expert match และ SOS เร่งด่วน",
  },
];

const buildSystemCards = (aggregateMap) => [
  {
    id: "learning-system",
    title: "Learning Progress",
    path: "/du/admin",
    metric: `${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.learning,
      "averageProgressPercent",
    )}%`,
    description: `คอร์สที่กำลังเรียน ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.learning,
      "activeEnrollmentCount",
    )} รายการ`,
  },
  {
    id: "support-system",
    title: "SOS Workspace",
    path: "/du/sos",
    metric: `${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.support,
      "openTicketCount",
    )} เคส`,
    description: `กำลังดำเนินการ ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.support,
      "inProgressTicketCount",
    )} เคส`,
  },
  {
    id: "video-system",
    title: "Video Coach",
    path: "/du/video-coach",
    metric: `${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.reviews,
      "pendingVideoReviewCount",
    )} รอรีวิว`,
    description: `รีวิวแล้ว ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.reviews,
      "reviewedVideoCount",
    )} รายการ`,
  },
  {
    id: "innovation-system",
    title: "Innovation Board",
    path: "/du/innovations",
    metric: `${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.innovations,
      "totalInnovationCount",
    )} รายการ`,
    description: `ถึงขั้น best practice ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.innovations,
      "bestPracticeInnovationCount",
    )} รายการ`,
  },
  {
    id: "matching-system",
    title: "Expert Matching",
    path: "/du/matchmaker",
    metric: `${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.matching,
      "pendingMatchRequestCount",
    )} รอจับคู่`,
    description: `ผู้เชี่ยวชาญพร้อมรับงาน ${getAggregateValue(
      aggregateMap,
      ADMIN_AGGREGATE_DOC_IDS.matching,
      "availableExpertCount",
    )} คน`,
  },
];

export function useAdminMonitoringSummary() {
  const [aggregateMap, setAggregateMap] = useState(buildDefaultAdminAggregateMap);
  const [loading, setLoading] = useState(true);
  const [listenerError, setListenerError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToAdminAggregates({
      onNext: ({ byId }) => {
        setAggregateMap(byId);
        setLoading(false);
        setListenerError("");
      },
      onError: (error) => {
        console.error("Failed to subscribe admin aggregates:", error);
        setLoading(false);
        setListenerError("ไม่สามารถโหลดสรุประดับผู้ดูแลได้");
      },
    });

    return () => unsubscribe();
  }, []);

  const missingAggregateIds = useMemo(
    () =>
      Object.values(ADMIN_AGGREGATE_DOC_IDS).filter(
        (docId) => !aggregateMap?.[docId] || aggregateMap[docId].status === "missing",
      ),
    [aggregateMap],
  );

  const latestSnapshotLabel = useMemo(() => {
    const latestSnapshot = Object.values(aggregateMap || {}).reduce((latest, item) => {
      const candidate =
        typeof item?.snapshotAt?.toDate === "function"
          ? item.snapshotAt.toDate()
          : item?.snapshotAt instanceof Date
            ? item.snapshotAt
            : item?.snapshotAt
              ? new Date(item.snapshotAt)
              : null;

      if (!(candidate instanceof Date) || Number.isNaN(candidate.getTime())) {
        return latest;
      }

      if (!latest || candidate.getTime() > latest.getTime()) {
        return candidate;
      }

      return latest;
    }, null);

    if (!latestSnapshot) return "";

    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(latestSnapshot);
  }, [aggregateMap]);

  return {
    aggregateMap,
    headlineCards: buildHeadlineCards(aggregateMap),
    systemCards: buildSystemCards(aggregateMap),
    missingAggregateIds,
    latestSnapshotLabel,
    loading,
    listenerError,
  };
}

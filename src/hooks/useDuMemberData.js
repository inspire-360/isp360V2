import { useEffect, useMemo, useState } from "react";
import {
  getMissionResponseEnrollmentKey,
  groupMissionResponsesByEnrollmentKey,
} from "../services/firebase/mappers/missionResponseMapper";
import { subscribeToEnrollmentSummaryCollectionGroup } from "../services/firebase/repositories/enrollmentRepository";
import { subscribeToMissionResponseCollectionGroup } from "../services/firebase/repositories/missionResponseRepository";
import { subscribeToPresenceRows } from "../services/firebase/repositories/presenceRepository";
import { subscribeToUserProfiles } from "../services/firebase/repositories/userRepository";
import { PRESENCE_COLLECTION, PRESENCE_TICK_MS } from "../utils/presenceStatus";

const INITIAL_LOADING_STATE = {
  users: true,
  presence: true,
  enrollments: true,
  missionResponses: true,
};

export function useDuMemberData() {
  const [usersData, setUsersData] = useState([]);
  const [presenceRows, setPresenceRows] = useState([]);
  const [enrollmentRows, setEnrollmentRows] = useState([]);
  const [missionResponsesByEnrollmentKey, setMissionResponsesByEnrollmentKey] = useState({});
  const [loadingState, setLoadingState] = useState(INITIAL_LOADING_STATE);
  const [listenerSeed, setListenerSeed] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), PRESENCE_TICK_MS);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const markLoaded = (key) =>
      setLoadingState((previous) => (previous[key] ? { ...previous, [key]: false } : previous));

    const unsubscribers = [
      subscribeToUserProfiles({
        onNext: (rows) => {
          setUsersData(rows);
          markLoaded("users");
        },
        onError: (error) => {
          console.error("Failed to subscribe users:", error);
          markLoaded("users");
        },
      }),
      subscribeToPresenceRows({
        onNext: (rows) => {
          setPresenceRows(rows);
          markLoaded("presence");
        },
        onError: (error) => {
          console.error(`Failed to subscribe ${PRESENCE_COLLECTION}:`, error);
          markLoaded("presence");
        },
      }),
      subscribeToEnrollmentSummaryCollectionGroup({
        onNext: (rows) => {
          setEnrollmentRows(rows);
          markLoaded("enrollments");
        },
        onError: (error) => {
          console.error("Failed to subscribe enrollments:", error);
          markLoaded("enrollments");
        },
      }),
      subscribeToMissionResponseCollectionGroup({
        onNext: (rows) => {
          setMissionResponsesByEnrollmentKey(groupMissionResponsesByEnrollmentKey(rows));
          markLoaded("missionResponses");
        },
        onError: (error) => {
          console.error("Failed to subscribe mission responses:", error);
          markLoaded("missionResponses");
        },
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [listenerSeed]);

  const enrollments = useMemo(
    () =>
      enrollmentRows.map((enrollment) => {
        const missionResponseKey = getMissionResponseEnrollmentKey({
          userId: enrollment.userId,
          courseId: enrollment.courseId || enrollment.id,
        });
        const canonicalMissionResponses = missionResponsesByEnrollmentKey[missionResponseKey] || {};
        const hasCanonicalMissionResponses = Object.keys(canonicalMissionResponses).length > 0;

        return {
          ...enrollment,
          missionResponses: canonicalMissionResponses,
          missionResponsesMap: canonicalMissionResponses,
          hasCanonicalMissionResponses,
        };
      }),
    [enrollmentRows, missionResponsesByEnrollmentKey],
  );

  const loading = Object.values(loadingState).some(Boolean);
  const refreshingMembers = loading && listenerSeed > 0;

  const refreshMembers = () => {
    setLoadingState(INITIAL_LOADING_STATE);
    setListenerSeed((previous) => previous + 1);
  };

  return {
    usersData,
    presenceRows,
    enrollments,
    loading,
    loadingState,
    now,
    refreshingMembers,
    refreshMembers,
  };
}

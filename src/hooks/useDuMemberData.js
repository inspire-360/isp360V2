import { useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  getMissionResponseEnrollmentKey,
  groupMissionResponsesByEnrollmentKey,
} from "../services/firebase/mappers/missionResponseMapper";
import { subscribeToMissionResponseCollectionGroup } from "../services/firebase/repositories/missionResponseRepository";
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
      onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          setUsersData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          markLoaded("users");
        },
        (error) => {
          console.error("Failed to subscribe users:", error);
          markLoaded("users");
        },
      ),
      onSnapshot(
        collection(db, PRESENCE_COLLECTION),
        (snapshot) => {
          setPresenceRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
          markLoaded("presence");
        },
        (error) => {
          console.error("Failed to subscribe presence:", error);
          markLoaded("presence");
        },
      ),
      onSnapshot(
        collectionGroup(db, "enrollments"),
        (snapshot) => {
          setEnrollmentRows(
            snapshot.docs.map((item) => ({
              id: item.id,
              courseId: item.data().courseId || item.id,
              path: item.ref.path,
              userId: item.ref.parent.parent?.id,
              ...item.data(),
            })),
          );
          markLoaded("enrollments");
        },
        (error) => {
          console.error("Failed to subscribe enrollments:", error);
          markLoaded("enrollments");
        },
      ),
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

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, collectionGroup, onSnapshot, query, where } from "firebase/firestore";
import {
  INNOVATION_STAGE_IDEA,
  normalizeInnovationStage,
  sortInnovations,
} from "../data/innovationKanban";
import { db } from "../lib/firebase";
import {
  ENROLLMENTS_SUBCOLLECTION,
  USERS_COLLECTION,
} from "../services/firebase/collections";
import {
  buildInnovationBoardRecord,
  buildInnovationId,
  normalizeInnovationRecord,
  shouldSyncInnovationMetadata,
  INNOVATION_BOARD_COURSE_ID,
} from "../services/firebase/mappers/innovationMapper";
import { getMissionResponseEnrollmentKey } from "../services/firebase/mappers/missionResponseMapper";
import { subscribeToMissionResponseCollectionGroup } from "../services/firebase/repositories/missionResponseRepository";
import {
  subscribeToInnovations,
  syncInnovationMetadata,
  updateInnovationStage,
} from "../services/firebase/repositories/innovationRepository";

const resolveDisplayName = ({ currentUser, userProfile }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  "ผู้ดูแล DU";

const buildInnovationSyncSources = ({
  enrollments,
  teachers,
  innovationDocs,
  missionResponsesByEnrollmentKey,
}) => {
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const innovationMap = new Map(innovationDocs.map((innovation) => [innovation.id, innovation]));

  return enrollments.flatMap((enrollment) => {
    const missionResponses =
      missionResponsesByEnrollmentKey[
        getMissionResponseEnrollmentKey({
          userId: enrollment.teacherId,
          courseId: enrollment.courseId || enrollment.enrollmentId,
        })
      ] || {};

    const existingInnovation = normalizeInnovationRecord(
      innovationMap.get(
        buildInnovationId({
          teacherId: enrollment.teacherId,
          enrollmentId: enrollment.enrollmentId,
          courseId: enrollment.courseId,
        }),
      ) || {},
    );

    const derivedInnovation = buildInnovationBoardRecord({
      enrollment,
      teacherProfile: teacherMap.get(enrollment.teacherId) || {},
      missionResponses,
      existingInnovation,
    });

    if (!derivedInnovation?.id) {
      return [];
    }

    return [
      {
        derivedInnovation,
        enrollment,
        teacherProfile: teacherMap.get(enrollment.teacherId) || {},
        missionResponses,
        existingInnovation,
      },
    ];
  });
};

const patchInnovationStageLocally = ({
  previousInnovations,
  innovationId,
  nextStage,
  operatorId,
  operatorName,
}) =>
  previousInnovations
    .map((innovation) =>
      innovation.id === innovationId
        ? {
            ...innovation,
            stage: normalizeInnovationStage(nextStage),
            updatedAt: new Date(),
            lastMovedAt: new Date(),
            lastMovedById: operatorId,
            lastMovedByName: operatorName,
          }
        : innovation,
    )
    .sort(sortInnovations);

export function useInnovationBoard({ currentUser, userProfile, isAdminView }) {
  const [teacherProfiles, setTeacherProfiles] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [missionResponsesByEnrollmentKey, setMissionResponsesByEnrollmentKey] = useState({});
  const [innovationDocs, setInnovationDocs] = useState([]);
  const [visibleInnovations, setVisibleInnovations] = useState([]);
  const [activeInnovationId, setActiveInnovationId] = useState("");
  const [loadingTeacherProfiles, setLoadingTeacherProfiles] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [loadingMissionResponses, setLoadingMissionResponses] = useState(true);
  const [loadingInnovationDocs, setLoadingInnovationDocs] = useState(true);
  const [movingInnovationId, setMovingInnovationId] = useState("");
  const [listenerError, setListenerError] = useState("");
  const innovationsRef = useRef([]);

  useEffect(() => {
    if (!currentUser?.uid || !isAdminView) {
      setTeacherProfiles([]);
      setEnrollments([]);
      setMissionResponsesByEnrollmentKey({});
      setInnovationDocs([]);
      setVisibleInnovations([]);
      setActiveInnovationId("");
      setLoadingTeacherProfiles(false);
      setLoadingEnrollments(false);
      setLoadingMissionResponses(false);
      setLoadingInnovationDocs(false);
      setListenerError("");
      innovationsRef.current = [];
      return undefined;
    }

    setLoadingTeacherProfiles(true);
    setLoadingEnrollments(true);
    setLoadingMissionResponses(true);
    setLoadingInnovationDocs(true);
    setListenerError("");

    const unsubscribeTeachers = onSnapshot(
      query(collection(db, USERS_COLLECTION)),
      (snapshot) => {
        const nextTeachers = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        startTransition(() => {
          setTeacherProfiles(nextTeachers);
          setLoadingTeacherProfiles(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถดึงรายชื่อครูสำหรับกระดานนวัตกรรมได้", error);
        setLoadingTeacherProfiles(false);
        setListenerError("ไม่สามารถโหลดรายชื่อครูสำหรับกระดานนวัตกรรมได้");
      },
    );

    const unsubscribeEnrollments = onSnapshot(
      query(
        collectionGroup(db, ENROLLMENTS_SUBCOLLECTION),
        where("courseId", "==", INNOVATION_BOARD_COURSE_ID),
      ),
      (snapshot) => {
        const nextEnrollments = snapshot.docs.map((item) => ({
          id: item.id,
          enrollmentId: item.id,
          teacherId: item.ref.parent.parent?.id || "",
          path: item.ref.path,
          ...item.data(),
        }));

        startTransition(() => {
          setEnrollments(nextEnrollments);
          setLoadingEnrollments(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถดึงข้อมูลการลงทะเบียนสำหรับกระดานนวัตกรรมได้", error);
        setLoadingEnrollments(false);
        setListenerError("ไม่สามารถโหลดข้อมูลการลงทะเบียนสำหรับกระดานนวัตกรรมได้");
      },
    );

    const unsubscribeMissionResponses = subscribeToMissionResponseCollectionGroup({
      courseId: INNOVATION_BOARD_COURSE_ID,
      onNext: (rows) => {
        const nextMissionResponsesByEnrollmentKey = rows.reduce((accumulator, row) => {
          const key = getMissionResponseEnrollmentKey(row);
          if (!key || !row.missionId) return accumulator;

          accumulator[key] = {
            ...(accumulator[key] || {}),
            [row.missionId]: row,
          };

          return accumulator;
        }, {});

        startTransition(() => {
          setMissionResponsesByEnrollmentKey(nextMissionResponsesByEnrollmentKey);
          setLoadingMissionResponses(false);
        });
      },
      onError: (error) => {
        console.error("ไม่สามารถดึงภารกิจย่อยสำหรับกระดานนวัตกรรมได้", error);
        setLoadingMissionResponses(false);
        setListenerError("ไม่สามารถโหลดภารกิจย่อยสำหรับกระดานนวัตกรรมได้");
      },
    });

    const unsubscribeInnovationDocs = subscribeToInnovations({
      onNext: (rows) => {
        startTransition(() => {
          setInnovationDocs(rows);
          setLoadingInnovationDocs(false);
        });
      },
      onError: (error) => {
        console.error("ไม่สามารถติดตามคอลเลกชัน innovations ได้", error);
        setLoadingInnovationDocs(false);
        setListenerError("ไม่สามารถเชื่อมข้อมูลนวัตกรรมแบบทันทีได้");
      },
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeEnrollments();
      unsubscribeMissionResponses();
      unsubscribeInnovationDocs();
    };
  }, [currentUser?.uid, isAdminView]);

  const innovationSyncSources = useMemo(
    () =>
      buildInnovationSyncSources({
        enrollments,
        teachers: teacherProfiles,
        innovationDocs,
        missionResponsesByEnrollmentKey,
      }),
    [enrollments, innovationDocs, missionResponsesByEnrollmentKey, teacherProfiles],
  );

  const innovationSyncSourceById = useMemo(
    () =>
      new Map(
        innovationSyncSources.map((item) => [
          item.derivedInnovation.id,
          item,
        ]),
      ),
    [innovationSyncSources],
  );

  const innovationsPendingSync = useMemo(
    () =>
      innovationSyncSources.filter(
        ({ existingInnovation, derivedInnovation }) =>
          !existingInnovation?.id ||
          shouldSyncInnovationMetadata(existingInnovation, derivedInnovation),
      ),
    [innovationSyncSources],
  );

  useEffect(() => {
    if (!currentUser?.uid || !isAdminView || innovationsPendingSync.length === 0) {
      return undefined;
    }

    let cancelled = false;

    const syncMissingMetadata = async () => {
      for (const source of innovationsPendingSync) {
        if (cancelled) return;

        try {
          await syncInnovationMetadata(source);
        } catch (error) {
          console.error("ไม่สามารถซิงก์ metadata ของนวัตกรรมได้", error);
        }
      }
    };

    void syncMissingMetadata();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, innovationsPendingSync, isAdminView]);

  const innovations = useMemo(() => {
    const innovationIdsWithDerivedSource = new Set(
      innovationSyncSources.map((item) => item.derivedInnovation.id),
    );
    const derivedRows = innovationSyncSources.map(
      ({ derivedInnovation, existingInnovation }) => ({
        ...derivedInnovation,
        hasInnovationDocument: Boolean(existingInnovation?.id),
      }),
    );
    const boardOnlyRows = innovationDocs
      .filter((innovation) => !innovationIdsWithDerivedSource.has(innovation.id))
      .map((innovation) =>
        normalizeInnovationRecord(innovation, {
          id: innovation.id,
        }),
      );

    return [...derivedRows, ...boardOnlyRows].sort(sortInnovations);
  }, [innovationDocs, innovationSyncSources]);

  useEffect(() => {
    innovationsRef.current = visibleInnovations;
  }, [visibleInnovations]);

  useEffect(() => {
    setActiveInnovationId((previous) => {
      if (previous && visibleInnovations.some((innovation) => innovation.id === previous)) {
        return previous;
      }

      const firstIdeaInnovation =
        visibleInnovations.find((innovation) => innovation.stage === INNOVATION_STAGE_IDEA) ||
        visibleInnovations[0] ||
        null;

      return firstIdeaInnovation?.id || "";
    });
  }, [visibleInnovations]);

  const loadingInnovations =
    loadingTeacherProfiles ||
    loadingEnrollments ||
    loadingMissionResponses ||
    loadingInnovationDocs;

  const activeInnovation = useMemo(
    () => visibleInnovations.find((innovation) => innovation.id === activeInnovationId) || null,
    [activeInnovationId, visibleInnovations],
  );

  const ensureInnovationDocument = useCallback(
    async (innovation) => {
      if (!innovation?.id) return null;

      const source = innovationSyncSourceById.get(innovation.id);
      if (!source) return innovation;

      return syncInnovationMetadata(source);
    },
    [innovationSyncSourceById],
  );

  const moveInnovationToStage = async ({ innovation, nextStage }) => {
    if (!currentUser?.uid || !isAdminView || !innovation?.id || !nextStage) return;

    const normalizedNextStage = normalizeInnovationStage(nextStage);
    if (innovation.stage === normalizedNextStage) return;

    const operatorName = resolveDisplayName({
      currentUser,
      userProfile,
    });

    setMovingInnovationId(innovation.id);
    startTransition(() => {
      const nextInnovations = patchInnovationStageLocally({
        previousInnovations: innovationsRef.current,
        innovationId: innovation.id,
        nextStage: normalizedNextStage,
        operatorId: currentUser.uid,
        operatorName,
      });
      innovationsRef.current = nextInnovations;
      setVisibleInnovations(nextInnovations);
      setActiveInnovationId(innovation.id);
    });

    try {
      await ensureInnovationDocument(innovation);
      await updateInnovationStage({
        innovationId: innovation.id,
        nextStage: normalizedNextStage,
        operatorId: currentUser.uid,
        operatorName,
      });
    } catch (error) {
      startTransition(() => {
        const revertedInnovations = innovationsRef.current
          .map((item) => (item.id === innovation.id ? innovation : item))
          .sort(sortInnovations);
        innovationsRef.current = revertedInnovations;
        setVisibleInnovations(revertedInnovations);
      });
      throw error;
    } finally {
      setMovingInnovationId("");
    }
  };

  useEffect(() => {
    setVisibleInnovations(innovations);
  }, [innovations]);

  return {
    innovations: visibleInnovations,
    activeInnovation,
    activeInnovationId,
    setActiveInnovationId,
    loadingInnovations,
    movingInnovationId,
    moveInnovationToStage,
    listenerError,
  };
}

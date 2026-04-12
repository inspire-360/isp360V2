import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  INNOVATIONS_COLLECTION,
  INNOVATION_STAGE_IDEA,
  normalizeInnovationStage,
  sortInnovations,
} from "../data/innovationKanban";
import { db } from "../lib/firebase";

const resolveDisplayName = ({ currentUser, userProfile }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  "ผู้ดูแล DU";

const normalizeInnovationRecord = (snapshotItem) => {
  const data = snapshotItem.data() || {};
  const summary =
    typeof data.summary === "string" && data.summary.trim()
      ? data.summary.trim()
      : typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : "";

  return {
    id: snapshotItem.id,
    ...data,
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : "นวัตกรรมที่ยังไม่ตั้งชื่อ",
    teacherName:
      data.teacherName ||
      data.teacherDisplayName ||
      data.ownerName ||
      "ยังไม่ระบุชื่อครู",
    schoolName: data.schoolName || data.school || "ยังไม่ระบุโรงเรียน",
    summary,
    description:
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : summary,
    focusArea: typeof data.focusArea === "string" ? data.focusArea : "",
    supportNeed: typeof data.supportNeed === "string" ? data.supportNeed : "",
    evidenceNote: typeof data.evidenceNote === "string" ? data.evidenceNote : "",
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean) : [],
    stage: normalizeInnovationStage(data.stage),
  };
};

const patchInnovationList = (previousInnovations, snapshot) => {
  if (previousInnovations.length === 0 || snapshot.docChanges().length === snapshot.docs.length) {
    return snapshot.docs.map(normalizeInnovationRecord).sort(sortInnovations);
  }

  const innovationMap = new Map(previousInnovations.map((innovation) => [innovation.id, innovation]));

  snapshot.docChanges().forEach((change) => {
    if (change.type === "removed") {
      innovationMap.delete(change.doc.id);
      return;
    }

    innovationMap.set(change.doc.id, normalizeInnovationRecord(change.doc));
  });

  return Array.from(innovationMap.values()).sort(sortInnovations);
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
  const [innovations, setInnovations] = useState([]);
  const [activeInnovationId, setActiveInnovationId] = useState("");
  const [loadingInnovations, setLoadingInnovations] = useState(true);
  const [movingInnovationId, setMovingInnovationId] = useState("");
  const [listenerError, setListenerError] = useState("");
  const innovationsRef = useRef([]);

  useEffect(() => {
    if (!currentUser?.uid || !isAdminView) {
      setInnovations([]);
      setActiveInnovationId("");
      setLoadingInnovations(false);
      setListenerError("");
      innovationsRef.current = [];
      return undefined;
    }

    setLoadingInnovations(true);
    setListenerError("");

    const unsubscribe = onSnapshot(
      collection(db, INNOVATIONS_COLLECTION),
      (snapshot) => {
        startTransition(() => {
          const nextInnovations = patchInnovationList(innovationsRef.current, snapshot);
          innovationsRef.current = nextInnovations;
          setInnovations(nextInnovations);
          setActiveInnovationId((previousActiveId) => {
            const nextIds = nextInnovations.map((item) => item.id);
            if (previousActiveId && nextIds.includes(previousActiveId)) {
              return previousActiveId;
            }

            const firstIdeaInnovation =
              nextInnovations.find((item) => item.stage === INNOVATION_STAGE_IDEA) ||
              nextInnovations[0] ||
              null;

            return firstIdeaInnovation?.id || "";
          });
          setLoadingInnovations(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถติดตามข้อมูลนวัตกรรมแบบเรียลไทม์ได้", {
          รหัสข้อผิดพลาด: error?.code || "ไม่ทราบรหัส",
          ข้อความระบบ: error?.message || "ไม่มีข้อความจากระบบ",
          คอลเลกชัน: INNOVATIONS_COLLECTION,
        });
        setListenerError("ไม่สามารถเชื่อมข้อมูลนวัตกรรมแบบทันทีได้");
        setLoadingInnovations(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, isAdminView]);

  const activeInnovation = useMemo(
    () => innovations.find((innovation) => innovation.id === activeInnovationId) || null,
    [activeInnovationId, innovations],
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
      setInnovations(nextInnovations);
      setActiveInnovationId(innovation.id);
    });

    try {
      await updateDoc(doc(db, INNOVATIONS_COLLECTION, innovation.id), {
        stage: normalizedNextStage,
        updatedAt: serverTimestamp(),
        lastMovedAt: serverTimestamp(),
        lastMovedById: currentUser.uid,
        lastMovedByName: operatorName,
      });
    } catch (error) {
      startTransition(() => {
        const revertedInnovations = innovationsRef.current
          .map((item) => (item.id === innovation.id ? innovation : item))
          .sort(sortInnovations);
        innovationsRef.current = revertedInnovations;
        setInnovations(revertedInnovations);
      });
      throw error;
    } finally {
      setMovingInnovationId("");
    }
  };

  return {
    innovations,
    activeInnovation,
    activeInnovationId,
    setActiveInnovationId,
    loadingInnovations,
    movingInnovationId,
    moveInnovationToStage,
    listenerError,
  };
}

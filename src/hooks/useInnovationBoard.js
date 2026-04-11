import { startTransition, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { INNOVATIONS_COLLECTION, sortInnovations } from "../data/innovationKanban";
import { db } from "../lib/firebase";

const resolveDisplayName = ({ currentUser, userProfile }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  "ผู้ดูแล DU";

const patchInnovationList = (previousInnovations, snapshot) => {
  if (previousInnovations.length === 0 || snapshot.docChanges().length === snapshot.docs.length) {
    return snapshot.docs
      .map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      .sort(sortInnovations);
  }

  const innovationMap = new Map(previousInnovations.map((innovation) => [innovation.id, innovation]));

  snapshot.docChanges().forEach((change) => {
    if (change.type === "removed") {
      innovationMap.delete(change.doc.id);
      return;
    }

    innovationMap.set(change.doc.id, {
      id: change.doc.id,
      ...change.doc.data(),
    });
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
            stage: nextStage,
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

  useEffect(() => {
    if (!currentUser?.uid || !isAdminView) {
      setInnovations([]);
      setActiveInnovationId("");
      setLoadingInnovations(false);
      return undefined;
    }

    setLoadingInnovations(true);

    const innovationsQuery = query(collection(db, INNOVATIONS_COLLECTION), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      innovationsQuery,
      (snapshot) => {
        startTransition(() => {
          setInnovations((previousInnovations) => patchInnovationList(previousInnovations, snapshot));
          setActiveInnovationId((previousActiveId) => {
            const nextIds = snapshot.docs.map((item) => item.id);
            if (previousActiveId && nextIds.includes(previousActiveId)) {
              return previousActiveId;
            }

            return nextIds[0] || "";
          });
          setLoadingInnovations(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถติดตามคอลเลกชันนวัตกรรมแบบเรียลไทม์ได้", {
          รหัสข้อผิดพลาด: error?.code || "ไม่ทราบรหัส",
          ข้อความระบบ: error?.message || "ไม่มีข้อความจากระบบ",
          คอลเลกชัน: INNOVATIONS_COLLECTION,
        });
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
    if (innovation.stage === nextStage) return;

    const operatorName = resolveDisplayName({
      currentUser,
      userProfile,
    });

    setMovingInnovationId(innovation.id);
    startTransition(() => {
      setInnovations((previousInnovations) =>
        patchInnovationStageLocally({
          previousInnovations,
          innovationId: innovation.id,
          nextStage,
          operatorId: currentUser.uid,
          operatorName,
        }),
      );
      setActiveInnovationId(innovation.id);
    });

    try {
      await updateDoc(doc(db, INNOVATIONS_COLLECTION, innovation.id), {
        stage: nextStage,
        updatedAt: serverTimestamp(),
        lastMovedAt: serverTimestamp(),
        lastMovedById: currentUser.uid,
        lastMovedByName: operatorName,
      });
    } catch (error) {
      startTransition(() => {
        setInnovations((previousInnovations) =>
          previousInnovations
            .map((item) => (item.id === innovation.id ? innovation : item))
            .sort(sortInnovations),
        );
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
  };
}

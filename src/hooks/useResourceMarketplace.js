import { startTransition, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  EXPERTS_COLLECTION,
  MATCH_REQUESTS_COLLECTION,
  expandExpertDirectoryRecords,
  sortExpertsByName,
  sortMatchRequests,
} from "../data/resourceMatchmaking";
import { seedExpertsDirectory as runExpertSeedDirectory } from "../utils/seedExpertsDirectory";

const resolveDisplayName = ({ currentUser, userProfile, userRole }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  (userRole === "admin" ? "ผู้ดูแล DU" : "ครู");

const buildExpertRows = (snapshot) =>
  expandExpertDirectoryRecords(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })),
  )
    .map((item) => ({
      ...item,
    }))
    .sort(sortExpertsByName);

export function useResourceMarketplace({ currentUser, userProfile, userRole, isAdminView }) {
  const [requests, setRequests] = useState([]);
  const [experts, setExperts] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingExperts, setLoadingExperts] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [assigningExpert, setAssigningExpert] = useState(false);
  const [completingRequest, setCompletingRequest] = useState(false);
  const [seedingExperts, setSeedingExperts] = useState(false);
  const [expertsError, setExpertsError] = useState("");

  useEffect(() => {
    if (!currentUser?.uid) {
      setRequests([]);
      setActiveRequestId("");
      setLoadingRequests(false);
      return undefined;
    }

    setLoadingRequests(true);

    const requestsRef = collection(db, MATCH_REQUESTS_COLLECTION);
    const requestsQuery = isAdminView
      ? query(requestsRef, orderBy("updatedAt", "desc"))
      : query(requestsRef, where("requesterId", "==", currentUser.uid), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const nextRequests = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort(sortMatchRequests);

        startTransition(() => {
          setRequests(nextRequests);
          setActiveRequestId((previous) => {
            if (previous && nextRequests.some((request) => request.id === previous)) {
              return previous;
            }

            return nextRequests[0]?.id || "";
          });
          setLoadingRequests(false);
        });
      },
      () => {
        setLoadingRequests(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, isAdminView]);

  useEffect(() => {
    if (!isAdminView || !currentUser?.uid) {
      setExperts([]);
      setExpertsError("");
      setLoadingExperts(false);
      return undefined;
    }

    setLoadingExperts(true);

    const expertsQuery = query(collection(db, EXPERTS_COLLECTION));

    const unsubscribe = onSnapshot(
      expertsQuery,
      (snapshot) => {
        const nextExperts = buildExpertRows(snapshot);

        startTransition(() => {
          setExperts(nextExperts);
          setExpertsError("");
          setLoadingExperts(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถดึงรายชื่อผู้เชี่ยวชาญจาก Firestore ได้", {
          รหัสข้อผิดพลาด: error?.code || "ไม่ทราบรหัส",
          ข้อความระบบ: error?.message || "ไม่มีข้อความจากระบบ",
          คอลเลกชัน: EXPERTS_COLLECTION,
          ผู้ใช้งาน: currentUser?.uid || "ไม่พบรหัสผู้ใช้",
        });
        setExpertsError("ไม่สามารถดึงรายชื่อผู้เชี่ยวชาญได้ กรุณาตรวจสอบสิทธิ์แอดมินและข้อมูลในคอลเลกชันผู้เชี่ยวชาญ");
        setLoadingExperts(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, isAdminView]);

  const refreshExpertsDirectory = async () => {
    if (!isAdminView || !currentUser?.uid) return [];

    const snapshot = await getDocs(query(collection(db, EXPERTS_COLLECTION)));
    const nextExperts = buildExpertRows(snapshot);

    startTransition(() => {
      setExperts(nextExperts);
      setExpertsError("");
      setLoadingExperts(false);
    });

    return nextExperts;
  };

  const activeRequest = useMemo(
    () => requests.find((request) => request.id === activeRequestId) || null,
    [activeRequestId, requests],
  );

  const createRequest = async ({ requestTitle, desiredExpertise, preferredFormat, requestDetails }) => {
    if (!currentUser?.uid) return;

    setCreatingRequest(true);

    try {
      const requestRef = doc(collection(db, MATCH_REQUESTS_COLLECTION));
      const requesterName = resolveDisplayName({
        currentUser,
        userProfile,
        userRole,
      });

      await setDoc(requestRef, {
        requesterId: currentUser.uid,
        requesterName,
        requesterRole: "teacher",
        schoolName: userProfile?.school || "",
        requestTitle: requestTitle.trim(),
        desiredExpertise: desiredExpertise.trim(),
        preferredFormat,
        requestDetails: requestDetails.trim(),
        status: "pending_match",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        matchedExpertId: "",
        matchedExpertName: "",
        matchedExpertTitle: "",
        matchedExpertPrimaryExpertise: "",
        matchedByAdminId: "",
        matchedByAdminName: "",
        matchedAt: null,
        completedAt: null,
        adminNote: "",
        latestUpdateText: "ทีม DU รับคำร้องแล้วและกำลังค้นหาผู้เชี่ยวชาญที่เหมาะสม",
      });

      setActiveRequestId(requestRef.id);
    } finally {
      setCreatingRequest(false);
    }
  };

  const seedExpertsDirectory = async () => {
    if (!isAdminView || !currentUser?.uid) {
      throw new Error("บัญชีนี้ไม่มีสิทธิ์นำเข้าฐานข้อมูลผู้เชี่ยวชาญ");
    }

    setSeedingExperts(true);

    try {
      const result = await runExpertSeedDirectory();
      await refreshExpertsDirectory();
      return result;
    } finally {
      setSeedingExperts(false);
    }
  };

  const assignExpertToRequest = async ({ request, expert, adminNote }) => {
    if (!isAdminView || !currentUser?.uid || !request?.id || !expert?.id) return;

    setAssigningExpert(true);

    try {
      const adminName = resolveDisplayName({
        currentUser,
        userProfile,
        userRole: "admin",
      });
      const trimmedNote = String(adminNote || "").trim();

      await updateDoc(doc(db, MATCH_REQUESTS_COLLECTION, request.id), {
        status: "matched",
        updatedAt: serverTimestamp(),
        matchedExpertId: expert.id,
        matchedExpertName: expert.displayName || "",
        matchedExpertTitle: expert.title || "",
        matchedExpertPrimaryExpertise: expert.primaryExpertise || "",
        matchedByAdminId: currentUser.uid,
        matchedByAdminName: adminName,
        matchedAt: request.matchedAt || serverTimestamp(),
        completedAt: null,
        adminNote: trimmedNote,
        latestUpdateText: `จับคู่กับ ${expert.displayName || "ผู้เชี่ยวชาญ"} แล้ว`,
      });
    } finally {
      setAssigningExpert(false);
    }
  };

  const completeRequest = async ({ request, adminNote }) => {
    if (!isAdminView || !currentUser?.uid || !request?.id) return;

    setCompletingRequest(true);

    try {
      const trimmedNote = String(adminNote || "").trim();
      const latestUpdateText = request.matchedExpertName
        ? `ปิดงานหลังประสานกับ ${request.matchedExpertName} เรียบร้อยแล้ว`
        : "ปิดงานคำร้องนี้เรียบร้อยแล้ว";

      await updateDoc(doc(db, MATCH_REQUESTS_COLLECTION, request.id), {
        status: "completed",
        updatedAt: serverTimestamp(),
        completedAt: request.completedAt || serverTimestamp(),
        adminNote: trimmedNote,
        latestUpdateText,
      });
    } finally {
      setCompletingRequest(false);
    }
  };

  return {
    requests,
    experts,
    activeRequest,
    activeRequestId,
    setActiveRequestId,
    loadingRequests,
    loadingExperts,
    creatingRequest,
    assigningExpert,
    completingRequest,
    seedingExperts,
    expertsError,
    createRequest,
    assignExpertToRequest,
    completeRequest,
    seedExpertsDirectory,
  };
}

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
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
  sortExpertsByName,
  sortMatchRequests,
} from "../data/resourceMatchmaking";

const resolveDisplayName = ({ currentUser, userProfile, userRole }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  (userRole === "admin" ? "ผู้ดูแล DU" : "ครู");

export function useResourceMarketplace({ currentUser, userProfile, userRole, isAdminView }) {
  const [requests, setRequests] = useState([]);
  const [experts, setExperts] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState("");
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingExperts, setLoadingExperts] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [assigningExpert, setAssigningExpert] = useState(false);
  const [completingRequest, setCompletingRequest] = useState(false);

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
      setLoadingExperts(false);
      return undefined;
    }

    setLoadingExperts(true);

    const expertsQuery = query(collection(db, EXPERTS_COLLECTION), orderBy("displayName", "asc"));

    const unsubscribe = onSnapshot(
      expertsQuery,
      (snapshot) => {
        const nextExperts = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort(sortExpertsByName);

        startTransition(() => {
          setExperts(nextExperts);
          setLoadingExperts(false);
        });
      },
      () => {
        setLoadingExperts(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, isAdminView]);

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
        requesterRole: userRole || "teacher",
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
    createRequest,
    assignExpertToRequest,
    completeRequest,
  };
}

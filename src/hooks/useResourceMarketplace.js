import { startTransition, useEffect, useMemo, useState } from "react";
import {
  assignMarketplaceExpert,
  completeMarketplaceRequest,
  createMatchRequest,
  listMarketplaceExperts,
  subscribeToMarketplaceExperts,
  subscribeToMatchRequests,
} from "../services/firebase/repositories/expertMatchRepository";
import { seedExpertsDirectory as runExpertSeedDirectory } from "../utils/seedExpertsDirectory";

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

    return subscribeToMatchRequests({
      currentUserId: currentUser.uid,
      isAdminView,
      onNext: (nextRequests) => {
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
      onError: () => {
        setLoadingRequests(false);
      },
    });
  }, [currentUser?.uid, isAdminView]);

  useEffect(() => {
    if (!isAdminView || !currentUser?.uid) {
      setExperts([]);
      setExpertsError("");
      setLoadingExperts(false);
      return undefined;
    }

    setLoadingExperts(true);

    return subscribeToMarketplaceExperts({
      onNext: (nextExperts) => {
        startTransition(() => {
          setExperts(nextExperts);
          setExpertsError("");
          setLoadingExperts(false);
        });
      },
      onError: (error) => {
        console.error("ไม่สามารถดึงรายชื่อผู้เชี่ยวชาญจาก Firestore ได้", {
          errorCode: error?.code || "unknown",
          message: error?.message || "No message from Firestore",
          userId: currentUser?.uid || "unknown",
        });
        setExpertsError("ไม่สามารถดึงรายชื่อผู้เชี่ยวชาญได้ กรุณาตรวจสอบสิทธิ์แอดมินและข้อมูลในฐานผู้เชี่ยวชาญ");
        setLoadingExperts(false);
      },
    });
  }, [currentUser?.uid, isAdminView]);

  const refreshExpertsDirectory = async () => {
    if (!isAdminView || !currentUser?.uid) return [];

    const nextExperts = await listMarketplaceExperts();

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

  const createMarketplaceRequest = async ({
    requestTitle,
    desiredExpertise,
    preferredFormat,
    priority,
    resourceType,
    requestDetails,
    needTags,
  }) => {
    if (!currentUser?.uid) return;

    setCreatingRequest(true);

    try {
      const nextRequest = await createMatchRequest({
        currentUser,
        userProfile,
        userRole,
        requestTitle,
        desiredExpertise,
        preferredFormat,
        priority,
        resourceType,
        requestDetails,
        needTags,
      });

      setActiveRequestId(nextRequest.id);
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
      await assignMarketplaceExpert({
        request,
        expert,
        adminUser: currentUser,
        adminProfile: userProfile,
        adminRole: userRole,
        adminNote,
      });
    } finally {
      setAssigningExpert(false);
    }
  };

  const completeRequest = async ({ request, adminNote, closedReason }) => {
    if (!isAdminView || !currentUser?.uid || !request?.id) return;

    setCompletingRequest(true);

    try {
      await completeMarketplaceRequest({
        request,
        adminNote,
        closedReason,
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
    createRequest: createMarketplaceRequest,
    assignExpertToRequest,
    completeRequest,
    seedExpertsDirectory,
  };
}

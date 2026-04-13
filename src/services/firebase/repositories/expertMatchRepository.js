import {
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import {
  expandExpertDirectoryRecords,
  sortExpertsByName,
  sortMatchRequests,
} from "../../../data/resourceMatchmaking";
import { EXPERTS_COLLECTION, MATCH_REQUESTS_COLLECTION } from "../collections";
import {
  buildMatchRequestAssignmentData,
  buildMatchRequestCompletionData,
  buildTeacherMatchRequestCreateData,
  normalizeExpertMatchRecord,
  normalizeMatchRequestRecord,
} from "../mappers/expertMatchMapper";
import { expertsCollectionRef, matchRequestDocRef, matchRequestsCollectionRef } from "../pathBuilders";

const buildExpertRows = (snapshot) =>
  expandExpertDirectoryRecords(
    snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })),
  )
    .map((item) =>
      normalizeExpertMatchRecord(item, {
        id: item.id,
      }),
    )
    .sort(sortExpertsByName);

const buildMatchRequestQuery = ({ currentUserId = "", isAdminView = false } = {}) => {
  const collectionRef = matchRequestsCollectionRef();
  if (isAdminView) {
    return query(collectionRef, orderBy("updatedAt", "desc"));
  }

  return query(
    collectionRef,
    where("requesterId", "==", currentUserId),
    orderBy("updatedAt", "desc"),
  );
};

export const subscribeToMatchRequests = (
  { currentUserId = "", isAdminView = false, onNext, onError } = {},
) => {
  if (!currentUserId) {
    onNext?.([]);
    return () => {};
  }

  return onSnapshot(
    buildMatchRequestQuery({ currentUserId, isAdminView }),
    (snapshot) => {
      const rows = snapshot.docs
        .map((item) =>
          normalizeMatchRequestRecord(item.data(), {
            id: item.id,
          }),
        )
        .sort(sortMatchRequests);

      onNext?.(rows);
    },
    onError,
  );
};

export const subscribeToMarketplaceExperts = ({ onNext, onError } = {}) =>
  onSnapshot(
    query(expertsCollectionRef()),
    (snapshot) => {
      onNext?.(buildExpertRows(snapshot));
    },
    onError,
  );

export const listMarketplaceExperts = async () => {
  const snapshot = await getDocs(query(expertsCollectionRef()));
  return buildExpertRows(snapshot);
};

export const createMatchRequest = async ({
  currentUser = null,
  userProfile = null,
  userRole = "",
  requestTitle = "",
  desiredExpertise = "",
  preferredFormat = "online",
  priority = "medium",
  resourceType = "consultation",
  requestDetails = "",
  needTags = [],
} = {}) => {
  if (!currentUser?.uid) {
    throw new Error("Current user is required to create a match request.");
  }

  const requestRef = matchRequestDocRef();
  const payload = buildTeacherMatchRequestCreateData({
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

  await setDoc(requestRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return normalizeMatchRequestRecord(
    {
      ...payload,
    },
    {
      id: requestRef.id,
    },
  );
};

export const assignMarketplaceExpert = async ({
  request = {},
  expert = {},
  adminUser = null,
  adminProfile = null,
  adminRole = "admin",
  adminNote = "",
} = {}) => {
  if (!request?.id || !expert?.id || !adminUser?.uid) {
    throw new Error("request, expert, and adminUser are required to assign an expert.");
  }

  const payload = buildMatchRequestAssignmentData({
    request,
    expert,
    adminUser,
    adminProfile,
    adminRole,
    adminNote,
  });

  await setDoc(
    matchRequestDocRef(request.id),
    {
      ...payload,
      updatedAt: serverTimestamp(),
      matchedAt: request?.matchedAt || serverTimestamp(),
      completedAt: null,
    },
    { merge: true },
  );
};

export const completeMarketplaceRequest = async ({
  request = {},
  adminNote = "",
  closedReason = "resolved",
} = {}) => {
  if (!request?.id) {
    throw new Error("request is required to complete a match request.");
  }

  const payload = buildMatchRequestCompletionData({
    request,
    adminNote,
    closedReason,
  });

  await setDoc(
    matchRequestDocRef(request.id),
    {
      ...payload,
      updatedAt: serverTimestamp(),
      matchedAt: request?.matchedAt || serverTimestamp(),
      completedAt: request?.completedAt || serverTimestamp(),
    },
    { merge: true },
  );
};

import { limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";
import {
  auditLogsCollectionRef,
  systemHealthCollectionRef,
} from "../pathBuilders";

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeAuditLog = (docSnapshot) => {
  const data = docSnapshot.data() || {};
  return {
    id: docSnapshot.id,
    ...data,
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

const normalizeHealthDoc = (docSnapshot) => {
  const data = docSnapshot.data() || {};
  return {
    id: docSnapshot.id,
    ...data,
    lastCheckedAtMs: toMillis(data.lastCheckedAt || data.checkedAt || data.updatedAt),
    updatedAtMs: toMillis(data.updatedAt),
  };
};

export const subscribeToAuditLogsV2 = ({ onNext, onError, requestedLimit = 100 } = {}) =>
  onSnapshot(
    query(auditLogsCollectionRef(), orderBy("createdAt", "desc"), limit(requestedLimit)),
    (snapshot) => {
      onNext?.(snapshot.docs.map(normalizeAuditLog));
    },
    onError,
  );

export const subscribeToSystemHealth = ({ onNext, onError } = {}) =>
  onSnapshot(
    systemHealthCollectionRef(),
    (snapshot) => {
      const rows = snapshot.docs
        .map(normalizeHealthDoc)
        .sort((left, right) => (right.lastCheckedAtMs || 0) - (left.lastCheckedAtMs || 0));
      onNext?.(rows);
    },
    onError,
  );

export const runMemberIntegrityCheck = async ({
  write = false,
  confirm = "",
  limit: requestedLimit = 1000,
} = {}) => {
  const callable = httpsCallable(functions, "runMemberIntegrityCheck");
  const response = await callable({
    write,
    confirm,
    limit: requestedLimit,
  });

  return response.data;
};

export const formatAuditHealthDateTime = (value, fallback = "-") => {
  const ms = toMillis(value);
  if (!ms) return fallback;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
};

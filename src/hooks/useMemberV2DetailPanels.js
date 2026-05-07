import { useEffect, useState } from "react";
import {
  subscribeToMemberAuditLogs,
  subscribeToMemberUsageDetails,
} from "../services/firebase/repositories/memberV2Repository";

const usageInitialState = {
  usage: null,
  loading: false,
  error: null,
};

const auditInitialState = {
  auditLogs: [],
  loading: false,
  error: null,
};

export function useMemberUsageDetails(uid, { enabled = false } = {}) {
  const [state, setState] = useState(usageInitialState);

  useEffect(() => {
    if (!enabled || !uid) return undefined;

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));
    });

    const unsubscribe = subscribeToMemberUsageDetails(uid, {
      onNext: (usage) => setState({ usage, loading: false, error: null }),
      onError: (error) => {
        console.error("Failed to subscribe userUsage:", error);
        setState((previous) => ({ ...previous, loading: false, error }));
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, uid]);

  return enabled && uid ? state : usageInitialState;
}

export function useMemberAuditLogs(uid, { enabled = false } = {}) {
  const [state, setState] = useState(auditInitialState);

  useEffect(() => {
    if (!enabled || !uid) return undefined;

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));
    });

    const unsubscribe = subscribeToMemberAuditLogs(uid, {
      onNext: (auditLogs) => setState({ auditLogs, loading: false, error: null }),
      onError: (error) => {
        console.error("Failed to subscribe auditLogs:", error);
        setState((previous) => ({ ...previous, loading: false, error }));
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, uid]);

  return enabled && uid ? state : auditInitialState;
}

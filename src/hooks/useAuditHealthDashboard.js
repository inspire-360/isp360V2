import { useEffect, useState } from "react";
import {
  subscribeToAuditLogsV2,
  subscribeToSystemHealth,
} from "../services/firebase/repositories/auditHealthRepository";

export const useAuditHealthDashboard = ({ enabled = true } = {}) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [healthDocs, setHealthDocs] = useState([]);
  const [auditError, setAuditError] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unsubscribeAudit = subscribeToAuditLogsV2({
      onNext: (rows) => {
        setAuditLogs(rows);
        setAuditError(null);
        setLoading(false);
      },
      onError: (error) => {
        setAuditError(error);
        setLoading(false);
      },
    });
    const unsubscribeHealth = subscribeToSystemHealth({
      onNext: (rows) => {
        setHealthDocs(rows);
        setHealthError(null);
      },
      onError: setHealthError,
    });

    return () => {
      unsubscribeAudit();
      unsubscribeHealth();
    };
  }, [enabled]);

  return {
    auditLogs,
    healthDocs,
    auditError,
    healthError,
    loading,
  };
};

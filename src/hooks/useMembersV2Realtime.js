import { useEffect, useState } from "react";
import { subscribeToMembersV2 } from "../services/firebase/repositories/memberV2Repository";

const initialState = {
  members: [],
  loading: true,
  error: null,
  lastUpdatedAt: null,
};

export function useMembersV2Realtime({ enabled = true, reloadKey = 0 } = {}) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unsubscribe = subscribeToMembersV2({
      onNext: (rows) => {
        setState({
          members: rows,
          loading: false,
          error: null,
          lastUpdatedAt: new Date(),
        });
      },
      onError: (error) => {
        console.error("Failed to subscribe members_v2:", error);
        setState((previous) => ({
          ...previous,
          loading: false,
          error,
          lastUpdatedAt: new Date(),
        }));
      },
    });

    return () => unsubscribe();
  }, [enabled, reloadKey]);

  return enabled ? state : { ...initialState, loading: false };
}

import { useEffect, useMemo, useState } from "react";
import {
  subscribeToMissionResponses,
} from "../services/firebase/repositories/missionResponseRepository";
import {
  subscribeToUserEnrollmentSummaries,
} from "../services/firebase/repositories/enrollmentRepository";
import {
  buildEnrollmentInsight,
  buildPainPointCloud,
  collectModuleOneAnswerResponseGroups,
  collectMissionPainPointSignals,
} from "../utils/duMemberInsights";

const initialState = {
  enrollments: [],
  missionResponsesByCourseId: {},
  loading: false,
  error: null,
};

export function useMemberLearningDetails(uid, { enabled = false } = {}) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!enabled || !uid) {
      return undefined;
    }

    let active = true;
    let missionUnsubscribers = [];
    queueMicrotask(() => {
      if (!active) return;
      setState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));
    });

    const unsubscribeEnrollments = subscribeToUserEnrollmentSummaries(uid, {
      onNext: (enrollments) => {
        missionUnsubscribers.forEach((unsubscribe) => unsubscribe());
        missionUnsubscribers = [];

        setState((previous) => ({
          ...previous,
          enrollments,
          missionResponsesByCourseId: {},
          loading: false,
          error: null,
        }));

        missionUnsubscribers = enrollments
          .map((enrollment) => enrollment.courseId || enrollment.id)
          .filter(Boolean)
          .map((courseId) =>
            subscribeToMissionResponses(uid, courseId, {
              onNext: (responses) => {
                const responseMap = Object.fromEntries(
                  responses.map((response) => [response.missionId || response.id, response]),
                );
                setState((previous) => ({
                  ...previous,
                  missionResponsesByCourseId: {
                    ...previous.missionResponsesByCourseId,
                    [courseId]: responseMap,
                  },
                }));
              },
              onError: (error) => {
                console.error("Failed to subscribe member mission responses:", error);
                setState((previous) => ({
                  ...previous,
                  error,
                }));
              },
            }),
          );
      },
      onError: (error) => {
        console.error("Failed to subscribe member enrollments:", error);
        setState((previous) => ({
          ...previous,
          loading: false,
          error,
        }));
      },
    });

    return () => {
      active = false;
      unsubscribeEnrollments();
      missionUnsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [enabled, uid]);

  const enrollmentInsights = useMemo(
    () =>
      state.enrollments.map((enrollment) =>
        buildEnrollmentInsight({
          ...enrollment,
          missionResponsesMap:
            state.missionResponsesByCourseId[enrollment.courseId || enrollment.id] || {},
        }),
      ),
    [state.enrollments, state.missionResponsesByCourseId],
  );

  const painPointCloud = useMemo(
    () => buildPainPointCloud(collectMissionPainPointSignals(enrollmentInsights)),
    [enrollmentInsights],
  );

  const moduleOneAnswerGroups = useMemo(
    () => collectModuleOneAnswerResponseGroups(enrollmentInsights),
    [enrollmentInsights],
  );

  return enabled && uid
    ? {
        ...state,
        enrollmentInsights,
        moduleOneAnswerGroups,
        painPointCloud,
      }
    : {
        ...initialState,
        enrollmentInsights: [],
        moduleOneAnswerGroups: [],
        painPointCloud: [],
      };
}

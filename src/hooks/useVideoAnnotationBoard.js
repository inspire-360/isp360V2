import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { resolvePlayableVideoSource } from "../data/videoAnnotations";
import { db } from "../lib/firebase";
import {
  buildTeacherDisplayName,
  buildVideoReviewId,
  buildVideoReviewRecord,
  normalizeVideoReviewRecord,
  shouldSyncVideoReviewMetadata,
  VIDEO_REVIEW_COURSE_ID,
} from "../services/firebase/mappers/videoMapper";
import { getMissionResponseEnrollmentKey } from "../services/firebase/mappers/missionResponseMapper";
import { subscribeToMissionResponseCollectionGroup } from "../services/firebase/repositories/missionResponseRepository";
import {
  createVideoComment,
  subscribeToVideoComments,
  subscribeToVideoReviews,
  syncVideoReviewMetadata,
  updateVideoDuration,
  updateVideoReviewStatus,
} from "../services/firebase/repositories/videoRepository";

const USERS_COLLECTION = "users";
const ENROLLMENTS_SUBCOLLECTION = "enrollments";

const resolveDisplayName = ({ currentUser, userProfile, userRole }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  (userRole === "admin" ? "ผู้ดูแล DU" : "ครู");

const sortVideosByUpdatedAt = (left, right) =>
  Number(right?.updatedAtMs || 0) - Number(left?.updatedAtMs || 0);

const buildVideoSyncSources = ({
  enrollments,
  teachers,
  reviewDocs,
  missionResponsesByEnrollmentKey,
}) => {
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const reviewMap = new Map(reviewDocs.map((video) => [video.id, video]));

  return enrollments.flatMap((enrollment) => {
    const missionResponses =
      missionResponsesByEnrollmentKey[
        getMissionResponseEnrollmentKey({
          userId: enrollment.teacherId,
          courseId: enrollment.courseId || enrollment.enrollmentId,
        })
      ] || {};

    const existingVideo = normalizeVideoReviewRecord(
      reviewMap.get(
        buildVideoReviewId({
          teacherId: enrollment.teacherId,
          enrollmentId: enrollment.enrollmentId,
          courseId: enrollment.courseId,
        }),
      ) || {},
    );

    const derivedVideo = buildVideoReviewRecord({
      enrollment,
      teacherProfile: teacherMap.get(enrollment.teacherId) || {},
      missionResponses,
      existingVideo,
    });

    if (!derivedVideo.videoUrl) {
      return [];
    }

    return [
      {
        derivedVideo,
        enrollment,
        teacherProfile: teacherMap.get(enrollment.teacherId) || {},
        missionResponses,
        existingVideo,
      },
    ];
  });
};

export function useVideoAnnotationBoard({ currentUser, userProfile, userRole }) {
  const [teacherProfiles, setTeacherProfiles] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [missionResponsesByEnrollmentKey, setMissionResponsesByEnrollmentKey] = useState({});
  const [reviewDocs, setReviewDocs] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState("");
  const [readyCommentVideoId, setReadyCommentVideoId] = useState("");
  const [comments, setComments] = useState([]);
  const [loadingTeacherProfiles, setLoadingTeacherProfiles] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [loadingMissionResponses, setLoadingMissionResponses] = useState(true);
  const [loadingReviewDocs, setLoadingReviewDocs] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setTeacherProfiles([]);
      setEnrollments([]);
      setMissionResponsesByEnrollmentKey({});
      setReviewDocs([]);
      setActiveVideoId("");
      setReadyCommentVideoId("");
      setComments([]);
      setLoadingTeacherProfiles(false);
      setLoadingEnrollments(false);
      setLoadingMissionResponses(false);
      setLoadingReviewDocs(false);
      return undefined;
    }

    setLoadingTeacherProfiles(true);
    setLoadingEnrollments(true);
    setLoadingMissionResponses(true);
    setLoadingReviewDocs(true);

    const unsubscribeTeachers = onSnapshot(
      query(collection(db, USERS_COLLECTION)),
      (snapshot) => {
        const nextTeachers = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        startTransition(() => {
          setTeacherProfiles(nextTeachers);
          setLoadingTeacherProfiles(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถดึงรายชื่อครูสำหรับจับคู่วิดีโอได้", error);
        setLoadingTeacherProfiles(false);
      },
    );

    const unsubscribeEnrollments = onSnapshot(
      query(
        collectionGroup(db, ENROLLMENTS_SUBCOLLECTION),
        where("courseId", "==", VIDEO_REVIEW_COURSE_ID),
      ),
      (snapshot) => {
        const nextEnrollments = snapshot.docs.map((item) => ({
          id: item.id,
          enrollmentId: item.id,
          teacherId: item.ref.parent.parent?.id || "",
          path: item.ref.path,
          ...item.data(),
        }));

        startTransition(() => {
          setEnrollments(nextEnrollments);
          setLoadingEnrollments(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถดึงข้อมูลลงทะเบียนคอร์สครูสำหรับห้องโค้ชวิดีโอได้", error);
        setLoadingEnrollments(false);
      },
    );

    const unsubscribeMissionResponses = subscribeToMissionResponseCollectionGroup({
      courseId: VIDEO_REVIEW_COURSE_ID,
      onNext: (rows) => {
        const nextMissionResponsesByEnrollmentKey = rows.reduce((accumulator, row) => {
          const key = getMissionResponseEnrollmentKey(row);
          if (!key || !row.missionId) return accumulator;

          accumulator[key] = {
            ...(accumulator[key] || {}),
            [row.missionId]: row,
          };

          return accumulator;
        }, {});

        startTransition(() => {
          setMissionResponsesByEnrollmentKey(nextMissionResponsesByEnrollmentKey);
          setLoadingMissionResponses(false);
        });
      },
      onError: (error) => {
        console.error("ไม่สามารถดึงภารกิจย่อยของคอร์สครูสำหรับห้องโค้ชวิดีโอได้", error);
        setLoadingMissionResponses(false);
      },
    });

    const unsubscribeReviewDocs = subscribeToVideoReviews({
      onNext: (rows) => {
        startTransition(() => {
          setReviewDocs(rows);
          setLoadingReviewDocs(false);
        });
      },
      onError: (error) => {
        console.error("ไม่สามารถดึงสถานะรีวิววิดีโอได้", error);
        setLoadingReviewDocs(false);
      },
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeEnrollments();
      unsubscribeMissionResponses();
      unsubscribeReviewDocs();
    };
  }, [currentUser?.uid]);

  const videoSyncSources = useMemo(
    () =>
      buildVideoSyncSources({
        enrollments,
        teachers: teacherProfiles,
        reviewDocs,
        missionResponsesByEnrollmentKey,
      }),
    [enrollments, missionResponsesByEnrollmentKey, reviewDocs, teacherProfiles],
  );

  const videoSyncSourceById = useMemo(
    () =>
      new Map(
        videoSyncSources.map((item) => [
          item.derivedVideo.id,
          item,
        ]),
      ),
    [videoSyncSources],
  );

  const videosPendingSync = useMemo(
    () =>
      videoSyncSources.filter(
        ({ existingVideo, derivedVideo }) =>
          !existingVideo?.id || shouldSyncVideoReviewMetadata(existingVideo, derivedVideo),
      ),
    [videoSyncSources],
  );

  useEffect(() => {
    if (!currentUser?.uid || userRole !== "admin" || videosPendingSync.length === 0) {
      return undefined;
    }

    let cancelled = false;

    const syncMissingMetadata = async () => {
      for (const source of videosPendingSync) {
        if (cancelled) return;

        try {
          await syncVideoReviewMetadata(source);
        } catch (error) {
          console.error("ไม่สามารถซิงก์ metadata ของวิดีโอสำหรับห้องโค้ชได้", error);
        }
      }
    };

    void syncMissingMetadata();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, userRole, videosPendingSync]);

  const videos = useMemo(() => {
    const reviewIdsWithDerivedSource = new Set(videoSyncSources.map((item) => item.derivedVideo.id));
    const derivedRows = videoSyncSources.map(({ derivedVideo, existingVideo }) => ({
      ...derivedVideo,
      teacherName: buildTeacherDisplayName({
        teacherId: derivedVideo.teacherId,
        fallbackName: existingVideo.teacherName,
      }),
      playerSource: resolvePlayableVideoSource(derivedVideo.videoUrl),
      hasReviewDocument: Boolean(existingVideo?.id),
    }));
    const reviewOnlyRows = reviewDocs
      .filter((video) => !reviewIdsWithDerivedSource.has(video.id))
      .map((video) => ({
        ...normalizeVideoReviewRecord(video, {
          id: video.id,
        }),
        playerSource: resolvePlayableVideoSource(video.videoUrl),
        hasReviewDocument: true,
      }));

    return [...derivedRows, ...reviewOnlyRows].sort(sortVideosByUpdatedAt);
  }, [reviewDocs, videoSyncSources]);

  const loadingVideos =
    loadingTeacherProfiles || loadingEnrollments || loadingMissionResponses || loadingReviewDocs;

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === activeVideoId) || null,
    [activeVideoId, videos],
  );

  const ensureVideoReviewDocument = useCallback(
    async (video) => {
      if (!video?.id) return null;

      const source = videoSyncSourceById.get(video.id);
      return syncVideoReviewMetadata(
        source || {
          existingVideo: video,
        },
      );
    },
    [videoSyncSourceById],
  );

  useEffect(() => {
    setActiveVideoId((previous) => {
      if (previous && videos.some((video) => video.id === previous)) {
        return previous;
      }

      return videos[0]?.id || "";
    });
  }, [videos]);

  useEffect(() => {
    if (!activeVideo?.id) {
      setReadyCommentVideoId("");
      return undefined;
    }

    let cancelled = false;
    setReadyCommentVideoId("");

    const prepareComments = async () => {
      try {
        await ensureVideoReviewDocument(activeVideo);
        if (!cancelled) {
          setReadyCommentVideoId(activeVideo.id);
        }
      } catch (error) {
        console.error("ไม่สามารถเตรียมเอกสารรีวิววิดีโอสำหรับการโค้ชได้", error);
        if (!cancelled) {
          setReadyCommentVideoId("");
        }
      }
    };

    void prepareComments();

    return () => {
      cancelled = true;
    };
  }, [activeVideo, ensureVideoReviewDocument]);

  useEffect(() => {
    if (!readyCommentVideoId) {
      setComments([]);
      setLoadingComments(false);
      return undefined;
    }

    setLoadingComments(true);

    const unsubscribe = subscribeToVideoComments(readyCommentVideoId, {
      onNext: (nextComments) => {
        startTransition(() => {
          setComments(nextComments);
          setLoadingComments(false);
        });
      },
      onError: (error) => {
        console.error("ไม่สามารถดึงไทม์ไลน์คอมเมนต์วิดีโอได้", error);
        setLoadingComments(false);
      },
    });

    return () => unsubscribe();
  }, [readyCommentVideoId]);

  const addComment = async ({ video, body, timestampSeconds }) => {
    if (!currentUser?.uid || !video?.id) return;

    setSavingComment(true);

    try {
      await ensureVideoReviewDocument(video);
      await createVideoComment({
        video,
        authorId: currentUser.uid,
        authorName: resolveDisplayName({
          currentUser,
          userProfile,
          userRole,
        }),
        authorRole: "admin",
        body,
        timestampSeconds,
      });
    } finally {
      setSavingComment(false);
    }
  };

  const updateReviewStatus = async ({ video, nextStatus }) => {
    if (!video?.id) return;

    setUpdatingStatus(true);

    try {
      await ensureVideoReviewDocument(video);
      await updateVideoReviewStatus({
        videoId: video.id,
        nextStatus,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const saveDuration = async ({ video, durationSeconds }) => {
    const nextDuration = Math.max(0, Math.floor(Number(durationSeconds) || 0));
    if (!video?.id || !nextDuration) return;
    if (Number(video.durationSeconds || 0) === nextDuration) return;

    setSavingDuration(true);

    try {
      await ensureVideoReviewDocument(video);
      await updateVideoDuration({
        videoId: video.id,
        durationSeconds: nextDuration,
      });
    } finally {
      setSavingDuration(false);
    }
  };

  return {
    videos,
    activeVideo,
    activeVideoId,
    setActiveVideoId,
    comments,
    loadingVideos,
    loadingComments,
    savingComment,
    updatingStatus,
    savingDuration,
    addComment,
    updateReviewStatus,
    saveDuration,
  };
}

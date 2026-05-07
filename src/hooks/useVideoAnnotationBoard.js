import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
} from "firebase/firestore";
import { resolvePlayableVideoSource } from "../data/videoAnnotations";
import { db } from "../lib/firebase";
import {
  buildTeacherDisplayName,
  buildVideoReviewId,
  buildVideoReviewRecord,
  isUsableVideoReviewUrl,
  normalizeVideoReviewRecord,
  shouldSyncVideoReviewMetadata,
  VIDEO_REVIEW_COURSE_ID,
  VIDEO_SOURCE_MISSION_ID,
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

const normalizeString = (value = "") => String(value || "").trim();

const pickFirstString = (...candidates) =>
  candidates.map((candidate) => normalizeString(candidate)).find(Boolean) || "";

const hasPlaceholderVideoUrlText = (value = "") => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("ใส่ลิงก์") ||
    normalized.includes("google drive / youtube") ||
    normalized.includes("https://...")
  );
};

const isDisplayableSubmittedVideoUrl = (value = "") => {
  const normalized = normalizeString(value);
  if (!normalized) return false;
  if (normalized.toLowerCase().startsWith("file://")) return false;
  if (hasPlaceholderVideoUrlText(normalized)) return false;

  try {
    const parsedUrl = new URL(normalized);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const isTeacherCoursePath = (path = "") =>
  String(path || "").includes(`/enrollments/${VIDEO_REVIEW_COURSE_ID}`);

const isTeacherCourseEnrollment = (enrollment = {}) => {
  const courseId = normalizeString(enrollment.courseId);
  const enrollmentId = normalizeString(enrollment.enrollmentId || enrollment.id);

  return (
    courseId === VIDEO_REVIEW_COURSE_ID ||
    enrollmentId === VIDEO_REVIEW_COURSE_ID ||
    isTeacherCoursePath(enrollment.path)
  );
};

const isTeacherCourseMissionResponse = (row = {}) => {
  const courseId = normalizeString(row.courseId);
  const enrollmentId = normalizeString(row.enrollmentId);

  return (
    courseId === VIDEO_REVIEW_COURSE_ID ||
    enrollmentId === VIDEO_REVIEW_COURSE_ID ||
    isTeacherCoursePath(row.enrollmentPath) ||
    isTeacherCoursePath(row.path)
  );
};

const getObjectRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const getMissionIdFromRecord = (record = {}) =>
  pickFirstString(
    record.missionId,
    record.id,
    record.lessonId,
    record.key,
    record.missionKey,
    record.slug,
  );

const toMissionResponseMap = (value) => {
  if (Array.isArray(value)) {
    return value.reduce((accumulator, item) => {
      const record = getObjectRecord(item);
      const missionId = getMissionIdFromRecord(record);
      if (!missionId) return accumulator;

      accumulator[missionId] = {
        ...record,
        missionId,
      };
      return accumulator;
    }, {});
  }

  return Object.entries(getObjectRecord(value)).reduce((accumulator, [key, item]) => {
    const record = getObjectRecord(item);
    if (!Object.keys(record).length) return accumulator;

    const missionId = getMissionIdFromRecord(record) || normalizeString(key);
    if (!missionId) return accumulator;

    accumulator[missionId] = {
      ...record,
      missionId,
    };
    return accumulator;
  }, {});
};

const normalizeMissionOneClipLinkRecord = (record = {}) => {
  const source = getObjectRecord(record);
  const clipLink = pickFirstString(
    source.clipLink,
    source.clip_link,
    source.clipUrl,
    source.clipURL,
    source.videoUrl,
    source.videoURL,
    source.videoLink,
    source.teachingClipLink,
    source.teachingClipUrl,
    source.link,
    source.url,
    source["clip link"],
    source["Clip Link"],
    source["video link"],
    source["Video Link"],
    source["ลิงก์คลิปการสอนจริง"],
    source["ลิงค์คลิปการสอนจริง"],
    source["ลิงก์คลิป"],
    source["ลิงค์คลิป"],
    source.evidenceLink,
    source.evidenceUrl,
    source.content?.clipLink,
    source.answer?.clipLink,
    source.answers?.clipLink,
    source.data?.clipLink,
    source.content?.answer?.clipLink,
    source.answer?.content?.clipLink,
    source.answers?.content?.clipLink,
    source.payload?.clipLink,
    source.payload?.answer?.clipLink,
    source.payload?.answers?.clipLink,
  );

  return clipLink
    ? {
        ...source,
        clipLink,
      }
    : source;
};

const resolveEnrollmentMissionResponseMap = (enrollment = {}) => {
  const candidateMaps = [
    enrollment.missionResponsesMap,
    enrollment.missionResponses,
    enrollment.responses,
    enrollment.responseMap,
    enrollment.answers,
    enrollment.lessonResponses,
    enrollment.moduleResponses,
    enrollment.modules,
  ].map(toMissionResponseMap);

  const mergedResponses = candidateMaps.reduce(
    (accumulator, item) => ({
      ...accumulator,
      ...item,
    }),
    {},
  );

  const legacyMissionOne = normalizeMissionOneClipLinkRecord(
    mergedResponses[VIDEO_SOURCE_MISSION_ID] ||
      enrollment.missionOne ||
      enrollment.moduleFiveMissionOne ||
      enrollment.module5MissionOne ||
      enrollment.m5MissionOne ||
      enrollment.realClassroom ||
      enrollment.teachingClip ||
      enrollment.module5?.missionOne ||
      enrollment.module5?.[VIDEO_SOURCE_MISSION_ID] ||
      enrollment.module5?.realClassroom,
  );
  const legacyClipLink = pickFirstString(
    legacyMissionOne.clipLink,
    enrollment.clipLink,
    enrollment.clip_link,
    enrollment.clipUrl,
    enrollment.clipURL,
    enrollment.videoUrl,
    enrollment.videoURL,
    enrollment.videoLink,
    enrollment.link,
    enrollment.url,
    enrollment["clip link"],
    enrollment["Clip Link"],
    enrollment["video link"],
    enrollment["Video Link"],
    enrollment["ลิงก์คลิปการสอนจริง"],
    enrollment["ลิงค์คลิปการสอนจริง"],
    enrollment["ลิงก์คลิป"],
    enrollment["ลิงค์คลิป"],
    enrollment.teachingClipLink,
    enrollment.teachingClipUrl,
    enrollment.realClassroomClipLink,
    enrollment.moduleFiveClipLink,
    enrollment.missionOne?.clipLink,
    enrollment.moduleFiveMissionOne?.clipLink,
    enrollment.module5MissionOne?.clipLink,
    enrollment.m5MissionOne?.clipLink,
    enrollment.realClassroom?.clipLink,
    enrollment.teachingClip?.clipLink,
    enrollment.content?.clipLink,
    enrollment.answer?.clipLink,
    enrollment.answers?.clipLink,
    enrollment.data?.clipLink,
    enrollment.module5?.missionOne?.clipLink,
    enrollment.module5?.[VIDEO_SOURCE_MISSION_ID]?.clipLink,
    enrollment.module5?.realClassroom?.clipLink,
  );

  if (!legacyClipLink && !Object.keys(legacyMissionOne).length) {
    return mergedResponses;
  }

  const existingMissionOne = normalizeMissionOneClipLinkRecord(mergedResponses[VIDEO_SOURCE_MISSION_ID]);
  return {
    ...mergedResponses,
    [VIDEO_SOURCE_MISSION_ID]: {
      ...legacyMissionOne,
      ...existingMissionOne,
      clipLink: pickFirstString(existingMissionOne.clipLink, legacyClipLink),
    },
  };
};

const buildVideoSyncSources = ({
  enrollments,
  teachers,
  reviewDocs,
  missionResponsesByEnrollmentKey,
}) => {
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const reviewMap = new Map(reviewDocs.map((video) => [video.id, video]));
  const sourceKeysWithEnrollment = new Set();

  const enrollmentSources = enrollments.flatMap((enrollment) => {
    const enrollmentKey = getMissionResponseEnrollmentKey({
      userId: enrollment.teacherId,
      courseId: enrollment.courseId || enrollment.enrollmentId,
    });
    if (enrollmentKey) {
      sourceKeysWithEnrollment.add(enrollmentKey);
    }
    const canonicalMissionResponses =
      missionResponsesByEnrollmentKey[enrollmentKey] || {};
    const enrollmentMissionResponses = resolveEnrollmentMissionResponseMap(enrollment);
    const missionResponses = {
      ...enrollmentMissionResponses,
      ...canonicalMissionResponses,
    };
    if (enrollmentMissionResponses[VIDEO_SOURCE_MISSION_ID]) {
      missionResponses[VIDEO_SOURCE_MISSION_ID] = {
        ...enrollmentMissionResponses[VIDEO_SOURCE_MISSION_ID],
        ...(canonicalMissionResponses[VIDEO_SOURCE_MISSION_ID] || {}),
        clipLink: pickFirstString(
          canonicalMissionResponses[VIDEO_SOURCE_MISSION_ID]?.clipLink,
          enrollmentMissionResponses[VIDEO_SOURCE_MISSION_ID]?.clipLink,
        ),
      };
    }
    if (missionResponses[VIDEO_SOURCE_MISSION_ID]) {
      missionResponses[VIDEO_SOURCE_MISSION_ID] = normalizeMissionOneClipLinkRecord(
        missionResponses[VIDEO_SOURCE_MISSION_ID],
      );
    }

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

    if (!isDisplayableSubmittedVideoUrl(derivedVideo.videoUrl)) {
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

  const missionResponseOnlySources = Object.entries(missionResponsesByEnrollmentKey).flatMap(
    ([enrollmentKey, missionResponses]) => {
      if (!enrollmentKey || sourceKeysWithEnrollment.has(enrollmentKey)) {
        return [];
      }

      const [teacherId = "", courseId = VIDEO_REVIEW_COURSE_ID] = enrollmentKey.split("::");
      const missionOne = normalizeMissionOneClipLinkRecord(missionResponses[VIDEO_SOURCE_MISSION_ID]);
      if (!isDisplayableSubmittedVideoUrl(missionOne.clipLink)) {
        return [];
      }

      const enrollment = {
        id: courseId || VIDEO_REVIEW_COURSE_ID,
        enrollmentId: courseId || VIDEO_REVIEW_COURSE_ID,
        courseId: courseId || VIDEO_REVIEW_COURSE_ID,
        teacherId,
        path: missionOne.enrollmentPath || "",
      };
      const normalizedMissionResponses = {
        ...missionResponses,
        [VIDEO_SOURCE_MISSION_ID]: missionOne,
      };
      const existingVideo = normalizeVideoReviewRecord(
        reviewMap.get(
          buildVideoReviewId({
            teacherId,
            enrollmentId: enrollment.enrollmentId,
            courseId: enrollment.courseId,
          }),
        ) || {},
      );
      const teacherProfile = teacherMap.get(teacherId) || {};
      const derivedVideo = buildVideoReviewRecord({
        enrollment,
        teacherProfile,
        missionResponses: normalizedMissionResponses,
        existingVideo,
      });

      if (!isDisplayableSubmittedVideoUrl(derivedVideo.videoUrl)) {
        return [];
      }

      return [
        {
          derivedVideo,
          enrollment,
          teacherProfile,
          missionResponses: normalizedMissionResponses,
          existingVideo,
        },
      ];
    },
  );

  return [...enrollmentSources, ...missionResponseOnlySources];
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
      collectionGroup(db, ENROLLMENTS_SUBCOLLECTION),
      (snapshot) => {
        const nextEnrollments = snapshot.docs
          .map((item) => {
            const data = item.data() || {};
            return {
              ...data,
              id: item.id,
              enrollmentId: item.id,
              teacherId: item.ref.parent.parent?.id || data.teacherId || "",
              path: item.ref.path,
              courseId: data.courseId || item.id,
            };
          })
          .filter(isTeacherCourseEnrollment);

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
      onNext: (rows) => {
        const nextMissionResponsesByEnrollmentKey = rows.filter(isTeacherCourseMissionResponse).reduce((accumulator, row) => {
          const key = getMissionResponseEnrollmentKey(row);
          if (!key || !row.missionId) return accumulator;

          const normalizedRow =
            row.missionId === VIDEO_SOURCE_MISSION_ID
              ? normalizeMissionOneClipLinkRecord(row)
              : row;

          accumulator[key] = {
            ...(accumulator[key] || {}),
            [row.missionId]: normalizedRow,
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
          isUsableVideoReviewUrl(derivedVideo.videoUrl) &&
          (!existingVideo?.id || shouldSyncVideoReviewMetadata(existingVideo, derivedVideo)),
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
    const teacherMap = new Map(teacherProfiles.map((teacher) => [teacher.id, teacher]));
    const derivedRows = videoSyncSources.map(({ derivedVideo, existingVideo, teacherProfile }) => ({
      ...derivedVideo,
      teacherName: buildTeacherDisplayName({
        teacherId: derivedVideo.teacherId,
        teacherProfile,
        fallbackName: existingVideo.teacherName || derivedVideo.teacherName,
      }),
      playerSource: resolvePlayableVideoSource(derivedVideo.videoUrl),
      hasReviewDocument: Boolean(existingVideo?.id),
    }));
    const reviewOnlyRows = reviewDocs
      .filter((video) => !reviewIdsWithDerivedSource.has(video.id))
      .filter((video) => isDisplayableSubmittedVideoUrl(video.videoUrl))
      .map((video) => {
        const normalizedVideo = normalizeVideoReviewRecord(video, {
          id: video.id,
        });

        return {
          ...normalizedVideo,
          teacherName: buildTeacherDisplayName({
            teacherId: normalizedVideo.teacherId,
            teacherProfile: teacherMap.get(normalizedVideo.teacherId) || {},
            fallbackName: normalizedVideo.teacherName,
          }),
          playerSource: resolvePlayableVideoSource(video.videoUrl),
          hasReviewDocument: true,
        };
      });

    return [...derivedRows, ...reviewOnlyRows].sort(sortVideosByUpdatedAt);
  }, [reviewDocs, teacherProfiles, videoSyncSources]);

  const videoSourceStats = useMemo(
    () => {
      const missionResponseEnrollmentCount = Object.keys(missionResponsesByEnrollmentKey).length;
      const playableVideoCount = videos.filter((video) => video.playerSource?.canPlay).length;
      const externalOnlyVideoCount = videos.filter(
        (video) => video.videoUrl && !video.playerSource?.canPlay,
      ).length;

      return {
        teacherProfiles: teacherProfiles.length,
        enrollments: enrollments.length,
        missionResponseEnrollments: missionResponseEnrollmentCount,
        reviewDocs: reviewDocs.length,
        displayableVideos: videos.length,
        playableVideos: playableVideoCount,
        externalOnlyVideos: externalOnlyVideoCount,
      };
    },
    [enrollments.length, missionResponsesByEnrollmentKey, reviewDocs.length, teacherProfiles.length, videos],
  );

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
    videoSourceStats,
    savingComment,
    updatingStatus,
    savingDuration,
    addComment,
    updateReviewStatus,
    saveDuration,
  };
}

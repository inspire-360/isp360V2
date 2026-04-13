import { startTransition, useEffect, useMemo, useState } from "react";
import {
  collection,
  collectionGroup,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  buildVideoCommentPreview,
  resolvePlayableVideoSource,
  sortVideoComments,
  VIDEO_COMMENTS_SUBCOLLECTION,
  VIDEOS_COLLECTION,
} from "../data/videoAnnotations";
import { db } from "../lib/firebase";
import { getMissionResponseEnrollmentKey } from "../services/firebase/mappers/missionResponseMapper";
import { subscribeToMissionResponseCollectionGroup } from "../services/firebase/repositories/missionResponseRepository";

const USERS_COLLECTION = "users";
const ENROLLMENTS_SUBCOLLECTION = "enrollments";
const TEACHER_COURSE_ID = "course-teacher";
const MODULE_FOUR_MISSION_ONE_ID = "m4-mission-1";
const MODULE_FOUR_MISSION_TWO_ID = "m4-mission-2";
const MODULE_FIVE_MISSION_ONE_ID = "m5-mission-1";
const READY_REVIEW_STATUS = "pending_feedback";
const REVIEW_STATUS_SET = new Set(["pending_feedback", "coaching", "reviewed"]);

const resolveDisplayName = ({ currentUser, userProfile, userRole }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  (userRole === "admin" ? "ผู้ดูแล DU" : "ครู");

const toVideoMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildDerivedVideoId = (teacherId = "", enrollmentId = "") =>
  [String(teacherId || "").trim(), String(enrollmentId || "").trim()]
    .filter(Boolean)
    .join("__");

const normalizeReviewStatus = (value = "") =>
  REVIEW_STATUS_SET.has(String(value || "").trim()) ? String(value || "").trim() : READY_REVIEW_STATUS;

const buildTeacherName = ({ teacherId, teacherProfile, reviewDoc }) =>
  String(
    reviewDoc?.teacherName ||
      teacherProfile?.name ||
      [teacherProfile?.prefix, teacherProfile?.firstName, teacherProfile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      teacherProfile?.displayName ||
      teacherId,
  ).trim();

const buildVideoRows = ({
  enrollments,
  teachers,
  reviewDocs,
  missionResponsesByEnrollmentKey,
}) => {
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const reviewMap = new Map(reviewDocs.map((video) => [video.id, video]));

  return enrollments
    .flatMap((enrollment) => {
      const canonicalMissionResponses =
        missionResponsesByEnrollmentKey[
          getMissionResponseEnrollmentKey({
            userId: enrollment.teacherId,
            courseId: enrollment.courseId || enrollment.enrollmentId,
          })
        ] || {};
      const missionResponses = {
        ...(enrollment.missionResponses || {}),
        ...canonicalMissionResponses,
      };
      const moduleFourMissionOne = missionResponses[MODULE_FOUR_MISSION_ONE_ID] || {};
      const moduleFourMissionTwo = missionResponses[MODULE_FOUR_MISSION_TWO_ID] || {};
      const moduleFiveMissionOne = missionResponses[MODULE_FIVE_MISSION_ONE_ID] || {};
      const videoUrl = String(moduleFiveMissionOne.clipLink || "").trim();

      if (!videoUrl) {
        return [];
      }

      const videoId = buildDerivedVideoId(enrollment.teacherId, enrollment.enrollmentId);
      const teacherProfile = teacherMap.get(enrollment.teacherId) || {};
      const reviewDoc = reviewMap.get(videoId) || {};
      const submittedAt =
        reviewDoc.submittedAt ||
        moduleFiveMissionOne.submittedAt ||
        moduleFiveMissionOne.updatedAt ||
        enrollment.lastSavedAt ||
        enrollment.lastAccess ||
        enrollment.updatedAt ||
        enrollment.createdAt ||
        null;
      const updatedAt =
        reviewDoc.updatedAt ||
        reviewDoc.lastCommentAt ||
        moduleFiveMissionOne.updatedAt ||
        moduleFiveMissionOne.submittedAt ||
        enrollment.lastSavedAt ||
        enrollment.lastAccess ||
        enrollment.updatedAt ||
        submittedAt;

      return [
        {
          id: videoId,
          teacherId: enrollment.teacherId,
          enrollmentId: enrollment.enrollmentId,
          sourceEnrollmentPath: enrollment.path,
          teacherName: buildTeacherName({
            teacherId: enrollment.teacherId,
            teacherProfile,
            reviewDoc,
          }),
          title:
            String(
              moduleFourMissionOne.innovationName ||
                moduleFiveMissionOne.lessonPlanTitle ||
                reviewDoc.title ||
                "",
            ).trim() || "วิดีโอการสอนจริง",
          description:
            String(
              moduleFiveMissionOne.learningFocus ||
                moduleFiveMissionOne.evidenceNote ||
                moduleFiveMissionOne.classroomContext ||
                reviewDoc.description ||
                "",
            ).trim(),
          subject:
            String(moduleFourMissionTwo.subjectName || reviewDoc.subject || teacherProfile.position || "").trim(),
          schoolName: String(reviewDoc.schoolName || teacherProfile.school || "").trim(),
          videoUrl,
          playerSource: resolvePlayableVideoSource(videoUrl),
          durationSeconds:
            reviewDoc.durationSeconds == null
              ? null
              : Math.max(0, Math.floor(Number(reviewDoc.durationSeconds) || 0)),
          reviewStatus: normalizeReviewStatus(reviewDoc.reviewStatus),
          assignedCoachIds: Array.isArray(reviewDoc.assignedCoachIds) ? reviewDoc.assignedCoachIds : [],
          submittedAt,
          updatedAt,
          lastCommentAt: reviewDoc.lastCommentAt || null,
          lastCommentPreview: String(reviewDoc.lastCommentPreview || "").trim(),
          commentCount: Math.max(0, Math.floor(Number(reviewDoc.commentCount) || 0)),
          hasReviewDocument: Boolean(reviewDoc.id),
        },
      ];
    })
    .sort((left, right) => toVideoMillis(right.updatedAt || right.submittedAt) - toVideoMillis(left.updatedAt || left.submittedAt));
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
        where("courseId", "==", TEACHER_COURSE_ID),
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
        console.error("ไม่สามารถดึงคำตอบภารกิจของคอร์สครูได้", error);
        setLoadingEnrollments(false);
      },
    );

    const unsubscribeReviewDocs = onSnapshot(
      query(collection(db, VIDEOS_COLLECTION)),
      (snapshot) => {
        const nextReviewDocs = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        startTransition(() => {
          setReviewDocs(nextReviewDocs);
          setLoadingReviewDocs(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถดึงสถานะรีวิววิดีโอได้", error);
        setLoadingReviewDocs(false);
      },
    );

    const unsubscribeMissionResponses = subscribeToMissionResponseCollectionGroup({
      courseId: TEACHER_COURSE_ID,
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

    return () => {
      unsubscribeTeachers();
      unsubscribeEnrollments();
      unsubscribeMissionResponses();
      unsubscribeReviewDocs();
    };
  }, [currentUser?.uid]);

  const videos = useMemo(
    () =>
      buildVideoRows({
        enrollments,
        teachers: teacherProfiles,
        reviewDocs,
        missionResponsesByEnrollmentKey,
      }),
    [enrollments, missionResponsesByEnrollmentKey, reviewDocs, teacherProfiles],
  );

  const loadingVideos =
    loadingTeacherProfiles || loadingEnrollments || loadingMissionResponses || loadingReviewDocs;

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === activeVideoId) || null,
    [activeVideoId, videos],
  );

  const ensureVideoReviewDocument = async (video) => {
    if (!video?.id) return;

    const videoRef = doc(db, VIDEOS_COLLECTION, video.id);
    await setDoc(
      videoRef,
      {
        teacherId: video.teacherId || "",
        teacherName: video.teacherName || "ยังไม่ระบุครู",
        title: video.title || "วิดีโอการสอนจริง",
        description: video.description || "",
        subject: video.subject || "",
        schoolName: video.schoolName || "",
        videoUrl: video.videoUrl || "",
        durationSeconds:
          video.durationSeconds == null
            ? null
            : Math.max(0, Math.floor(Number(video.durationSeconds) || 0)),
        reviewStatus: normalizeReviewStatus(video.reviewStatus),
        assignedCoachIds: Array.isArray(video.assignedCoachIds) ? video.assignedCoachIds : [],
        submittedAt: video.submittedAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastCommentAt: video.lastCommentAt || null,
        lastCommentPreview: String(video.lastCommentPreview || "").trim(),
        commentCount: Math.max(0, Math.floor(Number(video.commentCount) || 0)),
      },
      { merge: true },
    );
  };

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
  }, [activeVideo]);

  useEffect(() => {
    if (!readyCommentVideoId) {
      setComments([]);
      setLoadingComments(false);
      return undefined;
    }

    setLoadingComments(true);

    const commentsQuery = query(
      collection(db, VIDEOS_COLLECTION, readyCommentVideoId, VIDEO_COMMENTS_SUBCOLLECTION),
      orderBy("timestampSeconds", "asc"),
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const nextComments = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort(sortVideoComments);

        startTransition(() => {
          setComments(nextComments);
          setLoadingComments(false);
        });
      },
      (error) => {
        console.error("ไม่สามารถดึงไทม์ไลน์คอมเมนต์วิดีโอได้", error);
        setLoadingComments(false);
      },
    );

    return () => unsubscribe();
  }, [readyCommentVideoId]);

  const addComment = async ({ video, body, timestampSeconds }) => {
    if (!currentUser?.uid || !video?.id) return;

    setSavingComment(true);

    try {
      const trimmedBody = String(body || "").trim();
      await ensureVideoReviewDocument(video);

      const commentRef = doc(
        collection(db, VIDEOS_COLLECTION, video.id, VIDEO_COMMENTS_SUBCOLLECTION),
      );
      const videoRef = doc(db, VIDEOS_COLLECTION, video.id);
      const authorName = resolveDisplayName({
        currentUser,
        userProfile,
        userRole,
      });
      const batch = writeBatch(db);

      batch.set(commentRef, {
        videoId: video.id,
        teacherId: video.teacherId || "",
        authorId: currentUser.uid,
        authorName,
        authorRole: "admin",
        body: trimmedBody,
        timestampSeconds: Math.max(0, Math.floor(Number(timestampSeconds) || 0)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(
        videoRef,
        {
          updatedAt: serverTimestamp(),
          lastCommentAt: serverTimestamp(),
          lastCommentPreview: buildVideoCommentPreview(trimmedBody),
          commentCount: increment(1),
        },
        { merge: true },
      );

      await batch.commit();
    } finally {
      setSavingComment(false);
    }
  };

  const updateReviewStatus = async ({ video, nextStatus }) => {
    if (!video?.id) return;

    setUpdatingStatus(true);

    try {
      await ensureVideoReviewDocument(video);
      await updateDoc(doc(db, VIDEOS_COLLECTION, video.id), {
        reviewStatus: normalizeReviewStatus(nextStatus),
        updatedAt: serverTimestamp(),
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
      await updateDoc(doc(db, VIDEOS_COLLECTION, video.id), {
        durationSeconds: nextDuration,
        updatedAt: serverTimestamp(),
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

import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import {
  buildVideoCommentPreview,
  sortVideoComments,
} from "../../../data/videoAnnotations";
import {
  buildVideoReviewRecord,
  isUsableVideoReviewUrl,
  normalizeVideoReviewRecord,
  normalizeVideoReviewStatus,
  shouldSyncVideoReviewMetadata,
} from "../mappers/videoMapper";
import { videoCommentsCollectionRef, videoDocRef } from "../pathBuilders";

export const subscribeToVideoReviews = ({ onNext, onError }) =>
  onSnapshot(
    query(collection(db, "videos")),
    (snapshot) => {
      const rows = snapshot.docs.map((item) =>
        normalizeVideoReviewRecord(item.data(), {
          id: item.id,
        }),
      );
      onNext?.(rows);
    },
    (error) => {
      onError?.(error);
    },
  );

export const syncVideoReviewMetadata = async ({
  enrollment,
  teacherProfile,
  missionResponses,
  existingVideo,
  force = false,
} = {}) => {
  const nextVideo = buildVideoReviewRecord({
    enrollment,
    teacherProfile,
    missionResponses,
    existingVideo,
  });

  if (!nextVideo.id || !isUsableVideoReviewUrl(nextVideo.videoUrl)) {
    return null;
  }

  if (!force && existingVideo?.id && !shouldSyncVideoReviewMetadata(existingVideo, nextVideo)) {
    return nextVideo;
  }

  await setDoc(
    videoDocRef(nextVideo.id),
    {
      teacherId: nextVideo.teacherId,
      teacherName: nextVideo.teacherName,
      courseId: nextVideo.courseId,
      enrollmentId: nextVideo.enrollmentId,
      sourceEnrollmentPath: nextVideo.sourceEnrollmentPath,
      sourceMissionId: nextVideo.sourceMissionId,
      sourceMissionUpdatedAt: nextVideo.sourceMissionUpdatedAt || null,
      title: nextVideo.title,
      description: nextVideo.description,
      subject: nextVideo.subject,
      schoolName: nextVideo.schoolName,
      videoUrl: nextVideo.videoUrl,
      durationSeconds: nextVideo.durationSeconds,
      reviewStatus: normalizeVideoReviewStatus(nextVideo.reviewStatus),
      assignedCoachIds: nextVideo.assignedCoachIds,
      submittedAt: nextVideo.submittedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastCommentAt: nextVideo.lastCommentAt || null,
      lastCommentPreview: nextVideo.lastCommentPreview || "",
      commentCount: Math.max(0, Math.floor(Number(nextVideo.commentCount) || 0)),
    },
    { merge: true },
  );

  return nextVideo;
};

export const subscribeToVideoComments = (videoId, { onNext, onError } = {}) =>
  onSnapshot(
    query(videoCommentsCollectionRef(videoId), orderBy("timestampSeconds", "asc")),
    (snapshot) => {
      const nextComments = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort(sortVideoComments);

      onNext?.(nextComments);
    },
    (error) => {
      onError?.(error);
    },
  );

export const createVideoComment = async ({
  video,
  authorId,
  authorName,
  authorRole = "admin",
  body,
  timestampSeconds,
} = {}) => {
  const trimmedBody = String(body || "").trim();
  if (!video?.id || !authorId || !trimmedBody) return;

  const commentRef = videoCommentsCollectionRef(video.id);
  const nextCommentRef = doc(commentRef);
  const batch = writeBatch(db);

  batch.set(nextCommentRef, {
    videoId: video.id,
    teacherId: video.teacherId || "",
    authorId,
    authorName,
    authorRole,
    body: trimmedBody,
    timestampSeconds: Math.max(0, Math.floor(Number(timestampSeconds) || 0)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(
    videoDocRef(video.id),
    {
      updatedAt: serverTimestamp(),
      lastCommentAt: serverTimestamp(),
      lastCommentPreview: buildVideoCommentPreview(trimmedBody),
      commentCount: increment(1),
    },
    { merge: true },
  );

  await batch.commit();
};

export const updateVideoReviewStatus = async ({ videoId, nextStatus }) => {
  if (!videoId) return;

  await updateDoc(videoDocRef(videoId), {
    reviewStatus: normalizeVideoReviewStatus(nextStatus),
    updatedAt: serverTimestamp(),
  });
};

export const updateVideoDuration = async ({ videoId, durationSeconds }) => {
  const nextDuration = Math.max(0, Math.floor(Number(durationSeconds) || 0));
  if (!videoId || !nextDuration) return;

  await updateDoc(videoDocRef(videoId), {
    durationSeconds: nextDuration,
    updatedAt: serverTimestamp(),
  });
};

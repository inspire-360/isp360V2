import { startTransition, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  buildVideoCommentPreview,
  sortVideoComments,
  VIDEO_COMMENTS_SUBCOLLECTION,
  VIDEOS_COLLECTION,
} from "../data/videoAnnotations";
import { db } from "../lib/firebase";

const resolveDisplayName = ({ currentUser, userProfile, userRole }) =>
  userProfile?.name ||
  [userProfile?.prefix, userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ").trim() ||
  currentUser?.displayName ||
  currentUser?.email?.split("@")[0] ||
  (userRole === "admin" ? "ผู้ดูแล DU" : "ครู");

export function useVideoAnnotationBoard({ currentUser, userProfile, userRole }) {
  const [videos, setVideos] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState("");
  const [comments, setComments] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setVideos([]);
      setActiveVideoId("");
      setLoadingVideos(false);
      return undefined;
    }

    setLoadingVideos(true);

    const videosQuery = query(collection(db, VIDEOS_COLLECTION), orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      videosQuery,
      (snapshot) => {
        const nextVideos = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        startTransition(() => {
          setVideos(nextVideos);
          setActiveVideoId((previous) => {
            if (previous && nextVideos.some((video) => video.id === previous)) {
              return previous;
            }

            return nextVideos[0]?.id || "";
          });
          setLoadingVideos(false);
        });
      },
      () => {
        setLoadingVideos(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!activeVideoId) {
      setComments([]);
      setLoadingComments(false);
      return undefined;
    }

    setLoadingComments(true);

    const commentsQuery = query(
      collection(db, VIDEOS_COLLECTION, activeVideoId, VIDEO_COMMENTS_SUBCOLLECTION),
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
      () => {
        setLoadingComments(false);
      },
    );

    return () => unsubscribe();
  }, [activeVideoId]);

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === activeVideoId) || null,
    [activeVideoId, videos],
  );

  const addComment = async ({ video, body, timestampSeconds }) => {
    if (!currentUser?.uid || !video?.id) return;

    setSavingComment(true);

    try {
      const trimmedBody = String(body || "").trim();
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
        authorRole: userRole || "admin",
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
      await updateDoc(doc(db, VIDEOS_COLLECTION, video.id), {
        reviewStatus: nextStatus,
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

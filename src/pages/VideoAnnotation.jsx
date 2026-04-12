import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Clapperboard,
  Loader2,
  MessageSquareText,
  PauseCircle,
  PlayCircle,
  SkipBack,
  SkipForward,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  formatVideoDateTime,
  formatVideoTimecode,
  getVideoReviewStatusMeta,
  videoReviewStatusOptions,
} from "../data/videoAnnotations";
import { useVideoAnnotationBoard } from "../hooks/useVideoAnnotationBoard";

const VideoCommentItem = memo(function VideoCommentItem({
  comment,
  isActive,
  isSeeking,
  onSeek,
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSeek(comment)}
        className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
          isActive || isSeeking
            ? "border-primary/30 bg-primary/5 shadow-[0_16px_35px_rgba(13,17,100,0.12)]"
            : "border-slate-200 bg-white hover:border-secondary/25 hover:bg-secondary/5"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            นาทีที่ {formatVideoTimecode(comment.timestampSeconds)}
          </span>
          <span className="text-xs text-slate-400">{formatVideoDateTime(comment.createdAt)}</span>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-700">{comment.body}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{comment.authorName || "ผู้ดูแล DU"}</span>
          <span>{isSeeking ? "กำลังเลื่อนไปยังช่วงนี้" : "คลิกเพื่อเปิดวิดีโอตรงช่วงนี้"}</span>
        </div>
      </button>
    </li>
  );
});

export default function VideoAnnotation() {
  const { currentUser, userProfile, userRole } = useAuth();
  const videoRef = useRef(null);
  const [draftComment, setDraftComment] = useState("");
  const [capturedSeconds, setCapturedSeconds] = useState(null);
  const [currentSecond, setCurrentSecond] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [seekingCommentId, setSeekingCommentId] = useState("");
  const [formError, setFormError] = useState("");

  const {
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
  } = useVideoAnnotationBoard({
    currentUser,
    userProfile,
    userRole,
  });

  useEffect(() => {
    setDraftComment("");
    setFormError("");
    setCapturedSeconds(null);
    setCurrentSecond(0);
    setDurationSeconds(Number(activeVideo?.durationSeconds || 0));
  }, [activeVideoId, activeVideo?.durationSeconds]);

  const summary = useMemo(
    () => ({
      total: videos.length,
      pending: videos.filter((video) => video.reviewStatus === "pending_feedback").length,
      coaching: videos.filter((video) => video.reviewStatus === "coaching").length,
      reviewed: videos.filter((video) => video.reviewStatus === "reviewed").length,
    }),
    [videos],
  );

  const activeStatusMeta = getVideoReviewStatusMeta(activeVideo?.reviewStatus);
  const selectedCommentCount = Number(activeVideo?.commentCount || comments.length || 0);

  const closestCommentId = useMemo(() => {
    if (!comments.length) return "";

    const nearestComment = comments.reduce((nearest, comment) => {
      const currentDistance = Math.abs(Number(comment.timestampSeconds || 0) - currentSecond);
      if (!nearest) {
        return { id: comment.id, distance: currentDistance };
      }

      return currentDistance < nearest.distance
        ? { id: comment.id, distance: currentDistance }
        : nearest;
    }, null);

    if (!nearestComment || nearestComment.distance > 2) return "";
    return nearestComment.id;
  }, [comments, currentSecond]);

  const handleTimeUpdate = (event) => {
    const nextSecond = Math.max(0, Math.floor(event.currentTarget.currentTime || 0));
    setCurrentSecond((previous) => (previous === nextSecond ? previous : nextSecond));
  };

  const handleLoadedMetadata = (event) => {
    const nextDuration = Math.max(0, Math.floor(event.currentTarget.duration || 0));
    setDurationSeconds(nextDuration);

    if (activeVideo?.id && nextDuration > 0) {
      saveDuration({
        video: activeVideo,
        durationSeconds: nextDuration,
      }).catch(() => undefined);
    }
  };

  const captureMoment = () => {
    const element = videoRef.current;
    if (!element) return;

    element.pause();
    const nextSecond = Math.max(0, Math.floor(element.currentTime || 0));
    setCapturedSeconds(nextSecond);
    setCurrentSecond(nextSecond);
    setFormError("");
  };

  const jumpBy = (offsetSeconds) => {
    const element = videoRef.current;
    if (!element) return;

    const duration = Number.isFinite(element.duration) ? element.duration : Number(durationSeconds || 0);
    const rawSecond = element.currentTime + offsetSeconds;
    const upperBound = duration > 0 ? duration : Math.max(0, rawSecond);
    const nextSecond = Math.max(0, Math.min(upperBound, rawSecond));

    element.currentTime = nextSecond;
    setCurrentSecond(Math.floor(nextSecond));
  };

  const handleSeekComment = async (comment) => {
    const element = videoRef.current;
    if (!element) return;

    setSeekingCommentId(comment.id);
    element.currentTime = Number(comment.timestampSeconds || 0);
    setCurrentSecond(Math.max(0, Math.floor(comment.timestampSeconds || 0)));

    try {
      await element.play();
    } catch {
      element.pause();
    } finally {
      window.setTimeout(() => setSeekingCommentId(""), 1000);
    }
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();

    if (!activeVideo?.id) {
      setFormError("กรุณาเลือกวิดีโอที่ต้องการโค้ชก่อน");
      return;
    }

    const trimmedComment = draftComment.trim();
    if (!trimmedComment) {
      setFormError("กรุณาพิมพ์คอมเมนต์ก่อนบันทึก");
      return;
    }

    const element = videoRef.current;
    const fallbackSecond = Math.max(0, Math.floor(element?.currentTime || 0));
    const nextSecond = Number.isFinite(capturedSeconds) ? capturedSeconds : fallbackSecond;

    try {
      await addComment({
        video: activeVideo,
        body: trimmedComment,
        timestampSeconds: nextSecond,
      });
      setDraftComment("");
      setCapturedSeconds(nextSecond);
      setFormError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างบันทึกคอมเมนต์วิดีโอ", error);
      setFormError("ไม่สามารถบันทึกคอมเมนต์ได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleStatusChange = async (event) => {
    if (!activeVideo?.id) return;

    try {
      await updateReviewStatus({
        video: activeVideo,
        nextStatus: event.target.value,
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างอัปเดตสถานะวิดีโอ", error);
      window.alert("ไม่สามารถอัปเดตสถานะวิดีโอได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.82]">
              <Clapperboard size={14} />
              เครื่องมือคอมเมนต์วิดีโอการสอน
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                โค้ชครูจากวิดีโอจริง พร้อมบันทึกข้อเสนอแนะตามนาที
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.74] md:text-base">
                เลือกวิดีโอที่ต้องการรีวิว หยุดภาพตรงช่วงสำคัญ แล้วบันทึกคอมเมนต์แบบระบุเวลา
                เพื่อให้ครูย้อนกลับมาดูจุดเด่นและข้อเสนอแนะได้ตรงบริบทของห้องเรียนจริง
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">วิดีโอทั้งหมด</p>
              <p className="mt-2 text-3xl font-bold">{summary.total}</p>
            </div>
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">รอรับคำแนะนำ</p>
              <p className="mt-2 text-3xl font-bold">{summary.pending}</p>
            </div>
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">กำลังโค้ช</p>
              <p className="mt-2 text-3xl font-bold">{summary.coaching}</p>
            </div>
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">สรุปข้อเสนอแนะแล้ว</p>
              <p className="mt-2 text-3xl font-bold">{summary.reviewed}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="brand-panel p-6 md:p-8" aria-labelledby="video-selector-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
              <Sparkles size={14} />
              รายการวิดีโอที่พร้อมให้โค้ช
            </p>
            <h2 id="video-selector-heading" className="font-display text-2xl font-bold text-ink">
              เลือกวิดีโอจากครูที่ต้องการรีวิว
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              รายการวิดีโอชุดนี้ดึงจากคำตอบของภารกิจโมดูล 5 ภารกิจ 1 ในช่องลิงก์คลิปการสอนจริง
              และใช้ชื่อนวัตกรรมจากโมดูล 4 ภารกิจ 1 เป็นชื่อรายการสำหรับการโค้ชแบบเรียลไทม์
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {loadingVideos ? "กำลังซิงก์รายการวิดีโอ" : `มีวิดีโอพร้อมรีวิว ${summary.total} รายการ`}
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-max gap-3 pb-1">
            {loadingVideos ? (
              <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-slate-500">
                <Loader2 size={18} className="animate-spin text-primary" />
                <span>กำลังดึงวิดีโอจากระบบ</span>
              </div>
            ) : videos.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm leading-7 text-slate-500">
                ยังไม่พบคำตอบที่มีลิงก์คลิปการสอนจริงจากโมดูล 5 ภารกิจ 1 สำหรับการโค้ชรอบนี้
              </div>
            ) : (
              videos.map((video) => {
                const statusMeta = getVideoReviewStatusMeta(video.reviewStatus);
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setActiveVideoId(video.id)}
                    className={`min-w-[280px] rounded-[28px] border px-5 py-4 text-left transition ${
                      activeVideoId === video.id
                        ? "border-primary/30 bg-primary/5 shadow-[0_20px_50px_rgba(13,17,100,0.12)]"
                        : "border-slate-200 bg-white hover:border-secondary/25 hover:bg-secondary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {Number(video.commentCount || 0)} คอมเมนต์
                      </span>
                    </div>
                    <p className="mt-4 text-base font-semibold text-ink">{video.title || "วิดีโอไม่มีชื่อ"}</p>
                    <p className="mt-2 text-sm text-slate-600">{video.teacherName || "ยังไม่ได้ระบุครู"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {(video.subject || "ยังไม่ได้ระบุรายวิชา") +
                        " • " +
                        (video.schoolName || "ยังไม่ได้ระบุโรงเรียน")}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <section className="brand-panel p-6 md:p-8" aria-labelledby="video-review-heading">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <h2 id="video-review-heading" className="font-display text-2xl font-bold text-ink">
                  {activeVideo?.title || "เลือกวิดีโอเพื่อเริ่มโค้ช"}
                </h2>
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    ครู: {activeVideo?.teacherName || "ยังไม่ได้ระบุ"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    รายวิชา: {activeVideo?.subject || "ยังไม่ได้ระบุ"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    โรงเรียน: {activeVideo?.schoolName || "ยังไม่ได้ระบุ"}
                  </span>
                </div>
              </div>

              <label className="w-full max-w-[260px]">
                <span className="mb-2 block text-sm font-medium text-slate-600">สถานะการโค้ช</span>
                <select
                  value={activeVideo?.reviewStatus || "pending_feedback"}
                  onChange={handleStatusChange}
                  disabled={!activeVideo?.id || updatingStatus}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {videoReviewStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {activeVideo?.id ? (
              <>
                <div className="overflow-hidden rounded-[32px] border border-slate-100 bg-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.25)]">
                  <video
                    ref={videoRef}
                    src={activeVideo.videoUrl}
                    controls
                    preload="metadata"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="aspect-video w-full bg-black"
                  >
                    เบราว์เซอร์นี้ยังไม่รองรับการเล่นวิดีโอ
                  </video>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs tracking-[0.08em] text-slate-400">เวลาปัจจุบัน</p>
                    <p className="mt-2 text-2xl font-bold text-ink">{formatVideoTimecode(currentSecond)}</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs tracking-[0.08em] text-slate-400">เวลาที่จะบันทึก</p>
                    <p className="mt-2 text-2xl font-bold text-ink">
                      {formatVideoTimecode(capturedSeconds ?? currentSecond)}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs tracking-[0.08em] text-slate-400">ความยาววิดีโอ</p>
                    <p className="mt-2 text-2xl font-bold text-ink">
                      {durationSeconds ? formatVideoTimecode(durationSeconds) : "รอโหลด"}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs tracking-[0.08em] text-slate-400">คอมเมนต์ทั้งหมด</p>
                    <p className="mt-2 text-2xl font-bold text-ink">{selectedCommentCount}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => jumpBy(-10)}
                    className="brand-button-secondary"
                  >
                    <SkipBack size={16} />
                    ย้อนกลับ 10 วินาที
                  </button>
                  <button
                    type="button"
                    onClick={captureMoment}
                    className="brand-button-primary"
                  >
                    <PauseCircle size={16} />
                    หยุดและจับเวลาตรงนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpBy(10)}
                    className="brand-button-secondary"
                  >
                    เดินหน้า 10 วินาที
                    <SkipForward size={16} />
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    {savingDuration ? <Loader2 size={16} className="animate-spin text-primary" /> : <PlayCircle size={16} className="text-primary" />}
                    ระบบจะบันทึกความยาววิดีโอให้อัตโนมัติเมื่อโหลดเสร็จ
                  </div>
                </div>

                <form onSubmit={handleSubmitComment} className="rounded-[32px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-ink">บันทึกคอมเมนต์ตามเวลา</p>
                      <p className="mt-1 text-sm leading-7 text-slate-600">
                        แนะนำให้กดปุ่มหยุดก่อนทุกครั้ง เพื่อให้คอมเมนต์อิงกับเหตุการณ์จริงในชั้นเรียน
                      </p>
                    </div>
                    <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${activeStatusMeta.tone}`}>
                      {activeStatusMeta.label}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs tracking-[0.08em] text-slate-400">ตำแหน่งที่จะผูกกับคอมเมนต์</p>
                      <p className="mt-2 text-3xl font-bold text-ink">
                        {formatVideoTimecode(capturedSeconds ?? currentSecond)}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        เวลานี้จะถูกใช้ตอนกดบันทึก และครูสามารถคลิกย้อนกลับมาดูช่วงนี้ได้ทันที
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-600">ข้อความโค้ชสำหรับครู</span>
                        <textarea
                          value={draftComment}
                          onChange={(event) => setDraftComment(event.target.value)}
                          placeholder="ตัวอย่าง: ช่วงนี้ใช้คำถามปลายเปิดได้ดีมาก ลองเว้นเวลาให้นักเรียนคิดอีกเล็กน้อยก่อนเฉลย"
                          rows={5}
                          className="w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                        />
                      </label>

                      {formError ? <p className="text-sm font-medium text-rose-600">{formError}</p> : null}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={captureMoment}
                          className="brand-button-secondary"
                        >
                          ใช้เวลาปัจจุบัน
                        </button>
                        <button
                          type="submit"
                          disabled={savingComment}
                          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {savingComment ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
                          บันทึกคอมเมนต์ลงไทม์ไลน์
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <TimerReset size={32} className="text-slate-300" />
                <p className="mt-4 text-xl font-semibold text-ink">ยังไม่มีวิดีโอที่ถูกเลือก</p>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
                  เมื่อมีคำตอบในโมดูล 5 ภารกิจ 1 และเลือกวิดีโอแล้ว
                  พื้นที่เล่นวิดีโอและฟอร์มคอมเมนต์จะปรากฏที่นี่ทันที
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="brand-panel h-fit p-6 md:sticky md:top-6" aria-labelledby="video-comments-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
                <MessageSquareText size={14} />
                ไทม์ไลน์คอมเมนต์
              </p>
              <h2 id="video-comments-heading" className="mt-3 font-display text-2xl font-bold text-ink">
                คอมเมนต์เรียลไทม์
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                คลิกคอมเมนต์รายการใดก็ได้เพื่อให้วิดีโอย้อนกลับไปยังช่วงเวลานั้นทันที
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              {selectedCommentCount} รายการ
            </div>
          </div>

          <div className="mt-5 rounded-[28px] border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs tracking-[0.08em] text-slate-400">ครูเจ้าของวิดีโอ</p>
                <p className="mt-2 font-semibold text-ink">{activeVideo?.teacherName || "ยังไม่ได้ระบุ"}</p>
              </div>
              <div>
                <p className="text-xs tracking-[0.08em] text-slate-400">อัปเดตล่าสุด</p>
                <p className="mt-2 font-semibold text-ink">{formatVideoDateTime(activeVideo?.updatedAt)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            {loadingComments ? (
              <div className="flex min-h-[280px] items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-slate-50 text-slate-500">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span>กำลังซิงก์ไทม์ไลน์คอมเมนต์</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                <MessageSquareText size={28} className="text-slate-300" />
                <p className="mt-4 text-lg font-semibold text-ink">ยังไม่มีคอมเมนต์ในวิดีโอนี้</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  เริ่มต้นด้วยการหยุดวิดีโอในช่วงที่ต้องการสะท้อน แล้วพิมพ์ข้อเสนอแนะลงในแบบฟอร์มด้านซ้าย
                </p>
              </div>
            ) : (
              <ol className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <VideoCommentItem
                    key={comment.id}
                    comment={comment}
                    isActive={closestCommentId === comment.id}
                    isSeeking={seekingCommentId === comment.id}
                    onSeek={handleSeekComment}
                  />
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

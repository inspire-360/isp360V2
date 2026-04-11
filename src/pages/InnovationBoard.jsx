import React, { memo, useDeferredValue, useMemo, useState } from "react";
import {
  Award,
  Banknote,
  FlaskConical,
  GripVertical,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Telescope,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  buildInnovationSearchText,
  countInnovationsByStage,
  formatInnovationDateTime,
  getInnovationStageMeta,
  innovationStageOptions,
} from "../data/innovationKanban";
import { useInnovationBoard } from "../hooks/useInnovationBoard";
import { isAdminRole } from "../utils/userRoles";

const dragInnovationMime = "application/x-du-innovation-id";

const stageIconByValue = {
  idea: Lightbulb,
  prototype: FlaskConical,
  funded: Banknote,
  best_practice: Award,
};

const InnovationCard = memo(function InnovationCard({
  innovation,
  isActive,
  isDragging,
  isMoving,
  onSelect,
  onDragStart,
  onDragEnd,
}) {
  return (
    <article
      draggable
      onDragStart={(event) => onDragStart(event, innovation)}
      onDragEnd={onDragEnd}
      className={`group rounded-[24px] border bg-white p-4 transition ${
        isDragging
          ? "scale-[0.98] border-primary/25 bg-primary/5 opacity-70 shadow-[0_18px_35px_rgba(13,17,100,0.16)]"
          : isActive
            ? "border-primary/25 bg-primary/5 shadow-[0_18px_35px_rgba(13,17,100,0.12)]"
            : "border-slate-200 hover:border-secondary/25 hover:bg-secondary/5"
      } ${isMoving ? "pointer-events-none animate-pulse" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-base font-semibold leading-7 text-ink">{innovation.title}</p>
          <p className="mt-2 text-xs text-slate-500">
            {innovation.teacherName || "ยังไม่ระบุชื่อครู"} | {innovation.schoolName || "ยังไม่ระบุโรงเรียน"}
          </p>
        </div>
        <span
          draggable={false}
          className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-400"
        >
          <GripVertical size={16} />
        </span>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">
        {innovation.summary || "ยังไม่มีรายละเอียดของนวัตกรรมรายการนี้"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
          {innovation.focusArea || "ยังไม่ระบุประเด็นหลัก"}
        </span>
        {Array.isArray(innovation.tags)
          ? innovation.tags.slice(0, 3).map((tag) => (
              <span
                key={`${innovation.id}-${tag}`}
                className="inline-flex rounded-full border border-secondary/10 bg-secondary/5 px-3 py-1 text-xs font-medium text-secondary"
              >
                {tag}
              </span>
            ))
          : null}
      </div>

      <button
        type="button"
        draggable={false}
        onClick={() => onSelect(innovation.id)}
        className="mt-4 w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-primary/20 hover:bg-white"
      >
        เปิดรายละเอียดนวัตกรรม
      </button>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{innovation.supportNeed || "ยังไม่ระบุความช่วยเหลือที่ต้องการ"}</span>
        <span>{formatInnovationDateTime(innovation.updatedAt || innovation.createdAt)}</span>
      </div>
    </article>
  );
});

const InnovationStageColumn = memo(function InnovationStageColumn({
  stage,
  innovations,
  activeInnovationId,
  draggingInnovationId,
  movingInnovationId,
  dropStage,
  onSelectInnovation,
  onDragStart,
  onDragEnd,
  onDragEnterStage,
  onDragOverStage,
  onDragLeaveStage,
  onDropStage,
}) {
  const StageIcon = stageIconByValue[stage.value] || Sparkles;

  return (
    <section
      onDragEnterCapture={() => onDragEnterStage(stage.value)}
      onDragOverCapture={(event) => onDragOverStage(event, stage.value)}
      onDragLeaveCapture={(event) => onDragLeaveStage(event, stage.value)}
      onDropCapture={(event) => onDropStage(event, stage.value)}
      className={`relative overflow-hidden rounded-[30px] border bg-white/92 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] transition ${
        dropStage === stage.value
          ? "border-primary/25 shadow-[0_28px_70px_rgba(13,17,100,0.14)]"
          : "border-white/70"
      }`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${stage.glow}`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${stage.tone}`}>
            <StageIcon size={14} />
            {stage.label}
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{innovations.length}</p>
            <p className="mt-1 text-sm leading-7 text-slate-500">{stage.description}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-5 min-h-[320px] space-y-4">
        {innovations.length > 0 ? (
          innovations.map((innovation) => (
            <InnovationCard
              key={innovation.id}
              innovation={innovation}
              isActive={activeInnovationId === innovation.id}
              isDragging={draggingInnovationId === innovation.id}
              isMoving={movingInnovationId === innovation.id}
              onSelect={onSelectInnovation}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        ) : (
          <div
            className={`flex min-h-[320px] items-center justify-center rounded-[24px] border border-dashed px-6 text-center text-sm leading-7 transition ${
              dropStage === stage.value
                ? "border-primary/25 bg-primary/5 text-primary"
                : "border-slate-200 bg-slate-50/70 text-slate-500"
            }`}
          >
            ลากการ์ดมาวางที่คอลัมน์นี้เพื่ออัปเดตสถานะของนวัตกรรม
          </div>
        )}
      </div>
    </section>
  );
});

export default function InnovationBoard() {
  const { currentUser, userProfile, userRole } = useAuth();
  const adminView = isAdminRole(userRole);
  const [searchTerm, setSearchTerm] = useState("");
  const [draggingInnovationId, setDraggingInnovationId] = useState("");
  const [dropStage, setDropStage] = useState("");
  const [boardError, setBoardError] = useState("");

  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());

  const {
    innovations,
    activeInnovation,
    activeInnovationId,
    setActiveInnovationId,
    loadingInnovations,
    movingInnovationId,
    moveInnovationToStage,
  } = useInnovationBoard({
    currentUser,
    userProfile,
    isAdminView: adminView,
  });

  const summary = useMemo(() => countInnovationsByStage(innovations), [innovations]);

  const filteredInnovations = useMemo(() => {
    if (!deferredSearchTerm) return innovations;

    return innovations.filter((innovation) =>
      buildInnovationSearchText(innovation).includes(deferredSearchTerm),
    );
  }, [deferredSearchTerm, innovations]);

  const stageColumns = useMemo(() => {
    const stageBuckets = innovationStageOptions.reduce((result, stageOption) => {
      result[stageOption.value] = [];
      return result;
    }, {});

    filteredInnovations.forEach((innovation) => {
      const stageKey = stageBuckets[innovation.stage] ? innovation.stage : "idea";
      stageBuckets[stageKey].push(innovation);
    });

    return innovationStageOptions.map((stageOption) => ({
      ...stageOption,
      innovations: stageBuckets[stageOption.value] || [],
    }));
  }, [filteredInnovations]);

  const selectedInnovation = useMemo(() => {
    const matchedInnovation = filteredInnovations.find((innovation) => innovation.id === activeInnovationId);
    if (matchedInnovation) return matchedInnovation;
    if (activeInnovation) return activeInnovation;
    return filteredInnovations[0] || null;
  }, [activeInnovation, activeInnovationId, filteredInnovations]);

  const handleDragStart = (event, innovation) => {
    setBoardError("");
    setDraggingInnovationId(innovation.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", innovation.id);
    event.dataTransfer.setData(dragInnovationMime, innovation.id);
  };

  const handleDragEnd = () => {
    setDraggingInnovationId("");
    setDropStage("");
  };

  const handleDragEnterStage = (stageValue) => {
    if (draggingInnovationId) {
      setDropStage(stageValue);
    }
  };

  const handleDragOverStage = (event, stageValue) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropStage !== stageValue) {
      setDropStage(stageValue);
    }
  };

  const handleDragLeaveStage = (event, stageValue) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setDropStage((previousStage) => (previousStage === stageValue ? "" : previousStage));
  };

  const handleDropStage = async (event, stageValue) => {
    event.preventDefault();
    event.stopPropagation();

    const innovationId =
      event.dataTransfer.getData(dragInnovationMime) ||
      event.dataTransfer.getData("text/plain") ||
      draggingInnovationId;
    const innovation = innovations.find((item) => item.id === innovationId);

    setDraggingInnovationId("");
    setDropStage("");

    if (!innovation || innovation.stage === stageValue) return;

    try {
      await moveInnovationToStage({
        innovation,
        nextStage: stageValue,
      });
      setActiveInnovationId(innovation.id);
      setBoardError("");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดระหว่างย้ายการ์ดนวัตกรรม", error);
      setBoardError("ไม่สามารถอัปเดตสถานะของนวัตกรรมได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  if (!adminView) {
    return (
      <div className="brand-shell">
        <section className="brand-panel p-8">
          <p className="text-lg font-semibold text-ink">หน้านี้สำหรับผู้ดูแล DU เท่านั้น</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            หากต้องการติดตามนวัตกรรม กรุณาเข้าสู่ระบบด้วยสิทธิ์ผู้ดูแล DU
          </p>
        </section>
      </div>
    );
  }

  const selectedStageMeta = getInnovationStageMeta(selectedInnovation?.stage);

  return (
    <div className="brand-shell space-y-8">
      <section className="brand-panel-strong overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="brand-chip border-white/[0.20] bg-white/[0.10] text-white/[0.82]">
              <Telescope size={14} />
              กระดานติดตามนวัตกรรมของครู
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold md:text-5xl">
                ลาก วาง และขยับนวัตกรรมไปตามเส้นทางการเติบโตได้จากหน้าจอเดียว
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/[0.74] md:text-base">
                ใช้กระดานนี้เพื่อติดตามแนวคิดของครูจากไอเดียตั้งต้นไปจนถึงแนวปฏิบัติที่พร้อมขยายผล
                ทุกการย้ายการ์ดจะอัปเดตสถานะใน Firestore ทันทีและสะท้อนบนหน้าจอแบบเรียลไทม์
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4">
              <p className="text-xs tracking-[0.08em] text-white/[0.56]">นวัตกรรมทั้งหมด</p>
              <p className="mt-2 text-3xl font-bold">{summary.total}</p>
            </div>
            {innovationStageOptions.map((stageOption) => (
              <div
                key={stageOption.value}
                className="rounded-[28px] border border-white/[0.16] bg-white/[0.10] px-4 py-4"
              >
                <p className="text-xs tracking-[0.08em] text-white/[0.56]">{stageOption.label}</p>
                <p className="mt-2 text-3xl font-bold">{summary[stageOption.value]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="brand-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-lg font-semibold text-ink">พื้นที่ทำงานของทีม DU</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              ค้นหาจากชื่อครู ชื่อโรงเรียน ชื่อนวัตกรรม หรือแท็ก แล้วลากการ์ดไปยังคอลัมน์ใหม่เมื่อต้องการเปลี่ยนสถานะ
            </p>
          </div>

          <label className="relative block w-full max-w-xl">
            <span className="sr-only">ค้นหานวัตกรรม</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ค้นหาชื่อนวัตกรรม ชื่อครู โรงเรียน หรือแท็ก"
              className="w-full rounded-full border border-slate-200 bg-white px-12 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary/25 focus:ring-4 focus:ring-primary/10"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            แสดงผล {filteredInnovations.length} รายการ
          </span>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            ลากการ์ดเพื่อย้ายคอลัมน์ได้ทันที
          </span>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
            การ์ดที่กำลังอัปเดตจะมีสถานะกะพริบชั่วคราว
          </span>
        </div>

        {boardError ? (
          <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {boardError}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          {loadingInnovations ? (
            <div className="brand-panel flex min-h-[320px] items-center justify-center gap-3 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              กำลังโหลดกระดานนวัตกรรม
            </div>
          ) : (
            <div className="grid gap-4 2xl:grid-cols-4 xl:grid-cols-2">
              {stageColumns.map((stage) => (
                <InnovationStageColumn
                  key={stage.value}
                  stage={stage}
                  innovations={stage.innovations}
                  activeInnovationId={selectedInnovation?.id || activeInnovationId}
                  draggingInnovationId={draggingInnovationId}
                  movingInnovationId={movingInnovationId}
                  dropStage={dropStage}
                  onSelectInnovation={setActiveInnovationId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragEnterStage={handleDragEnterStage}
                  onDragOverStage={handleDragOverStage}
                  onDragLeaveStage={handleDragLeaveStage}
                  onDropStage={handleDropStage}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="brand-panel p-6">
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
              <Sparkles size={14} />
              รายละเอียดนวัตกรรมที่เลือก
            </p>

            {selectedInnovation ? (
              <div className="mt-5 space-y-5">
                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${selectedStageMeta.tone}`}>
                    {selectedStageMeta.label}
                  </span>
                  <h2 className="mt-4 text-2xl font-semibold leading-9 text-ink">{selectedInnovation.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {selectedInnovation.teacherName || "ยังไม่ระบุชื่อครู"} |{" "}
                    {selectedInnovation.schoolName || "ยังไม่ระบุโรงเรียน"}
                  </p>
                </div>

                <div className="space-y-4 text-sm leading-7 text-slate-600">
                  <p>{selectedInnovation.summary || "ยังไม่มีคำอธิบายนวัตกรรมรายการนี้"}</p>
                  <p>
                    <span className="font-semibold text-ink">ประเด็นหลัก:</span>{" "}
                    {selectedInnovation.focusArea || "ยังไม่ระบุ"}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">ความช่วยเหลือที่ต้องการ:</span>{" "}
                    {selectedInnovation.supportNeed || "ยังไม่ระบุ"}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">หมายเหตุหลักฐาน:</span>{" "}
                    {selectedInnovation.evidenceNote || "ยังไม่มีบันทึกหลักฐานเพิ่มเติม"}
                  </p>
                </div>

                {Array.isArray(selectedInnovation.tags) && selectedInnovation.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedInnovation.tags.map((tag) => (
                      <span
                        key={`${selectedInnovation.id}-${tag}-detail`}
                        className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-ink">สร้างรายการเมื่อ:</span>{" "}
                    {formatInnovationDateTime(selectedInnovation.createdAt)}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-ink">อัปเดตล่าสุด:</span>{" "}
                    {formatInnovationDateTime(
                      selectedInnovation.updatedAt || selectedInnovation.lastMovedAt || selectedInnovation.createdAt,
                    )}
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-ink">ผู้ย้ายสถานะล่าสุด:</span>{" "}
                    {selectedInnovation.lastMovedByName || "ยังไม่มีข้อมูล"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-7 text-slate-500">
                ยังไม่มีนวัตกรรมที่ตรงกับตัวกรองนี้ กรุณาลองปรับคำค้นหรือเพิ่มข้อมูลในคอลเลกชันนวัตกรรม
              </div>
            )}
          </section>

          <section className="brand-panel p-6">
            <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
              <Telescope size={14} />
              วิธีใช้งานกระดาน
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              <p>เลือกการ์ดเพื่ออ่านรายละเอียดของครูและบริบทของนวัตกรรมทางด้านขวา</p>
              <p>ลากการ์ดจากคอลัมน์เดิมไปยังคอลัมน์ใหม่เพื่ออัปเดตฟิลด์สถานะใน Firestore ทันที</p>
              <p>หากกำลังอัปเดตอยู่ การ์ดจะกะพริบชั่วคราวเพื่อบอกว่าระบบกำลังบันทึกข้อมูล</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareHeart } from "lucide-react";
import { TextAnswerTextarea } from "../forms/TextAnswerField";
import { isMissionTextValid } from "../../utils/missionTextValidation";

const buildPayload = (draft) => ({
  type: "platform-survey",
  overallExperience: draft.overallExperience || 0,
  platformUsefulness: draft.platformUsefulness || 0,
  easeOfUse: draft.easeOfUse || 0,
  aiMentorSupport: draft.aiMentorSupport || 0,
  wouldRecommend: draft.wouldRecommend || 0,
  favoritePart: draft.favoritePart || "",
  improvementIdea: draft.improvementIdea || "",
  finalReflection: draft.finalReflection || "",
});

const hasContent = (payload) => JSON.stringify(payload).replace(/[\s":,{}[\]]/g, "").length > 0;

const TextArea = ({ value, onChange, placeholder, rows = 5 }) => (
  <TextAnswerTextarea
    value={value || ""}
    onChange={onChange}
    rows={rows}
    placeholder={placeholder}
    className="mt-3 w-full rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white"
  />
);

const ratingLabels = {
  1: "น้อยมาก",
  2: "น้อย",
  3: "ปานกลาง",
  4: "มาก",
  5: "มากที่สุด",
};

const RatingField = ({ label, helper, value, onChange }) => (
  <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
    <p className="text-sm font-semibold text-ink">{label}</p>
    {helper ? <p className="mt-1 text-sm leading-7 text-slate-500">{helper}</p> : null}
    <div className="mt-4 grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          className={`rounded-[18px] border px-3 py-3 text-sm font-semibold transition ${
            value === score
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-slate-200 bg-white text-slate-500 hover:border-secondary/20"
          }`}
        >
          {score}
        </button>
      ))}
    </div>
    <p className="mt-3 text-sm text-slate-500">{value ? ratingLabels[value] : "ยังไม่ได้เลือกคะแนน"}</p>
  </div>
);

export default function PlatformSurveyForm({
  savedResponse,
  isCompleted,
  onSave,
  onDraftSave,
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState("");
  const [autosaveState, setAutosaveState] = useState("");
  const lastPayloadRef = useRef("");

  useEffect(() => {
    setDraft({
      overallExperience: savedResponse?.overallExperience || 0,
      platformUsefulness: savedResponse?.platformUsefulness || 0,
      easeOfUse: savedResponse?.easeOfUse || 0,
      aiMentorSupport: savedResponse?.aiMentorSupport || 0,
      wouldRecommend: savedResponse?.wouldRecommend || 0,
      favoritePart: savedResponse?.favoritePart || "",
      improvementIdea: savedResponse?.improvementIdea || "",
      finalReflection: savedResponse?.finalReflection || "",
    });
  }, [savedResponse]);

  useEffect(() => {
    const payload = buildPayload(draft);
    if (!hasContent(payload)) return undefined;

    const serialized = JSON.stringify(payload);
    if (serialized === lastPayloadRef.current) return undefined;

    setAutosaveState("กำลังบันทึกคำตอบอัตโนมัติ...");
    const timeoutId = window.setTimeout(async () => {
      try {
        await onDraftSave(payload);
        lastPayloadRef.current = serialized;
        setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
        window.setTimeout(() => setAutosaveState(""), 1800);
      } catch (error) {
        console.error("Failed to autosave final survey:", error);
        setAutosaveState("ยังบันทึกอัตโนมัติไม่สำเร็จ");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [draft, onDraftSave]);

  const payload = buildPayload(draft);
  const ready =
    draft.overallExperience &&
    draft.platformUsefulness &&
    draft.easeOfUse &&
    draft.aiMentorSupport &&
    draft.wouldRecommend &&
    isMissionTextValid(payload);

  const persist = async () => {
    setSaving(true);
    try {
      const payload = buildPayload(draft);
      await onSave(payload);
      lastPayloadRef.current = JSON.stringify(payload);
      setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
      setReward("ส่งแบบประเมินเรียบร้อย");
      window.setTimeout(() => setReward(""), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {reward ? (
        <div className="rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary">
          {reward}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-2 text-primary">
          {autosaveState || "ระบบกำลังดูแลการบันทึกคำตอบให้อัตโนมัติ"}
        </span>
        {isCompleted ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            ส่งแบบประเมินแล้ว
          </span>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-secondary">
          <MessageSquareHeart size={16} />
          แบบประเมินความพึงพอใจการใช้ Platform
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          ให้คะแนนการใช้งานแพลตฟอร์มและสะท้อนความรู้สึกของคุณ เพื่อช่วยให้ทีม DU และระบบ InSPIRE360
          พัฒนาประสบการณ์ของผู้ใช้รุ่นถัดไปได้ดีขึ้น
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RatingField
          label="ความพึงพอใจโดยรวม"
          helper="ภาพรวมของประสบการณ์ตลอดการเรียนใน InSPIRE360"
          value={draft.overallExperience}
          onChange={(value) => setDraft((previous) => ({ ...previous, overallExperience: value }))}
        />
        <RatingField
          label="ประโยชน์ต่อการพัฒนางานสอน"
          helper="แพลตฟอร์มช่วยให้การพัฒนาบทเรียนและนวัตกรรมชัดขึ้นมากน้อยแค่ไหน"
          value={draft.platformUsefulness}
          onChange={(value) => setDraft((previous) => ({ ...previous, platformUsefulness: value }))}
        />
        <RatingField
          label="ความง่ายในการใช้งาน"
          helper="โครงสร้างหน้าจอ การกรอกข้อมูล และการกลับมาทำต่อใช้งานง่ายเพียงใด"
          value={draft.easeOfUse}
          onChange={(value) => setDraft((previous) => ({ ...previous, easeOfUse: value }))}
        />
        <RatingField
          label="AI Mentor ช่วยได้จริงไหม"
          helper="คำแนะนำจาก AI Mentor มีประโยชน์และช่วยคิดต่อได้มากน้อยแค่ไหน"
          value={draft.aiMentorSupport}
          onChange={(value) => setDraft((previous) => ({ ...previous, aiMentorSupport: value }))}
        />
        <RatingField
          label="ความตั้งใจจะแนะนำต่อ"
          helper="คุณอยากแนะนำ InSPIRE360 ให้เพื่อนครูคนอื่นมากน้อยแค่ไหน"
          value={draft.wouldRecommend}
          onChange={(value) => setDraft((previous) => ({ ...previous, wouldRecommend: value }))}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-ink">สิ่งที่ชอบที่สุดใน Platform</p>
          <TextArea
            value={draft.favoritePart}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, favoritePart: event.target.value }))
            }
            placeholder="เล่าว่าอะไรช่วยคุณได้มากที่สุด หรือส่วนไหนที่รู้สึกว่ามีพลังจริง"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">สิ่งที่อยากให้พัฒนาเพิ่มเติม</p>
          <TextArea
            value={draft.improvementIdea}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, improvementIdea: event.target.value }))
            }
            placeholder="เสนอ feature หรือ flow ที่อยากให้ดีขึ้นในรุ่นถัดไป"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-ink">ข้อความสะท้อนปิดท้ายถึงทีม InSPIRE360</p>
        <TextArea
          rows={4}
          value={draft.finalReflection}
          onChange={(event) =>
            setDraft((previous) => ({ ...previous, finalReflection: event.target.value }))
          }
          placeholder="คุณได้อะไรจากการเรียนครั้งนี้ และอยากบอกอะไรกับทีมผู้ออกแบบแพลตฟอร์ม"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary">
          {isCompleted
            ? "แบบประเมินนี้ส่งแล้ว แก้ไขหรือล้างคำตอบเพื่อกรอกใหม่ได้"
            : "บันทึกเมื่อพร้อมเพื่อปลดล็อก Certificate"}
        </div>
        <button
          type="button"
          onClick={persist}
          disabled={!ready || saving}
          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isCompleted ? (
            <CheckCircle2 size={16} />
          ) : (
            <MessageSquareHeart size={16} />
          )}
          {isCompleted ? "อัปเดตแบบประเมิน" : "ส่งแบบประเมิน"}
        </button>
      </div>
    </div>
  );
}

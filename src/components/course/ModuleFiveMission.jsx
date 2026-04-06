import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const buildPayload = (lesson, draft) => {
  if (lesson.activityType === "module5_real_classroom") {
    return {
      type: "real-classroom",
      lessonPlanTitle: draft.lessonPlanTitle || "",
      implementedDate: draft.implementedDate || "",
      durationMinutes: draft.durationMinutes || "",
      classroomContext: draft.classroomContext || "",
      learningFocus: draft.learningFocus || "",
      clipLink: draft.clipLink || "",
      evidenceNote: draft.evidenceNote || "",
      duQuestion: draft.duQuestion || "",
    };
  }

  if (lesson.activityType === "module5_reflection_log") {
    return {
      type: "reflection-log",
      lessonPlanTitle: draft.lessonPlanTitle || "",
      whatHappened: draft.whatHappened || "",
      proudMoment: draft.proudMoment || "",
      studentResponse: draft.studentResponse || "",
      challengePoint: draft.challengePoint || "",
      evidenceCollected: draft.evidenceCollected || "",
      mentorReflection: draft.mentorReflection || "",
    };
  }

  return {
    type: "growth-path",
    lessonPlanTitle: draft.lessonPlanTitle || "",
    versionNext: draft.versionNext || "",
    improvementFocus: draft.improvementFocus || "",
    supportNeeded: draft.supportNeeded || "",
    nextTimeline: draft.nextTimeline || "",
    successIndicator: draft.successIndicator || "",
    scalePlan: draft.scalePlan || "",
  };
};

const hasContent = (payload) => JSON.stringify(payload).replace(/[\s":,{}\[\]]/g, "").length > 0;

const Field = ({ label, helper, children }) => (
  <div>
    <p className="text-sm font-semibold text-ink">{label}</p>
    {helper ? <p className="mt-1 text-sm leading-7 text-slate-500">{helper}</p> : null}
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = "text" }) => (
  <input
    type={type}
    value={value || ""}
    onChange={onChange}
    placeholder={placeholder}
    className="mt-3 w-full rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white"
  />
);

const TextArea = ({ value, onChange, placeholder, rows = 5 }) => (
  <textarea
    value={value || ""}
    onChange={onChange}
    rows={rows}
    placeholder={placeholder}
    className="mt-3 w-full rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white"
  />
);

const SectionIntro = ({ intro, helper }) => (
  <div className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
    <p className="text-sm font-semibold text-secondary">AI Mentor ชวนคิด</p>
    <p className="mt-3 text-sm leading-7 text-slate-700">{intro}</p>
    {helper ? <p className="mt-3 text-sm leading-7 text-slate-600">{helper}</p> : null}
  </div>
);

export default function ModuleFiveMission({
  lesson,
  savedResponse,
  allResponses = {},
  isCompleted,
  onSave,
  onDraftSave,
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState("");
  const [autosaveState, setAutosaveState] = useState("");
  const lastPayloadRef = useRef("");

  const moduleFourInnovation = allResponses["m4-mission-1"] || {};
  const moduleFourBlueprint = allResponses["m4-mission-2"] || {};
  const moduleFourCraft = allResponses["m4-mission-3"] || {};
  const moduleTwoSmart = allResponses["m2-mission-5"] || {};

  useEffect(() => {
    const fallbackTitle =
      savedResponse?.lessonPlanTitle ||
      moduleFourInnovation?.innovationName ||
      moduleFourCraft?.artifactTitle ||
      moduleTwoSmart?.commitment ||
      "";

    if (lesson.activityType === "module5_real_classroom") {
      setDraft({
        lessonPlanTitle: fallbackTitle,
        implementedDate: savedResponse?.implementedDate || "",
        durationMinutes: savedResponse?.durationMinutes || "50",
        classroomContext: savedResponse?.classroomContext || "",
        learningFocus:
          savedResponse?.learningFocus ||
          moduleFourBlueprint?.actionPhase ||
          moduleTwoSmart?.commitment ||
          "",
        clipLink: savedResponse?.clipLink || "",
        evidenceNote: savedResponse?.evidenceNote || "",
        duQuestion: savedResponse?.duQuestion || "",
      });
      return;
    }

    if (lesson.activityType === "module5_reflection_log") {
      setDraft({
        lessonPlanTitle: fallbackTitle,
        whatHappened: savedResponse?.whatHappened || "",
        proudMoment: savedResponse?.proudMoment || "",
        studentResponse: savedResponse?.studentResponse || "",
        challengePoint: savedResponse?.challengePoint || "",
        evidenceCollected: savedResponse?.evidenceCollected || "",
        mentorReflection: savedResponse?.mentorReflection || "",
      });
      return;
    }

    setDraft({
      lessonPlanTitle: fallbackTitle,
      versionNext: savedResponse?.versionNext || "",
      improvementFocus: savedResponse?.improvementFocus || "",
      supportNeeded: savedResponse?.supportNeeded || "",
      nextTimeline: savedResponse?.nextTimeline || "",
      successIndicator: savedResponse?.successIndicator || "",
      scalePlan: savedResponse?.scalePlan || "",
    });
  }, [lesson, moduleFourBlueprint, moduleFourCraft, moduleFourInnovation, moduleTwoSmart, savedResponse]);

  useEffect(() => {
    const payload = buildPayload(lesson, draft);
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
        console.error("Failed to autosave Module 5 draft:", error);
        setAutosaveState("ยังบันทึกอัตโนมัติไม่สำเร็จ");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [draft, lesson, onDraftSave]);

  const persist = async () => {
    setSaving(true);
    try {
      const payload = buildPayload(lesson, draft);
      await onSave(payload);
      lastPayloadRef.current = JSON.stringify(payload);
      setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
      setReward(lesson.content.aiMentor?.reward || "บันทึกภารกิจเรียบร้อย");
      window.setTimeout(() => setReward(""), 2200);
    } finally {
      setSaving(false);
    }
  };

  const renderTop = (helper) => (
    <>
      {reward ? (
        <div className="mb-4 rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary">
          {reward}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-2 text-primary">
          {autosaveState || "ระบบกำลังดูแลการบันทึกคำตอบให้อัตโนมัติ"}
        </span>
        {isCompleted ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            ภารกิจนี้ผ่านแล้ว
          </span>
        ) : null}
      </div>
      <SectionIntro intro={lesson.content.aiMentor.intro} helper={helper} />
    </>
  );

  const renderSubmit = (ready) => (
    <div className="mt-6 flex justify-end">
      {isCompleted ? (
        <div className="flex items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
          <CheckCircle2 size={16} />
          ทำภารกิจนี้เสร็จแล้ว
        </div>
      ) : (
        <button
          type="button"
          onClick={persist}
          disabled={!ready || saving}
          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          บันทึกภารกิจ
        </button>
      )}
    </div>
  );

  if (lesson.activityType === "module5_real_classroom") {
    const ready = Boolean(draft.lessonPlanTitle && draft.clipLink && draft.classroomContext);

    return (
      <div className="space-y-6">
        {renderTop(
          "แชร์หลักฐานการสอนจริงให้ครบทั้งแผน ลิงก์คลิป และบริบทของห้องเรียน เพื่อให้การสะท้อนผลในขั้นถัดไปมีฐานข้อมูลจริงรองรับ",
        )}
        <div className="grid gap-5 xl:grid-cols-2">
          <Field
            label="ชื่อแผน / ชื่อนวัตกรรมที่นำไปใช้"
            helper="ใช้ชื่อที่เชื่อมกับ Module 4 เพื่อให้ report card ต่อเนื่องกันได้"
          >
            <Input
              value={draft.lessonPlanTitle}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, lessonPlanTitle: event.target.value }))
              }
              placeholder="เช่น Border Market Story Lab"
            />
          </Field>
          <Field
            label="วันที่นำไปใช้จริง"
            helper="ระบุวันสอนหรือวันที่เก็บหลักฐาน"
          >
            <Input
              type="date"
              value={draft.implementedDate}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, implementedDate: event.target.value }))
              }
            />
          </Field>
          <Field
            label="ระยะเวลาคลิป / คาบเรียน (นาที)"
            helper="แนะนำ 50-60 นาทีตามโจทย์"
          >
            <Input
              type="number"
              value={draft.durationMinutes}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, durationMinutes: event.target.value }))
              }
              placeholder="50"
            />
          </Field>
          <Field
            label="บริบทชั้นเรียน"
            helper="เช่น ระดับชั้น จำนวนผู้เรียน หรือบริบทพิเศษของคาบนี้"
          >
            <TextArea
              rows={4}
              value={draft.classroomContext}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, classroomContext: event.target.value }))
              }
              placeholder="เช่น ม.2 จำนวน 32 คน ห้องเรียนมีผู้เรียนหลากหลายระดับ..."
            />
          </Field>
        </div>

        <Field
          label="เป้าหมายการเรียนรู้ / สิ่งที่อยากเห็นจากคาบนี้"
          helper="สรุปให้เห็นว่าคาบนี้ตั้งใจแก้ pain point หรือสร้างผลลัพธ์อะไร"
        >
          <TextArea
            value={draft.learningFocus}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, learningFocus: event.target.value }))
            }
            placeholder="อธิบายผลลัพธ์ที่คาดหวังและพฤติกรรมของผู้เรียนที่อยากเห็น"
          />
        </Field>

        <Field
          label="ลิงก์คลิปการสอนจริง"
          helper="แนบ Google Drive, YouTube (Unlisted), หรือพื้นที่เก็บไฟล์ที่เปิดให้ผู้ประเมินดูได้"
        >
          <Input
            value={draft.clipLink}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, clipLink: event.target.value }))
            }
            placeholder="https://..."
          />
        </Field>

        <div className="grid gap-5 xl:grid-cols-2">
          <Field
            label="บันทึกหลักฐานหรือจุดสังเกตสำคัญ"
            helper="เช่น นาทีที่เกิด quick win หรือช่วงที่เห็นพฤติกรรมผู้เรียนชัดเจน"
          >
            <TextArea
              value={draft.evidenceNote}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, evidenceNote: event.target.value }))
              }
              placeholder="ระบุช่วงเวลาหรือเหตุการณ์สำคัญที่อยากให้ย้อนดูในคลิป"
            />
          </Field>
          <Field
            label="คำถามที่อยากให้ DU ช่วยดู"
            helper="ถ้ามีจุดที่อยากได้ feedback เป็นพิเศษ ให้ใส่ไว้ตรงนี้"
          >
            <TextArea
              value={draft.duQuestion}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, duQuestion: event.target.value }))
              }
              placeholder="เช่น อยากได้คำแนะนำเรื่องการดึงผู้เรียนกลุ่มเงียบให้มีส่วนร่วม"
            />
          </Field>
        </div>

        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module5_reflection_log") {
    const ready = Boolean(draft.whatHappened && draft.proudMoment && draft.challengePoint);

    return (
      <div className="space-y-6">
        {renderTop(
          "ใช้ reflection log เป็นพื้นที่ซื่อสัตย์กับสิ่งที่เกิดขึ้นจริง ยิ่งชัด ยิ่งช่วยให้การต่อยอดใน Mission 3 มีคุณภาพและเป็นไปได้จริง",
        )}
        <Field
          label="ชื่อแผน / คาบที่สะท้อนผล"
          helper="เพื่อเชื่อม reflection นี้กับหลักฐานจาก Mission 1"
        >
          <Input
            value={draft.lessonPlanTitle}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, lessonPlanTitle: event.target.value }))
            }
            placeholder="ชื่อแผนการสอนหรือชื่อนวัตกรรม"
          />
        </Field>

        <div className="grid gap-5 xl:grid-cols-2">
          <Field
            label="เกิดอะไรขึ้นจริงในคาบนี้"
            helper="เล่า flow ของคาบหรือเหตุการณ์สำคัญที่สะท้อนการใช้แผนจริง"
          >
            <TextArea
              value={draft.whatHappened}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, whatHappened: event.target.value }))
              }
              placeholder="เล่าภาพรวมของคาบตั้งแต่เริ่มจนจบ"
            />
          </Field>
          <Field
            label="โมเมนต์ที่ภูมิใจที่สุด"
            helper="เลือกช่วงเวลาที่ทำให้รู้สึกว่าแผนนี้เริ่มสร้างผลลัพธ์จริง"
          >
            <TextArea
              value={draft.proudMoment}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, proudMoment: event.target.value }))
              }
              placeholder="เช่น ผู้เรียนเริ่มตั้งคำถามเองหรือช่วยกันแก้โจทย์อย่างมีชีวิตชีวา"
            />
          </Field>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Field
            label="ผู้เรียนตอบสนองอย่างไร"
            helper="เขียนให้เห็นพฤติกรรม อารมณ์ หรือระดับการมีส่วนร่วมของผู้เรียน"
          >
            <TextArea
              value={draft.studentResponse}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, studentResponse: event.target.value }))
              }
              placeholder="ผู้เรียนมีส่วนร่วม ถามตอบ ทำงานกลุ่ม หรือสะท้อนคิดอย่างไร"
            />
          </Field>
          <Field
            label="ความท้าทาย / จุดที่ยังติดขัด"
            helper="ระบุสิ่งที่ควรปรับจริง ๆ เพื่อใช้ต่อยอดรอบถัดไป"
          >
            <TextArea
              value={draft.challengePoint}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, challengePoint: event.target.value }))
              }
              placeholder="เช่น เวลายังไม่พอ ผู้เรียนบางกลุ่มยังไม่กล้าพูด หรือสื่อยังซับซ้อนเกินไป"
            />
          </Field>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Field
            label="หลักฐานที่ยืนยันข้อค้นพบ"
            helper="เช่น นาทีในคลิป ใบงาน คำพูดของนักเรียน หรือหลักฐานชิ้นอื่น"
          >
            <TextArea
              value={draft.evidenceCollected}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, evidenceCollected: event.target.value }))
              }
              placeholder="อธิบายหลักฐานที่ช่วยให้ reflection นี้จับต้องได้"
            />
          </Field>
          <Field
            label="ข้อคิดของครูหลังคาบนี้"
            helper="บอกสิ่งที่ครูเรียนรู้จากการสอนครั้งนี้กับตัวเอง"
          >
            <TextArea
              value={draft.mentorReflection}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, mentorReflection: event.target.value }))
              }
              placeholder="เช่น พบว่าวิธี facilitate สำคัญกว่าสื่อ หรือควรลดคำสั่งลงแล้วเพิ่มการถามกลับ"
            />
          </Field>
        </div>

        {renderSubmit(ready)}
      </div>
    );
  }

  const ready = Boolean(draft.versionNext && draft.improvementFocus && draft.nextTimeline);

  return (
    <div className="space-y-6">
      {renderTop(
        "เลือกการพัฒนารอบถัดไปที่สำคัญที่สุด ไม่ต้องใส่ทุกอย่าง แต่ต้องตอบได้ว่าทำไมสิ่งนี้จึงคุ้มค่าที่จะอัปเกรดก่อน",
      )}
      <Field
        label="ชื่อแผน / นวัตกรรมที่กำลังต่อยอด"
        helper="เชื่อมให้เห็นว่าการพัฒนานี้ต่อยอดจากอะไร"
      >
        <Input
          value={draft.lessonPlanTitle}
          onChange={(event) =>
            setDraft((previous) => ({ ...previous, lessonPlanTitle: event.target.value }))
          }
          placeholder="ชื่อแผนการสอนหรือชื่อนวัตกรรม"
        />
      </Field>

      <div className="grid gap-5 xl:grid-cols-2">
        <Field
          label="Version 2.0 อยากให้ชื่อว่าอะไร"
          helper="ตั้งชื่อเวอร์ชันถัดไปเพื่อช่วยให้เห็นภาพการเปลี่ยนแปลง"
        >
          <Input
            value={draft.versionNext}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, versionNext: event.target.value }))
            }
            placeholder="เช่น Border Story Lab 2.0"
          />
        </Field>
        <Field
          label="กรอบเวลาที่จะเริ่มทดลองรอบถัดไป"
          helper="กำหนดเวลาให้ชัด เช่น ภายใน 2 สัปดาห์ / ภายในเทอมหน้า"
        >
          <Input
            value={draft.nextTimeline}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, nextTimeline: event.target.value }))
            }
            placeholder="เช่น ภายใน 2 สัปดาห์หลังสอบกลางภาค"
          />
        </Field>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Field
          label="สิ่งที่จะปรับหลักในรอบถัดไป"
          helper="ระบุ 1-2 เรื่องสำคัญที่สุดที่ได้จาก reflection"
        >
          <TextArea
            value={draft.improvementFocus}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, improvementFocus: event.target.value }))
            }
            placeholder="เช่น ปรับคำสั่งให้สั้นขึ้น เพิ่มเวลา feedback กลุ่มเล็ก และแยกบทบาทผู้เรียนให้ชัดกว่าเดิม"
          />
        </Field>
        <Field
          label="ผลลัพธ์ที่อยากเห็นเมื่ออัปเกรดแล้ว"
          helper="เขียนให้พอวัดผลได้ เช่น พฤติกรรมหรือหลักฐานที่อยากเห็น"
        >
          <TextArea
            value={draft.successIndicator}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, successIndicator: event.target.value }))
            }
            placeholder="เช่น ผู้เรียนอย่างน้อย 80% มีส่วนร่วมในการนำเสนอหรือสร้างชิ้นงานครบตามเกณฑ์"
          />
        </Field>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Field
          label="สิ่งสนับสนุนที่ต้องการ"
          helper="เช่น DU mentor, สื่อ, อุปกรณ์, เพื่อนครูคู่คิด หรือเวลาในการเตรียม"
        >
          <TextArea
            value={draft.supportNeeded}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, supportNeeded: event.target.value }))
            }
            placeholder="ระบุ resource หรือ support ที่จะช่วยให้เวอร์ชันถัดไปเกิดขึ้นจริง"
          />
        </Field>
        <Field
          label="ถ้าทำได้ดีแล้ว อยากขยายผลอย่างไร"
          helper="เช่น ขยายไปอีกห้อง แชร์ใน PLC หรือทำเป็นต้นแบบระดับโรงเรียน"
        >
          <TextArea
            value={draft.scalePlan}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, scalePlan: event.target.value }))
            }
            placeholder="เขียนแผนขยายผลหรือการต่อยอดในวงกว้าง"
          />
        </Field>
      </div>

      {renderSubmit(ready)}
    </div>
  );
}

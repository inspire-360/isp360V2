import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const EMPTY_RESPONSE = Object.freeze({});

const filled = (value) => Boolean(String(value || "").trim());

const choiceValue = (selected, custom) => selected || custom || "";

const buildPayload = (lesson, draft) => {
  if (lesson.activityType === "module4_innovation_lab") {
    const selectedTool =
      lesson.content.toolOptions.find((option) => option.id === draft.innovationTool)?.label || "";
    const selectedPedagogy =
      lesson.content.activeLearningOptions.find((option) => option.id === draft.pedagogyMode)
        ?.label || "";
    const toolLabel = selectedTool || draft.innovationToolCustom || "";
    const pedagogyLabel = selectedPedagogy || draft.pedagogyCustom || "";

    return {
      type: "innovation-lab",
      innovationName: draft.innovationName || "",
      innovationTool: draft.innovationTool || "",
      innovationToolCustom: draft.innovationToolCustom || "",
      pedagogyMode: draft.pedagogyMode || "",
      pedagogyCustom: draft.pedagogyCustom || "",
      toolLabel,
      pedagogyLabel,
      innovationFormula: toolLabel && pedagogyLabel ? `${toolLabel} + ${pedagogyLabel}` : "",
      painPoint: draft.painPoint || "",
      targetGoal: draft.targetGoal || "",
    };
  }

  if (lesson.activityType === "module4_master_blueprint") {
    return {
      type: "master-blueprint",
      innovationName: draft.innovationName || "",
      teacherName: draft.teacherName || "",
      subjectName: draft.subjectName || "",
      gradeLevel: draft.gradeLevel || "",
      durationLabel: draft.durationLabel || "",
      inspiration: draft.inspiration || "",
      objectives: draft.objectives || "",
      innovationFormat: draft.innovationFormat || "",
      innovationMechanism: draft.innovationMechanism || "",
      hookPhase: draft.hookPhase || "",
      actionPhase: draft.actionPhase || "",
      reflectPhase: draft.reflectPhase || "",
      creativeEvaluation: draft.creativeEvaluation || "",
      resourcesNeeded: draft.resourcesNeeded || "",
      blueprintLink: draft.blueprintLink || "",
    };
  }

  if (lesson.activityType === "module4_crafting_session") {
    return {
      type: "crafting-session",
      innovationName: draft.innovationName || "",
      artifactType: draft.artifactType || "",
      artifactTitle: draft.artifactTitle || "",
      assetLink: draft.assetLink || "",
      assetDescription: draft.assetDescription || "",
      classroomUse: draft.classroomUse || "",
    };
  }

  return {
    type: "beta-test",
    testWith: draft.testWith || "",
    strengthAnswer: draft.strengthAnswer || "",
    upgradeAnswer: draft.upgradeAnswer || "",
    feedbackNote: draft.feedbackNote || "",
  };
};

const hasContent = (payload) => JSON.stringify(payload).replace(/[\s":,{}[\]]/g, "").length > 0;

const SectionIntro = ({ intro, helper }) => (
  <div className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
    <p className="text-sm font-semibold text-secondary">AI Mentor ชวนคิด</p>
    <p className="mt-3 text-sm leading-7 text-slate-700">{intro}</p>
    {helper ? <p className="mt-3 text-sm leading-7 text-slate-600">{helper}</p> : null}
  </div>
);

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

const ChoiceGrid = ({ options, value, onSelect }) => (
  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onSelect(option.id)}
        className={`rounded-[20px] border p-4 text-left transition ${
          value === option.id
            ? "border-primary/25 bg-primary/5"
            : "border-slate-100 bg-slate-50/80 hover:border-secondary/20"
        }`}
      >
        <p className="font-semibold text-ink">{option.label}</p>
      </button>
    ))}
  </div>
);

export default function ModuleFourMission({
  lesson,
  savedResponse,
  allResponses = EMPTY_RESPONSE,
  isCompleted,
  onSave,
  onDraftSave,
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState("");
  const [autosaveState, setAutosaveState] = useState("");
  const hydratedLessonRef = useRef("");
  const lastPayloadRef = useRef("");

  const moduleThreeBillboard = allResponses["m3-mission-1"] ?? EMPTY_RESPONSE;
  const moduleThreePitch = allResponses["m3-mission-3"] ?? EMPTY_RESPONSE;
  const moduleTwoSmart = allResponses["m2-mission-5"] ?? EMPTY_RESPONSE;
  const moduleFourInnovation = allResponses["m4-mission-1"] ?? EMPTY_RESPONSE;
  const moduleFourBlueprint = allResponses["m4-mission-2"] ?? EMPTY_RESPONSE;
  const moduleFourCraft = allResponses["m4-mission-3"] ?? EMPTY_RESPONSE;

  useEffect(() => {
    if (hydratedLessonRef.current === lesson.id) return;

    hydratedLessonRef.current = lesson.id;
    setReward("");
    setAutosaveState("");

    if (lesson.activityType === "module4_innovation_lab") {
      setDraft({
        innovationName: savedResponse?.innovationName || moduleThreePitch?.projectName || "",
        innovationTool: savedResponse?.innovationTool || "",
        innovationToolCustom: savedResponse?.innovationToolCustom || "",
        pedagogyMode: savedResponse?.pedagogyMode || "",
        pedagogyCustom: savedResponse?.pedagogyCustom || "",
        painPoint:
          savedResponse?.painPoint || moduleThreeBillboard?.painPoint || moduleThreePitch?.painPoint || "",
        targetGoal: savedResponse?.targetGoal || moduleTwoSmart?.commitment || "",
      });
      return;
    }

    if (lesson.activityType === "module4_master_blueprint") {
      setDraft({
        innovationName: savedResponse?.innovationName || moduleFourInnovation?.innovationName || "",
        teacherName: savedResponse?.teacherName || "",
        subjectName: savedResponse?.subjectName || "",
        gradeLevel: savedResponse?.gradeLevel || "",
        durationLabel: savedResponse?.durationLabel || "1 คาบ / 50 นาที",
        inspiration: savedResponse?.inspiration || moduleFourInnovation?.painPoint || "",
        objectives: savedResponse?.objectives || moduleFourInnovation?.targetGoal || "",
        innovationFormat:
          savedResponse?.innovationFormat || moduleFourInnovation?.innovationFormula || moduleFourInnovation?.toolLabel || "",
        innovationMechanism: savedResponse?.innovationMechanism || "",
        hookPhase: savedResponse?.hookPhase || "",
        actionPhase: savedResponse?.actionPhase || "",
        reflectPhase: savedResponse?.reflectPhase || "",
        creativeEvaluation: savedResponse?.creativeEvaluation || "",
        resourcesNeeded: savedResponse?.resourcesNeeded || "",
        blueprintLink: savedResponse?.blueprintLink || "",
      });
      return;
    }

    if (lesson.activityType === "module4_crafting_session") {
      setDraft({
        innovationName: savedResponse?.innovationName || moduleFourInnovation?.innovationName || "",
        artifactType: savedResponse?.artifactType || "",
        artifactTitle: savedResponse?.artifactTitle || "",
        assetLink: savedResponse?.assetLink || "",
        assetDescription: savedResponse?.assetDescription || "",
        classroomUse: savedResponse?.classroomUse || "",
      });
      return;
    }

    setDraft({
      testWith: savedResponse?.testWith || "",
      strengthAnswer: savedResponse?.strengthAnswer || "",
      upgradeAnswer: savedResponse?.upgradeAnswer || "",
      feedbackNote: savedResponse?.feedbackNote || "",
    });
  }, [
    lesson,
    moduleFourInnovation,
    moduleThreeBillboard,
    moduleThreePitch,
    moduleTwoSmart,
    savedResponse,
  ]);

  useEffect(() => {
    if (!onDraftSave) return undefined;

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
        console.error("Failed to autosave Module 4 draft:", error);
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
          disabled={!ready || saving}
          onClick={persist}
          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          บันทึกภารกิจ
        </button>
      )}
    </div>
  );

  const innovationFormula = useMemo(() => {
    const selectedTool =
      lesson.content.toolOptions?.find((option) => option.id === draft.innovationTool)?.label || "";
    const selectedPedagogy =
      lesson.content.activeLearningOptions?.find((option) => option.id === draft.pedagogyMode)?.label ||
      "";
    const toolLabel = selectedTool || draft.innovationToolCustom || "";
    const pedagogyLabel = selectedPedagogy || draft.pedagogyCustom || "";
    return toolLabel && pedagogyLabel ? `${toolLabel} + ${pedagogyLabel}` : "";
  }, [draft.innovationTool, draft.innovationToolCustom, draft.pedagogyMode, draft.pedagogyCustom, lesson.content]);

  if (lesson.activityType === "module4_innovation_lab") {
    const ready = [
      draft.innovationName,
      choiceValue(draft.innovationTool, draft.innovationToolCustom),
      choiceValue(draft.pedagogyMode, draft.pedagogyCustom),
      draft.painPoint,
      draft.targetGoal,
    ].every(filled);

    return (
      <div>
        {renderTop(
          "เลือก 1 เครื่องมือและ 1 กระบวนการเรียนรู้แบบ Active Learning แล้วผสมให้กลายเป็นนวัตกรรมที่ตอบ pain point จริงของห้องเรียน",
        )}
        {(moduleThreeBillboard?.painPoint || moduleTwoSmart?.commitment) && (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {moduleThreeBillboard?.painPoint ? (
              <article className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
                <p className="text-sm font-semibold text-primary">Pain Point ที่สืบต่อมาจากโมดูลก่อนหน้า</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{moduleThreeBillboard.painPoint}</p>
              </article>
            ) : null}
            {moduleTwoSmart?.commitment ? (
              <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
                <p className="text-sm font-semibold text-secondary">SMART Objective จาก Module 2</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{moduleTwoSmart.commitment}</p>
              </article>
            ) : null}
          </div>
        )}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="ชื่อนวัตกรรม">
            <Input
              value={draft.innovationName}
              onChange={(event) => setDraft((previous) => ({ ...previous, innovationName: event.target.value }))}
              placeholder="ตั้งชื่อให้นวัตกรรมของคุณน่าจดจำและชวนมอง"
            />
          </Field>
          <Field label="เลือก 1 เครื่องมือ" helper="เลือกแบบตัวเลือกสำเร็จรูปก่อน เพื่อให้ใช้งานง่ายและเสถียรขึ้น">
            <ChoiceGrid
              options={lesson.content.toolOptions}
              value={draft.innovationTool}
              onSelect={(innovationTool) =>
                setDraft((previous) => ({ ...previous, innovationTool, innovationToolCustom: "" }))
              }
            />
              <Input
                value={draft.innovationToolCustom}
                onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  innovationToolCustom: event.target.value,
                  innovationTool: event.target.value ? "" : previous.innovationTool,
                }))
              }
                placeholder="หากไม่มีในรายการ สามารถพิมพ์เครื่องมืออื่นได้"
              />
          </Field>
          <Field
            label="เลือก 1 วิธีจัดการเรียนรู้"
            helper="จับคู่กับเครื่องมือด้านบนเพื่อให้นวัตกรรมมีทั้งเทคโนโลยีและ pedagogy ที่สอดคล้องกัน"
          >
            <ChoiceGrid
              options={lesson.content.activeLearningOptions}
              value={draft.pedagogyMode}
              onSelect={(pedagogyMode) =>
                setDraft((previous) => ({ ...previous, pedagogyMode, pedagogyCustom: "" }))
              }
            />
            <Input
              value={draft.pedagogyCustom}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  pedagogyCustom: event.target.value,
                  pedagogyMode: event.target.value ? "" : previous.pedagogyMode,
                }))
              }
                placeholder="หากไม่มีในรายการ สามารถพิมพ์วิธีการอื่นได้"
              />
          </Field>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[26px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">สูตรผสมนวัตกรรม</p>
            <p className="mt-3 text-xl font-semibold text-ink">
              {innovationFormula || "เลือกทั้งเครื่องมือและวิธีการ แล้วสูตรผสมจะปรากฏตรงนี้"}
            </p>
          </article>
          <article className="rounded-[26px] border border-slate-100 bg-white p-5">
            <Field label="Pain Point ที่ต้องการแก้">
              <TextArea
                value={draft.painPoint}
                onChange={(event) => setDraft((previous) => ({ ...previous, painPoint: event.target.value }))}
                placeholder="ปัญหาอะไรในห้องเรียนที่นวัตกรรมนี้จะเข้าไปช่วยแก้"
                rows={4}
              />
            </Field>
            <Field label="เป้าหมายที่อยากให้เกิด">
              <TextArea
                value={draft.targetGoal}
                onChange={(event) => setDraft((previous) => ({ ...previous, targetGoal: event.target.value }))}
                placeholder="เมื่อใช้นวัตกรรมนี้แล้ว อยากเห็นผลลัพธ์อะไรเกิดขึ้นกับผู้เรียนหรือการสอน"
                rows={4}
              />
            </Field>
          </article>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module4_master_blueprint") {
    const ready = [
      draft.innovationName,
      draft.teacherName,
      draft.subjectName,
      draft.gradeLevel,
      draft.durationLabel,
      draft.inspiration,
      draft.objectives,
      draft.innovationFormat,
      draft.innovationMechanism,
      draft.hookPhase,
      draft.actionPhase,
      draft.reflectPhase,
      draft.creativeEvaluation,
      draft.resourcesNeeded,
      draft.blueprintLink,
    ].every(filled);

    return (
      <div>
        {renderTop(
          "นำคำตอบจาก Mission 1 มาขยายเป็นพิมพ์เขียวการสอน 1 หน้า ที่มีทั้งข้อมูลพื้นฐาน เป้าหมาย และขั้นตอนใช้นวัตกรรมอย่างครบถ้วน",
        )}
        {moduleFourInnovation?.innovationFormula ? (
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">สูตรผสมจาก Mission 1</p>
            <p className="mt-3 text-lg font-semibold text-ink">{moduleFourInnovation.innovationFormula}</p>
          </div>
        ) : null}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="ชื่อนวัตกรรม">
            <Input
              value={draft.innovationName}
              onChange={(event) => setDraft((previous) => ({ ...previous, innovationName: event.target.value }))}
              placeholder="ใช้ชื่อเดียวกับ Mission 1 เพื่อให้เชื่อมกันต่อเนื่อง"
            />
          </Field>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="ผู้สอน">
              <Input
                value={draft.teacherName}
                onChange={(event) => setDraft((previous) => ({ ...previous, teacherName: event.target.value }))}
                placeholder="ชื่อผู้สอน"
              />
            </Field>
            <Field label="รายวิชา">
              <Input
                value={draft.subjectName}
                onChange={(event) => setDraft((previous) => ({ ...previous, subjectName: event.target.value }))}
                placeholder="ชื่อวิชา"
              />
            </Field>
            <Field label="ระดับชั้น">
              <Input
                value={draft.gradeLevel}
                onChange={(event) => setDraft((previous) => ({ ...previous, gradeLevel: event.target.value }))}
                placeholder="เช่น ม.2 หรือ ป.5"
              />
            </Field>
            <Field label="เวลาที่ใช้">
              <Input
                value={draft.durationLabel}
                onChange={(event) => setDraft((previous) => ({ ...previous, durationLabel: event.target.value }))}
                placeholder="เช่น 1 คาบ / 50 นาที"
              />
            </Field>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <Field label="ปัญหาหรือแรงบันดาลใจ">
                <TextArea
                  value={draft.inspiration}
                  onChange={(event) => setDraft((previous) => ({ ...previous, inspiration: event.target.value }))}
                  placeholder="ปัญหาเดิมของการสอนเรื่องนี้คืออะไร และทำไมจึงต้องสร้างนวัตกรรมนี้ขึ้นมา"
                  rows={5}
                />
              </Field>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <Field label="จุดประสงค์การเรียนรู้">
                <TextArea
                  value={draft.objectives}
                  onChange={(event) => setDraft((previous) => ({ ...previous, objectives: event.target.value }))}
                  placeholder="สรุป K-P-A แบบสั้น ๆ ว่าเมื่อจบคาบ ผู้เรียนจะได้ความรู้ ทักษะ และทัศนคติอะไร"
                  rows={5}
                />
              </Field>
            </article>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <Field label="หัวใจของนวัตกรรม">
                <TextArea
                  value={draft.innovationFormat}
                  onChange={(event) => setDraft((previous) => ({ ...previous, innovationFormat: event.target.value }))}
                  placeholder="ระบุรูปแบบ เช่น บอร์ดเกม การใช้ AI Role-play ห้องเรียนกลับด้าน หรือรูปแบบอื่น"
                  rows={5}
                />
              </Field>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <Field label="นวัตกรรมนี้ช่วยแก้ปัญหาอย่างไร">
                <TextArea
                  value={draft.innovationMechanism}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, innovationMechanism: event.target.value }))
                  }
                  placeholder="อธิบายกลไกว่าทำไมรูปแบบนี้ถึงช่วยแก้ pain point ได้"
                  rows={5}
                />
              </Field>
            </article>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <Field label="ขั้นกระตุ้น (Hook - 5 นาที)">
                <TextArea
                  value={draft.hookPhase}
                  onChange={(event) => setDraft((previous) => ({ ...previous, hookPhase: event.target.value }))}
                  placeholder="จะเปิดคาบอย่างไรให้เด็กสนใจและอยากมีส่วนร่วม"
                  rows={6}
                />
              </Field>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <Field label="ขั้นลุยกิจกรรม (Action)">
                <TextArea
                  value={draft.actionPhase}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, actionPhase: event.target.value }))
                  }
                  placeholder="เด็กจะใช้นวัตกรรมนี้อย่างไร และครูจะช่วยประคับประคองตรงไหน"
                  rows={6}
                />
              </Field>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <Field label="ขั้นสรุปและสะท้อนคิด (Reflection)">
                <TextArea
                  value={draft.reflectPhase}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, reflectPhase: event.target.value }))
                  }
                  placeholder="จะขมวดบทเรียนและเชื่อมชีวิตจริงหรือบริบทพื้นที่อย่างไร"
                  rows={6}
                />
              </Field>
            </article>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <Field label="การวัดผลแบบสร้างสรรค์">
              <TextArea
                value={draft.creativeEvaluation}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, creativeEvaluation: event.target.value }))
                }
                placeholder="จะดูอย่างไรว่าเด็กเข้าใจ เช่น จากชิ้นงาน การนำเสนอ การโหวต หรือคะแนนในเกม"
                rows={5}
              />
            </Field>
            <Field label="เครื่องมือและสิ่งที่ต้องเตรียม">
              <TextArea
                value={draft.resourcesNeeded}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, resourcesNeeded: event.target.value }))
                }
                placeholder="ลิสต์อุปกรณ์ แอป หรือวัสดุที่จำเป็นต่อการสอน"
                rows={5}
              />
            </Field>
          </div>
          <Field label="ลิงก์ไฟล์แผนการสอน / One-Page Blueprint">
            <Input
              value={draft.blueprintLink}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, blueprintLink: event.target.value }))
              }
              placeholder="แนบไฟล์ PDF, Word, รูปภาพ หรือ Google Drive ที่เก็บแผนไว้"
            />
          </Field>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module4_crafting_session") {
    const ready = [
      draft.innovationName,
      draft.artifactType,
      draft.artifactTitle,
      draft.assetLink,
      draft.classroomUse,
    ].every(filled);

    return (
      <div>
        {renderTop(
          "สร้างชิ้นงานจริงจากพิมพ์เขียวใน Mission 2 ไม่ว่าจะเป็นสื่อดิจิทัลหรือสื่อทำมือ เพื่อให้พร้อมนำไปใช้ในห้องเรียน",
        )}
        {moduleFourBlueprint?.blueprintLink ? (
          <div className="mt-5 rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">ลิงก์แผนการสอนที่อ้างอิง</p>
            <p className="mt-3 break-all text-sm leading-7 text-slate-700">
              {moduleFourBlueprint.blueprintLink}
            </p>
          </div>
        ) : null}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="ชื่อนวัตกรรม">
            <Input
              value={draft.innovationName}
              onChange={(event) => setDraft((previous) => ({ ...previous, innovationName: event.target.value }))}
              placeholder="ชื่อนวัตกรรมหรือชิ้นงานที่กำลังสร้าง"
            />
          </Field>
          <Field label="ประเภทชิ้นงาน">
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                { id: "digital", label: "สื่อดิจิทัล" },
                { id: "physical", label: "สื่อทำมือ / สื่อกายภาพ" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, artifactType: option.id }))}
                  className={`rounded-[20px] border p-4 text-left transition ${
                    draft.artifactType === option.id
                      ? "border-primary/25 bg-primary/5"
                      : "border-slate-100 bg-slate-50/80 hover:border-secondary/20"
                  }`}
                >
                  <p className="font-semibold text-ink">{option.label}</p>
                </button>
              ))}
            </div>
          </Field>
          <Field label="ชื่อชิ้นงาน">
            <Input
              value={draft.artifactTitle}
              onChange={(event) => setDraft((previous) => ({ ...previous, artifactTitle: event.target.value }))}
              placeholder="เช่น สไลด์นำเสนอ ใบงานอินเทอร์แอคทีฟ บอร์ดเกม หรือชุดอุปกรณ์กิจกรรม"
            />
          </Field>
          <Field label="ลิงก์ไฟล์หรือภาพชิ้นงาน">
            <Input
              value={draft.assetLink}
              onChange={(event) => setDraft((previous) => ({ ...previous, assetLink: event.target.value }))}
              placeholder="แนบลิงก์ Canva, Google Drive, YouTube หรือภาพถ่ายชิ้นงาน"
            />
          </Field>
          <Field label="คำอธิบายชิ้นงานสั้น ๆ">
            <TextArea
              value={draft.assetDescription}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, assetDescription: event.target.value }))
              }
              placeholder="อธิบายสั้น ๆ ว่าชิ้นงานนี้คืออะไร"
              rows={4}
            />
          </Field>
          <Field label="ชิ้นงานนี้ใช้ทำอะไรในคาบเรียน">
            <TextArea
              value={draft.classroomUse}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, classroomUse: event.target.value }))
              }
              placeholder="อธิบายว่าผู้เรียนจะใช้หรือมีปฏิสัมพันธ์กับชิ้นงานนี้อย่างไร"
              rows={4}
            />
          </Field>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  const ready = [draft.strengthAnswer, draft.upgradeAnswer].every(filled);

  return (
    <div>
      {renderTop(
        "ฝัง Padlet ด้านล่างเพื่อใช้เป็นพื้นที่แลกเปลี่ยน แล้วสรุปผลทดลองใช้แบบสั้น กระชับ โดยตอบให้ชัดว่าอะไรคือจุดเด่นที่สุด และอะไรควรอัปเกรดเป็นเวอร์ชัน 2.0",
      )}
      {moduleFourCraft?.artifactTitle ? (
        <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-primary">ชิ้นงานที่กำลังนำไปทดลอง</p>
          <p className="mt-3 text-lg font-semibold text-ink">{moduleFourCraft.artifactTitle}</p>
        </div>
      ) : null}
      {lesson.content.padletEmbedUrl ? (
        <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-100 bg-white">
          <iframe
            src={lesson.content.padletEmbedUrl}
            title="Padlet Beta Test"
            className="h-[620px] w-full border-0"
            loading="lazy"
            allow="camera;microphone;geolocation;display-capture;clipboard-write"
          />
        </div>
      ) : null}
      <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
        <Field
          label="ทดลองกับใครบ้าง"
          helper="เช่น เพื่อนครูในวง PLC หรือนักเรียนกลุ่มเล็ก 2-3 คน"
        >
          <Input
            value={draft.testWith}
            onChange={(event) => setDraft((previous) => ({ ...previous, testWith: event.target.value }))}
            placeholder="เช่น เพื่อนครู 1 คน และนักเรียน 3 คน"
          />
        </Field>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <Field label="1. จุดเด่นที่สุดของนวัตกรรม/สื่อชิ้นนี้คืออะไร">
              <TextArea
                value={draft.strengthAnswer}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, strengthAnswer: event.target.value }))
                }
                placeholder="อธิบายสิ่งที่ทำได้ดีแล้ว หรือสิ่งที่คนทดลองใช้ชอบมากที่สุด"
                rows={6}
              />
            </Field>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <Field label="2. หากจะอัปเกรดเป็นเวอร์ชัน 2.0 อยากปรับอะไรต่อ">
              <TextArea
                value={draft.upgradeAnswer}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, upgradeAnswer: event.target.value }))
                }
                placeholder="ระบุสิ่งที่อยากแก้ เพิ่ม หรือปรับให้เหมาะกับการใช้จริงมากขึ้น"
                rows={6}
              />
            </Field>
          </article>
        </div>
        <Field
          label="บันทึกข้อเสนอแนะเพิ่มเติม"
          helper="ช่องนี้ไม่บังคับ แต่ใส่คำพูดหรือข้อสังเกตสั้น ๆ จากผู้ทดลองใช้ได้"
        >
          <TextArea
            value={draft.feedbackNote}
            onChange={(event) => setDraft((previous) => ({ ...previous, feedbackNote: event.target.value }))}
            placeholder="เช่น เด็กบอกว่าเข้าใจกติกาเร็วขึ้น หรือเพื่อนครูแนะนำให้ลดจำนวนขั้นตอน"
            rows={4}
          />
        </Field>
      </div>
      {renderSubmit(ready)}
    </div>
  );
}

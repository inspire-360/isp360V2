import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

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
      hookPhase: draft.hookPhase || "",
      actionPhase: draft.actionPhase || "",
      reflectPhase: draft.reflectPhase || "",
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

const hasContent = (payload) => JSON.stringify(payload).replace(/[\s":,{}\[\]]/g, "").length > 0;

const SectionIntro = ({ intro, helper }) => (
  <div className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
    <p className="text-sm font-semibold text-secondary">AI Mentor Guidance</p>
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

  const moduleThreeBillboard = allResponses["m3-mission-1"] || {};
  const moduleThreePitch = allResponses["m3-mission-3"] || {};
  const moduleTwoSmart = allResponses["m2-mission-5"] || {};
  const moduleFourInnovation = allResponses["m4-mission-1"] || {};
  const moduleFourBlueprint = allResponses["m4-mission-2"] || {};
  const moduleFourCraft = allResponses["m4-mission-3"] || {};

  useEffect(() => {
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
        hookPhase: savedResponse?.hookPhase || "",
        actionPhase: savedResponse?.actionPhase || "",
        reflectPhase: savedResponse?.reflectPhase || "",
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
    const payload = buildPayload(lesson, draft);
    if (!hasContent(payload)) return undefined;

    const serialized = JSON.stringify(payload);
    if (serialized === lastPayloadRef.current) return undefined;

    setAutosaveState("Saving draft...");
    const timeoutId = window.setTimeout(async () => {
      try {
        await onDraftSave(payload);
        lastPayloadRef.current = serialized;
        setAutosaveState("Draft autosaved");
        window.setTimeout(() => setAutosaveState(""), 1800);
      } catch (error) {
        console.error("Failed to autosave Module 4 draft:", error);
        setAutosaveState("Autosave pending");
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
      setAutosaveState("Draft autosaved");
      setReward(lesson.content.aiMentor?.reward || "Mission saved");
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
          {autosaveState || "Autosave active"}
        </span>
        {isCompleted ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            Mission completed
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
          Completed
        </div>
      ) : (
        <button
          type="button"
          disabled={!ready || saving}
          onClick={persist}
          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Complete mission
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
          "Build an innovation formula that feels grounded, practical, and exciting. The strongest ideas solve a real pain point while matching the right tool to the right learning move.",
        )}
        {(moduleThreeBillboard?.painPoint || moduleTwoSmart?.commitment) && (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {moduleThreeBillboard?.painPoint ? (
              <article className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
                <p className="text-sm font-semibold text-primary">Pain point from previous modules</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{moduleThreeBillboard.painPoint}</p>
              </article>
            ) : null}
            {moduleTwoSmart?.commitment ? (
              <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
                <p className="text-sm font-semibold text-secondary">SMART goal from Module 2</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{moduleTwoSmart.commitment}</p>
              </article>
            ) : null}
          </div>
        )}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="Innovation Name">
            <Input
              value={draft.innovationName}
              onChange={(event) => setDraft((previous) => ({ ...previous, innovationName: event.target.value }))}
              placeholder="Give your innovation a memorable name"
            />
          </Field>
          <Field label="Select one tool" helper="Choose one hardware or software element for the formula.">
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
              placeholder="Or type a custom tool"
            />
          </Field>
          <Field
            label="Select one active-learning move"
            helper="Choose the learning process that gives the tool pedagogical power."
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
              placeholder="Or type a custom active-learning strategy"
            />
          </Field>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[26px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">Innovation Formula</p>
            <p className="mt-3 text-xl font-semibold text-ink">
              {innovationFormula || "Choose both ingredients to reveal the formula"}
            </p>
          </article>
          <article className="rounded-[26px] border border-slate-100 bg-white p-5">
            <Field label="Pain Point">
              <TextArea
                value={draft.painPoint}
                onChange={(event) => setDraft((previous) => ({ ...previous, painPoint: event.target.value }))}
                placeholder="What classroom issue will this innovation solve?"
                rows={4}
              />
            </Field>
            <Field label="Target Goal">
              <TextArea
                value={draft.targetGoal}
                onChange={(event) => setDraft((previous) => ({ ...previous, targetGoal: event.target.value }))}
                placeholder="What goal should become more reachable because of this innovation?"
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
      draft.hookPhase,
      draft.actionPhase,
      draft.reflectPhase,
      draft.blueprintLink,
    ].every(filled);

    return (
      <div>
        {renderTop(
          "Design a blueprint that another teacher can scan in one glance. Keep each phase tight, visual, and clearly connected to the innovation formula.",
        )}
        {moduleFourInnovation?.innovationFormula ? (
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">Innovation Formula</p>
            <p className="mt-3 text-lg font-semibold text-ink">{moduleFourInnovation.innovationFormula}</p>
          </div>
        ) : null}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="Innovation Name">
            <Input
              value={draft.innovationName}
              onChange={(event) => setDraft((previous) => ({ ...previous, innovationName: event.target.value }))}
              placeholder="Repeat the innovation name for this blueprint"
            />
          </Field>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <Field label="Hook (5 min)">
                <TextArea
                  value={draft.hookPhase}
                  onChange={(event) => setDraft((previous) => ({ ...previous, hookPhase: event.target.value }))}
                  placeholder="How will you open the lesson so learners feel curious and ready?"
                  rows={5}
                />
              </Field>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <Field label="Action (35 min)">
                <TextArea
                  value={draft.actionPhase}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, actionPhase: event.target.value }))
                  }
                  placeholder="How will learners use the innovation, and how will you facilitate?"
                  rows={6}
                />
              </Field>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <Field label="Reflect (10 min)">
                <TextArea
                  value={draft.reflectPhase}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, reflectPhase: event.target.value }))
                  }
                  placeholder="How will you check understanding and connect the lesson to life, SEZ, or future skills?"
                  rows={6}
                />
              </Field>
            </article>
          </div>
          <Field label="One-page Blueprint File Link">
            <Input
              value={draft.blueprintLink}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, blueprintLink: event.target.value }))
              }
              placeholder="Paste the PDF, Word, Drive, or image link for your blueprint"
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
          "Turn the blueprint into a real teaching asset. The goal is not perfection yet, but something concrete that can be tested in a real classroom moment.",
        )}
        {moduleFourBlueprint?.blueprintLink ? (
          <div className="mt-5 rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">Blueprint reference</p>
            <p className="mt-3 break-all text-sm leading-7 text-slate-700">
              {moduleFourBlueprint.blueprintLink}
            </p>
          </div>
        ) : null}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="Innovation Name">
            <Input
              value={draft.innovationName}
              onChange={(event) => setDraft((previous) => ({ ...previous, innovationName: event.target.value }))}
              placeholder="Name the innovation you are building"
            />
          </Field>
          <Field label="Artifact Type">
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                { id: "digital", label: "Digital Asset" },
                { id: "physical", label: "Physical / Handmade Asset" },
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
          <Field label="Artifact Title">
            <Input
              value={draft.artifactTitle}
              onChange={(event) => setDraft((previous) => ({ ...previous, artifactTitle: event.target.value }))}
              placeholder="What did you build?"
            />
          </Field>
          <Field label="Artifact Link or Image Link">
            <Input
              value={draft.assetLink}
              onChange={(event) => setDraft((previous) => ({ ...previous, assetLink: event.target.value }))}
              placeholder="Paste a Canva, Drive, YouTube, or photo link"
            />
          </Field>
          <Field label="Short Artifact Description">
            <TextArea
              value={draft.assetDescription}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, assetDescription: event.target.value }))
              }
              placeholder="Briefly describe the artifact itself"
              rows={4}
            />
          </Field>
          <Field label="How will this artifact be used in class?">
            <TextArea
              value={draft.classroomUse}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, classroomUse: event.target.value }))
              }
              placeholder="Explain what learners will do with the artifact during the lesson"
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
        "A beta test turns a clever idea into a stronger innovation. Capture the clearest win and the smartest next upgrade while the feedback is still fresh.",
      )}
      {moduleFourCraft?.artifactTitle ? (
        <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-primary">Prototype under test</p>
          <p className="mt-3 text-lg font-semibold text-ink">{moduleFourCraft.artifactTitle}</p>
        </div>
      ) : null}
      <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
        <Field label="Who tested the prototype?">
          <Input
            value={draft.testWith}
            onChange={(event) => setDraft((previous) => ({ ...previous, testWith: event.target.value }))}
            placeholder="Peer teacher, 2-3 students, or another small audience"
          />
        </Field>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <Field label="1. What is the strongest point of this innovation?">
              <TextArea
                value={draft.strengthAnswer}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, strengthAnswer: event.target.value }))
                }
                placeholder="What already works well?"
                rows={6}
              />
            </Field>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <Field label="2. What should be upgraded for Version 2.0?">
              <TextArea
                value={draft.upgradeAnswer}
                onChange={(event) =>
                  setDraft((previous) => ({ ...previous, upgradeAnswer: event.target.value }))
                }
                placeholder="What would you improve next?"
                rows={6}
              />
            </Field>
          </article>
        </div>
        <Field label="Optional feedback note">
          <TextArea
            value={draft.feedbackNote}
            onChange={(event) => setDraft((previous) => ({ ...previous, feedbackNote: event.target.value }))}
            placeholder="Capture a short quote or note from the beta test"
            rows={4}
          />
        </Field>
      </div>
      {renderSubmit(ready)}
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Sparkles } from "lucide-react";

const filled = (value) => Boolean(String(value || "").trim());

const buildPayload = (lesson, draft) => {
  if (lesson.activityType === "module3_idea_billboard") {
    return {
      type: "idea-billboard",
      projectName: draft.projectName || "",
      painPoint: draft.painPoint || "",
      solution: draft.solution || "",
      adviceRequest: draft.adviceRequest || "",
      boardEvidence: draft.boardEvidence || "",
      screenshotEvidence: draft.screenshotEvidence || "",
    };
  }

  if (lesson.activityType === "module3_mastermind_comments") {
    return {
      type: "mastermind-comments",
      commentOneRole: draft.commentOneRole || "",
      commentOneTarget: draft.commentOneTarget || "",
      commentOneText: draft.commentOneText || "",
      commentOneEvidence: draft.commentOneEvidence || "",
      commentTwoRole: draft.commentTwoRole || "",
      commentTwoTarget: draft.commentTwoTarget || "",
      commentTwoText: draft.commentTwoText || "",
      commentTwoEvidence: draft.commentTwoEvidence || "",
      vibeReflection: draft.vibeReflection || "",
    };
  }

  if (lesson.activityType === "module3_spell_pitch") {
    return {
      type: "spell-pitch",
      projectName: draft.projectName || "",
      feedbackApplied: draft.feedbackApplied || "",
      hook: draft.hook || "",
      painPoint: draft.painPoint || "",
      solution: draft.solution || "",
      impact: draft.impact || "",
      pitchLink: draft.pitchLink || "",
    };
  }

  return {
    type: "reflection-mirror",
    reflectionAnswer: draft.reflectionAnswer || "",
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

export default function ModuleThreeMission({
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

  const moduleTwoRoadmap = allResponses["m2-mission-3"] || {};
  const moduleTwoPitch = allResponses["m2-mission-4"] || {};
  const moduleTwoSmart = allResponses["m2-mission-5"] || {};

  useEffect(() => {
    if (lesson.activityType === "module3_idea_billboard") {
      setDraft({
        projectName: savedResponse?.projectName || moduleTwoPitch?.projectName || "",
        painPoint: savedResponse?.painPoint || "",
        solution: savedResponse?.solution || moduleTwoRoadmap?.northStar || "",
        adviceRequest: savedResponse?.adviceRequest || "",
        boardEvidence: savedResponse?.boardEvidence || "",
        screenshotEvidence: savedResponse?.screenshotEvidence || "",
      });
      return;
    }

    if (lesson.activityType === "module3_mastermind_comments") {
      setDraft({
        commentOneRole: savedResponse?.commentOneRole || "",
        commentOneTarget: savedResponse?.commentOneTarget || "",
        commentOneText: savedResponse?.commentOneText || "",
        commentOneEvidence: savedResponse?.commentOneEvidence || "",
        commentTwoRole: savedResponse?.commentTwoRole || "",
        commentTwoTarget: savedResponse?.commentTwoTarget || "",
        commentTwoText: savedResponse?.commentTwoText || "",
        commentTwoEvidence: savedResponse?.commentTwoEvidence || "",
        vibeReflection: savedResponse?.vibeReflection || "",
      });
      return;
    }

    if (lesson.activityType === "module3_spell_pitch") {
      setDraft({
        projectName: savedResponse?.projectName || moduleTwoPitch?.projectName || "",
        feedbackApplied: savedResponse?.feedbackApplied || "",
        hook: savedResponse?.hook || "",
        painPoint: savedResponse?.painPoint || "",
        solution: savedResponse?.solution || moduleTwoSmart?.commitment || "",
        impact: savedResponse?.impact || "",
        pitchLink: savedResponse?.pitchLink || "",
      });
      return;
    }

    setDraft({
      reflectionAnswer: savedResponse?.reflectionAnswer || "",
    });
  }, [lesson, moduleTwoPitch, moduleTwoRoadmap, moduleTwoSmart, savedResponse]);

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
        console.error("Failed to autosave Module 3 draft:", error);
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

  if (lesson.activityType === "module3_idea_billboard") {
    const ready =
      [draft.projectName, draft.painPoint, draft.solution, draft.adviceRequest].every(filled) &&
      [draft.boardEvidence, draft.screenshotEvidence].some(filled);

    return (
      <div>
        {renderTop(
          "Turn your 30-day plan into a short, clear council post so other teachers can quickly understand the idea and help you improve it.",
        )}
        {moduleTwoSmart?.commitment ? (
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm leading-7 text-slate-700">
            SMART promise from Module 2: {moduleTwoSmart.commitment}
          </div>
        ) : null}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="Project Name">
            <Input
              value={draft.projectName}
              onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
              placeholder="Name the 30-day project you want to post"
            />
          </Field>
          <Field label="Pain Point" helper="State the problem in 1-2 short lines.">
            <TextArea
              value={draft.painPoint}
              onChange={(event) => setDraft((previous) => ({ ...previous, painPoint: event.target.value }))}
              placeholder="What classroom pain point are you trying to solve?"
              rows={4}
            />
          </Field>
          <Field label="Solution" helper="Summarize the 30-day action you plan to run.">
            <TextArea
              value={draft.solution}
              onChange={(event) => setDraft((previous) => ({ ...previous, solution: event.target.value }))}
              placeholder="Describe the core idea and what you will do in the next 30 days"
              rows={5}
            />
          </Field>
          <Field label="What help do you want from the council?">
            <TextArea
              value={draft.adviceRequest}
              onChange={(event) => setDraft((previous) => ({ ...previous, adviceRequest: event.target.value }))}
              placeholder="What advice or ideas do you want peers to suggest?"
              rows={4}
            />
          </Field>
        </div>
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">Post evidence</p>
            <a
              href={lesson.content.boardUrl}
              target="_blank"
              rel="noreferrer"
              className="brand-button-secondary"
            >
              Open Padlet
              <ExternalLink size={16} />
            </a>
          </div>
          <Field label="Padlet post link">
            <Input
              value={draft.boardEvidence}
              onChange={(event) => setDraft((previous) => ({ ...previous, boardEvidence: event.target.value }))}
              placeholder="Paste the link to your Padlet post"
            />
          </Field>
          <Field label="Screenshot evidence link">
            <Input
              value={draft.screenshotEvidence}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, screenshotEvidence: event.target.value }))
              }
              placeholder="Paste a Drive link or image link for your screenshot"
            />
          </Field>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module3_mastermind_comments") {
    const ready = [
      draft.commentOneRole,
      draft.commentOneTarget,
      draft.commentOneText,
      draft.commentOneEvidence,
      draft.commentTwoRole,
      draft.commentTwoTarget,
      draft.commentTwoText,
      draft.commentTwoEvidence,
    ].every(filled);

    const renderRolePicker = (value, onPick) => (
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {lesson.content.roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onPick(role.id)}
            className={`rounded-[20px] border p-4 text-left transition ${
              value === role.id
                ? "border-primary/25 bg-primary/5"
                : "border-slate-100 bg-slate-50/80 hover:border-secondary/20"
            }`}
          >
            <p className="font-semibold text-ink">{role.label}</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">{role.starter}</p>
          </button>
        ))}
      </div>
    );

    return (
      <div>
        {renderTop(
          "Step into the council as a constructive peer, not a judge. Choose a role, leave helpful comments, and widen the project owner's perspective.",
        )}
        <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-100 bg-white">
          <iframe
            src={lesson.content.padletEmbedUrl}
            title="Padlet PLC Council"
            className="h-[620px] w-full border-0"
            loading="lazy"
            allow="camera;microphone;geolocation;display-capture;clipboard-write"
          />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {["One", "Two"].map((slot) => {
            const key = slot === "One" ? "commentOne" : "commentTwo";

            return (
              <article key={slot} className="rounded-[28px] border border-slate-100 bg-white p-5">
                <h3 className="text-xl font-semibold text-ink">Comment {slot}</h3>
                {renderRolePicker(draft[`${key}Role`], (roleId) =>
                  setDraft((previous) => ({ ...previous, [`${key}Role`]: roleId })),
                )}
                <Field label="Which post did you comment on?">
                  <Input
                    value={draft[`${key}Target`]}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, [`${key}Target`]: event.target.value }))
                    }
                    placeholder="Name the teacher or post title"
                  />
                </Field>
                <Field label="Comment text">
                  <TextArea
                    value={draft[`${key}Text`]}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, [`${key}Text`]: event.target.value }))
                    }
                    placeholder="Paste or summarize the comment you actually posted"
                    rows={5}
                  />
                </Field>
                <Field label="Screenshot evidence">
                  <Input
                    value={draft[`${key}Evidence`]}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, [`${key}Evidence`]: event.target.value }))
                    }
                    placeholder="Paste a Drive link or image link for the screenshot"
                  />
                </Field>
              </article>
            );
          })}
        </div>
        <div className="mt-5 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
          <Field
            label="Vibe Check"
            helper="What new perspective or feeling did you get from joining the PLC exchange?"
          >
            <TextArea
              value={draft.vibeReflection}
              onChange={(event) => setDraft((previous) => ({ ...previous, vibeReflection: event.target.value }))}
              placeholder="Describe the energy, insight, or shift you noticed from the exchange"
              rows={4}
            />
          </Field>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module3_spell_pitch") {
    const ready = [
      draft.projectName,
      draft.feedbackApplied,
      draft.hook,
      draft.painPoint,
      draft.solution,
      draft.impact,
      draft.pitchLink,
    ].every(filled);

    return (
      <div>
        {renderTop(
          "Use the feedback from the council to sharpen your project story, then condense it into a 60-second pitch that makes people want to support the idea immediately.",
        )}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="Project Name">
            <Input
              value={draft.projectName}
              onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
              placeholder="Name the project you want to pitch"
            />
          </Field>
          <Field
            label="Feedback Applied"
            helper="Capture the most useful feedback from Mission 2 and explain how it changed your plan."
          >
            <TextArea
              value={draft.feedbackApplied}
              onChange={(event) => setDraft((previous) => ({ ...previous, feedbackApplied: event.target.value }))}
              placeholder="Summarize the peer feedback that improved your project"
              rows={4}
            />
          </Field>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[28px] border border-slate-100 bg-white p-5">
            <Field label="Hook (10 sec)">
              <TextArea
                value={draft.hook}
                onChange={(event) => setDraft((previous) => ({ ...previous, hook: event.target.value }))}
                placeholder="Open with a sentence that grabs attention right away"
                rows={4}
              />
            </Field>
            <Field label="Pain Point (15 sec)">
              <TextArea
                value={draft.painPoint}
                onChange={(event) => setDraft((previous) => ({ ...previous, painPoint: event.target.value }))}
                placeholder="Describe the core pain point clearly and quickly"
                rows={4}
              />
            </Field>
          </article>
          <article className="rounded-[28px] border border-slate-100 bg-white p-5">
            <Field label="Solution (20 sec)">
              <TextArea
                value={draft.solution}
                onChange={(event) => setDraft((previous) => ({ ...previous, solution: event.target.value }))}
                placeholder="Explain the improved 30-day project after feedback"
                rows={4}
              />
            </Field>
            <Field label="Impact (15 sec)">
              <TextArea
                value={draft.impact}
                onChange={(event) => setDraft((previous) => ({ ...previous, impact: event.target.value }))}
                placeholder="Describe the impact for learners, school, community, or SEZ/OECD goals"
                rows={4}
              />
            </Field>
          </article>
        </div>
        <div className="mt-5 rounded-[26px] border border-slate-100 bg-white p-5">
          <Field label="Audio / Video Link">
            <Input
              value={draft.pitchLink}
              onChange={(event) => setDraft((previous) => ({ ...previous, pitchLink: event.target.value }))}
              placeholder="Paste a Google Drive, YouTube Unlisted, TikTok, or other media link"
            />
          </Field>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  const ready = filled(draft.reflectionAnswer);

  return (
    <div>
      {renderTop(
        "Pause and look back at how the network strengthened the project. Name the insight or power you discovered from the PLC exchange before moving on to Module 4.",
      )}
      <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
        <Field label="Reflection Mirror" helper={lesson.content.question}>
          <TextArea
            value={draft.reflectionAnswer}
            onChange={(event) => setDraft((previous) => ({ ...previous, reflectionAnswer: event.target.value }))}
            placeholder="Reflect on the new perspective or support you discovered from the teacher network"
            rows={7}
          />
        </Field>
      </div>
      {renderSubmit(ready)}
    </div>
  );
}

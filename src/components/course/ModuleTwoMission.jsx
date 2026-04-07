import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const EMPTY_RESPONSE = Object.freeze({});

const filled = (value) => Boolean(String(value || "").trim());

const summarizePhrase = (text = "") => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length <= 42 ? normalized : `${normalized.slice(0, 39).trim()}...`;
};

const collectInsights = (response, lensCodes = []) =>
  response?.parts
    ?.flatMap((part) => part.items || [])
    .filter((item) => filled(item.answer) && (lensCodes.length === 0 || lensCodes.includes(item.lensCode))) || [];

const buildCloudNodes = (insights = [], maxItems = 8) => {
  const seen = new Set();
  return insights
    .flatMap((item, itemIndex) =>
      String(item.answer || "")
        .split(/[\n,;|]/g)
        .map((segment, segmentIndex) => ({
          id: `${item.id}-${segmentIndex}`,
          text: summarizePhrase(segment),
          lensCode: item.lensCode,
          weight: Math.min(5, Math.max(1, Math.ceil(segment.length / 18) + (itemIndex % 2))),
        })),
    )
    .filter((token) => {
      const fingerprint = `${token.lensCode}-${token.text.toLowerCase()}`;
      if (!token.text || seen.has(fingerprint)) return false;
      seen.add(fingerprint);
      return true;
    })
    .slice(0, maxItems);
};

const lensTone = (lensCode, weight) => {
  const tones = {
    S: ["border-primary/20 bg-primary/10 text-primary", "border-primary/30 bg-primary/15 text-primary"],
    W: ["border-warm/20 bg-warm/10 text-[#a24619]", "border-warm/30 bg-warm/15 text-[#a24619]"],
    O: ["border-secondary/20 bg-secondary/10 text-secondary", "border-secondary/30 bg-secondary/15 text-secondary"],
    T: ["border-accent/20 bg-accent/10 text-accent", "border-accent/30 bg-accent/15 text-accent"],
  };
  return (tones[lensCode] || tones.S)[weight > 3 ? 1 : 0];
};

const buildChecklistSummary = (lenses = []) =>
  lenses
    .map((lens) => {
      const yesCount = (lens.items || []).filter((item) => item.value === "yes").length;
      return `${lens.title}: มี ${yesCount}/${(lens.items || []).length}`;
    })
    .join(" | ");

const buildSmartNarrative = (projectName, criteria = []) => {
  const read = (id) => criteria.find((item) => item.id === id)?.answer || "";
  const specific = read("specific");
  const measurable = read("measurable");
  const achievable = read("achievable");
  const relevant = read("relevant");
  const timeBound = read("timeBound");
  const headline = filled(projectName) ? `โครงการ "${projectName}"` : "โครงการนี้";
  const parts = [specific, measurable, achievable, relevant, timeBound].filter(filled);

  if (parts.length === 0) return "";

  return `${headline} จะ${specific || "สร้างการเปลี่ยนแปลงที่ชัดเจน"} โดย${measurable || "มีหลักฐานให้ติดตามผลได้"} ทั้งนี้ทำได้จริงเพราะ${achievable || "สอดคล้องกับบริบทที่มี"} และตอบโจทย์${relevant || "pain point ที่เลือกไว้"} ภายใน${timeBound || "กรอบเวลา 30 วัน"}`;
};

const buildPayload = (lesson, draft) => {
  if (lesson.activityType === "module2_dream_lab") {
    const selectedStrategy =
      (draft.strategies || []).find((item) => item.id === draft.selectedStrategyId) || null;
    return {
      type: "dream-lab",
      sparkNote: draft.sparkNote || "",
      selectedStrategyId: draft.selectedStrategyId || "",
      selectedStrategy,
      strategies: draft.strategies || [],
    };
  }
  if (lesson.activityType === "module2_vibe_check") {
    return { type: "vibe-check", moodLine: draft.moodLine || "", senses: draft.senses || [] };
  }
  if (lesson.activityType === "module2_roadmap") {
    return { type: "roadmap", northStar: draft.northStar || "", weeks: draft.weeks || [] };
  }
  if (lesson.activityType === "module2_pitch_deck") {
    return { type: "pitch", projectName: draft.projectName || "", teaser: draft.teaser || "", cards: draft.cards || [] };
  }
  if (lesson.activityType === "module2_smart_objective") {
    return {
      type: "smart",
      commitment: draft.commitment || "",
      polishedSummary: draft.polishedSummary || "",
      criteria: draft.criteria || [],
    };
  }
  return {
    type: "quality",
    alignmentNote: buildChecklistSummary(draft.lenses || []),
    lenses: draft.lenses || [],
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

const SummaryCard = ({ tone = "primary", title, body }) => {
  const toneMap = {
    primary: "border-primary/10 bg-primary/5",
    secondary: "border-secondary/10 bg-secondary/5",
    accent: "border-accent/10 bg-accent/5",
    warm: "border-warm/20 bg-warm/10",
  };

  return (
    <article className={`rounded-[24px] border p-5 ${toneMap[tone] || toneMap.primary}`}>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-700">{body || "-"}</p>
    </article>
  );
};

const ChecklistToggle = ({ value, onChange }) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {[
      { id: "yes", label: "มี", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
      { id: "no", label: "ไม่มี", className: "border-rose-200 bg-rose-50 text-rose-700" },
    ].map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
          value === option.id
            ? option.className
            : "border-slate-200 bg-white text-slate-500 hover:border-primary/20"
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default function ModuleTwoMission({
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

  const moduleOneMissionOne = allResponses["m1-mission-1"] ?? EMPTY_RESPONSE;
  const moduleOneMissionTwo = allResponses["m1-mission-2"] ?? EMPTY_RESPONSE;

  const strengthCloud = useMemo(
    () => buildCloudNodes(collectInsights(moduleOneMissionOne, ["S"])),
    [moduleOneMissionOne],
  );
  const weaknessCloud = useMemo(
    () => buildCloudNodes(collectInsights(moduleOneMissionOne, ["W"])),
    [moduleOneMissionOne],
  );
  const opportunityCloud = useMemo(
    () => buildCloudNodes(collectInsights(moduleOneMissionTwo, ["O"])),
    [moduleOneMissionTwo],
  );
  const threatCloud = useMemo(
    () => buildCloudNodes(collectInsights(moduleOneMissionTwo, ["T"])),
    [moduleOneMissionTwo],
  );

  useEffect(() => {
    if (hydratedLessonRef.current === lesson.id) return;

    let nextDraft;

    if (lesson.activityType === "module2_dream_lab") {
      const strategies =
        savedResponse?.strategies?.length
          ? savedResponse.strategies
          : lesson.content.prompts.map((item) => ({ ...item, answer: "" }));
      const selectedStrategyId =
        savedResponse?.selectedStrategyId ||
        savedResponse?.selectedStrategy?.id ||
        strategies.find((item) => filled(item.answer))?.id ||
        strategies[0]?.id ||
        "";

      nextDraft = { strategies, sparkNote: savedResponse?.sparkNote || "", selectedStrategyId };
    } else if (lesson.activityType === "module2_vibe_check") {
      nextDraft = {
        senses:
          savedResponse?.senses?.length
            ? savedResponse.senses
            : lesson.content.senses.map((item) => ({ ...item, answer: "" })),
        moodLine: savedResponse?.moodLine || "",
      };
    } else if (lesson.activityType === "module2_roadmap") {
      nextDraft = {
        weeks:
          savedResponse?.weeks?.length
            ? savedResponse.weeks
            : lesson.content.weeks.map((item) => ({ ...item, quickWin: "", plan: "", evidence: "" })),
        northStar: savedResponse?.northStar || "",
      };
    } else if (lesson.activityType === "module2_pitch_deck") {
      nextDraft = {
        projectName: savedResponse?.projectName || "",
        teaser: savedResponse?.teaser || "",
        cards:
          savedResponse?.cards?.length
            ? savedResponse.cards
            : lesson.content.prompts.map((item) => ({ ...item, answer: "" })),
      };
    } else if (lesson.activityType === "module2_smart_objective") {
      const criteria =
        savedResponse?.criteria?.length
          ? savedResponse.criteria
          : lesson.content.criteria.map((item) => ({ ...item, answer: "" }));
      nextDraft = {
        commitment: savedResponse?.commitment || "",
        polishedSummary: savedResponse?.polishedSummary || "",
        criteria,
      };
    } else {
      nextDraft = {
        alignmentNote: savedResponse?.alignmentNote || "",
        lenses:
          savedResponse?.lenses?.length
            ? savedResponse.lenses
            : lesson.content.lenses.map((lens) => ({
                ...lens,
                items: (lens.items || []).map((item) => ({ ...item, value: "" })),
              })),
      };
    }

    hydratedLessonRef.current = lesson.id;
    lastPayloadRef.current = JSON.stringify(buildPayload(lesson, nextDraft));
    setReward("");
    setAutosaveState("");
    setDraft(nextDraft);
  }, [lesson, savedResponse]);

  const payload = useMemo(() => buildPayload(lesson, draft), [draft, lesson]);

  useEffect(() => {
    if (!onDraftSave) return undefined;
    if (!hasContent(payload)) return undefined;

    const serialized = JSON.stringify(payload);
    if (serialized === lastPayloadRef.current) return undefined;

    setAutosaveState("กำลังบันทึกคำตอบอัตโนมัติ...");
    const timeoutId = window.setTimeout(async () => {
      try {
        await onDraftSave(payload);
        lastPayloadRef.current = serialized;
        setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
      } catch (error) {
        console.error("Failed to autosave Module 2 draft:", error);
        setAutosaveState("ยังบันทึกอัตโนมัติไม่สำเร็จ");
      }
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [onDraftSave, payload]);

  const dreamLabResponse =
    lesson.activityType === "module2_dream_lab" ? payload : allResponses["m2-mission-1"] ?? EMPTY_RESPONSE;
  const vibeResponse =
    lesson.activityType === "module2_vibe_check" ? payload : allResponses["m2-mission-2"] ?? EMPTY_RESPONSE;
  const roadmapResponse =
    lesson.activityType === "module2_roadmap" ? payload : allResponses["m2-mission-3"] ?? EMPTY_RESPONSE;
  const pitchResponse =
    lesson.activityType === "module2_pitch_deck" ? payload : allResponses["m2-mission-4"] ?? EMPTY_RESPONSE;
  const smartResponse =
    lesson.activityType === "module2_smart_objective" ? payload : allResponses["m2-mission-5"] ?? EMPTY_RESPONSE;

  const selectedDream = useMemo(() => {
    const strategies = dreamLabResponse.strategies || [];
    return (
      strategies.find((item) => item.id === dreamLabResponse.selectedStrategyId) ||
      dreamLabResponse.selectedStrategy ||
      strategies.find((item) => filled(item.answer)) ||
      null
    );
  }, [dreamLabResponse]);

  const smartPreview = useMemo(
    () => buildSmartNarrative(pitchResponse.projectName || draft.projectName, draft.criteria || []),
    [draft.criteria, draft.projectName, pitchResponse.projectName],
  );

  const updateListItem = (key, id, field, value) =>
    setDraft((previous) => ({
      ...previous,
      [key]: previous[key].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));

  const appendTokenToSelectedDream = (tokenText) =>
    setDraft((previous) => ({
      ...previous,
      strategies: previous.strategies.map((strategy) =>
        strategy.id === previous.selectedStrategyId
          ? { ...strategy, answer: `${String(strategy.answer || "").trim()}\n${tokenText}`.trim() }
          : strategy,
      ),
    }));

  const persist = async () => {
    setSaving(true);
    try {
      const nextPayload =
        lesson.activityType === "module2_smart_objective" && !filled(draft.commitment) && filled(smartPreview)
          ? buildPayload(lesson, { ...draft, commitment: smartPreview, polishedSummary: smartPreview })
          : buildPayload(lesson, draft);
      await onSave(nextPayload);
      lastPayloadRef.current = JSON.stringify(nextPayload);
      setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
      setReward(lesson.content.aiMentor?.reward || "บันทึกภารกิจเรียบร้อย");
      window.setTimeout(() => setReward(""), 2200);
    } finally {
      setSaving(false);
    }
  };

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

  const renderHeader = (helper) => (
    <>
      <div className="mb-4 min-h-[72px]">
        {reward ? (
          <div className="rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary">
            {reward}
          </div>
        ) : null}
      </div>
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

  if (lesson.activityType === "module2_dream_lab") {
    const cloudMap = { S: strengthCloud, W: weaknessCloud, O: opportunityCloud, T: threatCloud };
    const selectedStrategy = (draft.strategies || []).find((item) => item.id === draft.selectedStrategyId);
    const ready = Boolean(selectedStrategy && filled(selectedStrategy.answer) && filled(draft.sparkNote));

    return (
      <div>
        {renderHeader("เลือก Dream Lab เพียง 1 แนวทางที่อยากปั้นต่อจริง ๆ แล้วใช้ชิปคำสำคัญจาก Module 1 มาช่วยต่อยอดคำตอบให้ชัดขึ้น")}
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {(draft.strategies || []).map((strategy) => {
            const isActive = draft.selectedStrategyId === strategy.id;
            return (
              <button
                key={strategy.id}
                type="button"
                onClick={() => setDraft((previous) => ({ ...previous, selectedStrategyId: strategy.id }))}
                className={`rounded-[28px] border p-5 text-left transition ${
                  isActive
                    ? "border-primary/25 bg-primary/5 shadow-[0_18px_50px_rgba(13,17,100,0.10)]"
                    : "border-slate-100 bg-white hover:border-secondary/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="brand-chip border-slate-200 bg-white text-slate-600">{strategy.strategyType}</span>
                  <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-slate-400"}`}>
                    {isActive ? "กำลังเลือก" : "กดเพื่อเลือก"}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-ink">{strategy.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{strategy.prompt}</p>
                {filled(strategy.answer) ? (
                  <p className="mt-4 rounded-[20px] border border-white/80 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-700">
                    {strategy.answer}
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>

        {selectedStrategy ? (
          <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">Dream Lab ที่เลือก</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">{selectedStrategy.title}</h3>
              </div>
              <span className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">
                {selectedStrategy.relevantLensCodes.join(" + ")}
              </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {selectedStrategy.relevantLensCodes.map((lensCode) => (
                <article key={lensCode} className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">คำสำคัญจากมุม {lensCode}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(cloudMap[lensCode] || []).map((token) => (
                      <button
                        key={token.id}
                        type="button"
                        onClick={() => appendTokenToSelectedDream(token.text)}
                        className={`rounded-full border px-3 py-2 text-sm ${lensTone(token.lensCode, token.weight)}`}
                      >
                        {token.text}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <Field
              label="ขยาย Dream Lab ที่เลือก"
              helper="เขียนให้ชัดว่าในโลกไร้ข้อจำกัด คุณอยากปั้นแนวทางนี้ออกมาเป็นประสบการณ์แบบไหน"
            >
              <TextArea
                value={selectedStrategy.answer}
                onChange={(event) => updateListItem("strategies", selectedStrategy.id, "answer", event.target.value)}
                placeholder="อธิบาย Dream Lab ที่เลือกให้เห็นภาพชัด ทั้งโจทย์ วิธีทำ และความเปลี่ยนแปลงที่อยากเห็น"
                rows={7}
              />
            </Field>
          </div>
        ) : null}

        <div className="mt-5 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
          <p className="text-sm font-semibold text-secondary">สรุปประกายหลักของไอเดีย</p>
          <TextArea
            value={draft.sparkNote}
            onChange={(event) => setDraft((previous) => ({ ...previous, sparkNote: event.target.value }))}
            placeholder="สรุปสั้น ๆ ว่า Dream Lab ที่เลือกนี้มีเสน่ห์หรือพลังสำคัญตรงไหน"
            rows={4}
          />
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_vibe_check") {
    const ready = (draft.senses || []).every((item) => filled(item.answer)) && filled(draft.moodLine);

    return (
      <div>
        {renderHeader("ตอนนี้เราจะพาไอเดียที่เลือกมาแปลงเป็นภาพจำของห้องเรียนในฝัน เพื่อให้เห็นตรงกันว่ากำลังออกแบบบรรยากาศแบบไหน")}
        {selectedDream ? (
          <SummaryCard
            title={`กำลังทำ Vibe Check ให้กับ ${selectedDream.title}`}
            body={selectedDream.answer || selectedDream.prompt}
          />
        ) : null}
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {(draft.senses || []).map((sense) => (
            <article key={sense.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
              <h3 className="text-xl font-semibold text-ink">{sense.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{sense.prompt}</p>
              <TextArea
                value={sense.answer}
                onChange={(event) => updateListItem("senses", sense.id, "answer", event.target.value)}
                placeholder={sense.placeholder}
                rows={8}
              />
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
          <p className="text-sm font-semibold text-secondary">ประโยคสรุปบรรยากาศ</p>
          <TextArea
            value={draft.moodLine}
            onChange={(event) => setDraft((previous) => ({ ...previous, moodLine: event.target.value }))}
            placeholder="สรุปเป็น 1-2 ประโยคว่า ห้องเรียนในฝันนี้ให้ความรู้สึกอย่างไร"
            rows={3}
          />
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_roadmap") {
    const ready =
      (draft.weeks || []).every((item) => filled(item.quickWin) && filled(item.plan) && filled(item.evidence)) &&
      filled(draft.northStar);

    return (
      <div>
        {renderHeader("นำ Dream Lab ที่เลือกและบรรยากาศที่อยากเห็น มาวางเป็นแผน 30 วันแบบ timeline ที่ทำจริงได้และมี quick win ทุกสัปดาห์")}
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {selectedDream ? (
            <SummaryCard tone="primary" title="Dream Lab ที่กำลังพาไปต่อ" body={selectedDream.answer || selectedDream.prompt} />
          ) : null}
          {vibeResponse.moodLine ? (
            <SummaryCard tone="secondary" title="Vibe ที่อยากเห็น" body={vibeResponse.moodLine} />
          ) : null}
        </div>
        <div className="mt-5 space-y-4">
          {(draft.weeks || []).map((week, index) => (
            <article
              key={week.id}
              className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white p-5 pl-8"
            >
              <span className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-primary via-secondary to-accent" />
              <div>
                <p className="text-sm font-semibold text-primary">ช่วงที่ {index + 1}</p>
                <h3 className="mt-1 text-xl font-semibold text-ink">{week.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{week.focus}</p>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <Field label="Quick Win">
                  <Input
                    value={week.quickWin || ""}
                    onChange={(event) => updateListItem("weeks", week.id, "quickWin", event.target.value)}
                    placeholder="ผลสำเร็จเล็ก ๆ ที่อยากเห็นภายในสัปดาห์นี้"
                  />
                </Field>
                <Field label="สิ่งที่จะลงมือทำ">
                  <TextArea
                    value={week.plan}
                    onChange={(event) => updateListItem("weeks", week.id, "plan", event.target.value)}
                    placeholder="ระบุขั้นตอนหรือกิจกรรมหลักของสัปดาห์นี้"
                    rows={5}
                  />
                </Field>
                <Field label="หลักฐาน/สัญญาณความคืบหน้า">
                  <TextArea
                    value={week.evidence}
                    onChange={(event) => updateListItem("weeks", week.id, "evidence", event.target.value)}
                    placeholder="จะดูจากอะไรว่าแผนเริ่มเดินแล้ว"
                    rows={5}
                  />
                </Field>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">North Star ของ 30 วัน</p>
          <TextArea
            value={draft.northStar}
            onChange={(event) => setDraft((previous) => ({ ...previous, northStar: event.target.value }))}
            placeholder="เมื่อครบ 30 วัน คุณอยากเห็นภาพความสำเร็จปลายทางเป็นแบบไหน"
            rows={4}
          />
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_pitch_deck") {
    const ready =
      filled(draft.projectName) && filled(draft.teaser) && (draft.cards || []).every((item) => filled(item.answer));

    return (
      <div>
        {renderHeader("หน้านี้จะช่วยย่อยคำตอบจาก Mission 1-3 ให้กลายเป็นคำโปรยโปรเจกต์ที่อ่านแล้วเข้าใจเร็ว เห็นภาพ และพร้อมชวนคนอื่นมาร่วมทาง")}
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {selectedDream ? (
            <SummaryCard tone="primary" title="Dream Lab ที่เลือก" body={selectedDream.answer || selectedDream.prompt} />
          ) : null}
          {vibeResponse.moodLine ? (
            <SummaryCard tone="secondary" title="Vibe ที่อยากเห็น" body={vibeResponse.moodLine} />
          ) : null}
          {roadmapResponse.northStar ? (
            <SummaryCard tone="accent" title="เป้าหมายปลายทาง 30 วัน" body={roadmapResponse.northStar} />
          ) : null}
        </div>
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <Field label="ชื่อโปรเจกต์">
            <Input
              value={draft.projectName || ""}
              onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
              placeholder="ตั้งชื่อโปรเจกต์ให้ชัด จำง่าย และสื่อพลังของงาน"
            />
          </Field>
          <Field label="คำโปรยสั้น ๆ" helper="อ่านจบแล้วควรพอมองเห็นเป้าหมายและเสน่ห์ของโปรเจกต์ทันที">
            <TextArea
              value={draft.teaser}
              onChange={(event) => setDraft((previous) => ({ ...previous, teaser: event.target.value }))}
              placeholder="เขียนสรุปโปรเจกต์ 1-2 ประโยค"
              rows={4}
            />
          </Field>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {(draft.cards || []).map((card) => (
            <article key={card.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
              <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{card.prompt}</p>
              <TextArea
                value={card.answer}
                onChange={(event) => updateListItem("cards", card.id, "answer", event.target.value)}
                placeholder="เขียนแบบกระชับ แต่เห็นภาพและตอบโจทย์"
                rows={6}
              />
            </article>
          ))}
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_smart_objective") {
    const ready =
      (filled(draft.commitment) || filled(smartPreview)) &&
      (draft.criteria || []).every((item) => filled(item.answer));

    return (
      <div>
        {renderHeader("นำชื่อโปรเจกต์และคำตอบ 5W1H มาร้อยเป็นเป้าหมาย SMART ที่ทั้งชัด วัดได้ และพูดออกมาแล้วรู้เลยว่าจะลงมืออย่างไร")}
        {pitchResponse.projectName ? (
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">ชื่อโปรเจกต์</p>
            <p className="mt-3 text-xl font-semibold text-ink">{pitchResponse.projectName}</p>
          </div>
        ) : null}
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {(draft.criteria || []).map((criterion) => (
            <article key={criterion.id} className="rounded-[26px] border border-slate-100 bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">{criterion.label}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{criterion.prompt}</p>
              <TextArea
                value={criterion.answer}
                onChange={(event) => updateListItem("criteria", criterion.id, "answer", event.target.value)}
                placeholder="ขยายความให้ชัดในมิตินี้"
                rows={5}
              />
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[26px] border border-slate-100 bg-white p-5">
            <p className="text-sm font-semibold text-ink">คำมั่นสัญญาของโปรเจกต์</p>
            <TextArea
              value={draft.commitment}
              onChange={(event) => setDraft((previous) => ({ ...previous, commitment: event.target.value }))}
              placeholder="พิมพ์เป้าหมาย SMART ฉบับสุดท้าย 1-2 ประโยค"
              rows={5}
            />
            {filled(smartPreview) ? (
              <button
                type="button"
                onClick={() =>
                  setDraft((previous) => ({
                    ...previous,
                    commitment: smartPreview,
                    polishedSummary: smartPreview,
                  }))
                }
                className="brand-button-secondary mt-4"
              >
                เติมร่างอัตโนมัติจาก SMART
              </button>
            ) : null}
          </article>
          <article className="rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">ร่างข้อความที่เรียบเรียงให้แล้ว</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {smartPreview || "เมื่อกรอก S-M-A-R-T ครบ ระบบจะช่วยเรียบเรียงข้อความให้เห็นภาพรวมของเป้าหมายอัตโนมัติ"}
            </p>
          </article>
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  const ready = (draft.lenses || []).every((lens) => (lens.items || []).every((item) => filled(item.value)));

  return (
    <div>
      {renderHeader("หน้านี้เปลี่ยนเป็น checklist เพื่อให้ตรวจความสอดคล้องของโปรเจกต์ได้เร็วขึ้น แค่เช็กว่าแต่ละประเด็น “มี” หรือ “ไม่มี” ก็พอ")}
      {pitchResponse.projectName || smartResponse.commitment ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {pitchResponse.projectName ? (
            <SummaryCard tone="primary" title="โปรเจกต์ที่กำลังตรวจ" body={pitchResponse.projectName} />
          ) : null}
          {smartResponse.commitment ? (
            <SummaryCard tone="secondary" title="SMART Objective" body={smartResponse.commitment} />
          ) : null}
        </div>
      ) : null}
      <div className="mt-5 space-y-4">
        {(draft.lenses || []).map((lens) => (
          <article key={lens.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{lens.title}</p>
                <h3 className="mt-1 text-xl font-semibold text-ink">{lens.subtitle}</h3>
              </div>
            </div>
            {lens.objective ? <p className="mt-3 text-sm leading-7 text-slate-600">{lens.objective}</p> : null}
            <div className="mt-5 space-y-4">
              {(lens.items || []).map((item) => (
                <div key={item.id} className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <ChecklistToggle
                    value={item.value}
                    onChange={(value) =>
                      setDraft((previous) => ({
                        ...previous,
                        lenses: previous.lenses.map((entry) =>
                          entry.id === lens.id
                            ? {
                                ...entry,
                                items: entry.items.map((subItem) =>
                                  subItem.id === item.id ? { ...subItem, value } : subItem,
                                ),
                              }
                            : entry,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5 text-sm leading-7 text-slate-700">
        {buildChecklistSummary(draft.lenses || []) || "เมื่อเช็กครบ ระบบจะสรุปภาพรวมความสอดคล้องของโปรเจกต์ให้อัตโนมัติ"}
      </div>
      {renderSubmit(ready)}
    </div>
  );
}

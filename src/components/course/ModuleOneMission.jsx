import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const filled = (value) => Boolean(String(value || "").trim());

const extractAnswerMap = (parts = []) =>
  parts.flatMap((part) => part.items || []).reduce((accumulator, item) => {
    accumulator[item.id] = item.answer || "";
    return accumulator;
  }, {});

const collectInsights = (response, lensCodes = []) =>
  response?.parts
    ?.flatMap((part) => part.items || [])
    .filter((item) => filled(item.answer) && (lensCodes.length === 0 || lensCodes.includes(item.lensCode))) || [];

const summarizePhrase = (text = "") => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= 48) return normalized;
  return `${normalized.slice(0, 45).trim()}...`;
};

const splitCloudFragments = (text = "") =>
  String(text || "")
    .split(/[\n,;|]/g)
    .map((item) => summarizePhrase(item))
    .filter(Boolean);

const buildCloudNodes = (insights = [], maxItems = 12) => {
  const seen = new Set();
  const nodes = [];

  insights.forEach((item, itemIndex) => {
    const fragments = splitCloudFragments(item.answer);
    const segments = fragments.length > 0 ? fragments : [summarizePhrase(item.answer)];

    segments.forEach((segment, segmentIndex) => {
      const fingerprint = `${item.lensCode}-${segment.toLowerCase()}`;
      if (!segment || seen.has(fingerprint)) return;
      seen.add(fingerprint);
      nodes.push({
        id: `${item.id}-${segmentIndex}`,
        text: segment,
        lensCode: item.lensCode,
        weight: Math.min(5, Math.max(1, Math.ceil(segment.length / 18) + ((itemIndex + segmentIndex) % 2))),
        focus: item.focus,
        lensTitle: item.lensTitle,
      });
    });
  });

  return nodes.slice(0, maxItems);
};

const getCloudTone = (lensCode, weight) => {
  const tones = {
    O: [
      "border-secondary/20 bg-secondary/10 text-secondary",
      "border-secondary/30 bg-secondary/15 text-secondary shadow-[0_10px_24px_rgba(100,13,95,0.10)]",
      "border-secondary/40 bg-gradient-to-r from-secondary/20 to-accent/15 text-ink shadow-[0_16px_36px_rgba(100,13,95,0.14)]",
    ],
    T: [
      "border-accent/20 bg-accent/10 text-accent",
      "border-accent/30 bg-accent/15 text-accent shadow-[0_10px_24px_rgba(234,34,100,0.10)]",
      "border-accent/40 bg-gradient-to-r from-accent/18 to-warm/18 text-ink shadow-[0_16px_36px_rgba(234,34,100,0.14)]",
    ],
    S: [
      "border-primary/20 bg-primary/10 text-primary",
      "border-primary/30 bg-primary/15 text-primary shadow-[0_10px_24px_rgba(13,17,100,0.10)]",
      "border-primary/40 bg-gradient-to-r from-primary/18 to-secondary/15 text-ink shadow-[0_16px_36px_rgba(13,17,100,0.14)]",
    ],
    W: [
      "border-warm/20 bg-warm/10 text-[#a24619]",
      "border-warm/30 bg-warm/15 text-[#a24619] shadow-[0_10px_24px_rgba(247,141,96,0.10)]",
      "border-warm/40 bg-gradient-to-r from-warm/18 to-accent/10 text-ink shadow-[0_16px_36px_rgba(247,141,96,0.14)]",
    ],
  };

  const palette = tones[lensCode] || tones.O;
  return palette[Math.min(palette.length - 1, Math.max(0, weight - 3))];
};

const buildDraftPayload = ({ lesson, draft, strategySource, selectedStrategy }) => {
  if (lesson.activityType === "module1_reflection") {
    return {
      type: "reflection",
      activePartIndex: draft.activePartIndex || 0,
      summary: draft.summary?.trim() || "",
      parts: lesson.content.parts.map((part) => ({
        id: part.id,
        title: part.title,
        lensCode: part.lensCode,
        items: part.questions.map((question) => ({
          id: question.id,
          lensTitle: question.lensTitle,
          focus: question.focus,
          prompt: question.prompt,
          lensCode: question.lensCode,
          answer: draft.answers?.[question.id]?.trim() || "",
        })),
      })),
    };
  }

  if (lesson.activityType === "module1_strategy_fusion") {
    return {
      type: "strategies",
      reflection: draft.reflection?.trim() || "",
      strategies: (draft.strategies || []).map((strategy) => ({
        ...strategy,
        title: strategy.title?.trim() || "",
        internalSignal: strategy.internalSignal?.trim() || "",
        externalSignal: strategy.externalSignal?.trim() || "",
        strategyText: strategy.strategyText?.trim() || "",
        successSignal: strategy.successSignal?.trim() || "",
      })),
    };
  }

  if (lesson.activityType === "module1_needs_detective") {
    return {
      type: "needs-detective",
      selectedStrategyId: draft.selectedStrategyId || "",
      selectedStrategy:
        strategySource.find((strategy) => strategy.id === draft.selectedStrategyId) || null,
      selectionReason: draft.selectionReason?.trim() || "",
      strategyScores: strategySource.map((strategy) => ({
        strategyId: strategy.id,
        title: strategy.title,
        strategyType: strategy.strategyType,
        ratings: draft.ratings?.[strategy.id] || {},
        total: lesson.content.ratingCriteria.reduce(
          (sum, criterion) => sum + Number(draft.ratings?.[strategy.id]?.[criterion.id] || 0),
          0,
        ),
      })),
    };
  }

  return {
    type: "pdca",
    strategyTitle: draft.strategyTitle?.trim() || selectedStrategy?.title || "",
    startDate: draft.startDate || "",
    reviewDate: draft.reviewDate || "",
    supportNeeded: draft.supportNeeded?.trim() || "",
    plan: draft.plan?.trim() || "",
    do: draft.do?.trim() || "",
    check: draft.check?.trim() || "",
    act: draft.act?.trim() || "",
  };
};

const hasPayloadContent = (payload) => {
  if (!payload) return false;
  if (payload.type === "reflection") {
    return payload.parts?.some((part) => part.items?.some((item) => filled(item.answer))) || filled(payload.summary);
  }
  if (payload.type === "strategies") {
    return (
      payload.strategies?.some((strategy) =>
        [strategy.title, strategy.internalSignal, strategy.externalSignal, strategy.strategyText, strategy.successSignal].some(filled),
      ) || filled(payload.reflection)
    );
  }
  if (payload.type === "needs-detective") {
    return (
      filled(payload.selectedStrategyId) ||
      filled(payload.selectionReason) ||
      payload.strategyScores?.some((score) =>
        Object.values(score.ratings || {}).some((value) => Number(value || 0) > 0),
      )
    );
  }
  return [
    payload.strategyTitle,
    payload.startDate,
    payload.reviewDate,
    payload.supportNeeded,
    payload.plan,
    payload.do,
    payload.check,
    payload.act,
  ].some(filled);
};

const ratingPalette = {
  1: "border-slate-200 bg-slate-100 text-slate-600",
  2: "border-warm/30 bg-warm/15 text-[#a24619]",
  3: "border-secondary/25 bg-secondary/10 text-secondary",
  4: "border-accent/25 bg-accent/10 text-accent",
  5: "border-primary/25 bg-primary text-white",
};

const RatingButtons = ({ value, onSelect }) => (
  <div className="mt-3 space-y-3">
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onSelect(score)}
          className={`rounded-[18px] border px-2 py-3 text-sm font-semibold transition ${
            value === score
              ? ratingPalette[score]
              : "border-slate-200 bg-white text-slate-500 hover:border-primary/20"
          }`}
        >
          {score}
        </button>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-600">1 = น้อยมาก</span>
      <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-primary">5 = สูงมาก</span>
    </div>
  </div>
);

export default function ModuleOneMission({
  lesson,
  savedResponse,
  allResponses,
  isCompleted,
  onSave,
  onDraftSave,
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState("");
  const [autosaveState, setAutosaveState] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const lastPersistedPayloadRef = useRef("");

  const strategySource = useMemo(() => allResponses["m1-mission-3"]?.strategies || [], [allResponses]);
  const selectedStrategy = useMemo(() => {
    const selectedId = allResponses["m1-mission-4"]?.selectedStrategyId;
    return (
      allResponses["m1-mission-4"]?.selectedStrategy ||
      strategySource.find((strategy) => strategy.id === selectedId) ||
      strategySource[0] ||
      null
    );
  }, [allResponses, strategySource]);
  const internalInsights = useMemo(() => collectInsights(allResponses["m1-mission-1"]), [allResponses]);
  const externalInsights = useMemo(() => collectInsights(allResponses["m1-mission-2"]), [allResponses]);
  const internalCloud = useMemo(() => buildCloudNodes(internalInsights, 10), [internalInsights]);
  const opportunityCloud = useMemo(
    () => buildCloudNodes(externalInsights.filter((item) => item.lensCode === "O"), 10),
    [externalInsights],
  );
  const threatCloud = useMemo(
    () => buildCloudNodes(externalInsights.filter((item) => item.lensCode === "T"), 10),
    [externalInsights],
  );

  useEffect(() => {
    setFocusedField(null);
    if (lesson.activityType === "module1_reflection") {
      const nextDraft = {
        activePartIndex: savedResponse?.activePartIndex || 0,
        answers:
          Object.keys(extractAnswerMap(savedResponse?.parts || [])).length > 0
            ? extractAnswerMap(savedResponse.parts)
            : lesson.content.parts.reduce((accumulator, part) => {
                part.questions.forEach((question) => {
                  accumulator[question.id] = "";
                });
                return accumulator;
              }, {}),
        summary: savedResponse?.summary || "",
      };
      setDraft(nextDraft);
      lastPersistedPayloadRef.current = JSON.stringify(
        buildDraftPayload({ lesson, draft: nextDraft, strategySource, selectedStrategy }),
      );
      return;
    }

    if (lesson.activityType === "module1_strategy_fusion") {
      const nextDraft = {
        strategies:
          savedResponse?.strategies?.length > 0
            ? savedResponse.strategies
            : lesson.content.starterSlots.map((slot, index) => ({
                id: slot,
                title: `กลยุทธ์ ${index + 1}`,
                strategyType: index === 0 ? "SO" : index === 1 ? "WO" : "ST",
                internalSignal: "",
                externalSignal: "",
                strategyText: "",
                successSignal: "",
              })),
        reflection: savedResponse?.reflection || "",
      };
      setDraft(nextDraft);
      lastPersistedPayloadRef.current = JSON.stringify(
        buildDraftPayload({ lesson, draft: nextDraft, strategySource, selectedStrategy }),
      );
      return;
    }

    if (lesson.activityType === "module1_needs_detective") {
      const nextDraft = {
        selectedStrategyId: savedResponse?.selectedStrategyId || "",
        selectionReason: savedResponse?.selectionReason || "",
        ratings:
          savedResponse?.strategyScores?.reduce((accumulator, score) => {
            accumulator[score.strategyId] = score.ratings;
            return accumulator;
          }, {}) ||
          strategySource.reduce((accumulator, strategy) => {
            accumulator[strategy.id] = lesson.content.ratingCriteria.reduce((ratingMap, criterion) => {
              ratingMap[criterion.id] = 0;
              return ratingMap;
            }, {});
            return accumulator;
          }, {}),
      };
      setDraft(nextDraft);
      lastPersistedPayloadRef.current = JSON.stringify(
        buildDraftPayload({ lesson, draft: nextDraft, strategySource, selectedStrategy }),
      );
      return;
    }

    const nextDraft = {
      strategyTitle: savedResponse?.strategyTitle || selectedStrategy?.title || "",
      startDate: savedResponse?.startDate || "",
      reviewDate: savedResponse?.reviewDate || "",
      supportNeeded: savedResponse?.supportNeeded || "",
      plan: savedResponse?.plan || "",
      do: savedResponse?.do || "",
      check: savedResponse?.check || "",
      act: savedResponse?.act || "",
    };
    setDraft(nextDraft);
    lastPersistedPayloadRef.current = JSON.stringify(
      buildDraftPayload({ lesson, draft: nextDraft, strategySource, selectedStrategy }),
    );
  }, [lesson, savedResponse, strategySource, selectedStrategy]);

  useEffect(() => {
    if (!onDraftSave) return undefined;

    const payload = buildDraftPayload({ lesson, draft, strategySource, selectedStrategy });
    if (!hasPayloadContent(payload)) return undefined;

    const serialized = JSON.stringify(payload);
    if (serialized === lastPersistedPayloadRef.current) return undefined;

    setAutosaveState("กำลังบันทึกคำตอบอัตโนมัติ...");
    const timeoutId = window.setTimeout(async () => {
      try {
        await onDraftSave(payload);
        lastPersistedPayloadRef.current = serialized;
        setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
        window.setTimeout(() => setAutosaveState(""), 1800);
      } catch (error) {
        console.error("Failed to autosave mission draft:", error);
        setAutosaveState("ยังบันทึกอัตโนมัติไม่สำเร็จ");
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [draft, lesson, onDraftSave, selectedStrategy, strategySource]);

  const persist = async (payload) => {
    setSaving(true);
    try {
      await onSave(payload);
      lastPersistedPayloadRef.current = JSON.stringify(payload);
      setAutosaveState("บันทึกคำตอบอัตโนมัติแล้ว");
      setReward(lesson.content.aiMentor?.reward || "บันทึกภารกิจเรียบร้อย");
      window.setTimeout(() => setReward(""), 2500);
    } finally {
      setSaving(false);
    }
  };

  const injectCloudWord = (strategyId, field, value) => {
    setDraft((previous) => ({
      ...previous,
      strategies: previous.strategies.map((strategy) =>
        strategy.id === strategyId
          ? {
              ...strategy,
              [field]: filled(strategy[field]) ? `${strategy[field]}\n${value}` : value,
            }
          : strategy,
      ),
    }));
  };

  const applyCloudToken = (token) => {
    const defaultField =
      focusedField?.field || (token.lensCode === "S" || token.lensCode === "W" ? "internalSignal" : "externalSignal");
    const preferredStrategyId =
      focusedField?.strategyId || draft.strategies?.find((item) => !filled(item[defaultField]))?.id;
    const targetStrategyId = preferredStrategyId || draft.strategies?.[0]?.id;
    if (!targetStrategyId) return;
    injectCloudWord(targetStrategyId, defaultField, token.text);
  };

  const renderCloudGroup = ({ title, helper, tokens, emptyText }) => (
    <div className="rounded-[26px] border border-slate-100 bg-white p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{helper}</p>
      {tokens.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {tokens.map((token) => (
            <button
              key={token.id}
              type="button"
              onClick={() => applyCloudToken(token)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-left text-sm transition hover:-translate-y-0.5 ${getCloudTone(
                token.lensCode,
                token.weight,
              )}`}
              title={`เติมคำว่า ${token.text}`}
            >
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {token.lensCode}
              </span>
              <span>{token.text}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  );

  const renderReward = () => (
    <div className="mb-5 min-h-[76px]">
      {reward ? (
        <div className="flex items-center gap-3 rounded-[24px] border border-accent/20 bg-accent/5 px-4 py-4 text-sm text-slate-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="font-semibold text-ink">รางวัลใจมาแล้ว</p>
          <p className="mt-1">{reward}</p>
        </div>
        </div>
      ) : null}
    </div>
  );

  const renderStateBar = () => (
    <div className="mb-5 min-h-[84px] rounded-[24px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
      <div className="flex h-full flex-wrap items-center justify-between gap-3">
      <div className="text-slate-600">
        {isCompleted
          ? "ภารกิจนี้ผ่านแล้ว คุณยังแก้คำตอบต่อได้ และระบบจะช่วยบันทึกให้อัตโนมัติ"
          : "ระบบจะบันทึกคำตอบให้อัตโนมัติระหว่างพิมพ์ และค่อยกดปุ่มเมื่อพร้อมส่งภารกิจ"}
      </div>
        <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 font-medium text-primary">
          {autosaveState || "ระบบกำลังดูแลการบันทึกคำตอบให้อัตโนมัติ"}
        </span>
      </div>
    </div>
  );

  const renderSaveButton = (ready, text, payloadBuilder) => (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
      <div className="rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary">
        {isCompleted ? "ภารกิจนี้ผ่านแล้ว แก้คำตอบต่อได้ครับ" : "บันทึกเมื่อพร้อมเพื่อปลดล็อกภารกิจถัดไป"}
      </div>
      <button
        type="button"
        disabled={!ready || saving}
        onClick={() => persist(payloadBuilder())}
        className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {text}
      </button>
    </div>
  );

  if (lesson.activityType === "module1_reflection") {
    const parts = lesson.content.parts;
    const partIndex = draft.activePartIndex || 0;
    const currentPart = parts[partIndex];
    const ready =
      parts.every((part) => part.questions.every((question) => filled(draft.answers?.[question.id]))) &&
      filled(draft.summary);

    return (
      <div>
        {renderReward()}
        {renderStateBar()}
        {lesson.content.introduction ? (
          <div className="mb-5 rounded-[24px] border border-secondary/10 bg-secondary/5 p-4 text-sm leading-7 text-slate-700">
            {lesson.content.introduction}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {parts.map((part, index) => (
            <button
              key={part.id}
              type="button"
              onClick={() => setDraft((previous) => ({ ...previous, activePartIndex: index }))}
              className={`rounded-[24px] border p-4 text-left transition ${
                partIndex === index ? "border-primary/20 bg-primary/5" : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Part {index + 1}</p>
              <p className="mt-2 text-lg font-semibold text-ink">{part.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{part.description}</p>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">กำลังทำ {currentPart.title}</p>
              <p className="mt-1 text-sm leading-7 text-slate-600">{currentPart.description}</p>
            </div>
            <span className="rounded-full border border-white/80 bg-white px-3 py-2 text-sm font-semibold text-primary">
              ช่วงที่ {partIndex + 1}/{parts.length}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {currentPart.questions.map((question, index) => {
              const answered = filled(draft.answers?.[question.id]);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    answered
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-white/90 bg-white text-slate-500 hover:border-primary/20"
                  }`}
                >
                  ข้อ {index + 1}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {currentPart.questions.map((question, index) => (
            <label id={question.id} key={question.id} className="block rounded-[26px] border border-slate-100 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {index + 1}. {question.focus}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-ink">{question.lensTitle}</p>
                </div>
                <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                  {question.lensCode}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{question.prompt}</p>
              <textarea
                rows={5}
                value={draft.answers?.[question.id] || ""}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    answers: { ...previous.answers, [question.id]: event.target.value },
                  }))
                }
                className="mt-4 min-h-[168px] w-full resize-y rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                placeholder="พิมพ์คำตอบของคุณครูตรงนี้ได้เลย ระบบจะช่วยบันทึกให้อัตโนมัติ"
              />
            </label>
          ))}
        </div>
        <label className="mt-5 block rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">สรุปสิ่งที่เห็นชัดขึ้นจาก Part นี้</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{lesson.content.aiMentor.probe}</p>
          <textarea
            rows={4}
            value={draft.summary || ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, summary: event.target.value }))}
            className="mt-4 min-h-[144px] w-full resize-y rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            placeholder="สรุปว่าตอนนี้คุณครูเห็นภาพจุดแข็ง จุดอ่อน หรือสิ่งที่ควรโฟกัสชัดขึ้นอย่างไร"
          />
        </label>
        {renderSaveButton(
          ready,
          isCompleted ? "อัปเดตคำตอบภารกิจ" : "ส่งภารกิจนี้",
          () => buildDraftPayload({ lesson, draft, strategySource, selectedStrategy }),
        )}
      </div>
    );
  }

  if (lesson.activityType === "module1_strategy_fusion") {
    const strategies = draft.strategies || [];
    const ready =
      strategies.length >= 3 &&
      strategies.every((strategy) =>
        [strategy.title, strategy.internalSignal, strategy.externalSignal, strategy.strategyText, strategy.successSignal].every(
          filled,
        ),
      ) &&
      filled(draft.reflection);

    if (externalInsights.length === 0) {
      return (
        <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-8 text-center text-sm leading-7 text-slate-500">
          บันทึก Mission 2 ให้ครบก่อน แล้วระบบจะเปลี่ยนคำตอบภายนอกให้เป็น word cloud สำหรับจับคู่ทำ TOW Matrix ทันที
        </div>
      );
    }

    return (
      <div>
        {renderReward()}
        {renderStateBar()}
        <div className="rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
          <p className="text-sm font-semibold text-secondary">AI Mentor ชวนคิด</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">{lesson.content.aiMentor.intro}</p>
          <p className="mt-3 rounded-[20px] border border-white/70 bg-white/80 px-4 py-3 text-sm leading-7 text-slate-600">
            {lesson.content.aiMentor.probe}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
            <span>กดคำจาก word cloud เพื่อเติมลงในช่องที่กำลังเขียนอยู่</span>
            <span>
              ช่องที่กำลังโฟกัส:{" "}
              <span className="font-semibold text-primary">
                {focusedField?.field === "internalSignal"
                  ? "สัญญาณภายใน"
                  : focusedField?.field === "externalSignal"
                    ? "สัญญาณภายนอก"
                    : "ระบบเลือกให้"}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {renderCloudGroup({
            title: "คลังสัญญาณภายใน",
            helper: "ดึงจาก Mission 1 เพื่อหยิบจุดแข็งหรือจุดอ่อนมาเป็นฐานคิดของกลยุทธ์",
            tokens: internalCloud,
            emptyText: "ยังไม่มีคำตอบจาก Mission 1 มากพอสำหรับสร้างคลังสัญญาณภายใน",
          })}
          {renderCloudGroup({
            title: "คลังโอกาส",
            helper: "ดึงจาก Mission 2 เฉพาะคำตอบโอกาส เพื่อจับคู่ทำ SO หรือ WO strategy",
            tokens: opportunityCloud,
            emptyText: "ยังไม่มีคำตอบฝั่งโอกาสจาก Mission 2",
          })}
          {renderCloudGroup({
            title: "คลังอุปสรรค",
            helper: "ดึงจาก Mission 2 เฉพาะคำตอบอุปสรรค เพื่อจับคู่ทำ ST หรือ WT strategy",
            tokens: threatCloud,
            emptyText: "ยังไม่มีคำตอบฝั่งอุปสรรคจาก Mission 2",
          })}
        </div>

        <div className="mt-6 space-y-5">
          {strategies.map((strategy, index) => (
            <article key={strategy.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">การ์ดกลยุทธ์ {index + 1}</p>
                  <p className="mt-2 text-xl font-semibold text-ink">{strategy.title || `กลยุทธ์ ${index + 1}`}</p>
                </div>
                <select
                  value={strategy.strategyType || lesson.content.strategyTypes[index % lesson.content.strategyTypes.length]?.value}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      strategies: previous.strategies.map((item) =>
                        item.id === strategy.id ? { ...item, strategyType: event.target.value } : item,
                      ),
                    }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                >
                  {lesson.content.strategyTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 rounded-[22px] border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const signalPairs =
                      strategy.strategyType === "SO"
                        ? [
                            { field: "internalSignal", label: "S", tokens: internalCloud.filter((token) => token.lensCode === "S") },
                            { field: "externalSignal", label: "O", tokens: opportunityCloud },
                          ]
                        : strategy.strategyType === "WO"
                          ? [
                              { field: "internalSignal", label: "W", tokens: internalCloud.filter((token) => token.lensCode === "W") },
                              { field: "externalSignal", label: "O", tokens: opportunityCloud },
                            ]
                          : strategy.strategyType === "WT"
                            ? [
                                { field: "internalSignal", label: "W", tokens: internalCloud.filter((token) => token.lensCode === "W") },
                                { field: "externalSignal", label: "T", tokens: threatCloud },
                              ]
                            : [
                                { field: "internalSignal", label: "S", tokens: internalCloud.filter((token) => token.lensCode === "S") },
                                { field: "externalSignal", label: "T", tokens: threatCloud },
                              ];

                    return signalPairs.map((group) => (
                      <div key={`${strategy.id}-${group.field}`} className="flex-1 rounded-[18px] border border-white/80 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          คำแนะนำเร็วฝั่ง {group.label}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.tokens.slice(0, 5).map((token) => (
                            <button
                              key={`${strategy.id}-${group.field}-${token.id}`}
                              type="button"
                              onClick={() => injectCloudWord(strategy.id, group.field, token.text)}
                              className={`rounded-full border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${getCloudTone(
                                token.lensCode,
                                token.weight,
                              )}`}
                            >
                              {token.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ชื่อกลยุทธ์</p>
                  <input
                    value={strategy.title || ""}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id ? { ...item, title: event.target.value } : item,
                        ),
                      }))
                    }
                    className="mt-3 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                    placeholder="ตั้งชื่อกลยุทธ์ให้จำง่าย"
                  />
                </label>
                <label className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">สัญญาณความสำเร็จ</p>
                  <input
                    value={strategy.successSignal || ""}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id ? { ...item, successSignal: event.target.value } : item,
                        ),
                      }))
                    }
                    className="mt-3 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                    placeholder="ตัวชี้วัดหรือภาพความสำเร็จที่อยากเห็น"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <label
                  className={`rounded-[24px] border p-4 transition ${
                    focusedField?.strategyId === strategy.id && focusedField?.field === "internalSignal"
                      ? "border-primary/30 bg-primary/5"
                      : "border-slate-100 bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">สัญญาณภายใน</p>
                    <span className="brand-chip border-slate-200 bg-white text-slate-500">S / W</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    คลิก cloud คำตอบจาก Mission 1 หรือพิมพ์เพิ่มเองเพื่อระบุจุดแข็ง/จุดอ่อนที่ใช้ใน TOW matrix
                  </p>
                  <textarea
                    rows={4}
                    value={strategy.internalSignal || ""}
                    onFocus={() => setFocusedField({ strategyId: strategy.id, field: "internalSignal" })}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id ? { ...item, internalSignal: event.target.value } : item,
                        ),
                      }))
                    }
                    className="mt-3 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
                    placeholder="เช่น ครูเล่าเรื่องเก่ง / ภาระงานหลังบ้านสูง"
                  />
                </label>

                <label
                  className={`rounded-[24px] border p-4 transition ${
                    focusedField?.strategyId === strategy.id && focusedField?.field === "externalSignal"
                      ? "border-accent/30 bg-accent/5"
                      : "border-slate-100 bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">สัญญาณภายนอก</p>
                    <span className="brand-chip border-slate-200 bg-white text-slate-500">O / T</span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    ระบบดึง word cloud จาก Mission 2 มาให้แล้ว คลิกเพื่อเติมโอกาสหรืออุปสรรคลงช่องนี้ได้ทันที
                  </p>
                  <textarea
                    rows={4}
                    value={strategy.externalSignal || ""}
                    onFocus={() => setFocusedField({ strategyId: strategy.id, field: "externalSignal" })}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id ? { ...item, externalSignal: event.target.value } : item,
                        ),
                      }))
                    }
                    className="mt-3 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                    placeholder="เช่น AI tools ใหม่ / อินเทอร์เน็ตไม่เสถียร"
                  />
                </label>
              </div>

              <label className="mt-4 block rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-ink">ข้อความกลยุทธ์</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  เขียนกลยุทธ์ที่เกิดจากการจับคู่ internal + external signal ให้ชัดว่าใครทำอะไร เปลี่ยนอะไร และเพราะอะไร
                </p>
                <textarea
                  rows={5}
                  value={strategy.strategyText || ""}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      strategies: previous.strategies.map((item) =>
                        item.id === strategy.id ? { ...item, strategyText: event.target.value } : item,
                      ),
                    }))
                  }
                  className="mt-3 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                  placeholder="เช่น ใช้ทักษะการเล่าเรื่องของครูผสาน AI เพื่อสร้างบทเรียนสั้นที่เด็กเข้าถึงได้แม้เวลาจำกัด"
                />
              </label>
            </article>
          ))}
        </div>

        <label className="mt-5 block rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">สรุปภาพรวมของ 3 กลยุทธ์</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{lesson.content.aiMentor.probe}</p>
          <textarea
            rows={4}
            value={draft.reflection || ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, reflection: event.target.value }))}
            className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            placeholder="สรุปว่าทำไม 3 กลยุทธ์นี้ถึงตอบโจทย์บริบทจริงของห้องเรียนคุณครู"
          />
        </label>

        {renderSaveButton(
          ready,
          isCompleted ? "อัปเดตการจับคู่ TOW Matrix" : "ยืนยัน 3 กลยุทธ์ TOW Matrix",
          () => buildDraftPayload({ lesson, draft, strategySource, selectedStrategy }),
        )}
      </div>
    );
  }

  if (lesson.activityType === "module1_needs_detective") {
    if (strategySource.length === 0) {
      return (
        <div className="rounded-[26px] border border-slate-100 bg-slate-50/80 p-8 text-center text-sm leading-7 text-slate-500">
          บันทึก Mission 3 ให้ครบก่อน แล้วค่อยกลับมาให้คะแนนกลยุทธ์เพื่อเลือกทางหลักครับ
        </div>
      );
    }

    const ready =
      strategySource.every((strategy) =>
        lesson.content.ratingCriteria.every(
          (criterion) => Number(draft.ratings?.[strategy.id]?.[criterion.id] || 0) > 0,
        ),
      ) &&
      filled(draft.selectedStrategyId) &&
      filled(draft.selectionReason);

    return (
      <div>
        {renderReward()}
        {renderStateBar()}
        <div className="space-y-4">
          {strategySource.map((strategy) => {
            const ratings = draft.ratings?.[strategy.id] || {};
            const total = lesson.content.ratingCriteria.reduce(
              (sum, criterion) => sum + Number(ratings[criterion.id] || 0),
              0,
            );

            return (
              <article key={strategy.id} className="rounded-[26px] border border-slate-100 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="brand-chip border-slate-200 bg-slate-50 text-slate-500">
                      {strategy.strategyType}
                    </p>
                    <p className="mt-3 text-xl font-semibold text-ink">{strategy.title}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{strategy.strategyText}</p>
                  </div>
                  <div className="rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-primary/60">คะแนนรวม</p>
                    <p className="text-2xl font-bold text-primary">{total}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {lesson.content.ratingCriteria.map((criterion) => (
                    <div key={criterion.id} className="rounded-[20px] border border-slate-100 bg-slate-50/80 p-4">
                      <p className="font-semibold text-ink">{criterion.label}</p>
                      <p className="mt-2 text-xs leading-6 text-slate-500">{criterion.helper}</p>
                      <RatingButtons
                        value={Number(ratings[criterion.id] || 0)}
                        onSelect={(score) =>
                          setDraft((previous) => ({
                            ...previous,
                            ratings: {
                              ...previous.ratings,
                              [strategy.id]: {
                                ...previous.ratings?.[strategy.id],
                                [criterion.id]: score,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <label
                  className={`mt-5 flex items-center gap-3 rounded-[20px] border px-4 py-3 text-sm font-semibold text-ink transition ${
                    draft.selectedStrategyId === strategy.id
                      ? "border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 shadow-[0_18px_45px_rgba(100,13,95,0.10)]"
                      : "border-slate-100 bg-slate-50/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="selected-strategy"
                    checked={draft.selectedStrategyId === strategy.id}
                    onChange={() => setDraft((previous) => ({ ...previous, selectedStrategyId: strategy.id }))}
                    className="h-4 w-4 text-primary"
                  />
                  เลือกกลยุทธ์นี้ไปต่อ
                </label>
              </article>
            );
          })}
        </div>
        <label className="mt-5 block rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">เหตุผลที่เลือกกลยุทธ์นี้เป็นลำดับแรก</p>
          <textarea
            rows={4}
            value={draft.selectionReason || ""}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, selectionReason: event.target.value }))
            }
            className="mt-3 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            placeholder="ทำไมกลยุทธ์นี้จึงควรเริ่มก่อน"
          />
        </label>
        {renderSaveButton(
          ready,
          isCompleted ? "อัปเดตกลยุทธ์หลัก" : "ยืนยันกลยุทธ์หลักที่ต้องทำก่อน",
          () => buildDraftPayload({ lesson, draft, strategySource, selectedStrategy }),
        )}
      </div>
    );
  }

  const ready =
    filled(draft.strategyTitle) &&
    filled(draft.startDate) &&
    filled(draft.reviewDate) &&
    filled(draft.plan) &&
    filled(draft.do) &&
    filled(draft.check) &&
    filled(draft.act);

  return (
    <div>
      {renderReward()}
      {renderStateBar()}
      <div className="rounded-[26px] border border-primary/10 bg-primary/5 p-5">
        <p className="text-sm font-semibold text-primary">กลยุทธ์ที่เลือกไว้เพื่อทำ Action Plan</p>
        <p className="mt-3 text-xl font-semibold text-ink">
          {selectedStrategy?.title || draft.strategyTitle || "ยังไม่ได้เลือกกลยุทธ์หลัก"}
        </p>
        {selectedStrategy?.strategyText ? (
          <p className="mt-2 text-sm leading-7 text-slate-700">{selectedStrategy.strategyText}</p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input
          value={draft.strategyTitle || ""}
          onChange={(event) => setDraft((previous) => ({ ...previous, strategyTitle: event.target.value }))}
          className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
          placeholder="ชื่อกลยุทธ์หลัก"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="date"
            value={draft.startDate || ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, startDate: event.target.value }))}
            className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
          />
          <input
            type="date"
            value={draft.reviewDate || ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, reviewDate: event.target.value }))}
            className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {lesson.content.pdcaPrompts.map((prompt) => (
          <label key={prompt.id} className="rounded-[26px] border border-slate-100 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{prompt.title}</p>
            <p className="mt-2 text-lg font-semibold text-ink">{prompt.title}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{prompt.helper}</p>
            <textarea
              rows={5}
              value={draft[prompt.id] || ""}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, [prompt.id]: event.target.value }))
              }
              className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
              placeholder={`เขียนรายละเอียดในส่วน ${prompt.title}`}
            />
          </label>
        ))}
      </div>

      <label className="mt-5 block rounded-[26px] border border-slate-100 bg-white p-5">
        <p className="text-sm font-semibold text-ink">แรงหนุนที่อยากได้จาก DU / เครือข่าย</p>
        <textarea
          rows={4}
          value={draft.supportNeeded || ""}
          onChange={(event) =>
            setDraft((previous) => ({ ...previous, supportNeeded: event.target.value }))
          }
          className="mt-3 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
          placeholder="ต้องการแรงหนุนหรือทรัพยากรอะไร"
        />
      </label>

      {renderSaveButton(
        ready,
        isCompleted ? "อัปเดต Action Plan แบบ PDCA" : "บันทึก Action Plan แบบ PDCA",
        () => buildDraftPayload({ lesson, draft, strategySource, selectedStrategy }),
      )}
    </div>
  );
}

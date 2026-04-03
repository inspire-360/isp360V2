import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

const filled = (value) => Boolean(String(value || "").trim());

const extractAnswerMap = (parts = []) =>
  parts.flatMap((part) => part.items || []).reduce((accumulator, item) => {
    accumulator[item.id] = item.answer || "";
    return accumulator;
  }, {});

const collectInsights = (response) =>
  response?.parts?.flatMap((part) => part.items || []).filter((item) => filled(item.answer)) || [];

const RatingButtons = ({ value, onSelect }) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {[1, 2, 3, 4, 5].map((score) => (
      <button
        key={score}
        type="button"
        onClick={() => onSelect(score)}
        className={`h-9 w-9 rounded-2xl border text-sm font-semibold transition ${
          value === score
            ? "border-primary bg-primary text-white"
            : "border-slate-200 bg-white text-slate-500 hover:border-accent/25"
        }`}
      >
        {score}
      </button>
    ))}
  </div>
);

export default function ModuleOneMission({
  lesson,
  savedResponse,
  allResponses,
  isCompleted,
  onSave,
}) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState("");

  const strategySource = useMemo(
    () => allResponses["m1-mission-3"]?.strategies || [],
    [allResponses],
  );
  const selectedStrategy = useMemo(() => {
    const selectedId = allResponses["m1-mission-4"]?.selectedStrategyId;
    return (
      allResponses["m1-mission-4"]?.selectedStrategy ||
      strategySource.find((strategy) => strategy.id === selectedId) ||
      strategySource[0] ||
      null
    );
  }, [allResponses, strategySource]);
  const sourceInsights = useMemo(
    () => [
      ...collectInsights(allResponses["m1-mission-1"]).slice(0, 3),
      ...collectInsights(allResponses["m1-mission-2"]).slice(0, 3),
    ],
    [allResponses],
  );

  useEffect(() => {
    if (lesson.activityType === "module1_reflection") {
      setDraft({
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
      });
      return;
    }

    if (lesson.activityType === "module1_strategy_fusion") {
      setDraft({
        strategies:
          savedResponse?.strategies?.length > 0
            ? savedResponse.strategies
            : lesson.content.starterSlots.map((slot, index) => ({
                id: slot,
                title: `Strategy ${index + 1}`,
                strategyType: index === 0 ? "SO" : index === 1 ? "WO" : "ST",
                internalSignal: "",
                externalSignal: "",
                strategyText: "",
                successSignal: "",
              })),
        reflection: savedResponse?.reflection || "",
      });
      return;
    }

    if (lesson.activityType === "module1_needs_detective") {
      setDraft({
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
      });
      return;
    }

    setDraft({
      strategyTitle: savedResponse?.strategyTitle || selectedStrategy?.title || "",
      startDate: savedResponse?.startDate || "",
      reviewDate: savedResponse?.reviewDate || "",
      supportNeeded: savedResponse?.supportNeeded || "",
      plan: savedResponse?.plan || "",
      do: savedResponse?.do || "",
      check: savedResponse?.check || "",
      act: savedResponse?.act || "",
    });
  }, [lesson, savedResponse, strategySource, selectedStrategy]);

  const persist = async (payload) => {
    setSaving(true);
    try {
      await onSave(payload);
      setReward(lesson.content.aiMentor?.reward || "Mission saved");
      window.setTimeout(() => setReward(""), 2500);
    } finally {
      setSaving(false);
    }
  };

  const renderReward = () =>
    reward ? (
      <div className="mb-5 flex items-center gap-3 rounded-[24px] border border-accent/20 bg-accent/5 px-4 py-4 text-sm text-slate-700">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="font-semibold text-ink">Micro-reward unlocked</p>
          <p className="mt-1">{reward}</p>
        </div>
      </div>
    ) : null;

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
        <div className="mt-5 space-y-4">
          {currentPart.questions.map((question, index) => (
            <label key={question.id} className="block rounded-[26px] border border-slate-100 bg-white p-5">
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
                rows={4}
                value={draft.answers?.[question.id] || ""}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    answers: { ...previous.answers, [question.id]: event.target.value },
                  }))
                }
                className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                placeholder="พิมพ์คำตอบของคุณครู"
              />
            </label>
          ))}
        </div>
        <label className="mt-5 block rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">AI Mentor Reflection</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{lesson.content.aiMentor.probe}</p>
          <textarea
            rows={4}
            value={draft.summary || ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, summary: event.target.value }))}
            className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            placeholder="สรุปว่าตอนนี้อะไรชัดขึ้นที่สุด"
          />
        </label>
        {renderSaveButton(ready, isCompleted ? "Update mission answers" : "Complete mission", () => ({
          type: "reflection",
          activePartIndex: draft.activePartIndex,
          summary: draft.summary.trim(),
          parts: parts.map((part) => ({
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
        }))}
      </div>
    );
  }

  if (lesson.activityType === "module1_strategy_fusion") {
    const ready =
      draft.strategies?.length === 3 &&
      draft.strategies.every(
        (strategy) =>
          filled(strategy.title) &&
          filled(strategy.strategyType) &&
          filled(strategy.internalSignal) &&
          filled(strategy.externalSignal) &&
          filled(strategy.strategyText) &&
          filled(strategy.successSignal),
      ) &&
      filled(draft.reflection);

    return (
      <div>
        {renderReward()}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            {draft.strategies?.map((strategy) => (
              <article key={strategy.id} className="rounded-[26px] border border-slate-100 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <input
                    value={strategy.title}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id ? { ...item, title: event.target.value } : item,
                        ),
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                    placeholder="ตั้งชื่อกลยุทธ์"
                  />
                  <select
                    value={strategy.strategyType}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id
                            ? { ...item, strategyType: event.target.value }
                            : item,
                        ),
                      }))
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                  >
                    {lesson.content.strategyTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <textarea
                    rows={3}
                    value={strategy.internalSignal}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id
                            ? { ...item, internalSignal: event.target.value }
                            : item,
                        ),
                      }))
                    }
                    className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                    placeholder="จุดแข็งหรือจุดอ่อนที่ใช้คิด"
                  />
                  <textarea
                    rows={3}
                    value={strategy.externalSignal}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        strategies: previous.strategies.map((item) =>
                          item.id === strategy.id
                            ? { ...item, externalSignal: event.target.value }
                            : item,
                        ),
                      }))
                    }
                    className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                    placeholder="โอกาสหรืออุปสรรคที่ใช้คิด"
                  />
                </div>
                <textarea
                  rows={4}
                  value={strategy.strategyText}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      strategies: previous.strategies.map((item) =>
                        item.id === strategy.id
                          ? { ...item, strategyText: event.target.value }
                          : item,
                      ),
                    }))
                  }
                  className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                  placeholder="อธิบายว่าจะทำอะไร"
                />
                <textarea
                  rows={3}
                  value={strategy.successSignal}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      strategies: previous.strategies.map((item) =>
                        item.id === strategy.id
                          ? { ...item, successSignal: event.target.value }
                          : item,
                      ),
                    }))
                  }
                  className="mt-4 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
                  placeholder="ถ้ากลยุทธ์นี้เวิร์ก เราจะเห็นอะไร"
                />
              </article>
            ))}
          </div>
          <aside className="space-y-4">
            <div className="rounded-[26px] border border-primary/10 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-primary">AI Mentor</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{lesson.content.aiMentor.probe}</p>
            </div>
            <div className="rounded-[26px] border border-slate-100 bg-white p-5">
              <p className="text-sm font-semibold text-ink">Source sparks</p>
              <div className="mt-4 space-y-3">
                {sourceInsights.length > 0 ? (
                  sourceInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm"
                    >
                      <p className="font-semibold text-ink">{insight.lensTitle}</p>
                      <p className="mt-2 leading-6 text-slate-600">{insight.answer}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-slate-500">
                    บันทึก Mission 1 และ 2 ก่อน แล้ววัตถุดิบสำคัญจะโผล่มาตรงนี้ครับ
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
        <label className="mt-5 block rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">Reflection</p>
          <textarea
            rows={4}
            value={draft.reflection || ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, reflection: event.target.value }))}
            className="mt-3 w-full rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 outline-none transition focus:border-accent/30 focus:ring-4 focus:ring-accent/10"
            placeholder="สรุปว่ากลยุทธ์ทั้ง 3 ใบนี้ตอบโจทย์ห้องเรียนอย่างไร"
          />
        </label>
        {renderSaveButton(ready, isCompleted ? "Update strategy cards" : "Forge 3 strategies", () => ({
          type: "strategies",
          reflection: draft.reflection.trim(),
          strategies: draft.strategies.map((strategy) => ({
            ...strategy,
            title: strategy.title.trim(),
            internalSignal: strategy.internalSignal.trim(),
            externalSignal: strategy.externalSignal.trim(),
            strategyText: strategy.strategyText.trim(),
            successSignal: strategy.successSignal.trim(),
          })),
        }))}
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
                    <p className="text-xs uppercase tracking-[0.18em] text-primary/60">Total</p>
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
                <label className="mt-5 flex items-center gap-3 rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-ink">
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
          <p className="text-sm font-semibold text-ink">Selection reason</p>
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
        {renderSaveButton(ready, isCompleted ? "Update selected strategy" : "Lock priority strategy", () => ({
          type: "needs-detective",
          selectedStrategyId: draft.selectedStrategyId,
          selectedStrategy:
            strategySource.find((strategy) => strategy.id === draft.selectedStrategyId) || null,
          selectionReason: draft.selectionReason.trim(),
          strategyScores: strategySource.map((strategy) => ({
            strategyId: strategy.id,
            title: strategy.title,
            strategyType: strategy.strategyType,
            ratings: draft.ratings?.[strategy.id] || {},
            total: lesson.content.ratingCriteria.reduce(
              (sum, criterion) =>
                sum + Number(draft.ratings?.[strategy.id]?.[criterion.id] || 0),
              0,
            ),
          })),
        }))}
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
      <div className="rounded-[26px] border border-primary/10 bg-primary/5 p-5">
        <p className="text-sm font-semibold text-primary">Selected strategy</p>
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
        <p className="text-sm font-semibold text-ink">Support needed from DU / network</p>
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

      {renderSaveButton(ready, isCompleted ? "Update PDCA Action Plan" : "Save PDCA Action Plan", () => ({
        type: "pdca",
        strategyTitle: draft.strategyTitle.trim(),
        startDate: draft.startDate,
        reviewDate: draft.reviewDate,
        supportNeeded: draft.supportNeeded.trim(),
        plan: draft.plan.trim(),
        do: draft.do.trim(),
        check: draft.check.trim(),
        act: draft.act.trim(),
      }))}
    </div>
  );
}

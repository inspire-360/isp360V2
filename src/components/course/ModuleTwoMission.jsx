import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

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

const buildPayload = (lesson, draft) => {
  if (lesson.activityType === "module2_dream_lab") {
    return { type: "dream-lab", sparkNote: draft.sparkNote || "", strategies: draft.strategies || [] };
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
    return { type: "smart", commitment: draft.commitment || "", criteria: draft.criteria || [] };
  }
  return { type: "quality", alignmentNote: draft.alignmentNote || "", lenses: draft.lenses || [] };
};

const hasContent = (payload) => JSON.stringify(payload).replace(/[\s":,{}\[\]]/g, "").length > 0;

const SectionIntro = ({ intro, helper }) => (
  <div className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
    <p className="text-sm font-semibold text-secondary">AI Mentor Guidance</p>
    <p className="mt-3 text-sm leading-7 text-slate-700">{intro}</p>
    {helper ? <p className="mt-3 text-sm leading-7 text-slate-600">{helper}</p> : null}
  </div>
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

export default function ModuleTwoMission({ lesson, savedResponse, allResponses, isCompleted, onSave, onDraftSave }) {
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [reward, setReward] = useState("");
  const [autosaveState, setAutosaveState] = useState("");
  const lastPayloadRef = useRef("");

  const strengthCloud = useMemo(() => buildCloudNodes(collectInsights(allResponses["m1-mission-1"], ["S"])), [allResponses]);
  const weaknessCloud = useMemo(() => buildCloudNodes(collectInsights(allResponses["m1-mission-1"], ["W"])), [allResponses]);
  const opportunityCloud = useMemo(() => buildCloudNodes(collectInsights(allResponses["m1-mission-2"], ["O"])), [allResponses]);
  const threatCloud = useMemo(() => buildCloudNodes(collectInsights(allResponses["m1-mission-2"], ["T"])), [allResponses]);

  useEffect(() => {
    if (lesson.activityType === "module2_dream_lab") {
      setDraft({
        strategies: savedResponse?.strategies?.length ? savedResponse.strategies : lesson.content.prompts.map((item) => ({ ...item, answer: "" })),
        sparkNote: savedResponse?.sparkNote || "",
      });
      return;
    }
    if (lesson.activityType === "module2_vibe_check") {
      setDraft({
        senses: savedResponse?.senses?.length ? savedResponse.senses : lesson.content.senses.map((item) => ({ ...item, answer: "" })),
        moodLine: savedResponse?.moodLine || "",
      });
      return;
    }
    if (lesson.activityType === "module2_roadmap") {
      setDraft({
        weeks: savedResponse?.weeks?.length ? savedResponse.weeks : lesson.content.weeks.map((item) => ({ ...item, quickWin: "", plan: "", evidence: "" })),
        northStar: savedResponse?.northStar || "",
      });
      return;
    }
    if (lesson.activityType === "module2_pitch_deck") {
      setDraft({
        projectName: savedResponse?.projectName || "",
        teaser: savedResponse?.teaser || "",
        cards: savedResponse?.cards?.length ? savedResponse.cards : lesson.content.prompts.map((item) => ({ ...item, answer: "" })),
      });
      return;
    }
    if (lesson.activityType === "module2_smart_objective") {
      setDraft({
        commitment: savedResponse?.commitment || "",
        criteria: savedResponse?.criteria?.length ? savedResponse.criteria : lesson.content.criteria.map((item) => ({ ...item, answer: "" })),
      });
      return;
    }
    setDraft({
      alignmentNote: savedResponse?.alignmentNote || "",
      lenses: savedResponse?.lenses?.length ? savedResponse.lenses : lesson.content.lenses.map((item) => ({ ...item, answer: "" })),
    });
  }, [lesson, savedResponse]);

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
        console.error("Failed to autosave Module 2 draft:", error);
        setAutosaveState("Autosave pending");
      }
    }, 900);
    return () => window.clearTimeout(timeoutId);
  }, [draft, lesson, onDraftSave]);

  const updateListItem = (key, id, field, value) =>
    setDraft((previous) => ({
      ...previous,
      [key]: previous[key].map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));

  const appendToken = (strategyId, tokenText) =>
    setDraft((previous) => ({
      ...previous,
      strategies: previous.strategies.map((strategy) =>
        strategy.id === strategyId ? { ...strategy, answer: `${String(strategy.answer || "").trim()}\n${tokenText}`.trim() } : strategy,
      ),
    }));

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

  const renderHeader = (helper) => (
    <>
      {reward ? <div className="mb-4 rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-4 text-sm font-semibold text-primary">{reward}</div> : null}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-2 text-primary">{autosaveState || "Autosave active"}</span>
        {isCompleted ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Mission completed</span> : null}
      </div>
      <SectionIntro intro={lesson.content.aiMentor.intro} helper={helper} />
    </>
  );

  if (lesson.activityType === "module2_dream_lab") {
    const cloudMap = { S: strengthCloud, W: weaknessCloud, O: opportunityCloud, T: threatCloud };
    const ready = (draft.strategies || []).every((item) => filled(item.answer));
    return (
      <div>
        {renderHeader("ใช้ชิปจาก Module 1 เพื่อดึงสัญญาณสำคัญเข้ามา แล้วค่อยขยายเป็นภาพฝันของคุณเอง")}
        <div className="mt-5 space-y-5">
          {(draft.strategies || []).map((strategy) => (
            <article key={strategy.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="brand-chip border-slate-200 bg-slate-50 text-slate-600">{strategy.strategyType}</span>
                <span className="text-sm text-secondary">{strategy.relevantLensCodes.join(" + ")}</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-ink">{strategy.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{strategy.prompt}</p>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {strategy.relevantLensCodes.map((lensCode) => (
                  <div key={`${strategy.id}-${lensCode}`} className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Signal {lensCode}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(cloudMap[lensCode] || []).map((token) => (
                        <button
                          key={token.id}
                          type="button"
                          onClick={() => appendToken(strategy.id, token.text)}
                          className={`rounded-full border px-3 py-2 text-sm ${lensTone(token.lensCode, token.weight)}`}
                        >
                          {token.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <TextArea value={strategy.answer} onChange={(event) => updateListItem("strategies", strategy.id, "answer", event.target.value)} placeholder="พิมพ์ภาพฝันของกลยุทธ์นี้ให้ชัดที่สุด" rows={6} />
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">AI Mentor Reflection</p>
          <TextArea value={draft.sparkNote} onChange={(event) => setDraft((previous) => ({ ...previous, sparkNote: event.target.value }))} placeholder="สรุปประกายหลักของ Dream Lab แบบสั้นๆ" rows={4} />
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_vibe_check") {
    const ready = (draft.senses || []).every((item) => filled(item.answer));
    return (
      <div>
        {renderHeader("เขียนเหมือนกำลังพาคนเดินเข้าไปอยู่ในห้องเรียนจริง ให้เขาเห็น ได้ยิน และรู้สึกไปพร้อมกัน")}
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {(draft.senses || []).map((sense) => (
            <article key={sense.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
              <h3 className="text-xl font-semibold text-ink">{sense.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{sense.prompt}</p>
              <TextArea value={sense.answer} onChange={(event) => updateListItem("senses", sense.id, "answer", event.target.value)} placeholder={sense.placeholder} rows={8} />
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
          <p className="text-sm font-semibold text-secondary">Mood Line</p>
          <TextArea value={draft.moodLine} onChange={(event) => setDraft((previous) => ({ ...previous, moodLine: event.target.value }))} placeholder="สรุปบรรยากาศห้องเรียนในฝันแบบสั้น กระชับ และมีพลัง" rows={3} />
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_roadmap") {
    const ready = (draft.weeks || []).every((item) => filled(item.quickWin) && filled(item.plan));
    return (
      <div>
        {renderHeader("โฟกัส 30 วันที่เห็น quick win และพาใจทีมเดินต่อได้จริง")}
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {(draft.weeks || []).map((week) => (
            <article key={week.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
              <h3 className="text-xl font-semibold text-ink">{week.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{week.focus}</p>
              <input
                type="text"
                value={week.quickWin || ""}
                onChange={(event) => updateListItem("weeks", week.id, "quickWin", event.target.value)}
                placeholder="Quick Win ของสัปดาห์นี้"
                className="mt-3 w-full rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white"
              />
              <TextArea value={week.plan} onChange={(event) => updateListItem("weeks", week.id, "plan", event.target.value)} placeholder="จะลงมือทำอะไร กับใคร ที่ไหน อย่างไร" rows={5} />
              <TextArea value={week.evidence} onChange={(event) => updateListItem("weeks", week.id, "evidence", event.target.value)} placeholder="จะดูจากหลักฐานหรือ feedback อะไร" rows={4} />
            </article>
          ))}
        </div>
        <div className="mt-5 rounded-[26px] border border-slate-100 bg-white p-5">
          <p className="text-sm font-semibold text-ink">North Star</p>
          <TextArea value={draft.northStar} onChange={(event) => setDraft((previous) => ({ ...previous, northStar: event.target.value }))} placeholder="สรุปภาพความสำเร็จปลายทางของ sprint นี้" rows={4} />
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_pitch_deck") {
    const ready = filled(draft.projectName) && (draft.cards || []).every((item) => filled(item.answer));
    return (
      <div>
        {renderHeader("เขียนให้เหมือนกำลังชวนเพื่อนครูหรือผู้บริหารเข้ามาร่วมทีม อ่านจบแล้วต้องรู้ว่าโปรเจกต์นี้ช่วยอะไร")}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <input
            type="text"
            value={draft.projectName || ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, projectName: event.target.value }))}
            placeholder="ตั้งชื่อโปรเจกต์ให้คนอ่านจำได้ทันที"
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-primary/30 focus:bg-white"
          />
          <TextArea value={draft.teaser} onChange={(event) => setDraft((previous) => ({ ...previous, teaser: event.target.value }))} placeholder="เขียนคำโปรยสั้นๆ 1-2 ประโยค ที่เล่าเสน่ห์ของโปรเจกต์นี้" rows={4} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {(draft.cards || []).map((card) => (
            <article key={card.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
              <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{card.prompt}</p>
              <TextArea value={card.answer} onChange={(event) => updateListItem("cards", card.id, "answer", event.target.value)} placeholder="สรุปให้กระชับ แต่ชัดและเห็นภาพ" rows={6} />
            </article>
          ))}
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  if (lesson.activityType === "module2_smart_objective") {
    const ready = filled(draft.commitment) && (draft.criteria || []).every((item) => filled(item.answer));
    return (
      <div>
        {renderHeader("เขียนให้เหมือนเป็นประโยคที่พร้อมประกาศใช้จริง อ่านแล้วต้องเห็นทั้งผลลัพธ์ วิธีวัด และกรอบเวลา")}
        <div className="mt-5 rounded-[28px] border border-slate-100 bg-white p-5">
          <TextArea value={draft.commitment} onChange={(event) => setDraft((previous) => ({ ...previous, commitment: event.target.value }))} placeholder="ภายใน 30 วัน ... จะเกิดความเปลี่ยนแปลงอะไร กับใคร และวัดจากอะไร" rows={5} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {(draft.criteria || []).map((criterion) => (
            <article key={criterion.id} className="rounded-[26px] border border-slate-100 bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">{criterion.label}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{criterion.prompt}</p>
              <TextArea value={criterion.answer} onChange={(event) => updateListItem("criteria", criterion.id, "answer", event.target.value)} placeholder="ขยายให้ชัดขึ้นในมิตินี้" rows={5} />
            </article>
          ))}
        </div>
        {renderSubmit(ready)}
      </div>
    );
  }

  const ready = (draft.lenses || []).every((item) => filled(item.answer));
  return (
    <div>
      {renderHeader("ตอบให้เห็นว่าทำไมโปรเจกต์นี้จึงมีค่าในหลายระดับ ไม่ใช่แค่แก้ปัญหาเฉพาะหน้า")}
      <div className="mt-5 space-y-4">
        {(draft.lenses || []).map((lens) => (
          <article key={lens.id} className="rounded-[28px] border border-slate-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{lens.title}</p>
                <h3 className="mt-1 text-xl font-semibold text-ink">{lens.subtitle}</h3>
              </div>
              <span className="brand-chip border-slate-200 bg-slate-50 text-slate-500">{lens.id}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{lens.prompt}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {lens.context?.map((item) => (
                <div key={item} className="rounded-[20px] border border-slate-100 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
                  {item}
                </div>
              ))}
            </div>
            <TextArea value={lens.answer} onChange={(event) => updateListItem("lenses", lens.id, "answer", event.target.value)} placeholder="เขียนคำอธิบายว่าทำไมโปรเจกต์นี้จึงตอบโจทย์ในเลนส์นี้" rows={5} />
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
        <p className="text-sm font-semibold text-secondary">Alignment Note</p>
        <TextArea value={draft.alignmentNote} onChange={(event) => setDraft((previous) => ({ ...previous, alignmentNote: event.target.value }))} placeholder="สรุปภาพรวมของคุณค่าที่โปรเจกต์นี้จะสร้าง" rows={4} />
      </div>
      {renderSubmit(ready)}
    </div>
  );
}

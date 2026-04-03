import React from "react";
import { Award, CheckCircle2, Sparkles } from "lucide-react";

const formatStamp = (value) => {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const ScorePill = ({ value, max }) => (
  <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-3 text-right">
    <p className="text-xs uppercase tracking-[0.18em] text-primary/60">Post-test</p>
    <p className="text-2xl font-bold text-primary">
      {value}/{max}
    </p>
  </div>
);

export default function ModuleOneReportCard({ report }) {
  if (!report) return null;

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-[32px] border border-primary/10 bg-white p-6 shadow-[0_20px_60px_rgba(13,17,100,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="brand-chip border-primary/10 bg-primary/5 text-primary">
              <Award size={14} />
              {report.badge}
            </span>
            <h3 className="mt-4 font-display text-3xl font-bold text-ink">Module 1 Report Card</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              สรุปคำตอบทั้งหมดของ Module 1 พร้อมกลยุทธ์ที่เลือก Action Plan แบบ PDCA และการปลดล็อกไปยัง {report.unlockedModule}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
              Generated {formatStamp(report.generatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ScorePill value={report.score} max={report.totalQuestions} />
            <div className="rounded-[24px] border border-accent/10 bg-accent/5 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-accent/70">Unlocked</p>
              <p className="text-lg font-bold text-accent">{report.unlockedModule}</p>
            </div>
          </div>
        </div>

        {report.focusStrategy ? (
          <div className="mt-6 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
            <div className="flex items-center gap-3 text-secondary">
              <Sparkles size={18} />
              <p className="text-sm font-semibold">Priority strategy</p>
            </div>
            <p className="mt-3 text-lg font-semibold text-ink">{report.focusStrategy}</p>
          </div>
        ) : null}
      </section>

      {report.sections.map((section) => {
        if (section.kind === "answers") {
          return (
            <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
              <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
              {section.summary ? (
                <p className="mt-3 rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-7 text-primary">
                  {section.summary}
                </p>
              ) : null}
              <div className="mt-5 space-y-5">
                {section.parts?.map((part) => (
                  <article key={part.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h5 className="text-lg font-semibold text-ink">{part.title}</h5>
                      <span className="brand-chip border-slate-200 bg-white text-slate-500">
                        {part.lensCode}
                      </span>
                    </div>
                    <div className="mt-4 space-y-4">
                      {part.items?.map((item) => (
                        <div key={item.id} className="rounded-[20px] border border-white/80 bg-white p-4">
                          <p className="text-sm font-semibold text-ink">{item.lensTitle}</p>
                          <p className="mt-2 text-sm leading-7 text-slate-500">{item.prompt}</p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">{item.answer || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (section.kind === "strategies") {
          return (
            <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
              <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {section.items?.map((item) => (
                  <article key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                    <span className="brand-chip border-slate-200 bg-white text-slate-500">
                      {item.strategyType}
                    </span>
                    <p className="mt-4 text-lg font-semibold text-ink">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.strategyText}</p>
                    <div className="mt-4 space-y-2 text-sm text-slate-500">
                      <p>Internal: {item.internalSignal}</p>
                      <p>External: {item.externalSignal}</p>
                      <p>Success signal: {item.successSignal}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (section.kind === "rating") {
          return (
            <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
              <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
              {section.selectedStrategy ? (
                <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
                  <div className="flex items-center gap-3 text-primary">
                    <CheckCircle2 size={18} />
                    <p className="text-sm font-semibold">Selected strategy</p>
                  </div>
                  <p className="mt-3 text-lg font-semibold text-ink">{section.selectedStrategy.title}</p>
                  {section.selectionReason ? (
                    <p className="mt-2 text-sm leading-7 text-slate-700">{section.selectionReason}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-5 space-y-4">
                {section.scores?.map((score) => (
                  <div key={score.strategyId} className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-ink">{score.title}</p>
                      <p className="text-lg font-bold text-primary">{score.total}</p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {Object.entries(score.ratings || {}).map(([key, value]) => (
                        <div key={key} className="rounded-[18px] border border-white/80 bg-white px-3 py-3 text-sm">
                          <p className="text-slate-400">{key}</p>
                          <p className="mt-1 font-semibold text-ink">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        return (
          <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
            <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {["plan", "do", "check", "act"].map((key) => (
                <article key={key} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{key}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{section.actionPlan?.[key] || "-"}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 text-sm">
                <p className="text-slate-400">Strategy</p>
                <p className="mt-2 font-semibold text-ink">{section.actionPlan?.strategyTitle || "-"}</p>
              </div>
              <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 text-sm">
                <p className="text-slate-400">Start</p>
                <p className="mt-2 font-semibold text-ink">{section.actionPlan?.startDate || "-"}</p>
              </div>
              <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 text-sm">
                <p className="text-slate-400">Review</p>
                <p className="mt-2 font-semibold text-ink">{section.actionPlan?.reviewDate || "-"}</p>
              </div>
            </div>
            {section.actionPlan?.supportNeeded ? (
              <div className="mt-5 rounded-[22px] border border-secondary/10 bg-secondary/5 px-4 py-4 text-sm leading-7 text-slate-700">
                DU / Network support: {section.actionPlan.supportNeeded}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

import React, { useRef, useState } from "react";
import { Award, Download, FileImage, FileText, Loader2, Sparkles } from "lucide-react";

const formatStamp = (value) => {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
};

const ScorePill = ({ value, max }) => (
  <div className="rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-3 text-right">
    <p className="text-xs uppercase tracking-[0.18em] text-primary/60">Post-test</p>
    <p className="text-2xl font-bold text-primary">
      {value}/{max}
    </p>
  </div>
);

export default function ModuleTwoReportCard({ report }) {
  const exportRef = useRef(null);
  const [downloading, setDownloading] = useState("");

  if (!report) return null;

  const captureCard = async () => {
    const node = exportRef.current;
    if (!node) return null;
    const { default: html2canvas } = await import("html2canvas");
    return html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
  };

  const exportImage = async () => {
    setDownloading("image");
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png", 1);
      link.download = `module2-report-${report.cardSerial || "sdesign"}.png`;
      link.click();
    } finally {
      setDownloading("");
    }
  };

  const exportPdf = async () => {
    setDownloading("pdf");
    try {
      const canvas = await captureCard();
      if (!canvas) return;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageData = canvas.toDataURL("image/png", 1);
      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = 0;
      pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight;
        pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      pdf.save(`module2-report-${report.cardSerial || "sdesign"}.pdf`);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={exportImage}
          disabled={Boolean(downloading)}
          className="brand-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading === "image" ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
          Download PNG
        </button>
        <button
          type="button"
          onClick={exportPdf}
          disabled={Boolean(downloading)}
          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          Download PDF
        </button>
      </div>

      <div ref={exportRef} className="space-y-6 bg-white">
        <section className="rounded-[32px] border border-primary/10 bg-white p-6 shadow-[0_20px_60px_rgba(13,17,100,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <Award size={14} />
                {report.badge}
              </span>
              <h3 className="mt-4 font-display text-3xl font-bold text-ink">Module 2 Report Card</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                สรุป Dream Lab, Vibe Check, Roadmap 30 วัน, 5W1H, SMART Objective และ 3 เลนส์คุณภาพ พร้อมปลดล็อก {report.unlockedModule}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Trainee</p>
                  <p className="mt-2 font-semibold text-ink">{report.traineeName || "-"}</p>
                  {report.traineeEmail ? <p className="mt-1 text-slate-500">{report.traineeEmail}</p> : null}
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Card Serial</p>
                  <p className="mt-2 font-semibold text-ink">{report.cardSerial || "-"}</p>
                  <p className="mt-1 text-slate-500">Generated {formatStamp(report.generatedAt)}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ScorePill value={report.score} max={report.totalQuestions} />
              <div className="rounded-[24px] border border-accent/10 bg-accent/5 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-accent/70">Unlocked</p>
                <p className="text-lg font-bold text-accent">{report.unlockedModule}</p>
              </div>
            </div>
          </div>
          {report.projectName ? (
            <div className="mt-6 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
              <div className="flex items-center gap-3 text-secondary">
                <Sparkles size={18} />
                <p className="text-sm font-semibold">Project Focus</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-ink">{report.projectName}</p>
              {report.smartCommitment ? <p className="mt-2 text-sm leading-7 text-slate-700">{report.smartCommitment}</p> : null}
            </div>
          ) : null}
        </section>

        {report.sections.map((section) => {
          if (section.kind === "dream_lab") {
            return (
              <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
                <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
                {section.summary ? <p className="mt-3 text-sm leading-7 text-primary">{section.summary}</p> : null}
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {section.items?.map((item) => (
                    <article key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                      <span className="brand-chip border-slate-200 bg-white text-slate-500">{item.strategyType}</span>
                      <p className="mt-4 text-lg font-semibold text-ink">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{item.prompt}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{item.answer || "-"}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.kind === "vibe") {
            return (
              <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
                <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
                {section.moodLine ? <p className="mt-3 text-sm leading-7 text-secondary">{section.moodLine}</p> : null}
                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  {section.senses?.map((sense) => (
                    <article key={sense.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                      <p className="text-lg font-semibold text-ink">{sense.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{sense.prompt}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{sense.answer || "-"}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.kind === "roadmap") {
            return (
              <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
                <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
                {section.northStar ? <p className="mt-3 text-sm leading-7 text-primary">{section.northStar}</p> : null}
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {section.weeks?.map((week) => (
                    <article key={week.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                      <p className="text-lg font-semibold text-ink">{week.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{week.focus}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">Quick Win: {week.quickWin || "-"}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">Action: {week.plan || "-"}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">Evidence: {week.evidence || "-"}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.kind === "pitch") {
            return (
              <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
                <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
                {section.projectName ? <p className="mt-3 text-sm leading-7 text-secondary">{section.projectName}</p> : null}
                {section.teaser ? <p className="mt-2 text-sm leading-7 text-slate-700">{section.teaser}</p> : null}
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {section.cards?.map((card) => (
                    <article key={card.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                      <p className="text-lg font-semibold text-ink">{card.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{card.prompt}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{card.answer || "-"}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          if (section.kind === "smart") {
            return (
              <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
                <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
                <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5 text-sm leading-7 text-slate-700">
                  {section.commitment || "-"}
                </div>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {section.criteria?.map((criterion) => (
                    <article key={criterion.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                      <p className="text-lg font-semibold text-ink">{criterion.label}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">{criterion.prompt}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{criterion.answer || "-"}</p>
                    </article>
                  ))}
                </div>
              </section>
            );
          }

          return (
            <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
              <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
              {section.alignmentNote ? <p className="mt-3 text-sm leading-7 text-secondary">{section.alignmentNote}</p> : null}
              <div className="mt-5 space-y-4">
                {section.lenses?.map((lens) => (
                  <article key={lens.id} className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{lens.title}</p>
                        <p className="mt-1 text-lg font-semibold text-ink">{lens.subtitle}</p>
                      </div>
                      <span className="brand-chip border-slate-200 bg-white text-slate-500">{lens.id}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-500">{lens.prompt}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {lens.context?.map((item) => (
                        <div key={item} className="rounded-[18px] border border-white/80 bg-white px-3 py-3 text-sm leading-7 text-slate-600">
                          {item}
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-700">{lens.answer || "-"}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
        <Download size={14} />
        Export this report card as image or PDF
      </div>
    </div>
  );
}

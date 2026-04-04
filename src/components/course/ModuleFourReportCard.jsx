import React, { useRef, useState } from "react";
import {
  Award,
  Download,
  FileImage,
  FileText,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";

const formatStamp = (value) => {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function ModuleFourReportCard({ report }) {
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
      link.download = `module4-report-${report.cardSerial || "innovation"}.png`;
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

      pdf.save(`module4-report-${report.cardSerial || "innovation"}.pdf`);
    } finally {
      setDownloading("");
    }
  };

  const renderSection = (section) => {
    const content = section.content || {};

    if (section.kind === "formula") {
      return (
        <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
          <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">Innovation Formula</p>
            <p className="mt-3 text-xl font-semibold text-ink">{content.innovationFormula || "-"}</p>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Innovation Name</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.innovationName || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Pain Point</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.painPoint || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Tool</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.toolLabel || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Pedagogy Move</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.pedagogyLabel || "-"}</p>
            </article>
          </div>
          <div className="mt-4 rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">Target Goal</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.targetGoal || "-"}</p>
          </div>
        </section>
      );
    }

    if (section.kind === "blueprint") {
      return (
        <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
          <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Hook</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.hookPhase || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Action</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.actionPhase || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Reflect</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.reflectPhase || "-"}</p>
            </article>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">Blueprint File Link</p>
            <p className="mt-3 break-all text-sm leading-7 text-slate-700">{content.blueprintLink || "-"}</p>
          </div>
        </section>
      );
    }

    if (section.kind === "craft") {
      return (
        <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
          <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Artifact Type</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.artifactType || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Artifact Title</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.artifactTitle || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Artifact Link</p>
              <p className="mt-3 break-all text-sm leading-7 text-slate-700">{content.assetLink || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Classroom Use</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.classroomUse || "-"}</p>
            </article>
          </div>
          <div className="mt-4 rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">Artifact Description</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.assetDescription || "-"}</p>
          </div>
        </section>
      );
    }

    return (
      <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
        <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">Test Group</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.testWith || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">Strongest Point</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.strengthAnswer || "-"}</p>
          </article>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">Version 2.0 Upgrade</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.upgradeAnswer || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">Optional Feedback Note</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.feedbackNote || "-"}</p>
          </article>
        </div>
      </section>
    );
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
          {downloading === "image" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileImage size={16} />
          )}
          Download PNG
        </button>
        <button
          type="button"
          onClick={exportPdf}
          disabled={Boolean(downloading)}
          className="brand-button-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading === "pdf" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileText size={16} />
          )}
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
              <h3 className="mt-4 font-display text-3xl font-bold text-ink">Module 4 Report Card</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Innovation formula, lean blueprint, crafted teaching asset, beta-test insight, and the readiness checkpoint are now captured in one exportable card.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Post-test</p>
                  <p className="mt-2 font-semibold text-ink">
                    {report.score ?? 0} / {report.totalQuestions ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-accent/10 bg-accent/5 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-accent/70">Unlocked</p>
              <p className="text-lg font-bold text-accent">{report.unlockedModule}</p>
            </div>
          </div>
          {(report.innovationName || report.innovationFormula) && (
            <div className="mt-6 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
              <div className="flex items-center gap-3 text-secondary">
                <Zap size={18} />
                <p className="text-sm font-semibold">Innovation Focus</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-ink">{report.innovationName || "-"}</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{report.innovationFormula || "-"}</p>
            </div>
          )}
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <div className="flex items-center gap-3 text-primary">
              <Sparkles size={18} />
              <p className="text-sm font-semibold">Module Outcome</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              This teacher has moved from idea selection to prototype-ready innovation and can now carry that evidence into the reflection module.
            </p>
          </div>
        </section>
        {report.sections.map(renderSection)}
      </div>

      <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
        <Download size={14} />
        Export this innovation report as image or PDF
      </div>
    </div>
  );
}

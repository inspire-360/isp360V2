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
  if (!value) return "รอสร้าง";
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
      const margin = 10;
      const imageData = canvas.toDataURL("image/png", 1);
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = margin;
      pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight, undefined, "FAST");
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imageHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight, undefined, "FAST");
        heightLeft -= pageHeight - margin * 2;
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
            <p className="text-sm font-semibold text-primary">สูตรนวัตกรรม</p>
            <p className="mt-3 text-xl font-semibold text-ink">{content.innovationFormula || "-"}</p>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ชื่อนวัตกรรม</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.innovationName || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">Pain Point ที่ต้องการแก้</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.painPoint || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">เครื่องมือ</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.toolLabel || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">วิธีจัดการเรียนรู้</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.pedagogyLabel || "-"}</p>
            </article>
          </div>
          <div className="mt-4 rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">เป้าหมายที่ตั้งไว้</p>
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
              <p className="text-sm font-semibold text-ink">ขั้นกระตุ้น (Hook)</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.hookPhase || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ขั้นลุยกิจกรรม (Action)</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.actionPhase || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ขั้นสรุปและสะท้อนคิด (Reflection)</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.reflectPhase || "-"}</p>
            </article>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">ลิงก์ไฟล์แผนการสอน</p>
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
              <p className="text-sm font-semibold text-ink">ประเภทชิ้นงาน</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.artifactType || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ชื่อชิ้นงาน</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.artifactTitle || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ลิงก์ชิ้นงาน</p>
              <p className="mt-3 break-all text-sm leading-7 text-slate-700">{content.assetLink || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ใช้ทำอะไรในคาบเรียน</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.classroomUse || "-"}</p>
            </article>
          </div>
          <div className="mt-4 rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">คำอธิบายชิ้นงาน</p>
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
            <p className="text-sm font-semibold text-ink">ทดลองกับใครบ้าง</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.testWith || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">จุดเด่นที่สุด</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.strengthAnswer || "-"}</p>
          </article>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">สิ่งที่อยากอัปเกรดเป็นเวอร์ชัน 2.0</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.upgradeAnswer || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">ข้อเสนอแนะเพิ่มเติม</p>
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
          ดาวน์โหลด PNG
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
          ดาวน์โหลด PDF
        </button>
      </div>

      <div ref={exportRef} className="mx-auto w-full max-w-[210mm] space-y-6 bg-white p-[10mm]">
        <section className="rounded-[32px] border border-primary/10 bg-white p-6 shadow-[0_20px_60px_rgba(13,17,100,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="brand-chip border-primary/10 bg-primary/5 text-primary">
                <Award size={14} />
                {report.badge}
              </span>
              <h3 className="mt-4 font-display text-3xl font-bold text-ink">รายงานสรุป Module 4</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                สรุปสูตรนวัตกรรม พิมพ์เขียวแผนการสอน ชิ้นงานที่สร้างจริง และผลทดลองใช้จาก Module 4 ไว้ในรายงานเดียว
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ผู้เข้าอบรม</p>
                  <p className="mt-2 font-semibold text-ink">{report.traineeName || "-"}</p>
                  {report.traineeEmail ? <p className="mt-1 text-slate-500">{report.traineeEmail}</p> : null}
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">หมายเลข Serial Card</p>
                  <p className="mt-2 font-semibold text-ink">{report.cardSerial || "-"}</p>
                  <p className="mt-1 text-slate-500">สร้างเมื่อ {formatStamp(report.generatedAt)}</p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">คะแนน Post-test</p>
                  <p className="mt-2 font-semibold text-ink">
                    {report.score ?? 0} / {report.totalQuestions ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-accent/10 bg-accent/5 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-accent/70">ปลดล็อกแล้ว</p>
              <p className="text-lg font-bold text-accent">{report.unlockedModule}</p>
            </div>
          </div>
          {(report.innovationName || report.innovationFormula) && (
            <div className="mt-6 rounded-[26px] border border-secondary/10 bg-secondary/5 p-5">
              <div className="flex items-center gap-3 text-secondary">
                <Zap size={18} />
                <p className="text-sm font-semibold">นวัตกรรมที่ออกแบบ</p>
              </div>
              <p className="mt-3 text-lg font-semibold text-ink">{report.innovationName || "-"}</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">{report.innovationFormula || "-"}</p>
            </div>
          )}
          <div className="mt-5 rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <div className="flex items-center gap-3 text-primary">
              <Sparkles size={18} />
                <p className="text-sm font-semibold">ผลลัพธ์ของโมดูล</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              คุณครูได้พัฒนาไอเดียไปสู่ต้นแบบที่พร้อมใช้งานจริง และสามารถนำหลักฐานเหล่านี้ไปสะท้อนผลต่อใน Module 5 ได้แล้ว
            </p>
          </div>
        </section>
        {report.sections.map(renderSection)}
      </div>

      <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
        <Download size={14} />
        ดาวน์โหลดรายงานนี้เป็นไฟล์ภาพหรือ PDF
      </div>
    </div>
  );
}

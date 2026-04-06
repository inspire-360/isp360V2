import React, { useRef, useState } from "react";
import {
  Award,
  FileImage,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

const formatStamp = (value) => {
  if (!value) return "รอสร้าง";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default function ModuleFiveReportCard({ report }) {
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
      link.download = `module5-report-${report.cardSerial || "reflection"}.png`;
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

      pdf.save(`module5-report-${report.cardSerial || "reflection"}.pdf`);
    } finally {
      setDownloading("");
    }
  };

  const renderSection = (section) => {
    const content = section.content || {};

    if (section.kind === "implementation") {
      return (
        <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
          <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">แผนการสอน / นวัตกรรม</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.lessonPlanTitle || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">วันที่นำไปใช้จริง</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.implementedDate || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ระยะเวลา</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {content.durationMinutes ? `${content.durationMinutes} นาที` : "-"}
              </p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ลิงก์คลิป</p>
              <p className="mt-3 break-all text-sm leading-7 text-slate-700">{content.clipLink || "-"}</p>
            </article>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-primary">บริบทห้องเรียน</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.classroomContext || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
              <p className="text-sm font-semibold text-secondary">เป้าหมายการเรียนรู้</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.learningFocus || "-"}</p>
            </article>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">บันทึกหลักฐานสำคัญ</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.evidenceNote || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">คำถามที่อยากให้ DU ช่วยดู</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.duQuestion || "-"}</p>
            </article>
          </div>
        </section>
      );
    }

    if (section.kind === "reflection") {
      return (
        <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
          <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">สิ่งที่เกิดขึ้นจริง</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.whatHappened || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-primary">โมเมนต์ที่ภูมิใจ</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.proudMoment || "-"}</p>
            </article>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">การตอบสนองของผู้เรียน</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.studentResponse || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
              <p className="text-sm font-semibold text-secondary">จุดท้าทาย</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.challengePoint || "-"}</p>
            </article>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">หลักฐานที่เก็บได้</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.evidenceCollected || "-"}</p>
            </article>
            <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-sm font-semibold text-ink">ข้อคิดของครู</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{content.mentorReflection || "-"}</p>
            </article>
          </div>
        </section>
      );
    }

    return (
      <section key={section.title} className="rounded-[30px] border border-slate-100 bg-white p-6">
        <h4 className="font-display text-2xl font-bold text-ink">{section.title}</h4>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[24px] border border-primary/10 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">แผนต่อยอดเวอร์ชัน 2.0</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.versionNext || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">กรอบเวลา</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.nextTimeline || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">สิ่งที่จะปรับ</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.improvementFocus || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">ตัวชี้วัดความสำเร็จ</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.successIndicator || "-"}</p>
          </article>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="rounded-[24px] border border-secondary/10 bg-secondary/5 p-5">
            <p className="text-sm font-semibold text-secondary">แรงสนับสนุนที่ต้องการ</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.supportNeeded || "-"}</p>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-ink">แผนขยายผล</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{content.scalePlan || "-"}</p>
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
              <h3 className="mt-4 font-display text-3xl font-bold text-ink">รายงานสรุป Module 5</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                สรุปการสอนจริง บันทึกหลังสอน และแนวทางพัฒนาต่อยอดจาก Module 5 ในเอกสารเดียว
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
                    {report.score} / {report.totalQuestions}
                  </p>
                  <p className="mt-1 text-slate-500">ปลดล็อก {report.unlockedModule}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-secondary/10 bg-secondary/5 p-5 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-semibold text-secondary">
                <Sparkles size={16} />
                สถานะการสะท้อนผล
              </p>
              <p className="mt-3 max-w-sm leading-7">
                หลักฐานการสอนจริงถูกบันทึกครบแล้ว และพร้อมไปต่อยัง post-test ปลายคอร์ส แบบประเมินความพึงพอใจ และขั้นรับ Certificate
              </p>
            </div>
          </div>
        </section>

        {report.sections.map(renderSection)}
      </div>
    </div>
  );
}

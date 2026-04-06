import React, { useRef, useState } from "react";
import {
  Award,
  Download,
  FileImage,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const formatStamp = (value) => {
  if (!value) return "รอออกใบประกาศ";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(value));
};

export default function CourseCertificateCard({ certificate }) {
  const exportRef = useRef(null);
  const [downloading, setDownloading] = useState("");

  if (!certificate) return null;

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
      link.download = `certificate-${certificate.serialNumber || "inspire360"}.png`;
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
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const imageData = canvas.toDataURL("image/png", 1);
      const ratio = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
      const imageWidth = canvas.width * ratio;
      const imageHeight = canvas.height * ratio;
      const offsetX = (pageWidth - imageWidth) / 2;
      const offsetY = (pageHeight - imageHeight) / 2;
      pdf.addImage(imageData, "PNG", offsetX, offsetY, imageWidth, imageHeight, undefined, "FAST");
      pdf.save(`certificate-${certificate.serialNumber || "inspire360"}.pdf`);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="space-y-6">
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

      <div
        ref={exportRef}
        className="mx-auto w-full max-w-[297mm] overflow-hidden rounded-[36px] border border-primary/15 bg-[radial-gradient(circle_at_top_left,_rgba(247,141,96,0.32),_transparent_36%),linear-gradient(135deg,#0D1164_0%,#640D5F_45%,#EA2264_78%,#F78D60_100%)] p-8 text-white shadow-[0_30px_120px_rgba(13,17,100,0.26)] md:p-12"
      >
        <div className="rounded-[30px] border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/65">InSPIRE360</p>
              <h3 className="mt-4 font-display text-4xl font-bold md:text-5xl">
                {certificate.title}
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/80 md:text-base">
                ขอรับรองว่า
              </p>
              <p className="mt-3 font-display text-4xl font-bold md:text-6xl">
                {certificate.traineeName}
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/80 md:text-base">
                {certificate.statement}
              </p>
              <p className="mt-4 text-lg font-semibold text-white/92">{certificate.courseTitle}</p>
            </div>

            <div className="grid gap-3 text-sm md:min-w-[260px]">
              <div className="rounded-[24px] border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">วันที่ออก</p>
                <p className="mt-2 font-semibold text-white">{formatStamp(certificate.issuedAt)}</p>
              </div>
              <div className="rounded-[24px] border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">เลขที่ใบประกาศ</p>
                <p className="mt-2 font-semibold text-white">{certificate.serialNumber}</p>
              </div>
              <div className="rounded-[24px] border border-white/15 bg-white/10 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">อีเมล</p>
                <p className="mt-2 font-semibold text-white">{certificate.traineeEmail || "-"}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-white/88">
                <Sparkles size={16} />
                หมุดหมายความสำเร็จ
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {certificate.badges?.length ? (
                  certificate.badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/88"
                    >
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/88">
                    ผู้จบ InSPIRE360
                  </span>
                )}
              </div>
              {certificate.moduleTitles?.length ? (
                <div className="mt-5 space-y-2 text-sm leading-7 text-white/80">
                  {certificate.moduleTitles.map((title) => (
                    <p key={title}>{title}</p>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-white/88">
                <ShieldCheck size={16} />
                หมายเหตุการตรวจสอบ
              </p>
              <p className="mt-4 text-sm leading-7 text-white/80">
                ใบประกาศฉบับนี้ถูกสร้างจากข้อมูลการเรียนรู้จริง แบบประเมินความพึงพอใจ และผลการประเมินปลายคอร์สภายในระบบ InSPIRE360
              </p>
              <div className="mt-6 flex items-center gap-3 text-sm text-white/88">
                <Award size={18} />
                พร้อมดาวน์โหลดได้ทั้งไฟล์ PNG และ PDF
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm text-white/88">
                <Download size={18} />
                โปรดเก็บหมายเลข Serial ไว้สำหรับการตรวจสอบและใช้อ้างอิงผลงาน
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

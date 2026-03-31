import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function Construction({ message }) {
  const navigate = useNavigate();

  return (
    <div className="page-wrap flex min-h-[70vh] items-center justify-center px-4">
      <section className="dark-panel max-w-2xl p-8 text-center sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-300/10 text-amber-200">
          <AlertCircle size={36} />
        </div>
        <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-amber-200">
          เร็วๆ นี้
        </p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
          พื้นที่นี้กำลังเตรียมความพร้อม
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-300">
          {message || "เรากำลังจัดเตรียมเส้นทางการเรียนรู้นี้ให้พร้อมใช้งาน"}
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="secondary-button mt-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          ย้อนกลับ
        </button>
      </section>
    </div>
  );
}

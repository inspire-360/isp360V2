import React, { memo, useDeferredValue, useMemo, useState } from "react";
import { BarChart3, Loader2, Search, TimerReset } from "lucide-react";
import { useLearningDashboard } from "../hooks/useLearningDashboard";

const statusFilters = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "not_started", label: "ยังไม่เริ่ม" },
  { value: "active", label: "กำลังเรียน" },
  { value: "completed", label: "เรียนจบแล้ว" },
];

const LearningProgressRow = memo(function LearningProgressRow({ row }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-ink">{row.name}</p>
        <p className="mt-1 text-xs tracking-[0.08em] text-slate-400">{row.roleLabel}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-medium text-ink">{row.courseTitle}</p>
        <p className="mt-1 text-sm text-slate-500">
          {row.activeLessonTitle || "ยังไม่มีบทเรียนที่กำลังเปิด"}
        </p>
      </td>
      <td className="px-4 py-4 align-top">
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${row.status.tone}`}>
          {row.status.label}
        </span>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-ink">{row.scoreText}</p>
        <p className="mt-1 text-sm text-slate-500">
          {row.completedLessonsCount}/{row.lessonCount || 0} บทเรียน
        </p>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-accent"
            style={{ width: `${row.progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-slate-600">{row.progressPercent}%</p>
      </td>
      <td className="px-4 py-4 align-top text-sm text-slate-500">{row.updatedAtLabel}</td>
    </tr>
  );
});

export default function LearningProgressDashboard() {
  const { rows, summary, loading, listenerError, listenerInfo } = useLearningDashboard();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const deferredSearch = useDeferredValue(search);

  const filteredRows = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status.value !== statusFilter) return false;
      if (!keyword) return true;
      return row.searchText.includes(keyword);
    });
  }, [deferredSearch, rows, statusFilter]);

  return (
    <section className="brand-panel p-6 md:p-8" aria-labelledby="learning-progress-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="brand-chip border-primary/10 bg-primary/5 text-primary">
            <BarChart3 size={14} />
            แดชบอร์ดความคืบหน้าการเรียน
          </p>
          <h2 id="learning-progress-heading" className="mt-3 font-display text-2xl font-bold text-ink">
            ติดตามผู้เรียนแบบเรียลไทม์
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            ตัวฟังข้อมูลจะประมวลผลเฉพาะแถวของผู้ใช้ที่เปลี่ยนจริง เพื่อลดภาระการเรนเดอร์เมื่อมีการอัปเดตพร้อมกันหลายคน
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs tracking-[0.08em] text-slate-400">ผู้เรียนทั้งหมด</p>
            <p className="mt-2 text-2xl font-bold text-ink">{summary.total}</p>
          </div>
          <div className="rounded-3xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-xs tracking-[0.08em] text-sky-700">กำลังเรียน</p>
            <p className="mt-2 text-2xl font-bold text-sky-700">{summary.active}</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs tracking-[0.08em] text-emerald-700">เรียนจบแล้ว</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.completed}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อผู้เรียน หลักสูตร หรือบทเรียน"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary/30 focus:ring-4 focus:ring-primary/10"
        >
          {statusFilters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs leading-6 text-slate-500">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          กำลังฟังคอลเลกชัน {listenerInfo.usersCollection}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
          กำลังฟังกลุ่มย่อย {listenerInfo.enrollmentsCollectionGroup}
        </span>
      </div>

      {listenerError ? (
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {listenerError}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-[26px] border border-slate-100 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50 text-left">
              <tr className="text-xs tracking-[0.08em] text-slate-500">
                <th scope="col" className="px-4 py-3 font-semibold">ผู้เรียน</th>
                <th scope="col" className="px-4 py-3 font-semibold">หลักสูตรที่ติดตาม</th>
                <th scope="col" className="px-4 py-3 font-semibold">สถานะ</th>
                <th scope="col" className="px-4 py-3 font-semibold">คะแนนและบทเรียน</th>
                <th scope="col" className="px-4 py-3 font-semibold">ความคืบหน้า</th>
                <th scope="col" className="px-4 py-3 font-semibold">บันทึกล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <div className="flex items-center justify-center gap-3 text-slate-500">
                      <Loader2 size={20} className="animate-spin text-primary" />
                      <span>กำลังซิงก์ข้อมูลการเรียน</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-500">
                      <TimerReset size={24} className="text-slate-300" />
                      <p>ยังไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => <LearningProgressRow key={row.userId} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

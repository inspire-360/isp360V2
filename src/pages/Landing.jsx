import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Globe,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useLine } from "../contexts/LineContext";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const { lineProfile } = useLine();
  const navigate = useNavigate();

  useEffect(() => {
    if (lineProfile) {
      navigate("/login");
    }
  }, [lineProfile, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="brand-shell overflow-x-hidden bg-transparent">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/[0.78] py-4 shadow-[0_18px_45px_rgba(13,17,100,0.08)] backdrop-blur-xl" : "py-6"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-ink">InSPIRE 360°</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mission-led learning</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="brand-button-secondary hidden sm:inline-flex">
              เข้าสู่ระบบ
            </Link>
            <Link to="/register" className="brand-button-primary">
              เริ่มใช้งาน
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen overflow-hidden pt-28">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(13,17,100,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(13,17,100,0.04)_1px,transparent_1px)] bg-[size:38px_38px]" />
          <div className="absolute left-[-10%] top-[-8%] h-[420px] w-[420px] rounded-full bg-secondary/25 blur-[120px]" />
          <div className="absolute right-[-8%] top-[14%] h-[340px] w-[340px] rounded-full bg-accent/[0.22] blur-[120px]" />
          <div className="absolute bottom-[-12%] left-[35%] h-[360px] w-[360px] rounded-full bg-warm/[0.24] blur-[120px]" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.85fr)] lg:px-8">
          <div className="max-w-3xl">
            <span className="brand-chip border-primary/10 bg-white/[0.08]0 text-primary shadow-[0_10px_35px_rgba(13,17,100,0.08)]">
              <ShieldCheck size={14} />
              Education growth platform
            </span>
            <h1 className="mt-6 font-display text-[3.3rem] font-bold leading-[0.94] text-ink md:text-[5.4rem]">
              ภารกิจเรียนรู้ที่พาครูและผู้เรียน
              <span className="brand-gradient-text"> ขยับจริง</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              InSPIRE 360° รวม track การเรียนรู้ ภารกิจแบบ gamification และระบบ SOS to DU
              ให้การพัฒนาไม่ใช่แค่ดูคอร์ส แต่เป็นการเดินเกมที่มีคน support ต่อเนื่อง
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link to="/register" className="brand-button-primary">
                เริ่มต้นเส้นทางของฉัน
                <ArrowRight size={18} />
              </Link>
              <a href="#tracks" className="brand-button-secondary">
                <PlayCircle size={18} />
                สำรวจ track
              </a>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4">
              <div className="rounded-[26px] border border-white/70 bg-white/[0.82] p-4 shadow-[0_16px_45px_rgba(13,17,100,0.06)]">
                <p className="text-3xl font-bold text-ink">5+</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Teacher missions</p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/[0.82] p-4 shadow-[0_16px_45px_rgba(13,17,100,0.06)]">
                <p className="text-3xl font-bold text-ink">DU</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Follow-up flow</p>
              </div>
              <div className="rounded-[26px] border border-white/70 bg-white/[0.82] p-4 shadow-[0_16px_45px_rgba(13,17,100,0.06)]">
                <p className="text-3xl font-bold text-ink">360°</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">Support view</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="brand-panel-strong overflow-hidden p-6 md:p-8">
              <div className="flex items-center justify-between">
                <p className="brand-chip border-white/[0.18] bg-white/[0.10] text-white/[0.80]">Live surface</p>
                <p className="text-sm text-white/[0.60]">2026 edition</p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[28px] border border-white/[0.12] bg-white/[0.10] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-white/[0.50]">Teacher track</p>
                      <p className="mt-2 text-2xl font-bold">Mission-ready dashboard</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.10]">
                      <BookOpen size={20} />
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/[0.10]">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-warm via-accent to-white" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[26px] border border-white/[0.12] bg-white/[0.10] p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.10]">
                      <MessageCircle size={18} />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold">SOS to DU</h2>
                    <p className="mt-2 text-sm leading-6 text-white/[0.72]">
                      ส่งเรื่องและติดตาม timeline ในเคสเดิมได้
                    </p>
                  </div>
                  <div className="rounded-[26px] border border-white/[0.12] bg-white/[0.10] p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.10]">
                      <Zap size={18} />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold">DU Console</h2>
                    <p className="mt-2 text-sm leading-6 text-white/[0.72]">
                      ดู pulse ของระบบและคิวงานที่ตอบกลับได้เร็ว
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tracks" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="brand-chip border-secondary/10 bg-secondary/5 text-secondary">Tracks</p>
            <h2 className="mt-4 font-display text-3xl font-bold text-ink md:text-4xl">
              แต่ละพื้นที่มีหน้าที่ชัดและใช้ visual language เดียวกัน
            </h2>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <article className="brand-panel p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen size={20} />
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-ink">Teacher Missions</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                เปลี่ยนแต่ละ module ให้เป็น quest พร้อม reward, XP, และภารกิจที่เชื่อมกับงานจริง
              </p>
            </article>

            <article className="brand-panel p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <MessageCircle size={20} />
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-ink">SOS Follow-up</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                ส่งเรื่องเร่งด่วน ติดตามสถานะเดิม และเพิ่มข้อมูลต่อโดยไม่ต้องเริ่มต้นใหม่ทุกครั้ง
              </p>
            </article>

            <article className="brand-panel p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warm/15 text-[#a24619]">
                <Globe size={20} />
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold text-ink">DU Operations</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                ดูภาพรวมคอร์สและ queue งานในหนึ่ง console ที่ใช้ข้อมูลจริงจากระบบ
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="brand-panel-strong flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
            <div className="max-w-2xl">
              <p className="brand-chip border-white/[0.18] bg-white/[0.10] text-white/[0.80]">Start now</p>
              <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
                เปิดระบบให้ครู ผู้เรียน และ DU ใช้ workflow เดียวกัน
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/[0.72]">
                สมัครใช้งานแล้วเริ่มต้นใน dashboard ที่ออกแบบใหม่ หรือเข้าสู่ระบบเพื่อดู track ที่กำลัง active อยู่
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="brand-button-primary">
                สร้างบัญชี
              </Link>
              <Link to="/login" className="brand-button-secondary border-white/[0.18] bg-white/[0.10] text-white hover:text-white">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


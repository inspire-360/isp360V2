import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import BrandMark from "../components/BrandMark";
import {
  courseCatalog,
  landingWorkflow,
  platformSignals,
} from "../data/courseCatalog";
import { getIcon } from "../utils/iconHelper";
import { useLine } from "../contexts/LineContext";

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const MotionDiv = motion.div;
const MotionArticle = motion.article;

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const { lineProfile } = useLine();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 90]);
  const orbitY = useTransform(scrollY, [0, 500], [0, -70]);

  useEffect(() => {
    if (lineProfile) {
      navigate("/login");
    }
  }, [lineProfile, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="overflow-x-hidden bg-[#07111d] text-white">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-[#07111d]/82 backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="page-wrap flex items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark invert href="/" />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 sm:inline-flex"
            >
              เข้าสู่ระบบ
            </Link>
            <Link to="/register" className="primary-button">
              สมัครใช้งาน
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen overflow-hidden border-b border-white/10 pt-24">
        <MotionDiv
          style={{ y: heroY }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.38),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(216,163,95,0.18),transparent_24%),linear-gradient(180deg,#07111d_0%,#081426_55%,#0a1628_100%)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:52px_52px] opacity-35" />

        <div className="relative grid min-h-[calc(100vh-6rem)] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
          <MotionDiv
            initial="hidden"
            animate="show"
            variants={reveal}
            className="mx-auto w-full max-w-xl lg:mx-0"
          >
            <div className="glass-chip">พื้นที่เรียนรู้ภาษาไทยแบบครบระบบ</div>
            <h1 className="mt-6 font-display text-5xl font-semibold tracking-[-0.09em] text-white sm:text-6xl lg:text-7xl">
              InSPIRE 360 รวมการเรียนรู้ การดูแล และการติดตามไว้ในระบบเดียว
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-slate-300 sm:text-lg">
              จากเส้นทางพัฒนาครู ไปจนถึงพื้นที่ผู้เรียน หน้า SOS to DU และระบบแอดมิน ทุกอย่างเชื่อมกันอย่างชัดเจนในประสบการณ์เดียว
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="primary-button">
                เริ่มต้นใช้งาน
                <ArrowRight size={16} />
              </Link>
              <a
                href="#pathways"
                className="secondary-button border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                สำรวจเส้นทาง
                <PlayCircle size={16} />
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {platformSignals.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="font-display text-3xl font-semibold tracking-[-0.06em] text-white">
                    {item.value}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">{item.label}</div>
                </div>
              ))}
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            className="relative mx-auto w-full max-w-3xl"
          >
            <MotionDiv
              style={{ y: orbitY }}
              className="absolute -right-10 top-6 h-56 w-56 rounded-full border border-amber-300/20 bg-amber-300/10 blur-3xl"
            />
            <div className="dark-panel relative overflow-hidden p-6 sm:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,163,95,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.2),transparent_26%)]" />
              <div className="relative">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
                      ภาพรวมวันนี้
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-white">
                      ทางเข้าหนึ่งเดียว หลายบทบาท หลายภารกิจ
                    </h2>
                  </div>
                  <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 sm:block">
                    พร้อมใช้งานบนมือถือ
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {courseCatalog.map((course) => (
                    <MotionDiv
                      key={course.id}
                      whileHover={{ x: 6 }}
                      className="group rounded-[28px] border border-white/10 bg-white/5 p-5 transition"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${course.theme.iconWrap}`}
                        >
                          {getIcon(course.iconName, "h-6 w-6")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                              {course.shortTitle}
                            </p>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${course.theme.chip}`}
                            >
                              {course.accessLabel}
                            </span>
                          </div>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                            {course.description}
                          </p>
                        </div>
                        <div className="text-sm text-slate-400">
                          {course.modules} โมดูล
                        </div>
                      </div>
                    </MotionDiv>
                  ))}
                </div>
              </div>
            </div>
          </MotionDiv>
        </div>
      </section>

      <section
        id="pathways"
        className="border-b border-white/10 bg-[#091426] px-4 py-20 sm:px-6 lg:px-10"
      >
        <MotionDiv
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={reveal}
          className="page-wrap"
        >
          <div className="max-w-2xl">
            <p className="section-tag border-amber-300/20 bg-amber-300/10 text-amber-200">
              เส้นทางการเรียนรู้
            </p>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
              แต่ละพื้นที่มีหน้าที่ชัด: เรียนรู้ ดูแล หรือประสานช่วยเหลือ
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              เส้นทางหลักของครู พื้นที่ของผู้เรียน และส่วนขยายในอนาคต ถูกจัดให้แยกบทบาทชัดเจนแต่ยังเชื่อมกันเป็นระบบเดียว
            </p>
          </div>

          <div className="mt-12 space-y-5">
            {courseCatalog.map((course, index) => (
              <MotionArticle
                key={course.id}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, delay: index * 0.08 }}
                className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/55"
              >
                <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
                  <div
                    className={`relative border-b border-white/10 bg-gradient-to-br ${course.theme.glow} p-8 lg:border-b-0 lg:border-r`}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40" />
                    <div className="relative flex h-full flex-col justify-between gap-12">
                      <div>
                        <p
                          className={`text-[11px] uppercase tracking-[0.28em] ${course.theme.text}`}
                        >
                          {course.eyebrow}
                        </p>
                        <h3 className="mt-4 font-display text-4xl font-semibold tracking-[-0.07em] text-white">
                          {course.title}
                        </h3>
                        <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
                          {course.audience}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                        <span className="rounded-full border border-white/10 px-4 py-2">
                          {course.modules} โมดูล
                        </span>
                        <span className="rounded-full border border-white/10 px-4 py-2">
                          {course.hours} ชั่วโมงเรียนรู้
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    <p className="max-w-2xl text-base leading-7 text-slate-300">
                      {course.description}
                    </p>
                    <div className="mt-8 grid gap-3">
                      {course.outcomes.map((item) => (
                        <div
                          key={item}
                          className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-200"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </MotionArticle>
            ))}
          </div>
        </MotionDiv>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-10">
        <div className="page-wrap grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <MotionDiv
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={reveal}
            className="max-w-xl"
          >
            <p className="section-tag border-amber-300/20 bg-amber-300/10 text-amber-200">
              วิธีทำงานของระบบ
            </p>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-[-0.08em] text-white">
              เริ่มง่าย ใช้งานจริง และมองภาพรวมได้ทันที
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              โครงสร้างหน้าและข้อความถูกย้ายเป็นภาษาไทย พร้อมจัดลำดับการใช้งานให้ลดความสับสนระหว่างเรียน ทำงาน และขอความช่วยเหลือ
            </p>
          </MotionDiv>

          <div className="grid gap-4">
            {landingWorkflow.map((item, index) => (
              <MotionDiv
                key={item.title}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
                  0{index + 1}
                </div>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {item.description}
                </p>
              </MotionDiv>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0b172b] px-4 py-16 sm:px-6 lg:px-10">
        <div className="page-wrap flex flex-col items-start justify-between gap-6 rounded-[32px] border border-white/10 bg-white/5 p-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="section-tag border-amber-300/20 bg-amber-300/10 text-amber-200">
              พร้อมเริ่มหรือยัง
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.07em] text-white">
              พาครูและผู้เรียนเข้าสู่พื้นที่ดิจิทัลที่ชัดขึ้น ใช้ง่ายขึ้น และต่อยอดได้จริง
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              เข้าสู่ระบบเพื่อใช้งานต่อ หรือสร้างบัญชีใหม่แล้วเริ่มจากแดชบอร์ดภาษาไทยเวอร์ชันล่าสุดได้ทันที
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="secondary-button border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              เข้าสู่ระบบ
            </Link>
            <Link to="/register" className="primary-button">
              สร้างบัญชี
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import React from "react";
import BrandMark from "./BrandMark";

export default function AuthShell({
  eyebrow,
  title,
  description,
  asideTitle,
  asideCopy,
  highlights = [],
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(216,163,95,0.2),transparent_26%),linear-gradient(180deg,#07111d_0%,#0b1628_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:52px_52px] opacity-40" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-10 px-4 py-6 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <section className="flex flex-col justify-between gap-10 rounded-[36px] border border-white/10 bg-white/5 px-6 py-6 backdrop-blur md:px-8 md:py-8">
          <div className="space-y-8">
            <BrandMark invert href="/" />
            <div className="max-w-xl space-y-5">
              <p className="glass-chip">{eyebrow}</p>
              <div className="space-y-4">
                <h1 className="font-display text-4xl font-semibold tracking-[-0.08em] text-white sm:text-5xl">
                  {asideTitle}
                </h1>
                <p className="max-w-lg text-base leading-7 text-slate-300">
                  {asideCopy}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/10 bg-white/5 p-4"
              >
                <div className="text-sm font-semibold text-amber-200">
                  {item.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center py-4 lg:py-0">
          <div className="surface-panel w-full max-w-xl p-6 text-slate-900 sm:p-8">
            <div className="mb-8 space-y-3">
              <p className="section-tag">{eyebrow}</p>
              <div className="space-y-2">
                <h2 className="font-display text-3xl font-semibold tracking-[-0.06em] text-slate-950">
                  {title}
                </h2>
                <p className="text-sm leading-6 text-slate-500">{description}</p>
              </div>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

function BrandInner({ invert = false, compact = false }) {
  const shellClassName = invert ? "text-white" : "text-slate-950";
  const badgeClassName = invert
    ? "border-white/15 bg-white/10 text-amber-200"
    : "border-amber-300/60 bg-amber-100 text-amber-700";
  const metaClassName = invert ? "text-slate-300" : "text-slate-500";

  return (
    <div className={`inline-flex items-center gap-3 ${shellClassName}`}>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${badgeClassName}`}
      >
        <Sparkles size={18} />
      </div>
      <div className="leading-none">
        <div className="font-display text-[1.25rem] font-semibold tracking-[-0.06em]">
          InSPIRE 360
        </div>
        {!compact && (
          <div className={`mt-1 text-xs font-medium ${metaClassName}`}>
            Learning platform for purposeful digital classrooms
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrandMark({
  href = "/",
  invert = false,
  compact = false,
  className = "",
}) {
  const content = <BrandInner invert={invert} compact={compact} />;

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  );
}

"use client";

import { gradeForPercent } from "@/lib/grade";

export function GradeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const { letter, color } = gradeForPercent(pct);

  return (
    <span
      className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold shrink-0"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {letter}
    </span>
  );
}

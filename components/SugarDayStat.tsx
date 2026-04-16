"use client";

import { cn } from "@/lib/utils";

/** Total sugar logged for a day — informational only (not a goal). Single compact row. */
export function SugarDayStat({
  grams,
  dayLabel,
  className,
}: {
  grams: number;
  dayLabel: string;
  className?: string;
}) {
  const g = Math.round(grams * 10) / 10;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-[#2a2a2a] px-3 py-2",
        className
      )}
      style={{ background: "#141414" }}
    >
      <span className="text-[9px] uppercase tracking-[0.12em] text-[#6a6a6a] shrink-0">
        Sugar · {dayLabel}
      </span>
      <span
        className="text-lg font-black tabular-nums leading-none shrink-0"
        style={{ fontFamily: "var(--font-display)", color: "#fb7185" }}
      >
        {g}
        <span className="text-xs font-semibold text-[#9a9a9a] ml-0.5">g</span>
      </span>
    </div>
  );
}

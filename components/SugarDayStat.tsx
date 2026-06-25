"use client";

import { cn } from "@/lib/utils";

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
        "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5",
        className
      )}
      style={{
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span className="text-xs font-medium text-[#6a6a6a]">Sugar · {dayLabel}</span>
      <div className="flex items-baseline gap-0.5">
        <span
          className="text-base font-bold tabular-nums leading-none"
          style={{ color: "#fb7185", letterSpacing: "-0.02em" }}
        >
          {g}
        </span>
        <span className="text-[10px] text-[#6a6a6a] ml-0.5">g</span>
      </div>
    </div>
  );
}

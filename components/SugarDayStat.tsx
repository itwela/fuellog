"use client";

import { cn } from "@/lib/utils";

const SUGAR_COLOR = "#fb7185";

export function SugarDayStat({
  grams,
  dayLabel,
  className,
  goalMet,
}: {
  grams: number;
  dayLabel: string;
  className?: string;
  goalMet?: boolean;
}) {
  const g = Math.round(grams * 10) / 10;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5",
        goalMet ? "animate-gradient-border" : "",
        className
      )}
      style={
        goalMet
          ? {
              background: `linear-gradient(#1a1a1a, #1a1a1a) padding-box, conic-gradient(from var(--border-angle), rgba(255,255,255,0.04) 70%, ${SUGAR_COLOR} 80%, ${SUGAR_COLOR}99 85%, ${SUGAR_COLOR} 90%, rgba(255,255,255,0.04)) border-box`,
              border: "1px solid transparent",
            }
          : {
              background: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.05)",
            }
      }
    >
      <span className="text-xs font-medium text-[#6a6a6a]">Sugar · {dayLabel}</span>
      <div className="flex items-baseline gap-0.5">
        <span
          className="text-base font-bold tabular-nums leading-none"
          style={{ color: SUGAR_COLOR, letterSpacing: "-0.02em" }}
        >
          {g}
        </span>
        <span className="text-[10px] text-[#6a6a6a] ml-0.5">g</span>
      </div>
    </div>
  );
}

"use client";

import { WeekBarChart } from "./WeekBarChart";

export function WeeklySetsChart({
  days,
  sets,
  accent,
}: {
  days: Date[];
  sets: number[];
  accent: string;
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#6a6a6a]">Sets completed this week</p>
      </div>
      <WeekBarChart days={days} values={sets} goal={0} color={accent} />
    </div>
  );
}

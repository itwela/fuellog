"use client";

import { WeekBarChart } from "./WeekBarChart";
import { GradeBadge } from "./GradeBadge";
import { HYDRATION_GOAL_OZ } from "@/lib/constants";

const ACCENT = "#38bdf8";
const GOAL_MET_GOLD = "#ffd60a";

export function WeeklyHydrationChart({
  days,
  ounces,
  avgOunces,
}: {
  days: Date[];
  ounces: number[];
  avgOunces: number;
}) {
  const pct = (avgOunces / HYDRATION_GOAL_OZ) * 100;

  return (
    <div className="rounded-2xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#6a6a6a]">Hydration vs. goal</p>
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-medium text-[#6a6a6a]">Goal {HYDRATION_GOAL_OZ} oz</p>
          <GradeBadge pct={pct} />
        </div>
      </div>
      <WeekBarChart days={days} values={ounces} goal={HYDRATION_GOAL_OZ} color={ACCENT} overColor={GOAL_MET_GOLD} />
    </div>
  );
}

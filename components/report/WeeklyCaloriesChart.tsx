"use client";

import { WeekBarChart } from "./WeekBarChart";
import { GradeBadge } from "./GradeBadge";

const ACCENT = "#b6ff4a";
const GOAL_MET_GOLD = "#ffd60a";

export function WeeklyCaloriesChart({
  days,
  calories,
  goal,
  avgCalories,
}: {
  days: Date[];
  calories: number[];
  goal: number;
  avgCalories: number;
}) {
  const pct = goal > 0 ? (avgCalories / goal) * 100 : null;

  return (
    <div className="rounded-2xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-[#6a6a6a]">Calories vs. goal</p>
        <div className="flex items-center gap-2">
          {goal > 0 && <p className="text-[11px] font-medium text-[#6a6a6a]">Goal {goal} kcal</p>}
          <GradeBadge pct={pct} />
        </div>
      </div>
      <WeekBarChart days={days} values={calories} goal={goal} color={ACCENT} overColor={GOAL_MET_GOLD} />
    </div>
  );
}

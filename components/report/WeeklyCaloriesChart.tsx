"use client";

import { useState } from "react";
import { WeekBarChart } from "./WeekBarChart";
import { GradeBadge } from "./GradeBadge";

const ACCENT = "#b6ff4a";
const GOAL_MET_GOLD = "#ffd60a";

type Metric = "calories" | "protein";

export function WeeklyCaloriesChart({
  days,
  calories,
  calorieGoal,
  avgCalories,
  protein,
  proteinGoal,
  avgProtein,
}: {
  days: Date[];
  calories: number[];
  calorieGoal: number;
  avgCalories: number;
  protein: number[];
  proteinGoal: number;
  avgProtein: number;
}) {
  const [metric, setMetric] = useState<Metric>("calories");
  const isCalories = metric === "calories";

  const values = isCalories ? calories : protein;
  const goal = isCalories ? calorieGoal : proteinGoal;
  const avg = isCalories ? avgCalories : avgProtein;
  const pct = goal > 0 ? (avg / goal) * 100 : null;

  return (
    <div className="rounded-2xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center p-0.5 rounded-full" style={{ background: "#252525" }}>
          {(["calories", "protein"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-colors"
              style={{
                background: metric === m ? ACCENT : "transparent",
                color: metric === m ? "#0e0e0e" : "#6a6a6a",
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {goal > 0 && (
            <p className="text-[11px] font-medium text-[#6a6a6a]">
              Goal {goal} {isCalories ? "kcal" : "g"}
            </p>
          )}
          <GradeBadge pct={pct} />
        </div>
      </div>
      <WeekBarChart days={days} values={values} goal={goal} color={ACCENT} overColor={GOAL_MET_GOLD} />
    </div>
  );
}

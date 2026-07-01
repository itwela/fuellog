"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { formatDayLabel, isSameDay, toISO } from "@/lib/utils";

const ACCENT = "#b6ff4a";

function mealCalories(meal: Doc<"meal_logs">): number {
  const q = meal.quantity != null && meal.quantity > 0 ? meal.quantity : 1;
  return (meal.calories ?? 0) * q;
}

export function DayBreakdown({
  days,
  mealsByDay,
  goal,
}: {
  days: Date[];
  mealsByDay: Record<string, Doc<"meal_logs">[]>;
  goal: number;
}) {
  const today = new Date();

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold text-[#6a6a6a] px-0.5">Day by day</p>
      {days.map((day) => {
        const iso = toISO(day);
        const meals = mealsByDay[iso] ?? [];
        const dayTotal = meals.reduce((sum, m) => sum + mealCalories(m), 0);
        const isToday = isSameDay(day, today);

        return (
          <div
            key={iso}
            className="rounded-2xl p-4"
            style={{
              background: "#1a1a1a",
              border: isToday ? `1px solid ${ACCENT}40` : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-sm font-semibold" style={{ color: isToday ? ACCENT : "#f2f2f2" }}>
                {formatDayLabel(day)}
              </p>
              {meals.length > 0 && (
                <p className="text-xs font-medium text-[#6a6a6a] tabular-nums">
                  {Math.round(dayTotal)}{goal > 0 ? ` / ${goal}` : ""} kcal
                </p>
              )}
            </div>

            {meals.length === 0 ? (
              <p className="text-xs text-[#6a6a6a]">Nothing logged</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {meals.map((meal) => (
                  <div key={meal._id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] text-[#f2f2f2] truncate">{meal.name}</p>
                      <p className="text-[10px] text-[#6a6a6a] capitalize">{meal.mealType}</p>
                    </div>
                    <span className="text-[13px] font-medium tabular-nums text-[#6a6a6a] shrink-0">
                      {Math.round(mealCalories(meal))} kcal
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl p-3.5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-[10px] font-medium text-[#6a6a6a] mb-1">{label}</p>
      <p className="text-xl font-bold leading-none tabular-nums" style={{ color: "#f2f2f2", letterSpacing: "-0.02em" }}>
        {value}
        {unit && <span className="text-xs font-medium text-[#6a6a6a] ml-1">{unit}</span>}
      </p>
    </div>
  );
}

export function ReportSummaryStats({
  avgCalories,
  daysGoalMet,
  daysWithGoal,
  avgProtein,
  avgCarbs,
  avgFat,
  totalHydrationOz,
  avgHydrationOz,
  highestCalorieDay,
}: {
  avgCalories: number;
  daysGoalMet: number;
  daysWithGoal: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalHydrationOz: number;
  avgHydrationOz: number;
  highestCalorieDay: { label: string; calories: number } | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatTile label="Avg calories / day" value={Math.round(avgCalories).toString()} unit="kcal" />
      {daysWithGoal > 0 && (
        <StatTile label="Days goal met" value={`${daysGoalMet} / ${daysWithGoal}`} />
      )}
      <StatTile label="Avg protein / day" value={Math.round(avgProtein).toString()} unit="g" />
      <StatTile label="Avg carbs / day" value={Math.round(avgCarbs).toString()} unit="g" />
      <StatTile label="Avg fat / day" value={Math.round(avgFat).toString()} unit="g" />
      <StatTile label="Hydration total" value={Math.round(totalHydrationOz).toString()} unit="oz" />
      <StatTile label="Avg hydration / day" value={Math.round(avgHydrationOz).toString()} unit="oz" />
      {highestCalorieDay && (
        <StatTile
          label={`Highest day (${highestCalorieDay.label})`}
          value={Math.round(highestCalorieDay.calories).toString()}
          unit="kcal"
        />
      )}
    </div>
  );
}

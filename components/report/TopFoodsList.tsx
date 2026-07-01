"use client";

const ACCENT = "#b6ff4a";

export type TopFoodItem = {
  id: string;
  name: string;
  calories: number;
  mealType: string;
  dayLabel: string;
};

export function TopFoodsList({ items }: { items: TopFoodItem[] }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-xs font-semibold text-[#6a6a6a] mb-3">Highest calorie foods this week</p>

      {items.length === 0 ? (
        <p className="text-center text-sm py-4 text-[#6a6a6a]">Nothing logged yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: i === 0 ? ACCENT : "#252525", color: i === 0 ? "#0e0e0e" : "#6a6a6a" }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#f2f2f2] truncate">{item.name}</p>
                <p className="text-[10px] text-[#6a6a6a] capitalize">{item.dayLabel} · {item.mealType}</p>
              </div>
              <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: ACCENT, letterSpacing: "-0.02em" }}>
                {Math.round(item.calories)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const ACCENT = "#c084fc";

const DAYS = [
  { key: "monday",    label: "Monday",    short: "Mon" },
  { key: "tuesday",   label: "Tuesday",   short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday",  label: "Thursday",  short: "Thu" },
  { key: "friday",    label: "Friday",    short: "Fri" },
  { key: "saturday",  label: "Saturday",  short: "Sat" },
  { key: "sunday",    label: "Sunday",    short: "Sun" },
];

const TYPE_COLOR: Record<string, string> = {
  breakfast: "#fdcb40",
  lunch: "#b6ff4a",
  dinner: "#ff5623",
  snack: "#4abaff",
};

export function PlanWeekView({
  planId,
  planName,
  onBack,
  onDaySelect,
}: {
  planId: Id<"meal_plans">;
  planName: string;
  onBack: () => void;
  onDaySelect: (day: string) => void;
}) {
  const items = useQuery(api.mealplans.getItems, { planId }) ?? [];
  const d = new Date().getDay();
  const TODAY_KEY = DAYS[d === 0 ? 6 : d - 1].key;

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex items-start gap-3">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onBack}
          className="mt-1 text-[#6a6a6a]"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </motion.button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#6a6a6a]">Meal Plan</p>
          <h1
            className="text-[36px] leading-none font-bold truncate"
            style={{ color: ACCENT, letterSpacing: "-0.03em" }}
          >
            {planName}
          </h1>
        </div>
      </div>

      {/* Day rows */}
      <div className="px-4 flex flex-col gap-2">
        {DAYS.map((day, i) => {
          const dayItems = items.filter((it) => it.day === day.key);
          const kcal = dayItems.reduce((s, it) => s + (it.calories ?? 0), 0);
          const isToday = day.key === TODAY_KEY;
          const types = [...new Set(dayItems.map((it) => it.mealType))];

          return (
            <motion.button
              key={day.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDaySelect(day.key)}
              className="flex items-center gap-4 rounded-2xl px-4 py-4 text-left w-full"
              style={{
                background: isToday ? `${ACCENT}12` : "#1a1a1a",
                border: `1px solid ${isToday ? `${ACCENT}40` : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {/* Day label */}
              <div className="w-12 shrink-0">
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: isToday ? ACCENT : "#6a6a6a" }}
                >
                  {day.short}
                </p>
                {isToday && (
                  <p className="text-[9px] font-medium" style={{ color: ACCENT }}>Today</p>
                )}
              </div>

              {/* Meal type dots */}
              <div className="flex-1 min-w-0">
                {dayItems.length === 0 ? (
                  <p className="text-xs text-[#3a3a3a]">No meals</p>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {types.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${TYPE_COLOR[t]}22`, color: TYPE_COLOR[t] }}
                      >
                        {t[0].toUpperCase() + t.slice(1)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="shrink-0 text-right">
                {dayItems.length > 0 && (
                  <>
                    <p className="text-sm font-bold" style={{ color: "#f2f2f2" }}>
                      {kcal > 0 ? `${kcal}` : "—"}
                    </p>
                    <p className="text-[9px] text-[#6a6a6a]">
                      {kcal > 0 ? "kcal" : `${dayItems.length} meal${dayItems.length !== 1 ? "s" : ""}`}
                    </p>
                  </>
                )}
              </div>

              <svg width="14" height="14" fill="none" stroke="#3a3a3a" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

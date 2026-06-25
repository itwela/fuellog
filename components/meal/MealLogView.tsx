"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { toISO, sumMacros, formatDayLabel, isSameDay } from "@/lib/utils";
import { MacroRing } from "./MacroRing";
import { MealCard } from "./MealCard";
import { LogMealSheet } from "./LogMealSheet";
import { DateStrip } from "./DateStrip";
import { MonthCalendar } from "./MonthCalendar";
import { MacroProgressBar } from "@/components/MacroProgressBar";
import { GoalsSheet } from "@/components/GoalsSheet";
import { SugarDayStat } from "@/components/SugarDayStat";
import { PlanPickerSheet } from "@/components/mealplan/PlanPickerSheet";

const ACCENT = "#b6ff4a";

type LogSheetState = { kind: "new" } | { kind: "edit"; meal: Doc<"meal_logs"> };

export function MealLogView({ userId }: { userId: string }) {
  const [logSheet, setLogSheet] = useState<LogSheetState | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDate(now);
  }, []);

  const selectedISO = selectedDate ? toISO(selectedDate) : null;
  const isToday = selectedDate && today ? isSameDay(selectedDate, today) : false;

  const logs = useQuery(api.meals.getByDate, selectedISO ? { userId, date: selectedISO } : "skip") ?? [];
  const goals = useQuery(api.goals.get, { userId });
  const loggedDates = useQuery(api.meals.getLoggedDatesInMonth, selectedDate ? {
    userId,
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
  } : "skip") ?? [];

  const totals = sumMacros(logs);
  const calorieConsumed = totals.calories ?? 0;
  const calorieGoal = goals?.calories ?? 0;
  const calorieRemaining = calorieGoal > 0 ? Math.max(calorieGoal - calorieConsumed, 0) : null;
  const calorieOver = calorieGoal > 0 && calorieConsumed > calorieGoal;
  const sugarDayLabel = isToday ? "Today" : selectedDate ? formatDayLabel(selectedDate) : "";

  if (!selectedDate || !today) return null;

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-5 pt-12 pb-2 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#6a6a6a]">
            {isToday ? (
              calorieGoal > 0 ? (calorieOver ? "Over today's goal" : "Remaining today") : "Today"
            ) : (
              formatDayLabel(selectedDate)
            )}
          </p>
          <motion.h1
            key={selectedISO}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[68px] leading-none font-bold"
            style={{
              color: calorieOver ? "#ff453a" : ACCENT,
              letterSpacing: "-0.04em",
            }}
          >
            {calorieGoal > 0 ? calorieRemaining : Math.round(calorieConsumed)}
          </motion.h1>
          <p className="text-xs font-medium text-[#6a6a6a]">
            {calorieGoal > 0
              ? `${Math.round(calorieConsumed)} of ${calorieGoal} kcal consumed`
              : "Calories logged"}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setGoalsOpen(true)}
          className="md:hidden mt-3 px-3.5 py-1.5 rounded-full text-xs font-medium"
          style={{ background: "#1a1a1a", color: "#6a6a6a", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {goals ? "Goals" : "Set goals"}
        </motion.button>
      </div>

      {/* Date strip */}
      <DateStrip
        selected={selectedDate}
        onSelect={setSelectedDate}
        onOpenCalendar={() => setCalendarOpen(true)}
        loggedDates={loggedDates}
      />

      {/* Mobile: macro progress + sugar tally (selected day) */}
      <div className="px-5 mb-6 md:hidden space-y-3">
        <p className="text-xs font-medium text-[#6a6a6a] px-0.5">Day progress</p>
        {goals ? (
          <div className="rounded-2xl p-4 space-y-4" style={{ background: "#1a1a1a" }}>
            <MacroProgressBar label="Protein" current={totals.protein ?? 0} goal={goals.protein} color={ACCENT} />
            <MacroProgressBar label="Carbs" current={totals.carbs ?? 0} goal={goals.carbs} color="#4abaff" />
            <MacroProgressBar label="Fat" current={totals.fat ?? 0} goal={goals.fat} color="#fdcb40" />
          </div>
        ) : (
          <div className="flex gap-3">
            <MacroRing label="Protein" value={totals.protein ?? 0} unit="g" color={ACCENT} />
            <MacroRing label="Carbs" value={totals.carbs ?? 0} unit="g" color="#4abaff" />
            <MacroRing label="Fat" value={totals.fat ?? 0} unit="g" color="#fdcb40" />
          </div>
        )}
        <SugarDayStat grams={totals.sugar ?? 0} dayLabel={sugarDayLabel} />
      </div>

      {/* Desktop: rings + sugar */}
      <div className="hidden md:flex flex-col gap-3 px-5 mb-6">
        <p className="text-xs font-medium text-[#6a6a6a] px-0.5">Day progress</p>
        <div className="flex gap-3">
          <MacroRing label="Protein" value={totals.protein ?? 0} unit="g" color={ACCENT} />
          <MacroRing label="Carbs" value={totals.carbs ?? 0} unit="g" color="#4abaff" />
          <MacroRing label="Fat" value={totals.fat ?? 0} unit="g" color="#fdcb40" />
        </div>
        <SugarDayStat grams={totals.sugar ?? 0} dayLabel={sugarDayLabel} />
      </div>

      {/* Load plan button */}
      <div className="px-5 mb-3 md:hidden">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setPlanPickerOpen(true)}
          className="w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2"
          style={{ background: "#1a1a1a", color: "#c084fc", border: "1px solid rgba(192,132,252,0.2)" }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          Load Meal Plan
        </motion.button>
      </div>

      {/* Meal list */}
      <div className="flex-1 px-4 space-y-2">
        {logs.length === 0 ? (
          <motion.p
            key={selectedISO}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-[#6a6a6a] text-sm pt-8"
          >
            {isToday
              ? "Nothing logged yet — tap + to add a meal"
              : `Nothing logged on ${formatDayLabel(selectedDate!)}`}
          </motion.p>
        ) : (
          <AnimatePresence>
            {logs.map((log) => (
              <MealCard
                key={log._id}
                log={log}
                accent={ACCENT}
                userId={userId}
                onEdit={(meal) => setLogSheet({ kind: "edit", meal })}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setLogSheet({ kind: "new" })}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 md:bottom-8 md:right-8"
        style={{ background: ACCENT }}
      >
        <svg width="24" height="24" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {logSheet !== null && (
          <LogMealSheet
            key={logSheet.kind === "edit" ? logSheet.meal._id : "new"}
            userId={userId}
            accent={ACCENT}
            logDate={toISO(selectedDate)}
            editingMeal={logSheet.kind === "edit" ? logSheet.meal : undefined}
            onClose={() => setLogSheet(null)}
          />
        )}
        {goalsOpen && <GoalsSheet userId={userId} onClose={() => setGoalsOpen(false)} />}
        {calendarOpen && (
          <MonthCalendar
            selected={selectedDate}
            loggedDates={loggedDates}
            onSelect={setSelectedDate}
            onClose={() => setCalendarOpen(false)}
          />
        )}
        {planPickerOpen && selectedISO && (
          <PlanPickerSheet
            userId={userId}
            logDate={selectedISO}
            onClose={() => setPlanPickerOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

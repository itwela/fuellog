"use client";

import { useState } from "react";
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

const ACCENT = "#b6ff4a";

type LogSheetState = { kind: "new" } | { kind: "edit"; meal: Doc<"meal_logs"> };

export function MealLogView({ userId }: { userId: string }) {
  const [logSheet, setLogSheet] = useState<LogSheetState | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const selectedISO = toISO(selectedDate);
  const isToday = isSameDay(selectedDate, today);

  const logs = useQuery(api.meals.getByDate, { userId, date: selectedISO }) ?? [];
  const goals = useQuery(api.goals.get, { userId });
  const loggedDates = useQuery(api.meals.getLoggedDatesInMonth, {
    userId,
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
  }) ?? [];

  const totals = sumMacros(logs);
  const calorieConsumed = totals.calories ?? 0;
  const calorieGoal = goals?.calories ?? 0;
  const calorieRemaining = calorieGoal > 0 ? Math.max(calorieGoal - calorieConsumed, 0) : null;
  const calorieOver = calorieGoal > 0 && calorieConsumed > calorieGoal;
  const sugarDayLabel = isToday ? "Today" : formatDayLabel(selectedDate);

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-5 pt-12 pb-2 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-light uppercase tracking-[0.15em] text-[#6a6a6a]">
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
            className="text-[72px] leading-none font-black"
            style={{
              fontFamily: "var(--font-display)",
              color: calorieOver ? "#ff453a" : ACCENT,
            }}
          >
            {calorieGoal > 0 ? calorieRemaining : Math.round(calorieConsumed)}
          </motion.h1>
          <p className="text-[10px] font-light uppercase tracking-[0.15em] text-[#6a6a6a]">
            {calorieGoal > 0
              ? `${Math.round(calorieConsumed)} of ${calorieGoal} kcal consumed`
              : "Calories logged"}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setGoalsOpen(true)}
          className="md:hidden mt-3 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border"
          style={{ borderColor: "#3a3a3a", color: "#6a6a6a" }}
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
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#6a6a6a] px-0.5">Day progress</p>
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
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#6a6a6a] px-0.5">Day progress</p>
        <div className="flex gap-3">
          <MacroRing label="Protein" value={totals.protein ?? 0} unit="g" color={ACCENT} />
          <MacroRing label="Carbs" value={totals.carbs ?? 0} unit="g" color="#4abaff" />
          <MacroRing label="Fat" value={totals.fat ?? 0} unit="g" color="#fdcb40" />
        </div>
        <SugarDayStat grams={totals.sugar ?? 0} dayLabel={sugarDayLabel} />
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
              : `Nothing logged on ${formatDayLabel(selectedDate)}`}
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
            logDate={selectedISO}
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
      </AnimatePresence>
    </div>
  );
}

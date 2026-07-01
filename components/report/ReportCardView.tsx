"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  addDays,
  formatDayLabel,
  formatWeekRangeLabel,
  getWeekDays,
  isoFromTimestamp,
  isSameDay,
  toISO,
} from "@/lib/utils";
import { MonthCalendar } from "@/components/meal/MonthCalendar";
import { WeeklyCaloriesChart } from "./WeeklyCaloriesChart";
import { WeeklyHydrationChart } from "./WeeklyHydrationChart";
import { ReportSummaryStats } from "./ReportSummaryStats";
import { TopFoodsList, type TopFoodItem } from "./TopFoodsList";
import { DayBreakdown } from "./DayBreakdown";

const ACCENT = "#b6ff4a";

function mealCalories(meal: Doc<"meal_logs">): number {
  const q = meal.quantity != null && meal.quantity > 0 ? meal.quantity : 1;
  return (meal.calories ?? 0) * q;
}

export function ReportCardView({ userId }: { userId: string }) {
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDate(now);
  }, []);

  const week = selectedDate ? getWeekDays(selectedDate) : null;
  const weekStartISO = week ? toISO(week[0]) : null;

  const data = useQuery(
    api.reports.getWeek,
    weekStartISO ? { userId, weekStartDate: weekStartISO } : "skip"
  );
  const goals = useQuery(api.goals.get, { userId });
  const loggedDates = useQuery(
    api.meals.getLoggedDatesInMonth,
    selectedDate
      ? { userId, year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1 }
      : "skip"
  ) ?? [];

  if (!week || !today || !selectedDate) return null;

  const meals = data?.meals ?? [];
  const hydration = data?.hydration ?? [];

  const mealsByDay: Record<string, Doc<"meal_logs">[]> = {};
  for (const day of week) mealsByDay[toISO(day)] = [];
  for (const meal of meals) {
    const iso = isoFromTimestamp(meal.loggedAt);
    (mealsByDay[iso] ??= []).push(meal);
  }

  const hydrationByDay: Record<string, number> = {};
  for (const day of week) hydrationByDay[toISO(day)] = 0;
  for (const entry of hydration) {
    const iso = isoFromTimestamp(entry.loggedAt);
    hydrationByDay[iso] = (hydrationByDay[iso] ?? 0) + entry.ozAmount;
  }

  const calorieGoal = goals?.calories ?? 0;
  const caloriesByDay = week.map((day) =>
    (mealsByDay[toISO(day)] ?? []).reduce((sum, m) => sum + mealCalories(m), 0)
  );
  const ouncesByDay = week.map((day) => hydrationByDay[toISO(day)] ?? 0);

  const pastDays = week.filter((d) => d <= today);
  const divisor = Math.max(pastDays.length, 1);
  const pastIndices = week.map((d) => d <= today);

  const sum = (arr: number[]) => arr.reduce((a, b, i) => (pastIndices[i] ? a + b : a), 0);

  const avgCalories = sum(caloriesByDay) / divisor;
  const avgHydrationOz = sum(ouncesByDay) / divisor;
  const totalHydrationOz = sum(ouncesByDay);

  const proteinByDay = week.map((day) =>
    (mealsByDay[toISO(day)] ?? []).reduce((s, m) => s + (m.protein ?? 0) * (m.quantity && m.quantity > 0 ? m.quantity : 1), 0)
  );
  const carbsByDay = week.map((day) =>
    (mealsByDay[toISO(day)] ?? []).reduce((s, m) => s + (m.carbs ?? 0) * (m.quantity && m.quantity > 0 ? m.quantity : 1), 0)
  );
  const fatByDay = week.map((day) =>
    (mealsByDay[toISO(day)] ?? []).reduce((s, m) => s + (m.fat ?? 0) * (m.quantity && m.quantity > 0 ? m.quantity : 1), 0)
  );

  const daysWithGoal = calorieGoal > 0 ? pastDays.length : 0;
  const daysGoalMet = calorieGoal > 0
    ? week.reduce((count, day, i) => (pastIndices[i] && caloriesByDay[i] >= calorieGoal ? count + 1 : count), 0)
    : 0;

  const maxCalIndex = caloriesByDay.reduce((best, v, i) => (v > caloriesByDay[best] ? i : best), 0);
  const highestCalorieDay = caloriesByDay[maxCalIndex] > 0
    ? { label: formatDayLabel(week[maxCalIndex]), calories: caloriesByDay[maxCalIndex] }
    : null;

  const topFoods: TopFoodItem[] = meals
    .map((m) => ({
      id: m._id,
      name: m.name,
      calories: mealCalories(m),
      mealType: m.mealType,
      dayLabel: formatDayLabel(new Date(isoFromTimestamp(m.loggedAt) + "T00:00:00")),
    }))
    .filter((item) => item.calories > 0)
    .sort((a, b) => b.calories - a.calories)
    .slice(0, 5);

  const isCurrentWeek = week.some((d) => isSameDay(d, today));

  function prevWeek() {
    if (!week) return;
    setSelectedDate(addDays(week[0], -7));
  }

  function nextWeek() {
    if (!week || !today) return;
    const next = addDays(week[6], 1);
    if (next <= today) setSelectedDate(next);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      {/* Week nav */}
      <div className="flex items-center justify-between px-1">
        <motion.button whileTap={{ scale: 0.85 }} onClick={prevWeek} className="p-2 rounded-full text-[#6a6a6a]" style={{ background: "#1a1a1a" }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </motion.button>

        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "#f2f2f2" }}>
            {isCurrentWeek ? "This week" : formatWeekRangeLabel(week[0])}
          </p>
          {isCurrentWeek && (
            <p className="text-[10px] text-[#6a6a6a]">{formatWeekRangeLabel(week[0])}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={nextWeek}
            disabled={isCurrentWeek}
            className="p-2 rounded-full text-[#6a6a6a]"
            style={{ background: "#1a1a1a", opacity: isCurrentWeek ? 0.3 : 1 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </motion.button>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCalendarOpen(true)} className="p-2 rounded-full text-[#6a6a6a]" style={{ background: "#1a1a1a" }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </motion.button>
        </div>
      </div>

      <WeeklyCaloriesChart days={week} calories={caloriesByDay} goal={calorieGoal} avgCalories={avgCalories} />
      <WeeklyHydrationChart days={week} ounces={ouncesByDay} avgOunces={avgHydrationOz} />

      <ReportSummaryStats
        avgCalories={avgCalories}
        daysGoalMet={daysGoalMet}
        daysWithGoal={daysWithGoal}
        avgProtein={sum(proteinByDay) / divisor}
        avgCarbs={sum(carbsByDay) / divisor}
        avgFat={sum(fatByDay) / divisor}
        totalHydrationOz={totalHydrationOz}
        avgHydrationOz={avgHydrationOz}
        highestCalorieDay={highestCalorieDay}
      />

      <TopFoodsList items={topFoods} />

      <DayBreakdown days={week} mealsByDay={mealsByDay} goal={calorieGoal} />

      <AnimatePresence>
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

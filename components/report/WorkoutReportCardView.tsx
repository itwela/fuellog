"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { addDays, getWeekDays, isSameDay, toISO } from "@/lib/utils";
import { MonthCalendar } from "@/components/meal/MonthCalendar";
import { WeekNav } from "./WeekNav";
import { WeeklySetsChart } from "./WeeklySetsChart";
import { WorkoutReportSummaryStats } from "./WorkoutReportSummaryStats";
import { TopExercisesList, type TopExerciseItem } from "./TopExercisesList";
import { WorkoutDayBreakdown } from "./WorkoutDayBreakdown";

type SessionExercise = Doc<"workout_session_exercises"> & {
  exercise: Doc<"exercises"> | null;
};

type Session = Doc<"workout_sessions"> & {
  exercises: SessionExercise[];
};

export function WorkoutReportCardView({ userId, accent }: { userId: string; accent: string }) {
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

  const sessions: Session[] = useQuery(
    api.workout.getSessionsInWeek,
    weekStartISO ? { userId, weekStartDate: weekStartISO } : "skip"
  ) ?? [];
  const loggedDates = useQuery(
    api.workout.getLoggedWorkoutDatesInMonth,
    selectedDate
      ? { userId, year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1 }
      : "skip"
  ) ?? [];

  if (!week || !today || !selectedDate) return null;

  const sessionsByDay: Record<string, Session[]> = {};
  for (const day of week) sessionsByDay[toISO(day)] = [];
  for (const session of sessions) {
    const iso = toISO(new Date(session.startedAt));
    (sessionsByDay[iso] ??= []).push(session);
  }

  const setsCompleted = (session: Session) =>
    session.exercises.reduce((sum, se) => sum + se.sets.filter((s) => s.completed).length, 0);

  const setsByDay = week.map((day) =>
    (sessionsByDay[toISO(day)] ?? []).reduce((sum, s) => sum + setsCompleted(s), 0)
  );

  const totalSessions = sessions.length;
  const daysTrained = week.filter((day) => (sessionsByDay[toISO(day)] ?? []).length > 0).length;
  const totalSets = setsByDay.reduce((a, b) => a + b, 0);
  const avgSessionMinutes = totalSessions > 0
    ? sessions.reduce((sum, s) => sum + ((s.completedAt ?? s.startedAt) - s.startedAt), 0) / totalSessions / 60000
    : null;

  const exerciseTotals = new Map<string, { name: string; sets: number }>();
  for (const session of sessions) {
    for (const se of session.exercises) {
      if (!se.exercise) continue;
      const completed = se.sets.filter((s) => s.completed).length;
      const entry = exerciseTotals.get(se.exerciseId) ?? { name: se.exercise.name, sets: 0 };
      entry.sets += completed;
      exerciseTotals.set(se.exerciseId, entry);
    }
  }
  const topExercises: TopExerciseItem[] = Array.from(exerciseTotals.entries())
    .map(([id, { name, sets }]) => ({ id, name, setsCompleted: sets }))
    .filter((item) => item.setsCompleted > 0)
    .sort((a, b) => b.setsCompleted - a.setsCompleted)
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
      <WeekNav
        weekStart={week[0]}
        isCurrentWeek={isCurrentWeek}
        onPrev={prevWeek}
        onNext={nextWeek}
        onOpenCalendar={() => setCalendarOpen(true)}
      />

      <WeeklySetsChart days={week} sets={setsByDay} accent={accent} />

      <WorkoutReportSummaryStats
        totalSessions={totalSessions}
        daysTrained={daysTrained}
        totalSets={totalSets}
        avgSessionMinutes={avgSessionMinutes}
      />

      <TopExercisesList items={topExercises} accent={accent} />

      <WorkoutDayBreakdown days={week} sessionsByDay={sessionsByDay} accent={accent} />

      <AnimatePresence>
        {calendarOpen && (
          <MonthCalendar
            selected={selectedDate}
            loggedDates={loggedDates}
            onSelect={setSelectedDate}
            onClose={() => setCalendarOpen(false)}
            accent={accent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

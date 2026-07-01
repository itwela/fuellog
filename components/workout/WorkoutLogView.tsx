"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence } from "framer-motion";
import { toISO, formatDayLabel, isSameDay } from "@/lib/utils";
import { DateStrip } from "@/components/meal/DateStrip";
import { MonthCalendar } from "@/components/meal/MonthCalendar";
import { WorkoutSessionCard } from "./WorkoutSessionCard";

export function WorkoutLogView({ userId, accent }: { userId: string; accent: string }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDate(now);
  }, []);

  const selectedISO = selectedDate ? toISO(selectedDate) : null;
  const isToday = selectedDate && today ? isSameDay(selectedDate, today) : false;

  const sessions = useQuery(api.workout.getSessionsByDate, selectedISO ? { userId, date: selectedISO } : "skip") ?? [];
  const loggedDates = useQuery(api.workout.getLoggedWorkoutDatesInMonth, selectedDate ? {
    userId,
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth() + 1,
  } : "skip") ?? [];

  if (!selectedDate || !today) return null;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Day label */}
      <div className="px-5 pb-2">
        <p className="text-xs font-medium text-[#6a6a6a]">
          {isToday ? "Today" : formatDayLabel(selectedDate)}
        </p>
      </div>

      <DateStrip
        selected={selectedDate}
        onSelect={setSelectedDate}
        onOpenCalendar={() => setCalendarOpen(true)}
        loggedDates={loggedDates}
        accent={accent}
      />

      <div className="flex-1 px-4 space-y-2 pb-32 md:pb-4">
        {sessions.length === 0 ? (
          <p className="text-center text-[#6a6a6a] text-sm pt-8">
            {isToday
              ? "Nothing logged yet — tap + to start a workout"
              : `Nothing logged on ${formatDayLabel(selectedDate)}`}
          </p>
        ) : (
          <AnimatePresence>
            {sessions.map((session) => (
              <WorkoutSessionCard key={session._id} session={session} accent={accent} />
            ))}
          </AnimatePresence>
        )}
      </div>

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

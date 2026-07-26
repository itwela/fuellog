"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";
import { toISO, formatDayLabel, isSameDay } from "@/lib/utils";
import { DateStrip } from "@/components/meal/DateStrip";
import { MonthCalendar } from "@/components/meal/MonthCalendar";
import { WorkoutSessionCard } from "./WorkoutSessionCard";
import { WeightCard } from "./WeightCard";
import { EditSessionSheet } from "./EditSessionSheet";
import { LogPastWorkoutSheet } from "./LogPastWorkoutSheet";

export function WorkoutLogView({ userId, accent }: { userId: string; accent: string }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editSessionId, setEditSessionId] = useState<Id<"workout_sessions"> | null>(null);
  const [logPastOpen, setLogPastOpen] = useState(false);

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

      <WeightCard userId={userId} accent={accent} selectedDate={selectedDate} />

      <div className="flex-1 px-4 space-y-2 pb-32 md:pb-4">
        {sessions.length === 0 ? (
          <div className="pt-8 flex flex-col items-center gap-3">
            <p className="text-center text-[#6a6a6a] text-sm">
              {isToday
                ? "Nothing logged yet — tap + to start a workout"
                : `Nothing logged on ${formatDayLabel(selectedDate)}`}
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setLogPastOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-medium"
              style={{ background: "#252525", color: accent, border: `1px solid ${accent}44` }}
            >
              {isToday ? "Log a workout I already did" : "Log a workout for this day"}
            </motion.button>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {sessions.map((session) => (
                <WorkoutSessionCard
                  key={session._id}
                  session={session}
                  accent={accent}
                  onEdit={() => setEditSessionId(session._id)}
                />
              ))}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setLogPastOpen(true)}
              className="w-full py-2.5 rounded-xl text-[11px] font-medium"
              style={{ background: "#1a1a1a", color: "#6a6a6a", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              + Add another workout to this day
            </button>
          </>
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

        {editSessionId && (
          <EditSessionSheet
            key={editSessionId}
            sessionId={editSessionId}
            userId={userId}
            accent={accent}
            onClose={() => setEditSessionId(null)}
            onDeleted={() => setEditSessionId(null)}
          />
        )}

        {logPastOpen && (
          <LogPastWorkoutSheet
            userId={userId}
            accent={accent}
            date={selectedDate}
            onClose={() => setLogPastOpen(false)}
            onLogged={(id) => {
              setLogPastOpen(false);
              // Drop straight into editing so the reps and weight can be filled in.
              setEditSessionId(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

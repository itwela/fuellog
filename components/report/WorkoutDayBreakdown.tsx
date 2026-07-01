"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { formatDayLabel, isSameDay, toISO } from "@/lib/utils";

type SessionExercise = Doc<"workout_session_exercises"> & {
  exercise: Doc<"exercises"> | null;
};

type Session = Doc<"workout_sessions"> & {
  exercises: SessionExercise[];
};

export function WorkoutDayBreakdown({
  days,
  sessionsByDay,
  accent,
}: {
  days: Date[];
  sessionsByDay: Record<string, Session[]>;
  accent: string;
}) {
  const today = new Date();

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold text-[#6a6a6a] px-0.5">Day by day</p>
      {days.map((day) => {
        const iso = toISO(day);
        const sessions = sessionsByDay[iso] ?? [];
        const isToday = isSameDay(day, today);

        return (
          <div
            key={iso}
            className="rounded-2xl p-4"
            style={{
              background: "#1a1a1a",
              border: isToday ? `1px solid ${accent}40` : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-sm font-semibold mb-2.5" style={{ color: isToday ? accent : "#f2f2f2" }}>
              {formatDayLabel(day)}
            </p>

            {sessions.length === 0 ? (
              <p className="text-xs text-[#6a6a6a]">Nothing logged</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {sessions.map((session) => (
                  <div key={session._id} className="flex items-center justify-between gap-3">
                    <p className="text-[13px] text-[#f2f2f2] truncate">{session.name}</p>
                    <span className="text-[13px] font-medium tabular-nums text-[#6a6a6a] shrink-0">
                      {session.exercises.length} exercise{session.exercises.length !== 1 ? "s" : ""}
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

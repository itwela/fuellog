"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";

type SessionExercise = Doc<"workout_session_exercises"> & {
  exercise: Doc<"exercises"> | null;
};

type Session = Doc<"workout_sessions"> & {
  exercises: SessionExercise[];
};

function setsSummary(sets: SessionExercise["sets"]): string {
  const done = sets.filter((s) => s.completed);
  if (done.length === 0) return `${sets.length} set${sets.length !== 1 ? "s" : ""}`;
  const weights = new Set(done.map((s) => s.weight).filter(Boolean));
  const weightLabel = weights.size === 1 ? ` @ ${[...weights][0]}` : "";
  const reps = done.map((s) => s.reps ?? "—");
  const repsLabel = new Set(reps).size === 1 ? reps[0] : reps.join(",");
  return `${done.length}×${repsLabel}${weightLabel}`;
}

export function WorkoutSessionCard({ session, accent }: { session: Session; accent: string }) {
  const time = new Date(session.startedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <AliveCard seed={`session:${session._id}`} accent={accent} className="rounded-2xl overflow-hidden px-4 py-3.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="font-bold text-base text-[#f2f2f2] leading-tight" style={{ letterSpacing: "-0.01em" }}>
          {session.name}
        </p>
        <span className="text-[10px] font-medium text-[#6a6a6a] shrink-0 pt-0.5 tabular-nums">{time}</span>
      </div>

      <div className="space-y-1.5">
        {session.exercises.map((se) => (
          <div key={se._id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-[#f2f2f2] leading-snug flex-1 min-w-0 line-clamp-1 break-words">
              {se.exercise?.name ?? "Unknown exercise"}
            </span>
            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: accent }}>
              {setsSummary(se.sets)}
            </span>
          </div>
        ))}
      </div>
    </AliveCard>
  );
}

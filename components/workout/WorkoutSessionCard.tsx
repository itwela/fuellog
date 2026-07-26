"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";

type SessionExercise = Doc<"workout_session_exercises"> & {
  exercise: Doc<"exercises"> | null;
};

type Session = Doc<"workout_sessions"> & {
  exercises: SessionExercise[];
};

type SetEntry = SessionExercise["sets"][number];

/** A run of consecutive sets sharing the same reps + weight, so "10,10,10" reads as "3 × 10". */
type SetGroup = {
  count: number;
  reps?: number;
  weight?: string;
  /** True when every set in the run was ticked off during the session. */
  completed: boolean;
};

function hasData(set: SetEntry): boolean {
  return set.reps != null || (set.weight != null && set.weight.trim() !== "");
}

/**
 * Collapses consecutive sets with identical reps/weight into groups.
 * Unlike the old summary this never hides reps or weight just because the set
 * was never ticked complete — typed-in numbers are real data worth showing.
 */
function groupSets(sets: SetEntry[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const set of sets) {
    const weight = set.weight?.trim() || undefined;
    const last = groups[groups.length - 1];
    if (last && last.reps === set.reps && last.weight === weight) {
      last.count += 1;
      last.completed = last.completed && set.completed;
    } else {
      groups.push({ count: 1, reps: set.reps, weight, completed: set.completed });
    }
  }
  return groups;
}

/** "3 × 10" for a repeated run, bare "10" for a one-off, "3 sets" when reps are unknown. */
function formatReps(group: SetGroup): string {
  if (group.reps == null) return `${group.count} set${group.count !== 1 ? "s" : ""}`;
  return group.count > 1 ? `${group.count} × ${group.reps}` : String(group.reps);
}

function formatGroup(group: SetGroup): string {
  const reps = formatReps(group);
  return group.weight ? `${reps} @ ${group.weight}` : reps;
}

/**
 * When every set was at the same weight, collapse to a single chip — "10, 8, 4 @ 45"
 * reads far better than three chips each repeating the weight.
 */
function sharedWeight(sets: SetEntry[]): string | null | undefined {
  const weights = new Set(sets.map((s) => s.weight?.trim() || ""));
  if (weights.size !== 1) return undefined;
  return [...weights][0] || null;
}

function ExerciseRow({ se, accent }: { se: SessionExercise; accent: string }) {
  const { sets } = se;
  const logged = sets.filter(hasData);
  const totalLabel = `${sets.length} set${sets.length !== 1 ? "s" : ""}`;

  // One weight across the whole exercise? Render a single chip and state the weight once.
  const common = sharedWeight(sets);
  const groups =
    common !== undefined
      ? [
          {
            label: groupSets(sets.map((s) => ({ ...s, weight: undefined })))
              .map(formatReps)
              .join(", ") + (common ? ` @ ${common}` : ""),
            completed: sets.every((s) => s.completed),
          },
        ]
      : groupSets(sets).map((g) => ({ label: formatGroup(g), completed: g.completed }));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-[#f2f2f2] leading-snug flex-1 min-w-0 line-clamp-1 break-words">
          {se.exercise?.name ?? "Unknown exercise"}
        </span>
        <span className="text-[10px] font-medium text-[#6a6a6a] shrink-0 tabular-nums">{totalLabel}</span>
      </div>

      {logged.length === 0 ? (
        <span className="text-[11px] text-[#4a4a4a]">No reps or weight recorded</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {groups.map((group, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold tabular-nums leading-none"
              style={{
                background: group.completed ? `${accent}1f` : "#252525",
                color: group.completed ? accent : "#b0b0b0",
              }}
            >
              {group.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkoutSessionCard({
  session,
  accent,
  onEdit,
}: {
  session: Session;
  accent: string;
  onEdit?: () => void;
}) {
  const time = new Date(session.startedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const totalSets = session.exercises.reduce((sum, se) => sum + se.sets.length, 0);

  return (
    <AliveCard seed={`session:${session._id}`} accent={accent} className="rounded-2xl overflow-hidden px-4 py-3.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-[#f2f2f2] leading-tight" style={{ letterSpacing: "-0.01em" }}>
            {session.name}
          </p>
          <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider mt-0.5 tabular-nums">
            {session.exercises.length} exercise{session.exercises.length !== 1 ? "s" : ""} · {totalSets} set
            {totalSets !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-medium text-[#6a6a6a] pt-0.5 tabular-nums">{time}</span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${session.name}`}
              className="p-1 -mr-1 text-[#4a4a4a] hover:text-[#f2f2f2] transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {session.exercises.map((se) => (
          <ExerciseRow key={se._id} se={se} accent={accent} />
        ))}
      </div>
    </AliveCard>
  );
}

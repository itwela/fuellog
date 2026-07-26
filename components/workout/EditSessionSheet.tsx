"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type SetDraft = { reps?: number; weight?: string; completed: boolean };

/** The set rows for one exercise, saved as a whole when anything changes. */
function ExerciseSets({
  sessionExerciseId,
  exerciseName,
  initialSets,
  accent,
  onRemoveExercise,
}: {
  sessionExerciseId: Id<"workout_session_exercises">;
  exerciseName: string;
  initialSets: SetDraft[];
  accent: string;
  onRemoveExercise: () => void;
}) {
  const [sets, setSets] = useState<SetDraft[]>(initialSets);
  const replaceSets = useMutation(api.workout.replaceSets);

  // Adopt server changes (e.g. another device) without clobbering local typing.
  useEffect(() => {
    setSets(initialSets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialSets)]);

  function commit(next: SetDraft[]) {
    setSets(next);
    void replaceSets({
      id: sessionExerciseId,
      sets: next.map((s) => ({
        reps: s.reps,
        weight: s.weight?.trim() || undefined,
        completed: s.completed,
      })),
    });
  }

  function patchSet(index: number, patch: Partial<SetDraft>) {
    commit(sets.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSet() {
    const last = sets[sets.length - 1];
    // Carry the previous set's numbers forward — usually what you want.
    commit([...sets, { reps: last?.reps, weight: last?.weight, completed: false }]);
  }

  function removeSet(index: number) {
    commit(sets.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-xl p-3 mb-2" style={{ background: "#252525" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-[#f2f2f2] truncate">{exerciseName}</p>
        <button
          type="button"
          onClick={onRemoveExercise}
          aria-label={`Remove ${exerciseName} from this workout`}
          className="text-[10px] text-[#6a6a6a] hover:text-[#ff5252] transition-colors shrink-0"
        >
          Remove
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-1 mb-1">
        <span className="w-5 text-[9px] uppercase tracking-wider text-[#4a4a4a]">#</span>
        <span className="flex-1 text-[9px] uppercase tracking-wider text-[#4a4a4a]">Reps</span>
        <span className="flex-1 text-[9px] uppercase tracking-wider text-[#4a4a4a]">Weight</span>
        <span className="w-12" />
      </div>

      <div className="space-y-1.5">
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 text-xs font-bold tabular-nums" style={{ color: accent }}>
              {i + 1}
            </span>

            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={set.reps ?? ""}
              onChange={(e) =>
                patchSet(i, { reps: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              placeholder="—"
              className="flex-1 min-w-0 rounded-lg px-2 py-2 text-sm text-[#f2f2f2] placeholder-[#4a4a4a] outline-none tabular-nums"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
            />

            <input
              type="text"
              value={set.weight ?? ""}
              onChange={(e) => patchSet(i, { weight: e.target.value })}
              placeholder="—"
              className="flex-1 min-w-0 rounded-lg px-2 py-2 text-sm text-[#f2f2f2] placeholder-[#4a4a4a] outline-none"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
            />

            <div className="flex items-center gap-1 w-12 shrink-0 justify-end">
              <button
                type="button"
                onClick={() => patchSet(i, { completed: !set.completed })}
                aria-label={set.completed ? `Mark set ${i + 1} incomplete` : `Mark set ${i + 1} complete`}
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: set.completed ? accent : "#3a3a3a",
                  background: set.completed ? accent : "transparent",
                }}
              >
                {set.completed && (
                  <svg width="10" height="10" fill="none" stroke="#0e0e0e" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => removeSet(i)}
                aria-label={`Delete set ${i + 1}`}
                className="text-[#4a4a4a] hover:text-[#ff5252] transition-colors shrink-0"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="w-full mt-2 py-2 rounded-lg text-[11px] font-medium transition-colors"
        style={{ background: "#1a1a1a", color: accent, border: `1px solid ${accent}33` }}
      >
        + Add set
      </button>
    </div>
  );
}

export function EditSessionSheet({
  sessionId,
  userId,
  accent,
  onClose,
  onDeleted,
}: {
  sessionId: Id<"workout_sessions">;
  userId: string;
  accent: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveExercise, setConfirmRemoveExercise] = useState<{
    id: Id<"workout_session_exercises">;
    name: string;
  } | null>(null);

  const session = useQuery(api.workout.getSession, { sessionId });
  const exercises =
    useQuery(api.workout.getExercises, adding ? { userId, search: search || undefined } : "skip") ?? [];

  const updateSession = useMutation(api.workout.updateSession);
  const addExerciseToSession = useMutation(api.workout.addExerciseToSession);
  const removeExerciseFromSession = useMutation(api.workout.removeExerciseFromSession);
  const deleteSession = useMutation(api.workout.deleteSession);

  useEffect(() => {
    if (session) setName(session.name);
  }, [session?.name]);

  function commitName() {
    const trimmed = name.trim();
    if (!session || !trimmed || trimmed === session.name) {
      if (session && !trimmed) setName(session.name);
      return;
    }
    void updateSession({ id: sessionId, name: trimmed });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4 flex flex-col"
        style={{
          background: "#1a1a1a",
          maxHeight: "calc(100dvh - 16px)",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom) + 84px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SheetHeader onClose={onClose} />

        {!session ? (
          <p className="text-sm text-[#6a6a6a] py-8 text-center">Loading…</p>
        ) : (
          <>
            <label className="block text-[10px] uppercase tracking-wider text-[#6a6a6a] mb-1.5">
              Workout name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full rounded-xl px-4 py-3 text-base font-bold text-[#f2f2f2] outline-none mb-4"
              style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}
            />

            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
              {session.exercises.map((se) => (
                <ExerciseSets
                  key={se._id}
                  sessionExerciseId={se._id}
                  exerciseName={se.exercise?.name ?? "Unknown exercise"}
                  initialSets={se.sets}
                  accent={accent}
                  onRemoveExercise={() =>
                    setConfirmRemoveExercise({
                      id: se._id,
                      name: se.exercise?.name ?? "this exercise",
                    })
                  }
                />
              ))}

              {session.exercises.length === 0 && (
                <p className="text-center text-[#6a6a6a] text-sm py-6">
                  No exercises in this workout — add one below
                </p>
              )}

              {/* Add an exercise to this session */}
              {adding ? (
                <div className="rounded-xl p-3 mb-2" style={{ background: "#252525" }}>
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exercises…"
                    className="w-full rounded-lg px-3 py-2.5 mb-2 text-sm text-[#f2f2f2] placeholder-[#4a4a4a] outline-none"
                    style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
                  />
                  <div className="max-h-52 overflow-y-auto space-y-1.5">
                    {exercises.map((ex) => (
                      <button
                        key={ex._id}
                        type="button"
                        onClick={async () => {
                          await addExerciseToSession({ sessionId, exerciseId: ex._id });
                          setAdding(false);
                          setSearch("");
                        }}
                        className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left"
                        style={{ background: "#1a1a1a" }}
                      >
                        <span className="text-sm text-[#f2f2f2] truncate">{ex.name}</span>
                        <span className="text-xs font-bold shrink-0" style={{ color: accent }}>
                          Add
                        </span>
                      </button>
                    ))}
                    {exercises.length === 0 && (
                      <p className="text-center text-[#6a6a6a] text-xs py-4">
                        {search ? "No exercises found" : "No exercises yet"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setSearch("");
                    }}
                    className="w-full mt-2 py-2 rounded-lg text-[11px] font-medium text-[#6a6a6a]"
                    style={{ background: "#1a1a1a" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="w-full py-2.5 mb-2 rounded-xl text-xs font-medium"
                  style={{ background: "#252525", color: accent, border: `1px solid ${accent}44` }}
                >
                  + Add exercise to this workout
                </button>
              )}

              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2.5 mt-2 rounded-xl text-xs font-medium text-[#6a6a6a]"
                style={{ background: "#252525" }}
              >
                Delete this workout
              </button>
            </div>
          </>
        )}
      </motion.div>

      <ConfirmDialog
        open={confirmDelete}
        itemName={session?.name ?? "this workout"}
        subtitle="The whole workout and all its sets will be deleted."
        onConfirm={async () => {
          await deleteSession({ id: sessionId });
          setConfirmDelete(false);
          onDeleted();
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={!!confirmRemoveExercise}
        itemName={confirmRemoveExercise?.name ?? ""}
        subtitle="This exercise and its sets will be removed from this workout."
        onConfirm={async () => {
          if (confirmRemoveExercise) await removeExerciseFromSession({ id: confirmRemoveExercise.id });
          setConfirmRemoveExercise(null);
        }}
        onCancel={() => setConfirmRemoveExercise(null)}
      />
    </>
  );
}

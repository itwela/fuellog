"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { formatDayLabel, toISO } from "@/lib/utils";

type PickerMode = "routines" | "exercises";

/**
 * Records a workout onto a day that was never started in the app. Saves it already
 * completed, then hands the id back so reps and weight can be filled in straight away.
 */
export function LogPastWorkoutSheet({
  userId,
  accent,
  date,
  onClose,
  onLogged,
}: {
  userId: string;
  accent: string;
  date: Date;
  onClose: () => void;
  onLogged: (sessionId: Id<"workout_sessions">) => void;
}) {
  const [mode, setMode] = useState<PickerMode>("routines");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Id<"exercises">[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routines = useQuery(api.workout.getRoutines, { userId }) ?? [];
  const exercises = useQuery(api.workout.getExercises, { userId, search: search || undefined }) ?? [];
  const logPastSession = useMutation(api.workout.logPastSession);

  useEffect(() => {
    if (routines.length === 0) setMode("exercises");
  }, [routines.length]);

  async function save(exerciseIds: Id<"exercises">[], sessionName: string) {
    if (exerciseIds.length === 0) {
      setError("Pick at least one exercise");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await logPastSession({
        userId,
        name: sessionName.trim() || "Workout",
        exerciseIds,
        date: toISO(date),
      });
      onLogged(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this workout");
      setSaving(false);
    }
  }

  function togglePicked(id: Id<"exercises">) {
    setPicked((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  return (
    <BottomSheet
      onClose={onClose}
      className="rounded-t-3xl px-5 pt-4 flex flex-col"
      panelStyle={{
        background: "#1a1a1a",
        maxHeight: "calc(100dvh - 16px)",
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom) + 84px)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
        <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Log a workout
        </h2>
        <p className="text-xs text-[#6a6a6a] mb-4">{formatDayLabel(date)}</p>

        <div className="flex rounded-xl p-1 mb-4" style={{ background: "#252525" }}>
          {(["routines", "exercises"] as PickerMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize"
              style={{
                background: mode === m ? accent : "transparent",
                color: mode === m ? "#0e0e0e" : "#6a6a6a",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {error && <p className="text-xs mb-3" style={{ color: "#ff5252" }}>{error}</p>}

        {mode === "routines" ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-2">
            {routines.map((routine) => (
              <motion.button
                key={routine._id}
                whileTap={{ scale: 0.97 }}
                disabled={saving}
                onClick={() => void save(routine.exerciseIds, routine.name)}
                className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left"
                style={{ background: "#252525", opacity: saving ? 0.5 : 1 }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#f2f2f2] truncate">{routine.name}</p>
                  <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider mt-0.5">
                    {routine.exercises.length} exercise{routine.exercises.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: accent }}>
                  Log
                </span>
              </motion.button>
            ))}

            {routines.length === 0 && (
              <p className="text-center text-[#6a6a6a] text-sm pt-8">
                No routines yet — switch to Exercises to pick individually
              </p>
            )}
          </div>
        ) : (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workout name (optional)"
              className="w-full rounded-xl px-4 py-3 mb-2 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none"
              style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.05)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full rounded-xl px-4 py-3 mb-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none"
              style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.05)" }}
            />

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pb-2">
              {exercises.map((ex) => {
                const index = picked.indexOf(ex._id);
                const isPicked = index >= 0;
                return (
                  <button
                    key={ex._id}
                    type="button"
                    onClick={() => togglePicked(ex._id)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-left"
                    style={{
                      background: "#252525",
                      border: isPicked ? `1px solid ${accent}` : "1px solid transparent",
                    }}
                  >
                    <span className="text-sm text-[#f2f2f2] truncate">{ex.name}</span>
                    {isPicked && (
                      <span
                        className="text-[10px] font-bold shrink-0 tabular-nums"
                        style={{ color: accent }}
                      >
                        {index + 1}
                      </span>
                    )}
                  </button>
                );
              })}

              {exercises.length === 0 && (
                <p className="text-center text-[#6a6a6a] text-sm pt-8">
                  {search ? "No exercises found" : "No exercises yet"}
                </p>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              disabled={saving || picked.length === 0}
              onClick={() => void save(picked, name)}
              className="w-full py-3.5 mt-2 rounded-2xl font-bold text-[15px] shrink-0"
              style={{
                background: accent,
                color: "#0e0e0e",
                opacity: saving || picked.length === 0 ? 0.35 : 1,
              }}
            >
              {saving
                ? "Saving…"
                : `Log ${picked.length || ""} exercise${picked.length === 1 ? "" : "s"}`.trim()}
            </motion.button>
          </>
        )}
    </BottomSheet>
  );
}

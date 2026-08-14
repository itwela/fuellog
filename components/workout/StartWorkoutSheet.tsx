"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ExerciseCard } from "./ExerciseCard";
import { AddExerciseSheet } from "./AddExerciseSheet";

type PickerMode = "routines" | "exercises";

export function StartWorkoutSheet({
  userId,
  accent,
  onClose,
  onStart,
}: {
  userId: string;
  accent: string;
  onClose: () => void;
  onStart: (exerciseIds: Id<"exercises">[], routineName?: string) => void;
}) {
  const [mode, setMode] = useState<PickerMode>("routines");
  const [search, setSearch] = useState("");
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);

  const routines = useQuery(api.workout.getRoutines, { userId }) ?? [];
  const exercises = useQuery(api.workout.getExercises, { userId, search: search || undefined }) ?? [];
  const [editExercise, setEditExercise] = useState<(typeof exercises)[0] | null>(null);

  // Once routines have loaded, default to the Exercises tab if the user has none to start from.
  useEffect(() => {
    if (routines.length === 0) setMode("exercises");
  }, [routines.length]);

  return (
    <>
      <BottomSheet
        onClose={onClose}
        className="rounded-t-3xl px-5 pt-4 flex flex-col"
        panelStyle={{
          background: "#1a1a1a",
          maxHeight: "calc(100dvh - 16px)",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom) + 84px)",
        }}
      >
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          {mode === "routines" ? "Start Workout" : "Exercises"}
        </h2>

        {/* Mode switcher */}
        <div className="flex rounded-xl p-1 mb-4" style={{ background: "#252525" }}>
          {(["routines", "exercises"] as PickerMode[]).map((m) => (
            <button
              key={m}
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

        {mode === "routines" ? (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-2">
            {routines.map((routine) => (
              <motion.button
                key={routine._id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStart(routine.exerciseIds, routine.name)}
                className="w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left"
                style={{ background: "#252525" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#f2f2f2] truncate">{routine.name}</p>
                  <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider mt-0.5">
                    {routine.exercises.length} exercise{routine.exercises.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: accent }}>
                  Start
                </span>
              </motion.button>
            ))}

            {routines.length === 0 && (
              <p className="text-center text-[#6a6a6a] text-sm pt-8">
                No routines yet — switch to Exercises to add some, then build a routine
              </p>
            )}
          </div>
        ) : (
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full rounded-xl px-4 py-3 mb-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none"
              style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.05)" }}
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setAddExerciseOpen(true)}
              className="w-full py-2.5 mb-3 rounded-xl text-xs font-medium"
              style={{ background: "#252525", color: accent, border: `1px solid ${accent}44` }}
            >
              + Add new exercise
            </motion.button>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-2">
              <AnimatePresence>
                {exercises.map((ex) => (
                  <ExerciseCard
                    key={ex._id}
                    exercise={ex}
                    accent={accent}
                    onEdit={() => setEditExercise(ex)}
                  />
                ))}
              </AnimatePresence>

              {exercises.length === 0 && (
                <p className="text-center text-[#6a6a6a] text-sm pt-8">
                  {search ? "No exercises found" : "Add your first exercise above"}
                </p>
              )}
            </div>
          </>
        )}
      </BottomSheet>

      {(addExerciseOpen || editExercise) && (
        <AddExerciseSheet
          userId={userId}
          accent={accent}
          editExercise={editExercise ?? undefined}
          onClose={() => { setAddExerciseOpen(false); setEditExercise(null); }}
        />
      )}
    </>
  );
}

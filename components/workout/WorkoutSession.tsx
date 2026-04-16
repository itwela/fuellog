"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function WorkoutSession({
  sessionId,
  accent,
  onEnd,
}: {
  sessionId: Id<"workout_sessions">;
  accent: string;
  onEnd: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sessionExercises = useQuery(api.workout.getSessionExercises, { sessionId }) ?? [];
  const updateSet = useMutation(api.workout.updateSet);
  const completeSession = useMutation(api.workout.completeSession);

  const current = sessionExercises[currentIndex];

  async function handleEndSession() {
    await completeSession({ id: sessionId });
    onEnd();
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-5">
        <p className="text-[#6a6a6a] text-sm">Loading...</p>
      </div>
    );
  }

  const { exercise, sets } = current;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-[#6a6a6a]">
            Exercise {currentIndex + 1} of {sessionExercises.length}
          </p>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleEndSession}
            className="text-xs text-[#6a6a6a] border border-[#3a3a3a] px-3 py-1.5 rounded-lg"
          >
            End Session
          </motion.button>
        </div>

        <h1
          className="text-[48px] leading-none font-black"
          style={{ fontFamily: "var(--font-display)", color: accent }}
        >
          {exercise?.name}
        </h1>
        {exercise?.muscleGroup && (
          <p className="text-[10px] uppercase tracking-widest text-[#6a6a6a] mt-1">{exercise.muscleGroup}</p>
        )}
      </div>

      {/* GIF preview */}
      {exercise?.gifUrl && (
        <div className="px-5 mb-4">
          <img
            src={exercise.gifUrl}
            alt={exercise.name}
            className="w-full rounded-2xl object-cover"
            style={{ maxHeight: 200 }}
          />
        </div>
      )}

      {/* Sets */}
      <div className="flex-1 px-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-[#6a6a6a] mb-3">Sets</p>
        {sets.map((set, i) => (
          <motion.div
            key={i}
            layout
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: set.completed ? "#252525" : "#1a1a1a",
              borderLeft: `3px solid ${set.completed ? accent : "#3a3a3a"}`,
            }}
          >
            <span
              className="text-2xl font-black w-8"
              style={{ fontFamily: "var(--font-display)", color: set.completed ? accent : "#6a6a6a" }}
            >
              {i + 1}
            </span>

            <input
              type="number"
              placeholder={exercise?.defaultReps ?? "Reps"}
              defaultValue={set.reps}
              onBlur={(e) =>
                updateSet({
                  id: current._id,
                  setIndex: i,
                  reps: e.target.value ? Number(e.target.value) : undefined,
                  weight: set.weight,
                  completed: set.completed,
                })
              }
              className="w-16 bg-transparent text-sm text-[#f2f2f2] outline-none placeholder-[#6a6a6a]"
            />
            <span className="text-[10px] text-[#6a6a6a]">reps</span>

            <input
              type="text"
              placeholder={exercise?.defaultWeight ?? "Weight"}
              defaultValue={set.weight}
              onBlur={(e) =>
                updateSet({
                  id: current._id,
                  setIndex: i,
                  reps: set.reps,
                  weight: e.target.value || undefined,
                  completed: set.completed,
                })
              }
              className="flex-1 bg-transparent text-sm text-[#f2f2f2] outline-none placeholder-[#6a6a6a]"
            />

            <motion.button
              whileTap={{ scale: 0.82 }}
              onClick={() =>
                updateSet({
                  id: current._id,
                  setIndex: i,
                  reps: set.reps,
                  weight: set.weight,
                  completed: !set.completed,
                })
              }
              className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
              style={{
                borderColor: set.completed ? accent : "#3a3a3a",
                background: set.completed ? accent : "transparent",
              }}
            >
              {set.completed && (
                <svg width="14" height="14" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Nav between exercises */}
      <div className="flex gap-2 px-4 pb-4 mt-6">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex-1 py-4 rounded-2xl font-bold text-base"
          style={{
            background: "#252525",
            color: currentIndex === 0 ? "#3a3a3a" : "#6a6a6a",
            fontFamily: "var(--font-display)",
          }}
        >
          Prev
        </motion.button>

        {currentIndex < sessionExercises.length - 1 ? (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex-1 py-4 rounded-2xl font-bold text-base"
            style={{ background: accent, color: "#0e0e0e", fontFamily: "var(--font-display)" }}
          >
            Next
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleEndSession}
            className="flex-1 py-4 rounded-2xl font-bold text-base"
            style={{ background: accent, color: "#0e0e0e", fontFamily: "var(--font-display)" }}
          >
            Finish
          </motion.button>
        )}
      </div>
    </div>
  );
}

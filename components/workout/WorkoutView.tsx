"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExerciseCard } from "./ExerciseCard";
import { AddExerciseSheet } from "./AddExerciseSheet";
import { WorkoutSession } from "./WorkoutSession";
import { RoutineSheet } from "./RoutineSheet";
import { AliveCard } from "@/components/AliveCard";

const ACCENT = "#ff5623";
type WorkoutTab = "library" | "routines";

export function WorkoutView({ userId }: { userId: string }) {
  const [tab, setTab] = useState<WorkoutTab>("library");
  const [addOpen, setAddOpen] = useState(false);
  const [routineSheetOpen, setRoutineSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Id<"exercises">[]>([]);
  const [sessionId, setSessionId] = useState<Id<"workout_sessions"> | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [search, setSearch] = useState("");

  const exercises = useQuery(api.workout.getExercises, { userId, search: search || undefined }) ?? [];
  const routines = useQuery(api.workout.getRoutines, { userId }) ?? [];
  const startSession = useMutation(api.workout.startSession);
  const deleteRoutine = useMutation(api.workout.deleteRoutine);

  function toggleSelect(id: Id<"exercises">) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleStartSession(exerciseIds: Id<"exercises">[], routineName?: string) {
    if (exerciseIds.length === 0) return;
    const id = await startSession({ userId, name: routineName ?? "Workout", exerciseIds });
    setSessionId(id);
    setSelecting(false);
    setSelectedIds([]);
  }

  if (sessionId) {
    return <WorkoutSession sessionId={sessionId} accent={ACCENT} onEnd={() => setSessionId(null)} />;
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-5 pt-12 pb-4">
        <p className="text-[10px] font-light uppercase tracking-[0.15em] text-[#6a6a6a]">Training</p>
        <h1
          className="text-[56px] leading-none font-black"
          style={{ fontFamily: "var(--font-display)", color: ACCENT }}
        >
          Workout
        </h1>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl p-1 mx-5 mb-4" style={{ background: "#1a1a1a" }}>
        {(["library", "routines"] as WorkoutTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelecting(false); setSelectedIds([]); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: tab === t ? ACCENT : "transparent",
              color: tab === t ? "#0e0e0e" : "#6a6a6a",
              fontFamily: tab === t ? "var(--font-display)" : undefined,
            }}
          >
            {t === "library" ? "Library" : "Routines"}
          </button>
        ))}
      </div>

      {tab === "library" ? (
        <>
          {/* Search */}
          <div className="px-5 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="w-full bg-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
            />
          </div>

          {/* Action bar */}
          <div className="flex gap-2 px-5 mb-4">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => { setSelecting(!selecting); setSelectedIds([]); }}
              className="flex-1 py-3 rounded-xl text-sm font-bold"
              style={{
                background: selecting ? "#252525" : ACCENT,
                color: selecting ? "#6a6a6a" : "#0e0e0e",
                fontFamily: "var(--font-display)",
              }}
            >
              {selecting ? "Cancel" : "Start Workout"}
            </motion.button>

            {selecting && selectedIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleStartSession(selectedIds)}
                className="px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: ACCENT, color: "#0e0e0e" }}
              >
                Go ({selectedIds.length})
              </motion.button>
            )}
          </div>

          {/* Exercise list */}
          <div className="flex-1 px-4 space-y-2">
            <AnimatePresence>
              {exercises.map((ex) => (
                <ExerciseCard
                  key={ex._id}
                  exercise={ex}
                  accent={ACCENT}
                  selectable={selecting}
                  selected={selectedIds.includes(ex._id)}
                  onToggleSelect={() => toggleSelect(ex._id)}
                />
              ))}
            </AnimatePresence>

            {exercises.length === 0 && (
              <p className="text-center text-[#6a6a6a] text-sm pt-8">
                {search ? "No exercises found" : "Add your first exercise below"}
              </p>
            )}
          </div>

          {/* FAB */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setAddOpen(true)}
            className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40"
            style={{ background: ACCENT }}
          >
            <svg width="24" height="24" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </motion.button>
        </>
      ) : (
        <>
          {/* Routines list */}
          <div className="flex-1 px-4 space-y-3">
            <AnimatePresence>
              {routines.map((routine) => (
                <AliveCard
                  key={routine._id}
                  seed={`routine:${routine._id}`}
                  accent={ACCENT}
                  className="rounded-2xl overflow-hidden"
                  style={{ borderLeft: `3px solid ${ACCENT}` }}
                >
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-lg text-[#f2f2f2] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                          {routine.name}
                        </p>
                        <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider mt-0.5">
                          {routine.exercises.length} exercise{routine.exercises.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => deleteRoutine({ id: routine._id })}
                        className="p-1.5 text-[#6a6a6a] shrink-0 ml-2"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </motion.button>
                    </div>

                    {/* Exercise chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {routine.exercises.map((ex) => ex && (
                        <span
                          key={ex._id}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium"
                          style={{ background: "#252525", color: "#b0b0b0" }}
                        >
                          {ex.name}
                        </span>
                      ))}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStartSession(routine.exerciseIds, routine.name)}
                      className="w-full py-3 rounded-xl text-sm font-bold"
                      style={{ background: ACCENT, color: "#0e0e0e", fontFamily: "var(--font-display)" }}
                    >
                      Start {routine.name}
                    </motion.button>
                  </div>
                </AliveCard>
              ))}
            </AnimatePresence>

            {routines.length === 0 && (
              <p className="text-center text-[#6a6a6a] text-sm pt-8">
                No routines yet — create one to group exercises together
              </p>
            )}
          </div>

          {/* FAB */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setRoutineSheetOpen(true)}
            className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40"
            style={{ background: ACCENT }}
          >
            <svg width="24" height="24" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </motion.button>
        </>
      )}

      <AnimatePresence>
        {addOpen && (
          <AddExerciseSheet
            userId={userId}
            accent={ACCENT}
            onClose={() => setAddOpen(false)}
          />
        )}
        {routineSheetOpen && (
          <RoutineSheet
            userId={userId}
            onClose={() => setRoutineSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

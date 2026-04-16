"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExerciseCard } from "./ExerciseCard";
import { AddExerciseSheet } from "./AddExerciseSheet";
import { WorkoutSession } from "./WorkoutSession";

const ACCENT = "#ff5623";

export function WorkoutView({ userId }: { userId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Id<"exercises">[]>([]);
  const [sessionId, setSessionId] = useState<Id<"workout_sessions"> | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [search, setSearch] = useState("");

  const exercises = useQuery(api.workout.getExercises, { userId, search: search || undefined }) ?? [];
  const startSession = useMutation(api.workout.startSession);

  function toggleSelect(id: Id<"exercises">) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleStartSession() {
    if (selectedIds.length === 0) return;
    const id = await startSession({ userId, name: "Workout", exerciseIds: selectedIds });
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
        <p className="text-[10px] font-light uppercase tracking-[0.15em] text-[#6a6a6a]">Exercise library</p>
        <h1
          className="text-[56px] leading-none font-black"
          style={{ fontFamily: "var(--font-display)", color: ACCENT }}
        >
          Workout
        </h1>
      </div>

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
            onClick={handleStartSession}
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

      <AnimatePresence>
        {addOpen && (
          <AddExerciseSheet
            userId={userId}
            accent={ACCENT}
            onClose={() => setAddOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

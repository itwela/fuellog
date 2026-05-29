"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const ACCENT = "#ff5623";

export function RoutineSheet({
  userId,
  onClose,
  editRoutineId,
}: {
  userId: string;
  onClose: () => void;
  editRoutineId?: Id<"workout_routines"> | null;
}) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Id<"exercises">[]>([]);
  const [search, setSearch] = useState("");

  const exercises = useQuery(api.workout.getExercises, { userId, search: search || undefined }) ?? [];
  const createRoutine = useMutation(api.workout.createRoutine);

  function toggle(id: Id<"exercises">) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!name.trim() || selectedIds.length === 0) return;
    await createRoutine({ userId, name: name.trim(), exerciseIds: selectedIds });
    onClose();
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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4"
        style={{
          background: "#1a1a1a",
          maxHeight: "90dvh",
          overflowY: "auto",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5" />
        <h2 className="text-xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>
          New Routine
        </h2>

        <div className="mb-4">
          <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-1">Routine name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day, Leg Day, Full Body"
            className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
          />
        </div>

        <div className="mb-3">
          <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-1">
            Pick exercises
            {selectedIds.length > 0 && (
              <span style={{ color: ACCENT }} className="ml-2 normal-case">
                {selectedIds.length} selected
              </span>
            )}
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#252525] rounded-xl px-4 py-2.5 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none mb-2"
          />
        </div>

        <div className="space-y-1.5 mb-5" style={{ maxHeight: 280, overflowY: "auto" }}>
          {exercises.map((ex) => {
            const sel = selectedIds.includes(ex._id);
            return (
              <motion.button
                key={ex._id}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggle(ex._id)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                style={{
                  background: sel ? `${ACCENT}22` : "#252525",
                  borderLeft: `3px solid ${sel ? ACCENT : "#3a3a3a"}`,
                }}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: sel ? ACCENT : "#3a3a3a",
                    background: sel ? ACCENT : "transparent",
                  }}
                >
                  {sel && (
                    <svg width="10" height="10" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f2f2f2] truncate">{ex.name}</p>
                  {ex.muscleGroup && (
                    <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider">{ex.muscleGroup}</p>
                  )}
                </div>
              </motion.button>
            );
          })}
          {exercises.length === 0 && (
            <p className="text-center text-[#6a6a6a] text-sm py-4">
              {search ? "No exercises found" : "No exercises yet — add some first"}
            </p>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          disabled={!name.trim() || selectedIds.length === 0}
          className="w-full py-4 rounded-2xl font-bold text-base"
          style={{
            background: ACCENT,
            color: "#0e0e0e",
            opacity: name.trim() && selectedIds.length > 0 ? 1 : 0.4,
            fontFamily: "var(--font-display)",
          }}
        >
          Save Routine ({selectedIds.length} exercise{selectedIds.length !== 1 ? "s" : ""})
        </motion.button>
      </motion.div>
    </>
  );
}

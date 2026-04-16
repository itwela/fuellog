"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Glutes", "Core", "Cardio", "Full Body"];

export function AddExerciseSheet({
  userId,
  accent,
  onClose,
}: {
  userId: string;
  accent: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [gifUrl, setGifUrl] = useState("");

  const addExercise = useMutation(api.workout.addExercise);

  async function handleSave() {
    if (!name.trim()) return;
    await addExercise({
      userId,
      name: name.trim(),
      muscleGroup: muscleGroup || undefined,
      defaultSets: sets ? Number(sets) : undefined,
      defaultReps: reps || undefined,
      defaultWeight: weight || undefined,
      gifUrl: gifUrl.trim() || undefined,
    });
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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4 pb-8"
        style={{ background: "#1a1a1a", maxHeight: "90dvh", overflowY: "auto" }}
      >
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5" />
        <h2 className="text-xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>
          Add Exercise
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-1">Exercise name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press"
              className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-2">Muscle group</label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={mg}
                  onClick={() => setMuscleGroup(mg === muscleGroup ? "" : mg)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: muscleGroup === mg ? accent : "#252525",
                    color: muscleGroup === mg ? "#0e0e0e" : "#6a6a6a",
                  }}
                >
                  {mg}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              ["Sets", sets, setSets],
              ["Reps", reps, setReps],
              ["Weight", weight, setWeight],
            ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-1">{label}</label>
                <input
                  type={label !== "Weight" ? "number" : "text"}
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={label === "Weight" ? "lbs" : "0"}
                  className="w-full bg-[#252525] rounded-xl px-3 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-1">GIF / Video URL</label>
            <input
              value={gifUrl}
              onChange={(e) => setGifUrl(e.target.value)}
              placeholder="Paste a GIF or image URL..."
              className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
            />
            {gifUrl.trim() && (
              <img
                src={gifUrl.trim()}
                alt="preview"
                className="w-full rounded-xl mt-2 object-cover"
                style={{ maxHeight: 160 }}
              />
            )}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full mt-6 py-4 rounded-2xl font-bold text-base"
          style={{
            background: accent,
            color: "#0e0e0e",
            opacity: name.trim() ? 1 : 0.4,
            fontFamily: "var(--font-display)",
          }}
        >
          Add Exercise
        </motion.button>
      </motion.div>
    </>
  );
}

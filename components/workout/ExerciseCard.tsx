"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";

interface Exercise {
  _id: Id<"exercises">;
  name: string;
  muscleGroup?: string | null;
  defaultSets?: number | null;
  defaultReps?: string | null;
  defaultWeight?: string | null;
  gifUrl?: string | null;
}

export function ExerciseCard({
  exercise,
  accent,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  exercise: Exercise;
  accent: string;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const setsReps =
    exercise.defaultSets != null
      ? `${exercise.defaultSets}×${exercise.defaultReps ?? "—"}`
      : null;

  const showMetaRow = !!(exercise.muscleGroup || exercise.defaultWeight);

  return (
    <AliveCard
      seed={`exercise:${exercise._id}`}
      accent={selected ? accent : "#3a3a3a"}
      className="rounded-2xl overflow-hidden"
      style={{
        borderLeft: `3px solid ${selected ? accent : "#3a3a3a"}`,
        outline: selected ? `1px solid ${accent}33` : "none",
      }}
    >
      <div
        className="flex flex-col gap-2 px-4 py-3 cursor-pointer"
        onClick={selectable ? onToggleSelect : () => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {selectable && (
              <motion.div
                animate={{ scale: selected ? 1 : 0.9 }}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  borderColor: selected ? accent : "#3a3a3a",
                  background: selected ? accent : "transparent",
                }}
              >
                {selected && (
                  <svg width="12" height="12" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </motion.div>
            )}
            <p className="font-medium text-[#f2f2f2] text-sm leading-snug flex-1 min-w-0 line-clamp-2 break-words">
              {exercise.name}
            </p>
          </div>

          <div className="flex items-start gap-2 shrink-0 text-[#6a6a6a]">
            {setsReps && (
              <span className="text-xs font-medium tabular-nums leading-snug text-right pt-0.5">{setsReps}</span>
            )}
            {exercise.gifUrl && (
              <svg width="14" height="14" fill="none" stroke={accent} strokeWidth="1.5" viewBox="0 0 24 24" className="shrink-0 mt-0.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                />
              </svg>
            )}
            {!selectable && (
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="pt-0.5">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </motion.div>
            )}
          </div>
        </div>

        {showMetaRow && (
          <div className={`flex items-center justify-between gap-2 ${selectable ? "pl-8" : ""}`}>
            <div className="flex flex-col items-start gap-0.5 min-w-0">
              {exercise.muscleGroup && (
                <span className="text-[10px] uppercase tracking-wider text-[#6a6a6a] leading-none">
                  {exercise.muscleGroup}
                </span>
              )}
              {exercise.defaultWeight && (
                <span className="text-[9px] text-[#6a6a6a] leading-none tabular-nums">{exercise.defaultWeight}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && !selectable && exercise.gifUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <img
                src={exercise.gifUrl}
                alt={exercise.name}
                className="w-full rounded-xl object-cover"
                style={{ maxHeight: 200 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AliveCard>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DraggableReorderList, type ReorderItem } from "@/components/lightswind/draggable-reorder-list";

const ACCENT = "#ff5623";

interface EditRoutine {
  _id: Id<"workout_routines">;
  name: string;
  exerciseIds: Id<"exercises">[];
}

export function RoutineSheet({
  userId,
  onClose,
  editRoutine,
}: {
  userId: string;
  onClose: () => void;
  editRoutine?: EditRoutine;
}) {
  const isEdit = !!editRoutine;
  const [name, setName] = useState(editRoutine?.name ?? "");
  const [selectedIds, setSelectedIds] = useState<Id<"exercises">[]>(editRoutine?.exerciseIds ?? []);
  const allExercises = useQuery(api.workout.getExercises, { userId }) ?? [];
  const [search, setSearch] = useState("");

  const exercises = useQuery(api.workout.getExercises, { userId, search: search || undefined }) ?? [];

  // Each selected entry gets a unique instance id (`${exerciseId}__${index}`) so
  // the same exercise can appear multiple times without key collisions in the list.
  const selectedReorderItems: ReorderItem[] = selectedIds.map((id, i) => {
    const ex = allExercises.find((e) => e._id === id);
    return { id: `${id}__${i}`, label: ex?.name ?? id, description: ex?.muscleGroup ?? undefined };
  });
  const createRoutine = useMutation(api.workout.createRoutine);
  const updateRoutine = useMutation(api.workout.updateRoutine);

  function add(id: Id<"exercises">) {
    setSelectedIds((prev) => [...prev, id]);
  }

  function instanceToExerciseId(instanceId: string): Id<"exercises"> {
    return instanceId.slice(0, instanceId.lastIndexOf("__")) as Id<"exercises">;
  }

  async function handleSave() {
    if (!name.trim() || selectedIds.length === 0) return;
    if (isEdit && editRoutine) {
      await updateRoutine({ id: editRoutine._id, name: name.trim(), exerciseIds: selectedIds });
    } else {
      await createRoutine({ userId, name: name.trim(), exerciseIds: selectedIds });
    }
    onClose();
  }

  return (
    <BottomSheet
      onClose={onClose}
      className="rounded-t-3xl px-5 pt-4"
      panelStyle={{
        background: "#1a1a1a",
        maxHeight: "calc(100dvh - 16px)",
        overflowY: "auto",
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom) + 84px)",
      }}
    >
        <h2 className="text-xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>
          {isEdit ? "Edit Routine" : "New Routine"}
        </h2>

        <div className="mb-4">
          <label className="text-xs font-medium text-[#6a6a6a] block mb-1">Routine name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day, Leg Day, Full Body"
            className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="mb-4">
            <label className="text-xs font-medium text-[#6a6a6a] block mb-2">
              Order <span style={{ color: ACCENT }}>({selectedIds.length})</span>
            </label>
            <DraggableReorderList
              // Key includes allExercises.length so the list remounts once exercises load in,
              // giving items proper labels instead of raw IDs.
              key={selectedIds.slice().sort().join(",") + "_" + allExercises.length}
              items={selectedReorderItems}
              removable
              onReorder={(items) =>
                setSelectedIds(items.map((i) => instanceToExerciseId(i.id)))
              }
            />
          </div>
        )}

        <div className="mb-3">
          <label className="text-xs font-medium text-[#6a6a6a] block mb-1">
            Add exercises
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#252525] rounded-xl px-4 py-2.5 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none mb-2"
          />
        </div>

        <div className="space-y-1.5 mb-5">
          {exercises.map((ex) => {
            const count = selectedIds.filter((i) => i === ex._id).length;
            const sel = count > 0;
            return (
              <motion.button
                key={ex._id}
                whileTap={{ scale: 0.97 }}
                onClick={() => add(ex._id)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                style={{
                  background: sel ? `${ACCENT}18` : "#252525",
                  outline: sel ? `1px solid ${ACCENT}44` : "none",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f2f2f2] truncate">{ex.name}</p>
                  {ex.muscleGroup && (
                    <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider">{ex.muscleGroup}</p>
                  )}
                </div>
                {count > 0 && (
                  <span
                    className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${ACCENT}26`, color: ACCENT }}
                  >
                    ×{count}
                  </span>
                )}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: ACCENT, color: "#0e0e0e" }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
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
    </BottomSheet>
  );
}

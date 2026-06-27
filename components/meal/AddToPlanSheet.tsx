"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { useSheetDismiss } from "@/lib/useSheetDismiss";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface MealData {
  name: string;
  mealType: MealType;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  fiber?: number | null;
  sugar?: number | null;
}

const DAYS = [
  { key: "monday",    short: "Mon" },
  { key: "tuesday",   short: "Tue" },
  { key: "wednesday", short: "Wed" },
  { key: "thursday",  short: "Thu" },
  { key: "friday",    short: "Fri" },
  { key: "saturday",  short: "Sat" },
  { key: "sunday",    short: "Sun" },
];

const ACCENT = "#c084fc";

export function AddToPlanSheet({
  userId,
  meal,
  onClose,
}: {
  userId: string;
  meal: MealData;
  onClose: () => void;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<Id<"meal_plans"> | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const plans = useQuery(api.mealplans.list, { userId }) ?? [];
  const addItem = useMutation(api.mealplans.addItem);
  const { dragProps, startDrag } = useSheetDismiss(onClose);

  async function handleAdd() {
    if (!selectedPlanId) return;
    setSaving(true);
    try {
      await addItem({
        planId: selectedPlanId,
        name: meal.name,
        day: selectedDay ?? undefined,
        mealType: meal.mealType,
        calories: meal.calories ?? undefined,
        protein: meal.protein ?? undefined,
        fat: meal.fat ?? undefined,
        carbs: meal.carbs ?? undefined,
        fiber: meal.fiber ?? undefined,
        sugar: meal.sugar ?? undefined,
        order: Date.now(),
      });
      setDone(true);
      setTimeout(onClose, 900);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 40 }}
        {...dragProps}
        className="fixed inset-x-0 bottom-0 z-50 px-5 pt-3 pb-10 rounded-t-[20px]"
        style={{
          background: "#1a1a1a",
          maxHeight: "80dvh",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div onPointerDown={startDrag} className="w-10 h-1 rounded-full bg-[#3a3a3c] mx-auto mb-4 touch-none cursor-grab" />

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-8"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}22` }}>
                <svg width="28" height="28" fill="none" stroke={ACCENT} strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-base font-semibold text-[#f2f2f2]">Added to plan</p>
            </motion.div>
          ) : (
            <motion.div key="form" className="flex flex-col gap-5">
              {/* Header */}
              <div>
                <p className="text-xs font-medium text-[#6a6a6a] mb-0.5">Adding to plan</p>
                <p className="text-lg font-semibold text-[#f2f2f2] leading-snug" style={{ letterSpacing: "-0.02em" }}>
                  {meal.name}
                </p>
              </div>

              {/* Plan picker */}
              <div>
                <p className="text-xs font-medium text-[#6a6a6a] mb-2">Choose a plan</p>
                {plans.length === 0 ? (
                  <p className="text-sm text-[#4a4a4a]">No meal plans yet — create one in the Plans tab.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {plans.map((plan) => (
                      <button
                        key={plan._id}
                        onClick={() => setSelectedPlanId(plan._id)}
                        className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all"
                        style={{
                          background: selectedPlanId === plan._id ? `${ACCENT}18` : "#252525",
                          border: `1px solid ${selectedPlanId === plan._id ? ACCENT : "rgba(255,255,255,0.05)"}`,
                          color: selectedPlanId === plan._id ? ACCENT : "#f2f2f2",
                        }}
                      >
                        <span>{plan.name}</span>
                        <span className="text-[10px] font-normal opacity-50">{plan.itemCount} items</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Day picker */}
              {selectedPlanId && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="text-xs font-medium text-[#6a6a6a] mb-2">
                    Which day? <span className="opacity-50">(optional)</span>
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => setSelectedDay(selectedDay === d.key ? null : d.key)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: selectedDay === d.key ? ACCENT : "#252525",
                          color: selectedDay === d.key ? "#0e0e0e" : "#6a6a6a",
                          border: `1px solid ${selectedDay === d.key ? ACCENT : "rgba(255,255,255,0.05)"}`,
                        }}
                      >
                        {d.short}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Add button */}
              {selectedPlanId && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdd}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl font-semibold text-[15px]"
                  style={{ background: ACCENT, color: "#0e0e0e", opacity: saving ? 0.6 : 1, letterSpacing: "-0.01em" }}
                >
                  {saving ? "Adding…" : selectedDay ? `Add to ${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}` : "Add (no specific day)"}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

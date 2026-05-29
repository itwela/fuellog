"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PlanItemSheet } from "./PlanItemSheet";

const ACCENT = "#c084fc";

const TYPE_COLOR: Record<string, string> = {
  breakfast: "#fdcb40",
  lunch: "#b6ff4a",
  dinner: "#ff5623",
  snack: "#4abaff",
};

export function PlanDetailSheet({
  planId,
  planName,
  onClose,
}: {
  planId: Id<"meal_plans">;
  planName: string;
  onClose: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const items = useQuery(api.mealplans.getItems, { planId }) ?? [];
  const removeItem = useMutation(api.mealplans.removeItem);

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
          background: "#0e0e0e",
          maxHeight: "90dvh",
          overflowY: "auto",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#6a6a6a]">Meal Plan</p>
            <h2
              className="text-3xl font-black leading-tight"
              style={{ fontFamily: "var(--font-display)", color: ACCENT }}
            >
              {planName}
            </h2>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setAddOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: ACCENT }}
          >
            <svg width="20" height="20" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </motion.button>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#6a6a6a] text-sm">No meals yet</p>
            <p className="text-[10px] text-[#3a3a3a] mt-1">Tap + to add meals to this plan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {["breakfast", "lunch", "dinner", "snack"].map((type) => {
              const group = items.filter((i) => i.mealType === type);
              if (group.length === 0) return null;
              return (
                <div key={type}>
                  <p
                    className="text-[10px] uppercase tracking-[0.15em] mb-2 px-1"
                    style={{ color: TYPE_COLOR[type] }}
                  >
                    {type}
                  </p>
                  {group.map((item) => (
                    <motion.div
                      key={item._id}
                      layout
                      className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-1.5"
                      style={{ background: "#1a1a1a", borderLeft: `3px solid ${TYPE_COLOR[type]}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#f2f2f2] truncate">{item.name}</p>
                        {item.calories != null && (
                          <p className="text-[10px] text-[#6a6a6a] mt-0.5">
                            {item.calories} kcal
                            {item.protein != null && ` · P: ${item.protein}g`}
                            {item.carbs != null && ` · C: ${item.carbs}g`}
                            {item.fat != null && ` · F: ${item.fat}g`}
                          </p>
                        )}
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => removeItem({ id: item._id })}
                        className="p-1 text-[#6a6a6a] shrink-0"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {addOpen && (
            <PlanItemSheet
              planId={planId}
              accent={ACCENT}
              itemCount={items.length}
              onClose={() => setAddOpen(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { useSheetDismiss } from "@/lib/useSheetDismiss";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PlanItemSheet } from "./PlanItemSheet";
import { DraggableReorderList, type ReorderItem } from "@/components/lightswind/draggable-reorder-list";

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
  const reorderItems = useMutation(api.mealplans.reorderItems);
  const { dragProps, startDrag } = useSheetDismiss(onClose);

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
        {...dragProps}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4"
        style={{
          background: "#0e0e0e",
          maxHeight: "90dvh",
          overflowY: "auto",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        }}
      >
        <div onPointerDown={startDrag} className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5 touch-none cursor-grab" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-medium text-[#6a6a6a]">Meal Plan</p>
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
          <div className="space-y-4">
            {["breakfast", "lunch", "dinner", "snack"].map((type) => {
              const group = items.filter((i) => i.mealType === type).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              if (group.length === 0) return null;
              const reorderList: ReorderItem[] = group.map((item) => ({
                id: item._id,
                label: item.name,
                description: [
                  item.calories != null && `${item.calories} kcal`,
                  item.protein != null && `P: ${item.protein}g`,
                  item.carbs != null && `C: ${item.carbs}g`,
                  item.fat != null && `F: ${item.fat}g`,
                ].filter(Boolean).join(" · ") || undefined,
              }));
              return (
                <div key={type}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-2 px-1" style={{ color: TYPE_COLOR[type] }}>
                    {type}
                  </p>
                  <DraggableReorderList
                    key={group.map(i => i._id).join(",")}
                    items={reorderList}
                    removable
                    onReorder={(newOrder) => {
                      const removed = reorderList.find(r => !newOrder.find(n => n.id === r.id));
                      if (removed) {
                        removeItem({ id: removed.id as Id<"meal_plan_items"> });
                      } else {
                        reorderItems({ ids: newOrder.map(i => i.id as Id<"meal_plan_items">) });
                      }
                    }}
                  />
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

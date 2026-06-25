"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DraggableReorderList, type ReorderItem } from "@/components/lightswind/draggable-reorder-list";
import { PlanItemSheet } from "./PlanItemSheet";
import { EditPlanItemSheet } from "./EditPlanItemSheet";

const ACCENT = "#c084fc";

const TYPE_COLOR: Record<string, string> = {
  breakfast: "#fdcb40",
  lunch: "#b6ff4a",
  dinner: "#ff5623",
  snack: "#4abaff",
};

const DAY_LABEL: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

export function PlanDayView({
  planId,
  planName,
  day,
  onBack,
}: {
  planId: Id<"meal_plans">;
  planName: string;
  day: string;
  onBack: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<Id<"meal_plan_items"> | null>(null);

  const allItems = useQuery(api.mealplans.getItems, { planId }) ?? [];
  const removeItem = useMutation(api.mealplans.removeItem);
  const reorderItems = useMutation(api.mealplans.reorderItems);

  const dayItems = allItems
    .filter((i) => i.day === day)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const totalKcal = dayItems.reduce((s, i) => s + (i.calories ?? 0), 0);
  const totalProtein = dayItems.reduce((s, i) => s + (i.protein ?? 0), 0);
  const totalCarbs = dayItems.reduce((s, i) => s + (i.carbs ?? 0), 0);
  const totalFat = dayItems.reduce((s, i) => s + (i.fat ?? 0), 0);

  const editItem = editItemId ? allItems.find((i) => i._id === editItemId) : null;

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-start gap-3">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onBack}
          className="mt-1 text-[#6a6a6a]"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </motion.button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#6a6a6a]">{planName}</p>
          <h1
            className="text-[36px] leading-none font-bold"
            style={{ color: ACCENT, letterSpacing: "-0.03em" }}
          >
            {DAY_LABEL[day]}
          </h1>
        </div>
      </div>

      {/* Macro summary bar */}
      {dayItems.length > 0 && (
        <div
          className="mx-4 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-2"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="text-center">
            <p className="text-lg font-bold leading-none" style={{ color: ACCENT }}>{totalKcal}</p>
            <p className="text-[9px] text-[#6a6a6a] mt-0.5">kcal</p>
          </div>
          <div className="w-px h-6 bg-[#2a2a2a]" />
          <div className="text-center flex-1">
            <p className="text-sm font-semibold" style={{ color: "#b6ff4a" }}>{Math.round(totalProtein)}g</p>
            <p className="text-[9px] text-[#6a6a6a]">protein</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-semibold" style={{ color: "#4abaff" }}>{Math.round(totalCarbs)}g</p>
            <p className="text-[9px] text-[#6a6a6a]">carbs</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm font-semibold" style={{ color: "#fdcb40" }}>{Math.round(totalFat)}g</p>
            <p className="text-[9px] text-[#6a6a6a]">fat</p>
          </div>
        </div>
      )}

      {/* Meals grouped by type */}
      <div className="flex-1 px-4 space-y-5">
        {dayItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#6a6a6a] text-sm">Nothing planned for {DAY_LABEL[day]}</p>
            <p className="text-[10px] text-[#3a3a3a] mt-1">Tap + to add meals</p>
          </div>
        ) : (
          (["breakfast", "lunch", "dinner", "snack"] as const).map((type) => {
            const group = dayItems.filter((i) => i.mealType === type);
            if (group.length === 0) return null;

            const groupKcal = group.reduce((s, i) => s + (i.calories ?? 0), 0);
            const groupProtein = group.reduce((s, i) => s + (i.protein ?? 0), 0);

            const reorderList: ReorderItem[] = group.map((item) => ({
              id: item._id,
              label: item.name,
              description: [
                item.calories != null && `${item.calories} kcal`,
                item.protein != null && `P ${item.protein}g`,
                item.carbs != null && `C ${item.carbs}g`,
                item.fat != null && `F ${item.fat}g`,
              ].filter(Boolean).join("  ·  ") || undefined,
            }));

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: TYPE_COLOR[type] }} />
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: TYPE_COLOR[type] }}
                  >
                    {type}
                  </p>
                  <div className="flex-1" />
                  <p className="text-[10px] font-medium tabular-nums" style={{ color: "#b6ff4a" }}>
                    {groupKcal} kcal
                  </p>
                  <span className="text-[#3a3a3a] text-[10px]">·</span>
                  <p className="text-[10px] font-medium tabular-nums" style={{ color: "#b6ff4a" }}>
                    {Math.round(groupProtein)}g P
                  </p>
                </div>
                <DraggableReorderList
                  key={group.map((i) => i._id).join(",")}
                  items={reorderList}
                  removable
                  onEditItem={(id) => setEditItemId(id as Id<"meal_plan_items">)}
                  onReorder={(newOrder) => {
                    const removed = reorderList.find((r) => !newOrder.find((n) => n.id === r.id));
                    if (removed) {
                      removeItem({ id: removed.id as Id<"meal_plan_items"> });
                    } else {
                      reorderItems({ ids: newOrder.map((i) => i.id as Id<"meal_plan_items">) });
                    }
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 md:bottom-8 md:right-8"
        style={{ background: ACCENT }}
      >
        <svg width="24" height="24" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {addOpen && (
          <PlanItemSheet
            planId={planId}
            accent={ACCENT}
            itemCount={allItems.length}
            day={day}
            onClose={() => setAddOpen(false)}
          />
        )}
        {editItem && (
          <EditPlanItemSheet
            key={editItem._id}
            item={editItem}
            accent={ACCENT}
            onClose={() => setEditItemId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

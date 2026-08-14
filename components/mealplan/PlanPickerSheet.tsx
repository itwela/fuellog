"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const ACCENT = "#c084fc";

export function PlanPickerSheet({
  userId,
  logDate,
  onClose,
}: {
  userId: string;
  logDate: string;
  onClose: () => void;
}) {
  const plans = useQuery(api.mealplans.list, { userId }) ?? [];
  const logMeal = useMutation(api.meals.log);

  return (
    <BottomSheet
      onClose={onClose}
      className="rounded-t-3xl px-5 pt-4 pb-10"
      panelStyle={{ background: "#1a1a1a", maxHeight: "80dvh", overflowY: "auto" }}
    >
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Load a Plan
        </h2>
        <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider mb-5">
          All meals from the plan will be added to this day
        </p>

        <div className="space-y-2">
          {plans.map((plan) => (
            <PlanApplyRow
              key={plan._id}
              planId={plan._id}
              planName={plan.name}
              itemCount={plan.itemCount}
              userId={userId}
              logDate={logDate}
              logMeal={logMeal}
              isLoading={false}
              onDone={onClose}
            />
          ))}
          {plans.length === 0 && (
            <p className="text-center text-[#6a6a6a] text-sm py-8">No plans yet — create one in the Plans tab</p>
          )}
        </div>
    </BottomSheet>
  );
}

function PlanApplyRow({
  planId,
  planName,
  itemCount,
  userId,
  logDate,
  logMeal,
  isLoading,
  onDone,
}: {
  planId: Id<"meal_plans">;
  planName: string;
  itemCount: number;
  userId: string;
  logDate: string;
  logMeal: ReturnType<typeof useMutation<typeof import("@/convex/_generated/api").api.meals.log>>;
  isLoading: boolean;
  onDone: () => void;
}) {
  const items = useQuery(api.mealplans.getItems, { planId }) ?? [];
  const [busy, setBusy] = useState(false);

  async function apply() {
    if (items.length === 0) return;
    setBusy(true);
    await Promise.all(
      items.map((item) =>
        logMeal({
          userId,
          name: item.name,
          mealType: item.mealType,
          calories: item.calories ?? undefined,
          protein: item.protein ?? undefined,
          fat: item.fat ?? undefined,
          carbs: item.carbs ?? undefined,
          fiber: item.fiber ?? undefined,
          sugar: item.sugar ?? undefined,
          aiEstimated: false,
          logDate,
        })
      )
    );
    setBusy(false);
    onDone();
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={apply}
      disabled={busy || isLoading || items.length === 0}
      className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-4"
      style={{ background: "#252525", opacity: busy ? 0.6 : 1 }}
    >
      <div className="text-left min-w-0">
        <p className="font-bold text-[#f2f2f2] text-sm truncate">{planName}</p>
        <p className="text-[10px] text-[#6a6a6a] mt-0.5">
          {itemCount === 0 ? "Empty plan" : `${itemCount} meal${itemCount !== 1 ? "s" : ""}`}
        </p>
      </div>
      {busy ? (
        <svg className="animate-spin shrink-0" width="18" height="18" fill="none" stroke="#c084fc" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M12 3a9 9 0 1 1 0 18A9 9 0 0 1 12 3Z" />
        </svg>
      ) : (
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0"
          style={{ background: "#c084fc", color: "#0e0e0e" }}
        >
          Load
        </div>
      )}
    </motion.button>
  );
}

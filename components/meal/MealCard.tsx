"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function storedQty(log: Doc<"meal_logs">): number {
  const q = log.quantity;
  return q != null && q > 0 ? q : 1;
}

export function MealCard({
  log,
  accent,
  userId,
  onEdit,
}: {
  log: Doc<"meal_logs">;
  accent: string;
  userId: string;
  onEdit: (log: Doc<"meal_logs">) => void;
}) {
  const savedQty = storedQty(log);
  const [pendingQty, setPendingQty] = useState(savedQty);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [savingQty, setSavingQty] = useState(false);

  useEffect(() => {
    setPendingQty(savedQty);
  }, [log._id, log.quantity]);

  const remove = useMutation(api.meals.remove);
  const updateLog = useMutation(api.meals.update);
  const upsertFoodBank = useMutation(api.foodbank.upsert);

  const dirtyQty = pendingQty !== savedQty;
  const displayCalories = Math.round((log.calories ?? 0) * pendingQty);
  const showQtyChip = pendingQty > 1 || dirtyQty;

  async function handleSaveQty(e: React.MouseEvent) {
    e.stopPropagation();
    if (!dirtyQty) return;
    setSavingQty(true);
    try {
      await updateLog({
        id: log._id,
        userId,
        name: log.name,
        mealType: log.mealType,
        calories: log.calories,
        protein: log.protein,
        fat: log.fat,
        carbs: log.carbs,
        fiber: log.fiber,
        sugar: log.sugar,
        quantity: pendingQty,
      });
    } finally {
      setSavingQty(false);
    }
  }

  async function handleUpdateFoodBank(e: React.MouseEvent) {
    e.stopPropagation();
    await upsertFoodBank({
      userId,
      name: log.name,
      calories: log.calories ?? undefined,
      protein: log.protein ?? undefined,
      fat: log.fat ?? undefined,
      carbs: log.carbs ?? undefined,
      fiber: log.fiber ?? undefined,
      sugar: log.sugar ?? undefined,
    });
    setBankSaved(true);
    setTimeout(() => setBankSaved(false), 2000);
  }

  async function confirmRemove() {
    await remove({ id: log._id, userId });
    setConfirmDelete(false);
  }

  return (
    <>
      <AliveCard
        seed={`meal:${log._id}`}
        role="button"
        tabIndex={0}
        onClick={() => onEdit(log)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit(log);
          }
        }}
        accent={accent}
        className="flex flex-col gap-2 px-4 py-3.5 cursor-pointer text-left w-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e0e] focus-visible:ring-[#6a6a6a]"
      >
        {/* Row 1: title (max 2 lines) ←→ kcal + delete */}
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-[#f2f2f2] text-sm leading-snug flex-1 min-w-0 line-clamp-2 break-words">
            {log.name}
          </p>
          <div className="flex items-start gap-1 shrink-0">
            <div className="flex flex-col items-end">
              <span
                className="text-lg font-bold leading-none tabular-nums"
                style={{
                  color: dirtyQty || pendingQty > 1 ? "#fdcb40" : accent,
                  letterSpacing: "-0.02em",
                }}
              >
                {displayCalories}
              </span>
              <span className="text-[10px] text-[#6a6a6a] leading-none mt-0.5">kcal</span>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              className="p-1 rounded-full shrink-0 -mr-0.5"
              style={{ color: "#6a6a6a" }}
              aria-label="Remove meal"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Row 2: meal type + qty label + AI (stacked) ←→ stepper + bank */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col items-start gap-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="text-[10px] font-medium text-[#6a6a6a] leading-none capitalize">
                {log.mealType}
              </span>
              {showQtyChip && (
                <span
                  className="text-[9px] font-semibold tabular-nums leading-none px-1 py-0.5 rounded border"
                  style={{
                    color: dirtyQty ? "#fdcb40" : "#6a6a6a",
                    borderColor: dirtyQty ? "#fdcb40" : "#4a4a4a",
                  }}
                >
                  ×{pendingQty}
                </span>
              )}
            </div>
            {log.aiEstimated && (
              <span className="text-[9px] font-medium text-[#6a6a6a] border border-[rgba(84,84,88,0.5)] rounded-md px-1.5 leading-none py-0.5 w-fit">
                AI est.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPendingQty((q) => Math.max(1, q - 1))}
              className="w-4 h-3.5 flex items-center justify-center text-[#6a6a6a] hover:text-[#f2f2f2] transition-colors"
              aria-label="Decrease quantity"
            >
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              onClick={dirtyQty ? handleSaveQty : undefined}
              disabled={savingQty || !dirtyQty}
              className="text-[9px] font-light min-w-[40px] text-center transition-colors disabled:opacity-40"
              style={{ color: dirtyQty ? "#fdcb40" : "#6a6a6a" }}
            >
              {dirtyQty ? (
                savingQty ? (
                  "…"
                ) : (
                  <span className="inline-flex items-center justify-center gap-0.5">
                    <span className="tabular-nums">×{pendingQty}</span>
                    <span>apply</span>
                  </span>
                )
              ) : (
                <span className="tabular-nums opacity-60">{pendingQty}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPendingQty((q) => Math.min(20, q + 1))}
              className="w-4 h-3.5 flex items-center justify-center text-[#6a6a6a] hover:text-[#f2f2f2] transition-colors"
              aria-label="Increase quantity"
            >
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleUpdateFoodBank}
              className="text-[9px] font-medium uppercase tracking-wider transition-colors"
              style={{ color: bankSaved ? accent : "#4a4a4a" }}
            >
              {bankSaved ? "✓" : "↑ Bank"}
            </button>
          </div>
        </div>
      </AliveCard>

      <ConfirmDialog
        open={confirmDelete}
        itemName={log.name}
        subtitle="This will be removed from your log for good."
        onConfirm={confirmRemove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BottomSheet } from "@/components/ui/BottomSheet";

/**
 * Shown when a shopping run is finished. Captures what was actually paid and
 * saves a trip record snapshotting the items that were checked off.
 */
export function FinishTripSheet({
  userId,
  listId,
  accent,
  purchasedCount,
  estimatedCost,
  onClose,
  onSaved,
}: {
  userId: string;
  listId: Id<"grocery_lists">;
  accent: string;
  purchasedCount: number;
  estimatedCost?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cost, setCost] = useState("");
  const [store, setStore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTrip = useMutation(api.grocery.saveTrip);

  async function handleSave() {
    const parsed = cost.trim() === "" ? undefined : parseFloat(cost);
    if (parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0)) {
      setError("Enter a valid amount, or leave it blank");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveTrip({
        userId,
        listId,
        actualCost: parsed,
        store: store.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this trip");
      setSaving(false);
    }
  }

  const parsedCost = parseFloat(cost);
  const showDiff =
    estimatedCost != null && Number.isFinite(parsedCost) && cost.trim() !== "";
  const diff = showDiff ? parsedCost - estimatedCost : 0;

  return (
    <BottomSheet
      onClose={onClose}
      className="px-5 pt-4 rounded-t-3xl"
      panelStyle={{
        background: "#1a1a1a",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
        <p className="text-base font-semibold text-[#f2f2f2]" style={{ letterSpacing: "-0.01em" }}>
          Save this trip
        </p>
        <p className="text-xs text-[#6a6a6a] mb-4">
          {purchasedCount} item{purchasedCount !== 1 ? "s" : ""} in your cart
          {estimatedCost != null && ` · $${estimatedCost.toFixed(2)} estimated`}
        </p>

        <label className="block text-[10px] uppercase tracking-wider text-[#6a6a6a] mb-1.5">
          What you actually paid
        </label>
        <div
          className="flex items-center gap-1.5 rounded-xl px-3 py-3 mb-1"
          style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-base font-medium shrink-0 text-[#6a6a6a]">$</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSave()}
            placeholder="0.00"
            className="bg-transparent outline-none text-base font-bold w-full placeholder-[#3a3a3a] tabular-nums"
            style={{ color: cost ? accent : undefined }}
          />
        </div>
        {showDiff && (
          <p className="text-[11px] mb-3 tabular-nums" style={{ color: diff > 0 ? "#ff8a5c" : "#34c759" }}>
            {diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(2)} vs estimate
          </p>
        )}
        {!showDiff && <div className="mb-3" />}

        <label className="block text-[10px] uppercase tracking-wider text-[#6a6a6a] mb-1.5">
          Store (optional)
        </label>
        <input
          value={store}
          onChange={(e) => setStore(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSave()}
          placeholder="Kroger, Costco…"
          className="w-full rounded-xl px-4 py-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none mb-4"
          style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}
        />

        {error && <p className="text-xs mb-3" style={{ color: "#ff5252" }}>{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-3 rounded-xl text-sm font-medium text-[#6a6a6a]"
            style={{ background: "#252525" }}
          >
            Not now
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: accent, color: "#0e0e0e", opacity: saving ? 0.4 : 1 }}
          >
            {saving ? "Saving…" : "Save trip"}
          </motion.button>
        </div>
    </BottomSheet>
  );
}

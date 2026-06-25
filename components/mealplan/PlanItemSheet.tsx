"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface MacroForm {
  name: string;
  mealType: MealType;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
}

const EMPTY: MacroForm = { name: "", mealType: "lunch", calories: "", protein: "", fat: "", carbs: "" };

export function PlanItemSheet({
  planId,
  accent,
  itemCount,
  day,
  onClose,
}: {
  planId: Id<"meal_plans">;
  accent: string;
  itemCount: number;
  day?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MacroForm>(EMPTY);
  const [loading, setLoading] = useState(false);

  const addItem = useMutation(api.mealplans.addItem);
  const estimateText = useAction(api.mealActions.estimateFromText);

  function set(field: keyof MacroForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEstimate() {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const result = await estimateText({
        foodDescription: form.name,
        knownCalories: form.calories ? Number(form.calories) : undefined,
        knownProtein: form.protein ? Number(form.protein) : undefined,
        knownFat: form.fat ? Number(form.fat) : undefined,
        knownCarbs: form.carbs ? Number(form.carbs) : undefined,
      });
      setForm((prev) => ({
        ...prev,
        name: result.name,
        calories: result.calories?.toString() ?? prev.calories,
        protein: result.protein?.toString() ?? prev.protein,
        fat: result.fat?.toString() ?? prev.fat,
        carbs: result.carbs?.toString() ?? prev.carbs,
      }));
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!form.name.trim()) return;
    await addItem({
      planId,
      name: form.name.trim(),
      day,
      mealType: form.mealType,
      calories: form.calories ? Number(form.calories) : undefined,
      protein: form.protein ? Number(form.protein) : undefined,
      fat: form.fat ? Number(form.fat) : undefined,
      carbs: form.carbs ? Number(form.carbs) : undefined,
      order: itemCount,
    });
    setForm(EMPTY);
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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4 pb-10"
        style={{ background: "#1a1a1a", maxHeight: "85dvh", overflowY: "auto" }}
      >
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5" />
        <h2 className="text-xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>
          Add meal to plan
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#6a6a6a] block mb-1">
              Food name
              {loading && <span className="ml-2 normal-case text-[#6a6a6a]">estimating...</span>}
            </label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={handleEstimate}
              placeholder="e.g. Grilled chicken breast"
              className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#6a6a6a] block mb-1">Meal type</label>
            <div className="flex gap-2">
              {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => set("mealType", t)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: form.mealType === t ? accent : "#252525",
                    color: form.mealType === t ? "#0e0e0e" : "#6a6a6a",
                  }}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([["calories", "Calories", "kcal"], ["protein", "Protein", "g"], ["fat", "Fat", "g"], ["carbs", "Carbs", "g"]] as [keyof MacroForm, string, string][]).map(([field, label, unit]) => (
              <div key={field}>
                <label className="text-xs font-medium text-[#6a6a6a] block mb-1">
                  {label} <span className="opacity-50">{unit}</span>
                </label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => set(field, e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleAdd}
          disabled={!form.name.trim()}
          className="w-full mt-5 py-4 rounded-2xl font-bold text-base"
          style={{
            background: accent,
            color: "#0e0e0e",
            opacity: form.name.trim() ? 1 : 0.4,
            fontFamily: "var(--font-display)",
          }}
        >
          Add to Plan
        </motion.button>
      </motion.div>
    </>
  );
}

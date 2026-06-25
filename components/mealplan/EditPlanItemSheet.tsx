"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface ItemData {
  _id: Id<"meal_plan_items">;
  name: string;
  mealType: MealType;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export function EditPlanItemSheet({
  item,
  accent,
  onClose,
}: {
  item: ItemData;
  accent: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [mealType, setMealType] = useState<MealType>(item.mealType);
  const [calories, setCalories] = useState(item.calories?.toString() ?? "");
  const [protein, setProtein] = useState(item.protein?.toString() ?? "");
  const [carbs, setCarbs] = useState(item.carbs?.toString() ?? "");
  const [fat, setFat] = useState(item.fat?.toString() ?? "");

  const updateItem = useMutation(api.mealplans.updateItem);

  async function handleSave() {
    if (!name.trim()) return;
    await updateItem({
      id: item._id,
      name: name.trim(),
      mealType,
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fat: fat ? Number(fat) : undefined,
    });
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
          Edit meal
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#6a6a6a] block mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#6a6a6a] block mb-1">Meal type</label>
            <div className="flex gap-2">
              {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMealType(t)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: mealType === t ? accent : "#252525",
                    color: mealType === t ? "#0e0e0e" : "#6a6a6a",
                  }}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {([
              ["Calories", "kcal", calories, setCalories],
              ["Protein", "g", protein, setProtein],
              ["Carbs", "g", carbs, setCarbs],
              ["Fat", "g", fat, setFat],
            ] as [string, string, string, (v: string) => void][]).map(([label, unit, val, setter]) => (
              <div key={label}>
                <label className="text-xs font-medium text-[#6a6a6a] block mb-1">
                  {label} <span className="opacity-50">{unit}</span>
                </label>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full mt-5 py-4 rounded-2xl font-bold text-base"
          style={{
            background: accent,
            color: "#0e0e0e",
            opacity: name.trim() ? 1 : 0.4,
            fontFamily: "var(--font-display)",
          }}
        >
          Save
        </motion.button>
      </motion.div>
    </>
  );
}

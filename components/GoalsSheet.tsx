"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { api } from "@/convex/_generated/api";

interface GoalForm {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export function GoalsSheet({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const existing = useQuery(api.goals.get, { userId });
  const setGoals = useMutation(api.goals.set);

  const [form, setForm] = useState<GoalForm>({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        calories: existing.calories.toString(),
        protein: existing.protein.toString(),
        carbs: existing.carbs.toString(),
        fat: existing.fat.toString(),
      });
    }
  }, [existing]);

  function set(field: keyof GoalForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    const calories = Number(form.calories);
    const protein = Number(form.protein);
    const carbs = Number(form.carbs);
    const fat = Number(form.fat);
    if (!calories) return;
    await setGoals({ userId, calories, protein, carbs, fat });
    onClose();
  }

  const ACCENT = "#b6ff4a";

  const fields: [keyof GoalForm, string, string][] = [
    ["calories", "Daily Calories", "kcal"],
    ["protein", "Protein", "g / day"],
    ["carbs", "Carbs", "g / day"],
    ["fat", "Fat", "g / day"],
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.52)" }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 40 }}
        className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[400px]"
        style={{
          background: "#1a1a1a",
          borderRadius: "20px 20px 0 0",
          maxHeight: "calc(100dvh - 16px)",
          overflowY: "auto",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
          overscrollBehavior: "contain",
        }}
      >
        <div
          className="w-9 h-[5px] rounded-full mx-auto mt-3 mb-4 md:hidden"
          style={{ background: "rgba(84,84,88,0.6)" }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-5 mb-6">
          <div>
            <p className="text-xs font-medium text-[#6a6a6a] mb-1">Daily targets</p>
            <h2
              className="text-2xl font-bold leading-tight"
              style={{ color: ACCENT, letterSpacing: "-0.02em" }}
            >
              Your Goals
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "#252525", color: "#6a6a6a" }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 space-y-2">
          {fields.map(([field, label, unit]) => (
            <div
              key={field}
              className="rounded-xl overflow-hidden"
              style={{ background: "#252525" }}
            >
              <div className="flex items-center px-4 py-3">
                <label className="flex-1 text-sm font-medium text-[#f2f2f2]">
                  {label}
                  <span className="text-[#6a6a6a] font-normal ml-1.5 text-xs">{unit}</span>
                </label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={(e) => set(field, e.target.value)}
                  placeholder="0"
                  className="w-24 text-right bg-transparent text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none"
                  style={{ letterSpacing: "-0.01em" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 mt-5">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={!form.calories}
            className="w-full py-3.5 rounded-2xl font-semibold text-[15px]"
            style={{
              background: ACCENT,
              color: "#0e0e0e",
              opacity: form.calories ? 1 : 0.35,
              letterSpacing: "-0.01em",
            }}
          >
            Save Goals
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

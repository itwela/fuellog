"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4 pb-10 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl"
        style={{
          background: "#1a1a1a",
          maxHeight: "calc(100dvh - 16px)",
          overflowY: "auto",
          paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom) + 84px)",
          overscrollBehavior: "contain",
        }}
      >
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5 md:hidden" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#6a6a6a]">Daily targets</p>
            <h2
              className="text-3xl font-black leading-none"
              style={{ fontFamily: "var(--font-display)", color: ACCENT }}
            >
              Your Goals
            </h2>
          </div>
          <button onClick={onClose} className="text-[#6a6a6a] p-1">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {([
            ["calories", "Daily Calories", "kcal"],
            ["protein", "Protein", "g / day"],
            ["carbs", "Carbs", "g / day"],
            ["fat", "Fat", "g / day"],
          ] as [keyof GoalForm, string, string][]).map(([field, label, unit]) => (
            <div key={field}>
              <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-1">
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

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          disabled={!form.calories}
          className="w-full mt-6 py-4 rounded-2xl font-bold text-base"
          style={{
            background: ACCENT,
            color: "#0e0e0e",
            opacity: form.calories ? 1 : 0.4,
            fontFamily: "var(--font-display)",
          }}
        >
          Save Goals
        </motion.button>
      </motion.div>
    </>
  );
}

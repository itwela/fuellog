"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toBase64 } from "@/lib/utils";
import { FoodBankPicker } from "./FoodBankPicker";
import { TextParseMode } from "./TextParseMode";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type Mode = "manual" | "photo" | "text";

interface MacroForm {
  name: string;
  mealType: MealType;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
  sugar: string;
}

const EMPTY: MacroForm = {
  name: "",
  mealType: "lunch",
  calories: "",
  protein: "",
  fat: "",
  carbs: "",
  fiber: "",
  sugar: "",
};

export type EditingMeal = {
  _id: Id<"meal_logs">;
  name: string;
  mealType: MealType;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  quantity?: number | null;
  aiEstimated: boolean;
};

function mealToForm(m: EditingMeal): MacroForm {
  const n = (v: number | null | undefined) =>
    v !== null && v !== undefined && !Number.isNaN(v) ? String(v) : "";
  return {
    name: m.name,
    mealType: m.mealType,
    calories: n(m.calories),
    protein: n(m.protein),
    fat: n(m.fat),
    carbs: n(m.carbs),
    fiber: n(m.fiber),
    sugar: n(m.sugar),
  };
}

const MODES: { id: Mode; label: string }[] = [
  { id: "manual", label: "Manual" },
  { id: "photo", label: "Photo" },
  { id: "text", label: "AI Text" },
];

export function LogMealSheet({
  userId,
  accent,
  logDate,
  onClose,
  editingMeal,
}: {
  userId: string;
  accent: string;
  logDate: string; // ISO YYYY-MM-DD
  onClose: () => void;
  /** When set, sheet edits this meal instead of logging a new one. */
  editingMeal?: EditingMeal | null;
}) {
  const isEdit = !!editingMeal;
  const [mode, setMode] = useState<Mode>("manual");
  const [form, setForm] = useState<MacroForm>(() =>
    editingMeal ? mealToForm(editingMeal) : EMPTY
  );
  const [loading, setLoading] = useState(false);
  const [aiRan, setAiRan] = useState(() => !!editingMeal?.aiEstimated);
  const [showFoodBank, setShowFoodBank] = useState(false);
  const [savedToFoodBank, setSavedToFoodBank] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMeal) {
      setForm(mealToForm(editingMeal));
      setAiRan(!!editingMeal.aiEstimated);
      setMode("manual");
    } else {
      setForm(EMPTY);
      setAiRan(false);
    }
  }, [editingMeal?._id]);

  const logMeal = useMutation(api.meals.log);
  const updateMeal = useMutation(api.meals.update);
  const upsertFoodBank = useMutation(api.foodbank.upsert);
  const estimateText = useAction(api.mealActions.estimateFromText);
  const estimateImage = useAction(api.mealActions.estimateFromImage);

  function set(field: keyof MacroForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleEstimateText() {
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
        fiber: result.fiber?.toString() ?? prev.fiber,
        sugar: result.sugar?.toString() ?? prev.sugar,
      }));
      setAiRan(true);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await toBase64(file);
      const result = await estimateImage({ imageBase64: base64, mimeType: file.type });
      setForm({
        name: result.name,
        mealType: form.mealType,
        calories: result.calories?.toString() ?? "",
        protein: result.protein?.toString() ?? "",
        fat: result.fat?.toString() ?? "",
        carbs: result.carbs?.toString() ?? "",
        fiber: result.fiber?.toString() ?? "",
        sugar: result.sugar?.toString() ?? "",
      });
      setAiRan(true);
      setMode("manual");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (editingMeal) {
      await updateMeal({
        userId,
        id: editingMeal._id,
        name: form.name.trim(),
        mealType: form.mealType,
        calories: form.calories ? Number(form.calories) : undefined,
        protein: form.protein ? Number(form.protein) : undefined,
        fat: form.fat ? Number(form.fat) : undefined,
        carbs: form.carbs ? Number(form.carbs) : undefined,
        fiber: form.fiber ? Number(form.fiber) : undefined,
        sugar: form.sugar ? Number(form.sugar) : undefined,
        quantity:
          editingMeal.quantity != null && editingMeal.quantity > 0
            ? editingMeal.quantity
            : 1,
      });
    } else {
      await logMeal({
        userId,
        name: form.name,
        mealType: form.mealType,
        calories: form.calories ? Number(form.calories) : undefined,
        protein: form.protein ? Number(form.protein) : undefined,
        fat: form.fat ? Number(form.fat) : undefined,
        carbs: form.carbs ? Number(form.carbs) : undefined,
        fiber: form.fiber ? Number(form.fiber) : undefined,
        sugar: form.sugar ? Number(form.sugar) : undefined,
        aiEstimated: aiRan,
        logDate,
      });
    }
    onClose();
  }

  async function handleSaveToFoodBank() {
    if (!form.name.trim()) return;
    await upsertFoodBank({
      userId,
      name: form.name.trim(),
      calories: form.calories ? Number(form.calories) : undefined,
      protein: form.protein ? Number(form.protein) : undefined,
      fat: form.fat ? Number(form.fat) : undefined,
      carbs: form.carbs ? Number(form.carbs) : undefined,
      fiber: form.fiber ? Number(form.fiber) : undefined,
      sugar: form.sugar ? Number(form.sugar) : undefined,
    });
    setSavedToFoodBank(true);
    setTimeout(() => setSavedToFoodBank(false), 1200);
  }

  function handleFoodBankSelect(entry: {
    name: string;
    calories?: number | null;
    protein?: number | null;
    fat?: number | null;
    carbs?: number | null;
    fiber?: number | null;
    sugar?: number | null;
  }) {
    setForm({
      name: entry.name,
      mealType: form.mealType,
      calories: entry.calories?.toString() ?? "",
      protein: entry.protein?.toString() ?? "",
      fat: entry.fat?.toString() ?? "",
      carbs: entry.carbs?.toString() ?? "",
      fiber: entry.fiber?.toString() ?? "",
      sugar: entry.sugar?.toString() ?? "",
    });
    setAiRan(false);
    setShowFoodBank(false);
    setMode("manual");
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4 pb-8 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px] md:rounded-3xl"
        style={{
          background: "#1a1a1a",
          // Use the full dynamic viewport and leave room to scroll past the bottom controls
          // (prevents the last button from being hidden behind mobile browser UI / bottom nav).
          maxHeight: "calc(100dvh - 16px)",
          overflowY: "auto",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + 84px)",
          overscrollBehavior: "contain",
        }}
      >
        {/* Handle (mobile only) */}
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5 md:hidden" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {isEdit ? "Edit meal" : "Log Meal"}
          </h2>
          {(isEdit || mode !== "text") && (
            <button
              type="button"
              onClick={() => setShowFoodBank(true)}
              className="px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border transition-colors"
              style={{ borderColor: "#3a3a3a", color: "#b6b6b6", background: "#252525" }}
            >
              From Food Bank
            </button>
          )}
        </div>

        {/* Mode toggle */}
        {!isEdit && (
          <div className="flex rounded-xl p-1 mb-5" style={{ background: "#252525" }}>
            {MODES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: mode === id ? accent : "transparent",
                  color: mode === id ? "#0e0e0e" : "#6a6a6a",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Mode content */}
        <AnimatePresence mode="wait">
          {!isEdit && mode === "text" ? (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <TextParseMode userId={userId} accent={accent} logDate={logDate} onDone={onClose} />
            </motion.div>
          ) : !isEdit && mode === "photo" ? (
            <motion.div
              key="photo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: accent }}
              >
                {loading ? (
                  <svg className="animate-spin" width="28" height="28" fill="none" stroke="#0e0e0e" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M12 3a9 9 0 1 1 0 18A9 9 0 0 1 12 3Z" />
                  </svg>
                ) : (
                  <svg width="28" height="28" fill="none" stroke="#0e0e0e" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                )}
              </motion.button>
              <p className="text-sm text-[#6a6a6a] text-center">
                {loading ? "Analyzing photo..." : "Tap to take or upload a photo"}
              </p>
            </motion.div>
          ) : (isEdit || mode === "manual") ? (
            <motion.div
              key={isEdit ? "edit-manual" : "manual"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* Food name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a]">Food name</label>
                  {loading && (
                    <span className="text-[10px] text-[#6a6a6a] flex items-center gap-1">
                      <svg className="animate-spin w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M12 3a9 9 0 1 1 0 18A9 9 0 0 1 12 3Z" />
                      </svg>
                      Estimating...
                    </span>
                  )}
                  {aiRan && !loading && (
                    <button
                      onClick={handleEstimateText}
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: accent }}
                    >
                      Re-estimate
                    </button>
                  )}
                </div>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onBlur={isEdit ? undefined : handleEstimateText}
                  placeholder="e.g. Chicken rice bowl"
                  className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                />
                {!aiRan && !loading && !isEdit && (
                  <p className="text-[10px] text-[#6a6a6a] mt-1">
                    Type a food name — AI will estimate calories &amp; macros when you move on
                  </p>
                )}
              </div>

              {/* Meal type */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[#6a6a6a] block mb-1">Meal type</label>
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
                      {t === "breakfast" ? "Breakfast" : t === "lunch" ? "Lunch" : t === "dinner" ? "Dinner" : "Snack"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Macro fields */}
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["calories", "Calories", "kcal"],
                  ["protein", "Protein", "g"],
                  ["fat", "Fat", "g"],
                  ["carbs", "Carbs", "g"],
                  ["fiber", "Fiber", "g"],
                  ["sugar", "Sugar", "g"],
                ] as [keyof MacroForm, string, string][]).map(([field, label, unit]) => (
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

              {aiRan && (
                <p className="text-[10px] text-[#6a6a6a] text-center">
                  Values filled by Gemma 4 — review before saving
                </p>
              )}

              {/* Food Bank shortcut */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveToFoodBank}
                  disabled={!form.name.trim()}
                  className="px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border transition-colors"
                  style={{
                    borderColor: "#3a3a3a",
                    background: "#252525",
                    color: savedToFoodBank ? "#b6ff4a" : "#b6b6b6",
                    opacity: form.name.trim() ? 1 : 0.4,
                  }}
                >
                  {savedToFoodBank ? "Saved to Food Bank" : "Save to Food Bank"}
                </button>
                <span className="text-[10px] text-[#6a6a6a]">Food Bank</span>
              </div>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="w-full mt-2 py-4 rounded-2xl font-bold text-base"
                style={{
                  background: accent,
                  color: "#0e0e0e",
                  opacity: form.name.trim() ? 1 : 0.4,
                  fontFamily: "var(--font-display)",
                }}
              >
                {isEdit ? "Save changes" : "Log Meal"}
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {showFoodBank && (
        <FoodBankPicker
          userId={userId}
          accent={accent}
          onSelect={handleFoodBankSelect}
          onClose={() => setShowFoodBank(false)}
        />
      )}
    </>
  );
}

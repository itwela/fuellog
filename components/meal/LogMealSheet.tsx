"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { compressImage } from "@/lib/utils";
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoContext, setPhotoContext] = useState("");
  const [photoAnalyzed, setPhotoAnalyzed] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
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

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoContext("");
    setPhotoAnalyzed(false);
    setPhotoError(null);
  }

  async function handleAnalyzePhoto() {
    if (!photoFile) return;
    setLoading(true);
    setPhotoError(null);
    const ctx = photoContext.trim();
    try {
      let result;
      try {
        const { base64, mimeType } = await compressImage(photoFile);
        result = await estimateImage({
          imageBase64: base64,
          mimeType,
          context: ctx || undefined,
        });
      } catch (visionErr) {
        console.warn("Vision models failed, falling back to text estimate:", visionErr);
        if (!ctx) throw visionErr; // no context to fall back with
        // Fall back: use the user's context text as the food description
        result = await estimateText({
          foodDescription: ctx,
        });
        if (!result.name || result.name === ctx) result = { ...result, name: ctx };
      }
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
      setPhotoAnalyzed(true);
    } catch (err) {
      console.error("Photo analysis failed:", err);
      setPhotoError(ctx ? "Analysis failed — try again" : "Analysis failed — add context and try again");
    } finally {
      setLoading(false);
    }
  }

  function handleClearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoContext("");
    setPhotoAnalyzed(false);
    setPhotoError(null);
    if (fileRef.current) fileRef.current.value = "";
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
        className="fixed inset-x-0 bottom-0 z-50 px-5 pt-3 pb-8 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[480px]"
        style={{
          background: "#1a1a1a",
          borderRadius: "20px 20px 0 0",
          maxHeight: "calc(100dvh - 16px)",
          overflowY: "auto",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom) + 84px)",
          overscrollBehavior: "contain",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Handle (mobile only) */}
        <div
          className="w-9 h-[5px] rounded-full mx-auto mt-1 mb-6 md:hidden"
          style={{ background: "rgba(84,84,88,0.6)" }}
        />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold" style={{ letterSpacing: "-0.02em" }}>
            {isEdit
              ? "Edit Meal"
              : mode === "photo"
                ? photoAnalyzed
                  ? "Review & Log"
                  : "Snap a Meal"
                : mode === "text"
                  ? "AI Text Parse"
                  : "Log Meal"}
          </h2>
          {(isEdit || (mode !== "text" && !photoAnalyzed)) && (
            <button
              type="button"
              onClick={() => setShowFoodBank(true)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{ color: accent, background: `${accent}14` }}
            >
              Food Bank
            </button>
          )}
        </div>

        {/* Mode toggle — Apple segmented control */}
        {!isEdit && (
          <div
            className="flex rounded-[10px] p-[3px] mb-5"
            style={{ background: "rgba(84,84,88,0.22)" }}
          >
            {MODES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className="flex-1 py-[7px] rounded-[8px] text-sm font-medium transition-all"
                style={{
                  background: mode === id ? "#3a3a3c" : "transparent",
                  color: mode === id ? "#f2f2f2" : "#6a6a6a",
                  boxShadow: mode === id ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
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
              className="flex flex-col gap-4"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />

              <AnimatePresence mode="wait">
                {photoAnalyzed && !loading ? (
                  /* ── Results state ── */
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col gap-4 w-full"
                  >
                    {/* Thumbnail + name row */}
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview!}
                        alt="analyzed food"
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        style={{ border: `1.5px solid ${accent}40` }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium mb-1" style={{ color: accent }}>AI identified</p>
                        <input
                          value={form.name}
                          onChange={(e) => set("name", e.target.value)}
                          className="w-full bg-[#252525] rounded-xl px-3 py-2.5 text-sm font-semibold text-[#f2f2f2] outline-none"
                          style={{ letterSpacing: "-0.01em" }}
                        />
                      </div>
                    </div>

                    {/* Meal type */}
                    <div className="flex gap-1.5">
                      {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => set("mealType", t)}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-medium capitalize"
                          style={{
                            background: form.mealType === t ? "#3a3a3c" : "transparent",
                            color: form.mealType === t ? "#f2f2f2" : "#6a6a6a",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Macro grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["calories", "Calories", "kcal"],
                        ["protein", "Protein", "g"],
                        ["fat", "Fat", "g"],
                        ["carbs", "Carbs", "g"],
                        ["fiber", "Fiber", "g"],
                        ["sugar", "Sugar", "g"],
                      ] as [keyof MacroForm, string, string][]).map(([field, label, unit]) => (
                        <div key={field} className="rounded-xl px-3.5 py-2.5" style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <p className="text-[10px] font-medium mb-1" style={{ color: "#6a6a6a" }}>
                            {label} <span className="opacity-50">{unit}</span>
                          </p>
                          <input
                            type="number"
                            value={form[field]}
                            onChange={(e) => set(field, e.target.value)}
                            className="w-full bg-transparent text-[18px] font-bold text-[#f2f2f2] outline-none tabular-nums"
                            style={{ letterSpacing: "-0.02em" }}
                          />
                        </div>
                      ))}
                    </div>

                    <p className="text-[10px] text-center" style={{ color: "rgba(235,235,245,0.3)" }}>
                      AI estimated — edit any field before logging
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearPhoto}
                        className="px-4 py-3 rounded-2xl text-sm font-medium"
                        style={{ background: "#252525", color: "#6a6a6a", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        Retake
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSave}
                        disabled={!form.name.trim()}
                        className="flex-1 py-3 rounded-2xl text-[15px] font-semibold"
                        style={{ background: accent, color: "#0e0e0e", opacity: form.name.trim() ? 1 : 0.35, letterSpacing: "-0.01em" }}
                      >
                        Log Meal
                      </motion.button>
                    </div>
                  </motion.div>
                ) : loading ? (
                  /* ── Analyzing state ── */
                  <motion.div
                    key="analyzing"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-5 w-full py-4"
                  >
                    <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview!} alt="food being analyzed" className="w-full h-full object-cover" />
                      <div className="absolute inset-0" style={{ background: "rgba(14,14,14,0.45)" }} />
                      <motion.div
                        className="absolute inset-x-0 h-[2px] pointer-events-none"
                        style={{ background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`, boxShadow: `0 0 14px 5px ${accent}55`, top: 0 }}
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 rounded-tl" style={{ borderColor: accent }} />
                      <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 rounded-tr" style={{ borderColor: accent }} />
                      <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 rounded-bl" style={{ borderColor: accent }} />
                      <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 rounded-br" style={{ borderColor: accent }} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[0, 1].map((i) => (
                          <motion.div key={i} className="absolute rounded-full border" style={{ borderColor: `${accent}70` }}
                            animate={{ width: [20, 100], height: [20, 100], opacity: [0.9, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.9 }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#f2f2f2]">Analyzing your food</span>
                      <div className="flex gap-[5px] items-center">
                        {[0, 1, 2].map((i) => (
                          <motion.span key={i} className="block w-[5px] h-[5px] rounded-full" style={{ background: accent }}
                            animate={{ opacity: [0.25, 1, 0.25] }}
                            transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22 }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                      {[{ emoji: "🔥", label: "Calories" }, { emoji: "💪", label: "Protein" }, { emoji: "⚡", label: "Carbs" }, { emoji: "🥑", label: "Fat" }].map(({ emoji, label }, i) => (
                        <motion.div key={label} className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.12, duration: 0.3 }}>
                          {emoji} {label}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : photoPreview ? (
                  /* ── Preview + context + analyze ── */
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4 w-full"
                  >
                    {/* Photo preview with retake button */}
                    <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="food photo" className="w-full h-full object-cover" />
                      <button
                        onClick={handleClearPhoto}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
                      >
                        <svg width="13" height="13" fill="none" stroke="#f2f2f2" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Context input */}
                    <div>
                      <label className="text-xs font-medium text-[#6a6a6a] block mb-1.5">
                        Add context <span className="opacity-50">(optional)</span>
                      </label>
                      <input
                        value={photoContext}
                        onChange={(e) => setPhotoContext(e.target.value)}
                        placeholder="e.g. grilled salmon, large portion, no sauce"
                        className="w-full rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#4a4a4a] outline-none"
                        style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}
                        onKeyDown={(e) => e.key === "Enter" && handleAnalyzePhoto()}
                      />
                    </div>

                    {/* Analyze button */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAnalyzePhoto}
                      className="w-full py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2"
                      style={{ background: accent, color: "#0e0e0e", letterSpacing: "-0.01em" }}
                    >
                      <svg width="16" height="16" fill="none" stroke="#0e0e0e" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      Analyze Food
                    </motion.button>

                    {photoError && (
                      <p className="text-xs text-center px-2" style={{ color: "#ff453a" }}>
                        {photoError}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  /* ── Camera button ── */
                  <motion.div
                    key="camera"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 py-6"
                  >
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={() => fileRef.current?.click()}
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ background: accent }}
                    >
                      <svg width="28" height="28" fill="none" stroke="#0e0e0e" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                      </svg>
                    </motion.button>
                    <p className="text-sm text-[#6a6a6a] text-center">Tap to take or upload a photo</p>
                  </motion.div>
                )}
              </AnimatePresence>
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
                  <label className="text-xs font-medium text-[#6a6a6a]">Food name</label>
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
                      className="text-xs font-medium"
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
                <label className="text-xs font-medium text-[#6a6a6a] block mb-1">Meal type</label>
                <div className="flex gap-2">
                  {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => set("mealType", t)}
                      className="flex-1 py-2 rounded-[8px] text-xs font-medium transition-all capitalize"
                      style={{
                        background: form.mealType === t ? "#3a3a3c" : "transparent",
                        color: form.mealType === t ? "#f2f2f2" : "#6a6a6a",
                      }}
                    >
                      {t}
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
                    <label className="text-xs font-medium text-[#6a6a6a] block mb-1">
                      {label} <span className="opacity-50 text-[10px]">{unit}</span>
                    </label>
                    <input
                      type="number"
                      value={form[field]}
                      onChange={(e) => set(field, e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl px-4 py-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none"
                      style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.04)" }}
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
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
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
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="w-full mt-2 py-3.5 rounded-2xl font-semibold text-[15px]"
                style={{
                  background: accent,
                  color: "#0e0e0e",
                  opacity: form.name.trim() ? 1 : 0.35,
                  letterSpacing: "-0.01em",
                }}
              >
                {isEdit ? "Save Changes" : "Log Meal"}
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

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface ParsedMeal {
  name: string;
  mealType: MealType;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  sugar: number | null;
}

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "#fdcb40",
  lunch: "#4abaff",
  dinner: "#b6ff4a",
  snack: "#ff5623",
};

export function TextParseMode({
  userId,
  accent,
  logDate,
  onDone,
}: {
  userId: string;
  accent: string;
  logDate: string; // ISO YYYY-MM-DD
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [meals, setMeals] = useState<ParsedMeal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);
  const [listening, setListening] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parse = useAction(api.mealActions.parseFromText);
  const logBatch = useMutation(api.meals.logBatch);

  // Speech recognition setup
  useEffect(() => {
    type SR = typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    type SpeechRecognitionInstance = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start: () => void;
      stop: () => void;
      abort: () => void;
      onresult: ((e: { resultIndex: number; results: { isFinal: boolean; [k: number]: { transcript: string } }[] }) => void) | null;
      onend: (() => void) | null;
    };

    const win = window as SR;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const rec = new SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let finalTranscript = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript + " ";
        } else {
          interim = e.results[i][0].transcript;
        }
      }
      setText((prev) => {
        const base = prev.trimEnd();
        return base ? `${base} ${finalTranscript}${interim}` : `${finalTranscript}${interim}`;
      });
    };

    rec.onend = () => setListening(false);
    recognitionRef.current = rec;

    return () => rec.abort();
  }, []);

  function toggleListening() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      setText((prev) => prev.trimEnd() + (prev.trim() ? " " : ""));
      rec.start();
      setListening(true);
    }
  }

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    setMeals(null);
    try {
      const result = (await parse({ text: text.trim(), logDate })) as ParsedMeal[];
      setMeals(result);
    } finally {
      setLoading(false);
    }
  }

  function removeMeal(i: number) {
    setMeals((prev) => prev?.filter((_, idx) => idx !== i) ?? null);
  }

  function updateMeal(i: number, field: keyof ParsedMeal, value: string | MealType) {
    setMeals((prev) =>
      prev?.map((m, idx) =>
        idx !== i
          ? m
          : {
              ...m,
              [field]: ["calories", "protein", "fat", "carbs", "fiber", "sugar"].includes(field)
                ? value === "" ? null : Number(value)
                : field === "name"
                  ? String(value)
                  : value,
            }
      ) ?? null
    );
  }

  async function handleLogAll() {
    if (!meals?.length) return;
    setLogging(true);
    try {
      await logBatch({
        userId,
        logDate,
        meals: meals.map((m) => ({
          name: m.name.trim() || "Untitled",
          mealType: m.mealType,
          calories: m.calories ?? undefined,
          protein: m.protein ?? undefined,
          fat: m.fat ?? undefined,
          carbs: m.carbs ?? undefined,
          fiber: m.fiber ?? undefined,
          sugar: m.sugar ?? undefined,
        })),
      });
      onDone();
    } finally {
      setLogging(false);
    }
  }

  // Review screen
  if (meals !== null) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#6a6a6a]">Found {meals.length} meal{meals.length !== 1 ? "s" : ""}</p>
            <p className="text-sm text-[#f2f2f2] font-medium">Review before logging</p>
          </div>
          <button
            onClick={() => { setMeals(null); }}
            className="text-xs text-[#6a6a6a] underline"
          >
            Re-parse
          </button>
        </div>

        <AnimatePresence>
          {meals.map((meal, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#252525", borderLeft: `3px solid ${MEAL_COLORS[meal.mealType]}` }}
            >
              {/* Header row */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <input
                  type="text"
                  value={meal.name}
                  onChange={(e) => updateMeal(i, "name", e.target.value)}
                  aria-label="Meal name"
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium text-[#f2f2f2] placeholder-[#6a6a6a] outline-none rounded-md px-1.5 py-0.5 -mx-1.5 border border-transparent hover:border-[#3a3a3a] focus:border-[#6a6a6a] focus:bg-[#1f1f1f] transition-colors"
                  placeholder="Meal name"
                />

                {/* Meal type pill */}
                <div className="flex gap-1">
                  {(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateMeal(i, "mealType", t)}
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors"
                      style={{
                        background: meal.mealType === t ? MEAL_COLORS[t] : "#1a1a1a",
                        color: meal.mealType === t ? "#0e0e0e" : "#6a6a6a",
                      }}
                      title={t}
                    >
                      {t === "breakfast" ? "Bkfst" : t === "lunch" ? "Lunch" : t === "dinner" ? "Din" : "Snack"}
                    </button>
                  ))}
                </div>

                <button onClick={() => setEditingIndex(editingIndex === i ? null : i)} className="text-[#6a6a6a]">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                </button>
                <button onClick={() => removeMeal(i)} className="text-[#6a6a6a]">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Macro summary row */}
              <div className="flex gap-3 px-4 pb-2 items-center">
                {[
                  ["Cal", meal.calories, accent],
                  ["P", meal.protein, "#b6ff4a"],
                  ["C", meal.carbs, "#4abaff"],
                  ["F", meal.fat, "#fdcb40"],
                ].map(([label, val, color]) => (
                  <div key={label as string} className="flex items-baseline gap-0.5">
                    <span className="text-[9px] text-[#6a6a6a]">{label as string}</span>
                    <span
                      className="text-sm font-black leading-none"
                      style={{ fontFamily: "var(--font-display)", color: color as string }}
                    >
                      {val !== null && val !== undefined && !Number.isNaN(Number(val))
                        ? Math.round(Number(val))
                        : "?"}
                    </span>
                    <span className="text-[9px] text-[#6a6a6a]">{label === "Cal" ? "kcal" : "g"}</span>
                  </div>
                ))}
              </div>

              {/* Editable fields */}
              <AnimatePresence>
                {editingIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                      {([
                        ["calories", "Calories"],
                        ["protein", "Protein g"],
                        ["fat", "Fat g"],
                        ["carbs", "Carbs g"],
                        ["fiber", "Fiber g"],
                        ["sugar", "Sugar g"],
                      ] as [keyof ParsedMeal, string][]).map(([field, label]) => (
                        <div key={field}>
                          <label className="text-[9px] uppercase tracking-widest text-[#6a6a6a] block mb-0.5">{label}</label>
                          <input
                            type="number"
                            value={meal[field] !== null ? String(meal[field]) : ""}
                            onChange={(e) => updateMeal(i, field, e.target.value)}
                            placeholder="?"
                            className="w-full bg-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {meals.length === 0 && (
          <p className="text-center text-[#6a6a6a] text-sm py-4">All removed — re-parse or go back</p>
        )}

        {meals.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLogAll}
            disabled={logging}
            className="w-full py-4 rounded-2xl font-bold text-base mt-2"
            style={{ background: accent, color: "#0e0e0e", fontFamily: "var(--font-display)" }}
          >
            {logging ? "Logging..." : `Log ${meals.length} Meal${meals.length !== 1 ? "s" : ""}`}
          </motion.button>
        )}
      </div>
    );
  }

  // Input screen
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] uppercase tracking-widest text-[#6a6a6a]">Describe what you ate</p>
          <span
            className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${accent}22`, color: accent }}
          >
            {new Date(logDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="text-xs text-[#6a6a6a] mb-3">
          Type, paste, or speak — any format works. A list, a journal entry, a voice transcript. AI will extract all your meals.
        </p>
      </div>

      {/* Textarea + mic */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`e.g. "For breakfast I had oatmeal with berries and a coffee with oat milk. Lunch was a chicken caesar salad. Had a protein shake after the gym and then grilled salmon with rice for dinner."`}
          rows={6}
          className="w-full bg-[#252525] rounded-2xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none resize-none"
        />

        {/* Mic button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleListening}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: listening ? accent : "#1a1a1a",
          }}
        >
          <AnimatePresence mode="wait">
            {listening ? (
              <motion.span
                key="stop"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
              >
                {/* Pulse ring */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${accent}` }}
                  animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                <svg width="16" height="16" fill="#0e0e0e" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </motion.span>
            ) : (
              <motion.span
                key="mic"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
              >
                <svg width="16" height="16" fill="none" stroke="#6a6a6a" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {listening && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] uppercase tracking-widest text-center"
          style={{ color: accent }}
        >
          Listening...
        </motion.p>
      )}

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleParse}
        disabled={loading || !text.trim()}
        className="w-full py-4 rounded-2xl font-bold text-base"
        style={{
          background: loading || !text.trim() ? "#252525" : accent,
          color: loading || !text.trim() ? "#6a6a6a" : "#0e0e0e",
          fontFamily: "var(--font-display)",
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 3a9 9 0 1 1 0 18A9 9 0 0 1 12 3Z" />
            </svg>
            Parsing & estimating...
          </span>
        ) : (
          "Parse Meals"
        )}
      </motion.button>
    </div>
  );
}

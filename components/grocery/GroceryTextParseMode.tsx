"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ParsedGroceryItem {
  name: string;
  quantity?: string | null;
  unit?: string | null;
}

export function GroceryTextParseMode({
  listId,
  accent,
  onDone,
}: {
  listId: Id<"grocery_lists">;
  accent: string;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ParsedGroceryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void; start: () => void; abort: () => void } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parse = useAction(api.groceryActions.parseFromText);
  const addItemsBatch = useMutation(api.grocery.addItemsBatch);

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
      onresult:
        | ((
            e: {
              resultIndex: number;
              results: { isFinal: boolean; [k: number]: { transcript: string } }[];
            }
          ) => void)
        | null;
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
    setItems(null);
    try {
      const result = (await parse({ text: text.trim() })) as ParsedGroceryItem[];
      setItems(result);
    } finally {
      setLoading(false);
    }
  }

  function removeItem(i: number) {
    setItems((prev) => prev?.filter((_, idx) => idx !== i) ?? null);
  }

  function updateItem(i: number, field: keyof ParsedGroceryItem, value: string) {
    setItems((prev) =>
      prev?.map((row, idx) =>
        idx !== i
          ? row
          : {
              ...row,
              [field]: value.trim() === "" ? null : value,
            }
      ) ?? null
    );
  }

  async function handleAddAll() {
    if (!items?.length) return;
    setAdding(true);
    try {
      await addItemsBatch({
        listId,
        items: items.map((row) => ({
          name: row.name.trim() || "Item",
          quantity: row.quantity?.trim() || undefined,
          unit: row.unit?.trim() || undefined,
        })),
      });
      onDone();
    } finally {
      setAdding(false);
    }
  }

  if (items !== null) {
    return (
      <div className="space-y-3 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#6a6a6a]">
              Found {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
            <p className="text-sm text-[#f2f2f2] font-medium">Review before adding</p>
          </div>
          <button
            type="button"
            onClick={() => setItems(null)}
            className="text-xs text-[#6a6a6a] underline shrink-0"
          >
            Re-parse
          </button>
        </div>

        <AnimatePresence>
          {items.map((row, i) => (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl overflow-hidden px-4 py-3 flex flex-col gap-2"
              style={{ background: "#252525", borderLeft: `3px solid ${accent}` }}
            >
              <div className="flex items-start gap-2">
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  aria-label="Item name"
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium text-[#f2f2f2] placeholder-[#6a6a6a] outline-none rounded-md px-1.5 py-0.5 -mx-1.5 border border-transparent hover:border-[#3a3a3a] focus:border-[#6a6a6a] focus:bg-[#1f1f1f] transition-colors"
                  placeholder="Name"
                />
                <button type="button" onClick={() => removeItem(i)} className="text-[#6a6a6a] p-1 shrink-0">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] uppercase tracking-widest text-[#6a6a6a] block mb-0.5">Qty</label>
                  <input
                    type="text"
                    value={row.quantity ?? ""}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    placeholder="—"
                    className="w-full bg-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] uppercase tracking-widest text-[#6a6a6a] block mb-0.5">Unit</label>
                  <input
                    type="text"
                    value={row.unit ?? ""}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                    placeholder="—"
                    className="w-full bg-[#1a1a1a] rounded-lg px-2 py-1.5 text-xs text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <p className="text-center text-[#6a6a6a] text-sm py-4">All removed — re-parse or switch back</p>
        )}

        {items.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => void handleAddAll()}
            disabled={adding}
            className="w-full py-4 rounded-2xl font-bold text-base mt-2"
            style={{ background: accent, color: "#0e0e0e", fontFamily: "var(--font-display)" }}
          >
            {adding ? "Adding…" : `Add ${items.length} to list`}
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#6a6a6a] mb-1">Paste or describe your list</p>
        <p className="text-xs text-[#6a6a6a]">
          Bullet list, recipe ingredients, a paragraph, or a voice note — AI will turn it into grocery rows with qty
          and unit when it can.
        </p>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`e.g. "2 lb ground beef, tortillas, shredded cheese, Greek yogurt, bananas, coffee beans, oat milk gallon"`}
          rows={6}
          className="w-full bg-[#252525] rounded-2xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none resize-none pr-12"
        />

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleListening}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: listening ? accent : "#1a1a1a" }}
          type="button"
          aria-label={listening ? "Stop listening" : "Speak list"}
        >
          <AnimatePresence mode="wait">
            {listening ? (
              <motion.span
                key="stop"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                className="relative flex items-center justify-center"
              >
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
              <motion.span key="mic" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <svg width="16" height="16" fill="none" stroke="#6a6a6a" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                  />
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
          Listening…
        </motion.p>
      )}

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => void handleParse()}
        disabled={loading || !text.trim()}
        type="button"
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
            Parsing…
          </span>
        ) : (
          "Parse list"
        )}
      </motion.button>
    </div>
  );
}

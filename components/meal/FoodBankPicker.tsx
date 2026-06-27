"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { api } from "@/convex/_generated/api";

interface FoodBankEntry {
  _id: string;
  name: string;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  fiber?: number | null;
  sugar?: number | null;
}

export function FoodBankPicker({
  userId,
  accent,
  onSelect,
  onClose,
}: {
  userId: string;
  accent: string;
  onSelect: (entry: FoodBankEntry) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const results = useQuery(api.foodbank.search, { userId, query: search }) ?? [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-60 rounded-t-3xl px-5 pt-4 pb-8"
        style={{ background: "#252525", maxHeight: "70dvh", overflowY: "auto" }}
      >
        <SheetHeader onClose={onClose} />
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Food Bank
        </h3>
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your foods..."
          className="w-full rounded-xl px-4 py-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none mb-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.05)" }}
        />
        <div className="space-y-2">
          {results.map((entry) => (
            <motion.button
              key={entry._id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(entry as FoodBankEntry)}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left"
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <p className="text-sm font-medium text-[#f2f2f2]">{entry.name}</p>
                <p className="text-[10px] text-[#6a6a6a] mt-0.5">
                  {entry.protein}g protein · {entry.carbs}g carbs · {entry.fat}g fat
                </p>
              </div>
              <span className="text-lg font-black" style={{ fontFamily: "var(--font-display)", color: accent }}>
                {entry.calories ?? "—"}
              </span>
            </motion.button>
          ))}
          {results.length === 0 && (
            <p className="text-center text-[#6a6a6a] text-sm py-4">
              {search ? "No results found" : "Log meals to build your food bank"}
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";

const ACCENT = "#4abaff";

export function FoodBankView({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const items = useQuery(api.foodbank.search, { userId, query: search }) ?? [];
  const remove = useMutation(api.foodbank.remove);

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-5 pt-12 pb-6">
        <p className="text-[10px] font-light uppercase tracking-[0.15em] text-[#6a6a6a]">Saved foods</p>
        <h1
          className="text-[56px] leading-none font-black"
          style={{ fontFamily: "var(--font-display)", color: ACCENT }}
        >
          Food Bank
        </h1>
      </div>

      <div className="px-5 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your food bank..."
          className="w-full bg-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
        />
      </div>

      <div className="flex-1 px-4 space-y-2">
        <AnimatePresence>
          {items.map((item) => (
            <AliveCard
              key={item._id}
              seed={`foodbank:${item._id}`}
              accent={ACCENT}
              className="flex flex-col gap-2 px-4 py-3"
              style={{ borderLeft: `3px solid ${ACCENT}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-[#f2f2f2] text-sm leading-snug flex-1 min-w-0 line-clamp-2 break-words">
                  {item.name}
                </p>
                <div className="flex items-start gap-1 shrink-0">
                  <div className="flex flex-col items-end">
                    <span
                      className="text-xl font-black leading-none tabular-nums"
                      style={{ fontFamily: "var(--font-display)", color: ACCENT }}
                    >
                      {item.calories ?? "—"}
                    </span>
                    <span className="text-[9px] text-[#6a6a6a] font-light leading-none mt-0.5">kcal</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => remove({ id: item._id as Id<"food_bank"> })}
                    className="p-1 rounded-full -mr-0.5"
                    style={{ color: "#6a6a6a" }}
                    aria-label="Remove from food bank"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col items-start gap-0.5 min-w-0">
                  <span className="text-[10px] text-[#6a6a6a] leading-snug">
                    P: {item.protein ?? "?"}g · C: {item.carbs ?? "?"}g · F: {item.fat ?? "?"}g
                  </span>
                  {item.useCount > 0 && (
                    <span className="text-[9px] uppercase tracking-wider text-[#6a6a6a] opacity-70 leading-none">
                      used {item.useCount}×
                    </span>
                  )}
                </div>
              </div>
            </AliveCard>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <p className="text-center text-[#6a6a6a] text-sm pt-8">
            {search ? "No results" : "Log meals to build your food bank"}
          </p>
        )}
      </div>
    </div>
  );
}

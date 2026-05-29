"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";

const ACCENT = "#4abaff";

export function FoodBankView({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [uploadingId, setUploadingId] = useState<Id<"food_bank"> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingItemRef = useRef<Id<"food_bank"> | null>(null);

  const items = useQuery(api.foodbank.search, { userId, query: search }) ?? [];
  const remove = useMutation(api.foodbank.remove);
  const setImage = useMutation(api.foodbank.setImage);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  function triggerUpload(id: Id<"food_bank">) {
    pendingItemRef.current = id;
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const itemId = pendingItemRef.current;
    if (!file || !itemId) return;
    e.target.value = "";
    setUploadingId(itemId);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await setImage({ id: itemId, imageStorageId: storageId });
    } finally {
      setUploadingId(null);
      pendingItemRef.current = null;
    }
  }

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

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex-1 px-4 space-y-2">
        <AnimatePresence>
          {items.map((item) => (
            <AliveCard
              key={item._id}
              seed={`foodbank:${item._id}`}
              accent={ACCENT}
              className="flex flex-col gap-0 px-0 py-0 overflow-hidden"
              style={{ borderLeft: `3px solid ${ACCENT}` }}
            >
              {/* Image */}
              {item.imageUrl && (
                <div className="w-full" style={{ maxHeight: 140, overflow: "hidden" }}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full object-cover"
                    style={{ height: 140 }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 px-4 py-3">
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

                  {/* Add / change photo button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => triggerUpload(item._id as Id<"food_bank">)}
                    disabled={uploadingId === item._id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium shrink-0"
                    style={{ background: "#252525", color: item.imageUrl ? "#6a6a6a" : ACCENT }}
                  >
                    {uploadingId === item._id ? (
                      <svg className="animate-spin" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M12 3a9 9 0 1 1 0 18A9 9 0 0 1 12 3Z" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      </svg>
                    )}
                    {item.imageUrl ? "Change photo" : "Add photo"}
                  </motion.button>
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

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GroceryListDetail } from "./GroceryListDetail";

const ACCENT = "#fdcb40";

export function GroceryView({ userId }: { userId: string }) {
  const [selectedList, setSelectedList] = useState<Id<"grocery_lists"> | null>(null);
  const [newListName, setNewListName] = useState("");
  const [adding, setAdding] = useState(false);

  const lists = useQuery(api.grocery.getLists, { userId }) ?? [];
  const createList = useMutation(api.grocery.createList);
  const archiveList = useMutation(api.grocery.archiveList);
  const duplicateList = useMutation(api.grocery.duplicateList);

  async function handleCreate() {
    if (!newListName.trim()) return;
    await createList({ userId, name: newListName.trim() });
    setNewListName("");
    setAdding(false);
  }

  if (selectedList) {
    return (
      <GroceryListDetail
        listId={selectedList}
        accent={ACCENT}
        onBack={() => setSelectedList(null)}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-5 pt-12 pb-6">
        <p className="text-[10px] font-light uppercase tracking-[0.15em] text-[#6a6a6a]">Reusable lists</p>
        <h1
          className="text-[56px] leading-none font-black"
          style={{ fontFamily: "var(--font-display)", color: ACCENT }}
        >
          Groceries
        </h1>
      </div>

      <div className="flex-1 px-4 space-y-2">
        <AnimatePresence>
          {lists.map((list) => (
            <motion.div
              key={list._id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3 rounded-2xl px-4 py-4"
              style={{ background: "#1a1a1a", borderLeft: `3px solid ${ACCENT}` }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedList(list._id)}
                className="flex-1 text-left"
              >
                <p className="font-medium text-[#f2f2f2]">{list.name}</p>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => duplicateList({ id: list._id, userId })}
                className="p-1.5 text-[#6a6a6a]"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => archiveList({ id: list._id })}
                className="p-1.5 text-[#6a6a6a]"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25-2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>

        {lists.length === 0 && !adding && (
          <p className="text-center text-[#6a6a6a] text-sm pt-8">No lists yet — create one below</p>
        )}
      </div>

      {/* Add new list */}
      <div className="px-4 mt-4">
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-2 mb-3"
            >
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="List name..."
                className="flex-1 bg-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
              />
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleCreate}
                className="px-5 rounded-xl font-bold text-sm"
                style={{ background: ACCENT, color: "#0e0e0e" }}
              >
                Add
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setAdding(!adding)}
          className="w-full py-4 rounded-2xl font-bold text-base"
          style={{
            background: adding ? "#252525" : ACCENT,
            color: adding ? "#6a6a6a" : "#0e0e0e",
            fontFamily: "var(--font-display)",
          }}
        >
          {adding ? "Cancel" : "New List"}
        </motion.button>
      </div>
    </div>
  );
}

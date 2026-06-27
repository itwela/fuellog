"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSheetDismiss } from "@/lib/useSheetDismiss";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";
import { GroceryTextParseMode } from "./GroceryTextParseMode";
import { DraggableReorderList, type ReorderItem } from "@/components/lightswind/draggable-reorder-list";

/** Clear “done” accent — filled circle + border */
const DONE_GREEN = "#34c759";

/** How many to buy — same idea as meal servings: count only (stored as string for AI compatibility). */
function parseQtyCount(raw: string | undefined | null): number {
  if (raw == null || !String(raw).trim()) return 1;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(99, n);
}

/**
 * Matches `MealCard`: [−] [×N apply | N] [+] plus a slim unit field (lbs, gal, …) — not a second “quantity column”.
 */
function GroceryQtyStepperRow({ item, checked }: { item: Doc<"grocery_list_items">; checked?: boolean }) {
  const updateItemMeta = useMutation(api.grocery.updateItemMeta);
  const savedQty = parseQtyCount(item.quantity);
  const [pendingQty, setPendingQty] = useState(savedQty);
  const [pendingUnit, setPendingUnit] = useState(item.unit ?? "");
  const [savingQty, setSavingQty] = useState(false);

  useEffect(() => {
    setPendingQty(parseQtyCount(item.quantity));
    setPendingUnit(item.unit ?? "");
  }, [item._id, item.quantity, item.unit]);

  const dirtyQty = pendingQty !== savedQty;
  const showQtyChip = pendingQty > 1 || dirtyQty;

  const applyColor = checked ? "#b6f0c0" : "#fdcb40";
  const chipMuted = checked ? "#6abe76" : "#6a6a6a";
  const unitColor = checked ? "#c8f5d0" : "#f2f2f2";

  async function handleApplyQty(e: React.MouseEvent) {
    e.stopPropagation();
    if (!dirtyQty) return;
    setSavingQty(true);
    try {
      await updateItemMeta({ id: item._id, quantity: String(pendingQty) });
    } finally {
      setSavingQty(false);
    }
  }

  function commitUnit() {
    const u = pendingUnit.trim();
    const cur = (item.unit ?? "").trim();
    if (u !== cur) {
      void updateItemMeta({ id: item._id, unit: u });
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-2 pl-8 pt-0.5"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0 min-h-[18px]">
        {showQtyChip && (
          <span
            className="text-[9px] font-semibold tabular-nums leading-none px-1 py-0.5 rounded border"
            style={{
              color: dirtyQty ? applyColor : chipMuted,
              borderColor: dirtyQty ? applyColor : "#4a4a4a",
            }}
          >
            ×{pendingQty}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setPendingQty((q) => Math.max(1, q - 1))}
          className="w-4 h-3.5 flex items-center justify-center text-[#6a6a6a] hover:text-[#f2f2f2] transition-colors"
          aria-label="Decrease amount"
        >
          <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={dirtyQty ? handleApplyQty : undefined}
          disabled={savingQty || !dirtyQty}
          className="text-[9px] font-light min-w-[40px] text-center transition-colors disabled:opacity-40"
          style={{ color: dirtyQty ? applyColor : "#6a6a6a" }}
        >
          {dirtyQty ? (
            savingQty ? (
              "…"
            ) : (
              <span className="inline-flex items-center justify-center gap-0.5">
                <span className="tabular-nums">×{pendingQty}</span>
                <span>apply</span>
              </span>
            )
          ) : (
            <span className="tabular-nums opacity-60">{pendingQty}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setPendingQty((q) => Math.min(99, q + 1))}
          className="w-4 h-3.5 flex items-center justify-center text-[#6a6a6a] hover:text-[#f2f2f2] transition-colors"
          aria-label="Increase amount"
        >
          <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <span className="text-[#4a4a4a] mx-0.5 select-none" aria-hidden>
          ·
        </span>

        <input
          type="text"
          value={pendingUnit}
          onChange={(e) => setPendingUnit(e.target.value)}
          onBlur={commitUnit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="lbs"
          title="Unit (optional): e.g. lbs, oz, gal"
          className="w-12 sm:w-14 bg-transparent text-[9px] outline-none border-b border-[#3a3a3a] focus:border-[#6a6a6a] pb-0.5 text-center placeholder:text-[#4a4a4a]"
          style={{ color: unitColor }}
        />
      </div>
    </div>
  );
}

export function GroceryListDetail({
  listId,
  accent,
  onBack,
}: {
  listId: Id<"grocery_lists">;
  accent: string;
  onBack: () => void;
}) {
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [shopping, setShopping] = useState(false);
  const [listTab, setListTab] = useState<"list" | "ai">("list");
  const [costInput, setCostInput] = useState<string>("");
  const [editingItem, setEditingItem] = useState<Doc<"grocery_list_items"> | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (shopping) setListTab("list");
  }, [shopping]);

  const listData = useQuery(api.grocery.getList, { listId });
  const items = useQuery(api.grocery.getItems, { listId }) ?? [];
  const addItem = useMutation(api.grocery.addItem);
  const toggleItem = useMutation(api.grocery.toggleItem);
  const removeItem = useMutation(api.grocery.removeItem);
  const resetChecks = useMutation(api.grocery.resetChecks);
  const reorderItems = useMutation(api.grocery.reorderItems);
  const { dragProps: editItemDragProps, startDrag: editItemStartDrag } = useSheetDismiss(() => setEditingItem(null));
  const updateItemMeta = useMutation(api.grocery.updateItemMeta);
  const updateListMeta = useMutation(api.grocery.updateListMeta);

  const unchecked = items.filter((i) => !i.checked).sort((a, b) => a.order - b.order);
  const checked = items.filter((i) => i.checked).sort((a, b) => a.order - b.order);

  // Sync cost input when list data loads
  useEffect(() => {
    if (listData?.estimatedCost != null) {
      setCostInput(String(listData.estimatedCost));
    }
  }, [listData?.estimatedCost]);

  function commitCost() {
    const val = parseFloat(costInput);
    const current = listData?.estimatedCost;
    if (costInput.trim() === "" && current != null) {
      void updateListMeta({ listId, estimatedCost: undefined });
    } else if (!isNaN(val) && val !== current) {
      void updateListMeta({ listId, estimatedCost: val });
    }
  }

  function openEditItem(id: string) {
    const item = unchecked.find((i) => i._id === id);
    if (!item) return;
    setEditingItem(item);
    setEditName(item.name);
  }

  async function handleSaveItemName() {
    if (!editingItem || !editName.trim()) return;
    await updateItemMeta({ id: editingItem._id, name: editName.trim() });
    setEditingItem(null);
  }

  async function handleAdd() {
    if (!newItem.trim()) return;
    await addItem({
      listId,
      name: newItem.trim(),
      quantity: newQty.trim() || undefined,
      order: items.length,
    });
    setNewItem("");
    setNewQty("");
  }

  async function handleStartShopping() {
    await resetChecks({ listId });
    setShopping(true);
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center gap-3">
        <motion.button whileTap={{ scale: 0.88 }} onClick={onBack} className="text-[#6a6a6a]">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </motion.button>
        <h1
          className="text-[36px] leading-none font-bold flex-1"
          style={{ color: accent, letterSpacing: "-0.03em" }}
        >
          List
        </h1>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={shopping ? () => setShopping(false) : handleStartShopping}
          className="px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: shopping ? "#252525" : accent, color: shopping ? "#6a6a6a" : "#0e0e0e" }}
        >
          {shopping ? "Done" : "Shop"}
        </motion.button>
      </div>

      {!shopping && (
        <div className="px-5 pb-3">
          <div className="flex rounded-xl p-1" style={{ background: "#252525" }}>
            <button
              type="button"
              onClick={() => setListTab("list")}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: listTab === "list" ? accent : "transparent",
                color: listTab === "list" ? "#0e0e0e" : "#6a6a6a",
              }}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setListTab("ai")}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: listTab === "ai" ? accent : "transparent",
                color: listTab === "ai" ? "#0e0e0e" : "#6a6a6a",
              }}
            >
              AI text
            </button>
          </div>
        </div>
      )}

      {/* Items or AI parse */}
      <div className="flex-1 px-4 space-y-2">
        {listTab === "ai" && !shopping ? (
          <GroceryTextParseMode listId={listId} accent={accent} onDone={() => setListTab("list")} />
        ) : (
          <>
          {/* Non-shopping: draggable reorder list */}
          {!shopping && (
            <DraggableReorderList
              key={unchecked.map(i => i._id).join(",")}
              items={unchecked.map((item): ReorderItem => ({
                id: item._id,
                label: item.name,
                description: item.unit || undefined,
                quantity: parseQtyCount(item.quantity),
              }))}
              removable
              onEditItem={openEditItem}
              onQuantityChange={(id, qty) => {
                void updateItemMeta({ id: id as Id<"grocery_list_items">, quantity: String(qty) });
              }}
              onReorder={(newOrder) => {
                const wasRemoved = newOrder.length < unchecked.length;
                if (wasRemoved) {
                  const removedId = unchecked.find(i => !newOrder.find(n => n.id === i._id))?._id;
                  if (removedId) removeItem({ id: removedId });
                } else {
                  reorderItems({ ids: newOrder.map(i => i.id as Id<"grocery_list_items">) });
                }
              }}
            />
          )}

          {/* Shopping mode: checkbox list */}
          {shopping && (
            <AnimatePresence>
              {unchecked.map((item) => (
                  <AliveCard
                    key={item._id}
                    seed={`groceryItem:${item._id}`}
                    accent={accent}
                    className="flex flex-col gap-2 px-4 py-3"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleItem({ id: item._id, checked: true })}
                        className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ borderColor: accent, background: "transparent" }}
                        aria-label="Mark done"
                      />
                      <p className="font-medium text-sm leading-snug flex-1 min-w-0 line-clamp-2 break-words" style={{ color: "#f2f2f2" }}>
                        {item.name}
                      </p>
                    </div>
                    <GroceryQtyStepperRow item={item} checked={false} />
                  </AliveCard>
              ))}
            </AnimatePresence>
          )}

            {/* Checked items at bottom in shopping mode */}
            {shopping && checked.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium mb-2 px-1" style={{ color: DONE_GREEN }}>
                  In cart ({checked.length})
                </p>
                <AnimatePresence>
                  {checked.map((item) => (
                    <motion.div
                      key={item._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-2 rounded-2xl px-4 py-3 mb-2 ring-1 ring-[#34c759]/40"
                      style={{ background: "rgba(52, 199, 89, 0.12)" }}
                    >
                      <div className="flex items-start gap-2">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.8 }}
                          onClick={() => toggleItem({ id: item._id, checked: false })}
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: DONE_GREEN }}
                          aria-label="Undo — move back to list"
                        >
                          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </motion.button>
                        <p className="text-[#d4f5da] text-sm leading-snug line-clamp-2 break-words flex-1 min-w-0 line-through decoration-[#6abe76]/80">
                          {item.name}
                        </p>
                      </div>
                      <GroceryQtyStepperRow item={item} checked />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Estimated cost */}
      {!shopping && listTab === "list" && (
        <div className="px-4 mt-4 mb-2 flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 flex-1"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="text-sm font-medium shrink-0" style={{ color: "#6a6a6a" }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              onBlur={commitCost}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder="Est. cost"
              className="bg-transparent outline-none text-sm w-full placeholder-[#3a3a3a]"
              style={{ color: costInput ? accent : undefined }}
            />
          </div>
          {listData?.estimatedCost != null && (
            <p className="text-xs font-medium shrink-0" style={{ color: "#6a6a6a" }}>
              est. total
            </p>
          )}
        </div>
      )}

      {/* Add item */}
      {!shopping && listTab === "list" && (
        <div className="px-4 mt-0 flex gap-2">
          <input
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            placeholder="Qty"
            className="w-16 bg-[#1a1a1a] rounded-xl px-3 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
          />
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add item..."
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.05)" }}
          />
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleAdd}
            className="px-5 rounded-xl font-bold text-sm"
            style={{ background: accent, color: "#0e0e0e" }}
          >
            Add
          </motion.button>
        </div>
      )}

      {/* Edit item name sheet */}
      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 z-40 bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 38 }}
              {...editItemDragProps}
              className="fixed inset-x-0 bottom-0 z-50 px-5 pt-4 rounded-t-3xl"
              style={{
                background: "#1a1a1a",
                paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div onPointerDown={editItemStartDrag} className="w-9 h-[5px] rounded-full mx-auto mb-5 touch-none cursor-grab" style={{ background: "rgba(84,84,88,0.6)" }} />
              <p className="text-base font-semibold text-[#f2f2f2] mb-4" style={{ letterSpacing: "-0.01em" }}>
                Edit item
              </p>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSaveItemName()}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium text-[#f2f2f2] placeholder-[#6a6a6a] outline-none mb-4"
                style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-[#6a6a6a]"
                  style={{ background: "#252525" }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void handleSaveItemName()}
                  disabled={!editName.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ background: accent, color: "#0e0e0e", opacity: editName.trim() ? 1 : 0.35 }}
                >
                  Save
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

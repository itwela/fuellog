"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "framer-motion";
import { GripVertical, X, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ReorderItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  quantity?: number;
}

interface DraggableReorderListProps {
  /** Items in their current order. Kept in sync while the user is not dragging. */
  items: ReorderItem[];
  /** Fires once per gesture, when the drag settles — not on every frame of the drag. */
  onReorder?: (items: ReorderItem[]) => void;
  /** Allow removing items */
  removable?: boolean;
  /** Called when an item's remove button is tapped. */
  onRemoveItem?: (id: string) => void;
  /** Additional classes */
  className?: string;
  /** Called when quantity stepper is used (only rendered when item.quantity is defined) */
  onQuantityChange?: (id: string, qty: number) => void;
  /** Called when edit button is tapped (renders pencil icon when provided) */
  onEditItem?: (id: string) => void;
}

/** Identity of a list as far as ordering is concerned. */
function orderKey(items: ReorderItem[]): string {
  return items.map((i) => i.id).join(" ");
}

function Item({
  item,
  onRemove,
  removable,
  onQuantityChange,
  onEditItem,
  onDragStart,
  onDragEnd,
  onNudge,
  canMoveUp,
  canMoveDown,
}: {
  item: ReorderItem;
  onRemove: (id: string) => void;
  removable: boolean;
  onQuantityChange?: (id: string, qty: number) => void;
  onEditItem?: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onNudge: (id: string, direction: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const dragControls = useDragControls();
  const [localQty, setLocalQty] = useState(item.quantity ?? 1);

  // Keep the stepper honest when the value changes upstream (edit sheet, AI parse, …).
  useEffect(() => {
    setLocalQty(item.quantity ?? 1);
  }, [item.quantity]);

  function handleQtyStep(delta: number) {
    const next = Math.max(1, Math.min(99, localQty + delta));
    setLocalQty(next);
    onQuantityChange?.(item.id, next);
  }

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      as="div"
      className="relative rounded-xl"
      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
      whileDrag={{
        scale: 1.03,
        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        zIndex: 50,
        cursor: "grabbing",
      }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
        className={cn("flex items-center gap-2 px-3 py-3 cursor-default select-none")}
      >
        {/* Drag handle — generous hit area, and arrow nudges for when dragging is fiddly */}
        <div className="flex flex-col items-center shrink-0 -my-1">
          <button
            type="button"
            onClick={() => onNudge(item.id, -1)}
            disabled={!canMoveUp}
            aria-label={`Move ${item.label} up`}
            className="w-6 h-4 flex items-center justify-center text-[#4a4a4a] hover:text-[#f2f2f2] disabled:opacity-25 disabled:hover:text-[#4a4a4a] transition-colors"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <div
            onPointerDown={(e) => {
              e.preventDefault();
              dragControls.start(e);
            }}
            className="w-6 h-5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
            role="button"
            aria-label={`Drag ${item.label} to reorder`}
          >
            <GripVertical className="h-4 w-4" color="#5a5a5a" />
          </div>

          <button
            type="button"
            onClick={() => onNudge(item.id, 1)}
            disabled={!canMoveDown}
            aria-label={`Move ${item.label} down`}
            className="w-6 h-4 flex items-center justify-center text-[#4a4a4a] hover:text-[#f2f2f2] disabled:opacity-25 disabled:hover:text-[#4a4a4a] transition-colors"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* Icon */}
        {item.icon && (
          <div
            className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "#252525", color: "#6a6a6a" }}
          >
            {item.icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <p
            className="text-sm font-medium truncate select-none"
            style={{ color: "#f2f2f2", letterSpacing: "-0.01em" }}
          >
            {item.label}
          </p>
          {item.description && (
            <p className="text-xs truncate mt-0.5 select-none" style={{ color: "#6a6a6a" }}>
              {item.description}
            </p>
          )}
        </div>

        {/* Quantity Stepper */}
        {item.quantity !== undefined && (
          <div
            className="flex items-center gap-1 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleQtyStep(-1)}
              aria-label={`Decrease quantity of ${item.label}`}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "#252525", color: "#6a6a6a" }}
            >
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M5 12h14" />
              </svg>
            </button>
            <span
              className="text-xs tabular-nums w-5 text-center font-medium"
              style={{ color: "#f2f2f2" }}
            >
              {localQty}
            </span>
            <button
              type="button"
              onClick={() => handleQtyStep(1)}
              aria-label={`Increase quantity of ${item.label}`}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "#252525", color: "#6a6a6a" }}
            >
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        )}

        {/* Edit Button */}
        {onEditItem && (
          <motion.button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onEditItem(item.id)}
            aria-label={`Edit ${item.label}`}
            className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-colors focus:outline-none"
            style={{ color: "rgba(235,235,245,0.25)" }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
              />
            </svg>
          </motion.button>
        )}

        {/* Remove Button */}
        {removable && (
          <motion.button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.label}`}
            className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-colors focus:outline-none"
            style={{ color: "rgba(235,235,245,0.3)" }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </motion.div>
    </Reorder.Item>
  );
}

export function DraggableReorderList({
  items: incomingItems,
  onReorder,
  removable = true,
  onRemoveItem,
  className,
  onQuantityChange,
  onEditItem,
}: DraggableReorderListProps) {
  const [items, setItems] = useState<ReorderItem[]>(incomingItems);
  const [dragging, setDragging] = useState(false);

  // Latest values for use inside the drag-end handler without re-binding it.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  /** The order last handed to `onReorder`, so we don't re-commit an unchanged order. */
  const committedRef = useRef(orderKey(incomingItems));

  /**
   * Adopt upstream changes only while idle. Committing on drag end means the server
   * echo arrives after the gesture is over, so this never yanks the list mid-drag —
   * which is exactly what the old `key`-remount workaround was doing.
   */
  useEffect(() => {
    if (dragging) return;
    const incomingKey = orderKey(incomingItems);
    committedRef.current = incomingKey;
    setItems((current) => {
      // Re-render for label/quantity edits too, not just order changes.
      if (orderKey(current) === incomingKey && current.length === incomingItems.length) {
        const same = current.every((c, i) => {
          const n = incomingItems[i];
          return c.label === n.label && c.description === n.description && c.quantity === n.quantity;
        });
        if (same) return current;
      }
      return incomingItems;
    });
  }, [incomingItems, dragging]);

  /** During the gesture this only moves things locally — no server write per frame. */
  const handleReorder = useCallback((newOrder: ReorderItem[]) => {
    setItems(newOrder);
  }, []);

  const commit = useCallback(
    (next: ReorderItem[]) => {
      const key = orderKey(next);
      if (key === committedRef.current) return;
      committedRef.current = key;
      onReorder?.(next);
    },
    [onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragging(false);
    commit(itemsRef.current);
  }, [commit]);

  const handleRemove = useCallback(
    (id: string) => {
      const next = itemsRef.current.filter((item) => item.id !== id);
      setItems(next);
      committedRef.current = orderKey(next);
      if (onRemoveItem) onRemoveItem(id);
      else onReorder?.(next);
    },
    [onRemoveItem, onReorder]
  );

  /** Arrow-button move: a reliable path when a drag is awkward (small screens especially). */
  const handleNudge = useCallback(
    (id: string, direction: -1 | 1) => {
      const current = itemsRef.current;
      const from = current.findIndex((i) => i.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      setItems(next);
      commit(next);
    },
    [commit]
  );

  return (
    <div className={cn("w-full select-none", className)} style={{ userSelect: "none" }}>
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={handleReorder}
        className="flex flex-col gap-2"
        as="div"
      >
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <Item
              key={item.id}
              item={item}
              onRemove={handleRemove}
              removable={removable}
              onQuantityChange={onQuantityChange}
              onEditItem={onEditItem}
              onDragStart={() => setDragging(true)}
              onDragEnd={handleDragEnd}
              onNudge={handleNudge}
              canMoveUp={index > 0}
              canMoveDown={index < items.length - 1}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl py-10 gap-2"
          style={{ border: "1px dashed rgba(255,255,255,0.1)", color: "#6a6a6a" }}
        >
          <Plus className="h-5 w-5 opacity-40" />
          <p className="text-sm">All items removed</p>
        </motion.div>
      )}
    </div>
  );
}

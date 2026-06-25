"use client";

import React, { useState } from "react";
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
  /** Initial items */
  items: ReorderItem[];
  /** Callback with new order when reordered */
  onReorder?: (items: ReorderItem[]) => void;
  /** Allow removing items */
  removable?: boolean;
  /** Additional classes */
  className?: string;
  /** Called when quantity stepper is used (only rendered when item.quantity is defined) */
  onQuantityChange?: (id: string, qty: number) => void;
  /** Called when edit button is tapped (renders pencil icon when provided) */
  onEditItem?: (id: string) => void;
}

function Item({
  item,
  onRemove,
  removable,
  onQuantityChange,
  onEditItem,
}: {
  item: ReorderItem;
  onRemove: (id: string) => void;
  removable: boolean;
  onQuantityChange?: (id: string, qty: number) => void;
  onEditItem?: (id: string) => void;
}) {
  const dragControls = useDragControls();
  const [localQty, setLocalQty] = useState(item.quantity ?? 1);

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
      as="div"
      className="relative"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
        whileDrag={{
          scale: 1.03,
          boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
          zIndex: 50,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        onPointerDown={(e) => e.preventDefault()}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 cursor-default select-none"
        )}
        style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Drag Handle */}
        <motion.div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
          whileHover={{ scale: 1.1 }}
        >
          <GripVertical className="h-4 w-4" color="#4a4a4a" />
        </motion.div>

        {/* Icon */}
        {item.icon && (
          <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#252525", color: "#6a6a6a" }}>
            {item.icon}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="text-sm font-medium truncate select-none" style={{ color: "#f2f2f2", letterSpacing: "-0.01em" }}>{item.label}</p>
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
              className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "#252525", color: "#6a6a6a" }}
            >
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" d="M5 12h14" />
              </svg>
            </button>
            <span className="text-xs tabular-nums w-5 text-center font-medium" style={{ color: "#f2f2f2" }}>
              {localQty}
            </span>
            <button
              type="button"
              onClick={() => handleQtyStep(1)}
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
            onClick={() => onEditItem(item.id)}
            aria-label={`Edit ${item.label}`}
            className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-colors focus:outline-none"
            style={{ color: "rgba(235,235,245,0.25)" }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
          </motion.button>
        )}

        {/* Remove Button */}
        {removable && (
          <motion.button
            type="button"
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
  items: initialItems,
  onReorder,
  removable = true,
  className,
  onQuantityChange,
  onEditItem,
}: DraggableReorderListProps) {
  const [items, setItems] = useState<ReorderItem[]>(initialItems);

  const handleReorder = (newOrder: ReorderItem[]) => {
    setItems(newOrder);
    onReorder?.(newOrder);
  };

  const handleRemove = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    onReorder?.(next);
  };

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
          {items.map((item) => (
            <Item
              key={item.id}
              item={item}
              onRemove={handleRemove}
              removable={removable}
              onQuantityChange={onQuantityChange}
              onEditItem={onEditItem}
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

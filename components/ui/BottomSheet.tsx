"use client";

import { motion } from "framer-motion";
import { SheetHeader } from "@/components/ui/SheetHeader";

/**
 * z-40 backdrop / z-50 panel is load-bearing: BottomNav sits at z-30 specifically
 * so every sheet wins that stacking fight without having to think about it.
 */
const SHEET_TRANSITION = { type: "spring", stiffness: 320, damping: 38 } as const;

export function BottomSheet({
  onClose,
  children,
  className = "",
  panelStyle,
  backdropClassName = "bg-black/60",
  backdropStyle,
  showHeader = true,
  transition = SHEET_TRANSITION,
}: {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  panelStyle?: React.CSSProperties;
  backdropClassName?: string;
  backdropStyle?: React.CSSProperties;
  showHeader?: boolean;
  transition?: { type: "spring"; stiffness: number; damping: number };
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={`fixed inset-0 z-40 ${backdropClassName}`}
        style={backdropStyle}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={transition}
        className={`fixed inset-x-0 bottom-0 z-50 ${className}`}
        style={panelStyle}
      >
        {showHeader && <SheetHeader onClose={onClose} />}
        {children}
      </motion.div>
    </>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Tab } from "@/app/page";

const TABS: { id: Tab; label: string; icon: React.FC<{ active: boolean; color: string }> }[] = [
  {
    id: "meal",
    label: "Log",
    icon: ({ active, color }) => (
      <svg width="24" height="24" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: "food",
    label: "Food Bank",
    icon: ({ active, color }) => (
      <svg width="24" height="24" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    id: "grocery",
    label: "Groceries",
    icon: ({ active, color }) => (
      <svg width="24" height="24" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
  {
    id: "workout",
    label: "Workout",
    icon: ({ active, color }) => (
      <svg width="24" height="24" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
];

const ACCENT: Record<Tab, string> = {
  meal: "#b6ff4a",
  food: "#4abaff",
  grocery: "#fdcb40",
  workout: "#ff5623",
};

export function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <nav
      className="relative z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        background: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        minHeight: 64,
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab;
        const color = ACCENT[id];

        return (
          <motion.button
            key={id}
            onClick={() => onTabChange(id)}
            whileTap={{ scale: 0.88 }}
            className="flex flex-col items-center gap-1 px-4 py-2 relative"
            style={{ opacity: isActive ? 1 : 0.4 }}
          >
            <Icon active={isActive} color={color} />
            <AnimatePresence>
              {isActive && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="text-[9px] font-medium uppercase tracking-widest"
                  style={{ color }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
            {isActive && (
              <motion.div
                layoutId="nav-pip"
                className="absolute -bottom-0 h-[3px] w-6 rounded-full"
                style={{ background: color }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}

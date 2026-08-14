"use client";

import { motion } from "framer-motion";
import type { Tab } from "@/lib/types";

const TABS: {
  id: Tab;
  label: string;
  icon: (props: { active: boolean; color: string }) => React.ReactElement;
}[] = [
  {
    id: "meal",
    label: "Log",
    icon: ({ active, color }) => (
      <svg width="25" height="25" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: "water",
    label: "Water",
    icon: ({ active, color }) => (
      <svg width="25" height="25" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25S5.25 9.75 5.25 14.25a6.75 6.75 0 0 0 13.5 0C18.75 9.75 12 2.25 12 2.25Z" />
      </svg>
    ),
  },
  {
    id: "food",
    label: "Bank",
    icon: ({ active, color }) => (
      <svg width="25" height="25" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    id: "grocery",
    label: "Shop",
    icon: ({ active, color }) => (
      <svg width="25" height="25" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
  {
    id: "workout",
    label: "Train",
    icon: ({ active, color }) => (
      <svg width="25" height="25" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    id: "plans",
    label: "Plans",
    icon: ({ active, color }) => (
      <svg width="25" height="25" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
];

const ACCENT: Record<Tab, string> = {
  meal: "#b6ff4a",
  food: "#4abaff",
  grocery: "#fdcb40",
  workout: "#ff5623",
  plans: "#c084fc",
  water: "#38bdf8",
};

const INACTIVE = "rgba(235,235,245,0.32)";

export function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <nav
      className="relative z-30 flex items-center justify-around px-2"
      style={{
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "0.5px solid rgba(84,84,88,0.4)",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
        paddingTop: 10,
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = id === activeTab;
        const color = isActive ? ACCENT[id] : INACTIVE;

        return (
          <motion.button
            key={id}
            onClick={() => onTabChange(id)}
            whileTap={{ scale: 0.86 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className="flex flex-col items-center justify-center gap-[3px] min-w-[56px] py-1"
          >
            <motion.div
              animate={{ color }}
              transition={{ duration: 0.18 }}
              style={{ color }}
            >
              <Icon active={isActive} color={color} />
            </motion.div>
            <motion.span
              animate={{ color }}
              transition={{ duration: 0.18 }}
              className="text-[10px] font-medium leading-none"
              style={{ letterSpacing: "-0.01em" }}
            >
              {label}
            </motion.span>
          </motion.button>
        );
      })}
    </nav>
  );
}

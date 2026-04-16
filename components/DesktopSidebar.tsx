"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { todayISO, sumMacros } from "@/lib/utils";
import { MacroProgressBar } from "./MacroProgressBar";
import { GoalsSheet } from "./GoalsSheet";
import { SugarDayStat } from "./SugarDayStat";
import type { Tab } from "@/app/page";

const NAV_ITEMS: { id: Tab; label: string; icon: React.FC<{ active: boolean; color: string }> }[] = [
  {
    id: "meal",
    label: "Meal Log",
    icon: ({ active, color }) => (
      <svg width="18" height="18" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: "food",
    label: "Food Bank",
    icon: ({ active, color }) => (
      <svg width="18" height="18" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    id: "grocery",
    label: "Groceries",
    icon: ({ active, color }) => (
      <svg width="18" height="18" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
  {
    id: "workout",
    label: "Workout",
    icon: ({ active, color }) => (
      <svg width="18" height="18" fill="none" stroke={active ? color : "currentColor"} strokeWidth="1.5" viewBox="0 0 24 24">
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

export function DesktopSidebar({
  activeTab,
  onTabChange,
  userId,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  userId: string;
}) {
  const [goalsOpen, setGoalsOpen] = useState(false);

  const today = todayISO();
  const logs = useQuery(api.meals.getByDate, { userId, date: today }) ?? [];
  const goals = useQuery(api.goals.get, { userId });
  const totals = sumMacros(logs);

  const calorieRemaining = goals ? Math.max(goals.calories - (totals.calories ?? 0), 0) : null;
  const calorieOver = goals && (totals.calories ?? 0) > goals.calories;
  const caloriePct = goals && goals.calories > 0
    ? Math.min((totals.calories ?? 0) / goals.calories, 1)
    : 0;

  return (
    <>
      <aside
        className="hidden md:flex flex-col h-full w-64 flex-shrink-0 border-r"
        style={{ background: "#0e0e0e", borderColor: "#1e1e1e" }}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6a6a6a]">Personal</p>
          <h1
            className="text-4xl font-black leading-none"
            style={{ fontFamily: "var(--font-display)", color: "#b6ff4a" }}
          >
            FuelLog
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 mb-6">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = id === activeTab;
            const color = ACCENT[id];
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onTabChange(id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left relative"
                style={{
                  background: isActive ? `${color}14` : "transparent",
                  color: isActive ? color : "#6a6a6a",
                }}
              >
                <Icon active={isActive} color={color} />
                <span className="text-sm font-medium">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pip"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: color }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-6 mb-5 h-px" style={{ background: "#1e1e1e" }} />

        {/* Today's goals */}
        <div className="flex-1 px-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#6a6a6a]">Today's progress</p>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setGoalsOpen(true)}
              className="text-[10px] uppercase tracking-wider"
              style={{ color: "#b6ff4a" }}
            >
              {goals ? "Edit" : "Set goals"}
            </motion.button>
          </div>

          {goals ? (
            <div className="space-y-1">
              {/* Big calorie hero */}
              <div
                className="rounded-2xl p-4 mb-4"
                style={{ background: "#1a1a1a" }}
              >
                {/* Calorie arc */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[#6a6a6a]">
                      {calorieOver ? "Over by" : "Remaining"}
                    </p>
                    <p
                      className="text-[42px] font-black leading-none"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: calorieOver ? "#ff453a" : "#b6ff4a",
                      }}
                    >
                      {calorieRemaining}
                    </p>
                    <p className="text-[9px] text-[#6a6a6a]">of {goals.calories} kcal</p>
                  </div>

                  {/* Mini donut */}
                  <svg width="56" height="56" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#252525" strokeWidth="6" />
                    <motion.circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke={calorieOver ? "#ff453a" : "#b6ff4a"}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                      animate={{ strokeDashoffset: (1 - caloriePct) * 2 * Math.PI * 22 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      transform="rotate(-90 28 28)"
                    />
                  </svg>
                </div>

                {/* Consumed bar */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#252525" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: calorieOver ? "#ff453a" : "#b6ff4a" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${caloriePct * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-[#6a6a6a]">{Math.round(totals.calories ?? 0)} consumed</span>
                  <span className="text-[9px] text-[#6a6a6a]">{goals.calories} goal</span>
                </div>
              </div>

              {/* Macro bars */}
              <div className="space-y-4">
                <MacroProgressBar
                  label="Protein"
                  current={totals.protein ?? 0}
                  goal={goals.protein}
                  color="#b6ff4a"
                />
                <MacroProgressBar
                  label="Carbs"
                  current={totals.carbs ?? 0}
                  goal={goals.carbs}
                  color="#4abaff"
                />
                <MacroProgressBar
                  label="Fat"
                  current={totals.fat ?? 0}
                  goal={goals.fat}
                  color="#fdcb40"
                />
              </div>

              <div className="mt-4">
                <SugarDayStat grams={totals.sugar ?? 0} dayLabel="Today" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <SugarDayStat grams={totals.sugar ?? 0} dayLabel="Today" />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setGoalsOpen(true)}
                className="w-full rounded-2xl border border-dashed py-6 text-center"
                style={{ borderColor: "#3a3a3a" }}
              >
                <p className="text-sm text-[#6a6a6a]">Set your daily goals</p>
                <p className="text-[10px] text-[#3a3a3a] mt-1">Track progress against targets</p>
              </motion.button>
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-6" />
      </aside>

      <AnimatePresence>
        {goalsOpen && (
          <GoalsSheet userId={userId} onClose={() => setGoalsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

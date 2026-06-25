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

const NAV_ITEMS: {
  id: Tab;
  label: string;
  icon: (props: { active: boolean; color: string }) => React.ReactElement;
}[] = [
  {
    id: "meal",
    label: "Meal Log",
    icon: ({ active, color }) => (
      <svg width="17" height="17" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    id: "water",
    label: "Hydration",
    icon: ({ active, color }) => (
      <svg width="17" height="17" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25S5.25 9.75 5.25 14.25a6.75 6.75 0 0 0 13.5 0C18.75 9.75 12 2.25 12 2.25Z" />
      </svg>
    ),
  },
  {
    id: "food",
    label: "Food Bank",
    icon: ({ active, color }) => (
      <svg width="17" height="17" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v.375c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    id: "grocery",
    label: "Groceries",
    icon: ({ active, color }) => (
      <svg width="17" height="17" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
  {
    id: "workout",
    label: "Workout",
    icon: ({ active, color }) => (
      <svg width="17" height="17" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    id: "plans",
    label: "Meal Plans",
    icon: ({ active, color }) => (
      <svg width="17" height="17" fill="none" stroke={color} strokeWidth={active ? "2" : "1.5"} viewBox="0 0 24 24">
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
        className="hidden md:flex flex-col h-full w-64 flex-shrink-0"
        style={{
          background: "#0e0e0e",
          borderRight: "0.5px solid rgba(84,84,88,0.35)",
        }}
      >
        {/* Logo */}
        <div className="px-6 pt-9 pb-7">
          <h1
            className="text-[32px] font-bold leading-none tracking-tight"
            style={{ color: "#b6ff4a", letterSpacing: "-0.03em" }}
          >
            FuelLog
          </h1>
          <p className="text-xs font-medium text-[#6a6a6a] mt-1">Personal Nutrition</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 mb-5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = id === activeTab;
            const color = ACCENT[id];
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onTabChange(id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                style={{
                  background: isActive ? `${color}16` : "transparent",
                  color: isActive ? color : "rgba(235,235,245,0.45)",
                }}
              >
                <Icon active={isActive} color={isActive ? color : "rgba(235,235,245,0.45)"} />
                <span className="text-sm font-medium">{label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-5 mb-5 h-px" style={{ background: "rgba(84,84,88,0.3)" }} />

        {/* Today's goals */}
        <div className="flex-1 px-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[#6a6a6a]">Today's Progress</p>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setGoalsOpen(true)}
              className="text-xs font-medium"
              style={{ color: "#b6ff4a" }}
            >
              {goals ? "Edit" : "Set Goals"}
            </motion.button>
          </div>

          {goals ? (
            <div className="space-y-1">
              {/* Calorie hero */}
              <div
                className="rounded-2xl p-4 mb-4 animate-gradient-border"
                style={{
                  background: "linear-gradient(#1a1a1a, #1a1a1a) padding-box, conic-gradient(from var(--border-angle), rgba(255,255,255,0.06) 80%, #b6ff4a 86%, #4abaff 90%, #b6ff4a 94%, rgba(255,255,255,0.06)) border-box",
                  border: "1px solid transparent",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-medium text-[#6a6a6a]">
                      {calorieOver ? "Over by" : "Remaining"}
                    </p>
                    <p
                      className="text-[40px] font-bold leading-none"
                      style={{
                        color: calorieOver ? "#ff453a" : "#b6ff4a",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {calorieRemaining}
                    </p>
                    <p className="text-[10px] text-[#6a6a6a] font-medium mt-0.5">
                      of {goals.calories} kcal
                    </p>
                  </div>

                  {/* Donut */}
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="20" fill="none" stroke="#252525" strokeWidth="5.5" />
                    <motion.circle
                      cx="26"
                      cy="26"
                      r="20"
                      fill="none"
                      stroke={calorieOver ? "#ff453a" : "#b6ff4a"}
                      strokeWidth="5.5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                      animate={{ strokeDashoffset: (1 - caloriePct) * 2 * Math.PI * 20 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      transform="rotate(-90 26 26)"
                    />
                  </svg>
                </div>

                {/* Track */}
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#252525" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: calorieOver ? "#ff453a" : "#b6ff4a" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${caloriePct * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-medium text-[#6a6a6a]">{Math.round(totals.calories ?? 0)} consumed</span>
                  <span className="text-[10px] font-medium text-[#6a6a6a]">{goals.calories} goal</span>
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
                className="w-full rounded-2xl py-6 text-center"
                style={{
                  border: "1px dashed rgba(84,84,88,0.5)",
                  background: "transparent",
                }}
              >
                <p className="text-sm font-medium text-[#6a6a6a]">Set daily goals</p>
                <p className="text-xs text-[#3a3a3a] mt-1">Track progress against targets</p>
              </motion.button>
            </div>
          )}
        </div>

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

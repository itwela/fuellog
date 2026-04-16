"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getMonthDays, isSameDay, toISO } from "@/lib/utils";

const ACCENT = "#b6ff4a";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

export function MonthCalendar({
  selected,
  loggedDates,
  onSelect,
  onClose,
}: {
  selected: Date;
  loggedDates: string[];
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth() + 1); // 1-indexed

  const today = new Date();
  const loggedSet = new Set(loggedDates);
  const days = getMonthDays(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    const nextIsAfterToday = viewYear > today.getFullYear() ||
      (viewYear === today.getFullYear() && viewMonth >= today.getMonth() + 1);
    if (nextIsAfterToday) return;
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const isAtCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-60 rounded-3xl p-5 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[340px]"
        style={{ background: "#1a1a1a" }}
      >
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <motion.button whileTap={{ scale: 0.85 }} onClick={prevMonth} className="p-2 text-[#6a6a6a]">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </motion.button>

          <span
            className="text-2xl font-black"
            style={{ fontFamily: "var(--font-display)", color: ACCENT }}
          >
            {MONTH_NAMES[viewMonth - 1]} {viewYear}
          </span>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={nextMonth}
            disabled={isAtCurrentMonth}
            className="p-2 text-[#6a6a6a]"
            style={{ opacity: isAtCurrentMonth ? 0.2 : 1 }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </motion.button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d, i) => (
            <div key={i} className="text-center text-[9px] uppercase tracking-wider text-[#6a6a6a] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const iso = toISO(day);
            const isSelected = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            const isFuture = day > today;
            const hasData = loggedSet.has(iso);

            return (
              <motion.button
                key={iso}
                whileTap={{ scale: 0.82 }}
                onClick={() => { if (!isFuture) { onSelect(day); onClose(); } }}
                disabled={isFuture}
                className="flex flex-col items-center justify-center h-9 rounded-xl relative"
                style={{
                  background: isSelected ? ACCENT : "transparent",
                  opacity: isFuture ? 0.2 : 1,
                }}
              >
                <span
                  className="text-sm font-bold leading-none"
                  style={{ color: isSelected ? "#0e0e0e" : isToday ? ACCENT : "#f2f2f2" }}
                >
                  {day.getDate()}
                </span>
                {hasData && !isSelected && (
                  <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: ACCENT }} />
                )}
                {isToday && !isSelected && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${ACCENT}50` }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Jump to today */}
        {!isAtCurrentMonth && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth() + 1); }}
            className="w-full mt-4 py-2 rounded-xl text-xs font-medium"
            style={{ background: "#252525", color: "#6a6a6a" }}
          >
            Jump to today
          </motion.button>
        )}
      </motion.div>
    </>
  );
}

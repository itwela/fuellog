"use client";

import { motion, AnimatePresence } from "framer-motion";
import { addDays, getWeekDays, isSameDay, toISO } from "@/lib/utils";

const ACCENT = "#b6ff4a";
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function DateStrip({
  selected,
  onSelect,
  onOpenCalendar,
  loggedDates,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
  onOpenCalendar: () => void;
  loggedDates: string[]; // ISO strings with data
}) {
  const today = new Date();
  const week = getWeekDays(selected);
  const loggedSet = new Set(loggedDates);

  function prevWeek() {
    onSelect(addDays(week[0], -7));
  }

  function nextWeek() {
    const next = addDays(week[6], 1);
    // Don't navigate past today's week
    if (next <= today) onSelect(next);
  }

  const isCurrentWeek = week.some((d) => isSameDay(d, today));

  return (
    <div className="flex items-center gap-2 px-4 pb-4">
      {/* Prev week */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={prevWeek}
        className="p-1.5 rounded-lg text-[#6a6a6a]"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </motion.button>

      {/* Day pills */}
      <div className="flex flex-1 gap-1">
        {week.map((day, i) => {
          const iso = toISO(day);
          const isSelected = isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          const isFuture = day > today;
          const hasData = loggedSet.has(iso);

          return (
            <motion.button
              key={iso}
              whileTap={{ scale: 0.88 }}
              onClick={() => !isFuture && onSelect(day)}
              disabled={isFuture}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl relative"
              style={{
                background: isSelected ? ACCENT : "transparent",
                opacity: isFuture ? 0.25 : 1,
              }}
            >
              <span
                className="text-[9px] uppercase tracking-wider"
                style={{ color: isSelected ? "#0e0e0e" : "#6a6a6a" }}
              >
                {DAY_LABELS[i]}
              </span>
              <span
                className="text-sm font-black leading-none"
                style={{
                  fontFamily: "var(--font-display)",
                  color: isSelected ? "#0e0e0e" : isToday ? ACCENT : "#f2f2f2",
                }}
              >
                {day.getDate()}
              </span>
              {/* Data dot */}
              {hasData && !isSelected && (
                <motion.div
                  layoutId={`dot-${iso}`}
                  className="w-1 h-1 rounded-full"
                  style={{ background: ACCENT }}
                />
              )}
              {/* Today ring */}
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

      {/* Next week / calendar */}
      <div className="flex flex-col items-center gap-1">
        {!isCurrentWeek && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={nextWeek}
            className="p-1.5 rounded-lg text-[#6a6a6a]"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onOpenCalendar}
          className="p-1.5 rounded-lg text-[#6a6a6a]"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}

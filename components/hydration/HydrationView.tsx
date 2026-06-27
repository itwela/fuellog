"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ACCENT = "#38bdf8";
const GOAL_OZ = 128; // 1 gallon

const QUICK_AMOUNTS = [8, 16, 24, 32];

function toISO(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// SVG ring chart
function HydrationRing({ oz, goal }: { oz: number; goal: number }) {
  const pct = Math.min(oz / goal, 1);
  const r = 88;
  const cx = 112;
  const cy = 112;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * pct;
  const empty = circumference - filled;

  const gallons = oz / 128;
  const cups = oz / 8;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 224, height: 224 }}>
        <svg width="224" height="224" viewBox="0 0 224 224">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="16"
          />
          {/* Progress */}
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={ACCENT}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${empty}`}
            strokeDashoffset={circumference * 0.25}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${filled} ${empty}` }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
          {/* Glow */}
          {pct > 0 && (
            <motion.circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={ACCENT}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${empty}`}
              strokeDashoffset={circumference * 0.25}
              opacity={0.18}
              filter="blur(6px)"
              animate={{ strokeDasharray: `${filled} ${empty}` }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[38px] font-bold leading-none tabular-nums" style={{ color: ACCENT, letterSpacing: "-0.03em" }}>
            {oz}
          </span>
          <span className="text-[13px] font-medium mt-0.5" style={{ color: "rgba(235,235,245,0.45)" }}>oz of {goal}</span>
          {pct >= 1 && (
            <span className="text-[11px] font-semibold mt-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(56,189,248,0.15)", color: ACCENT }}>
              Goal met!
            </span>
          )}
        </div>
      </div>

      {/* Sub stats */}
      <div className="flex gap-6 mt-1">
        <div className="text-center">
          <p className="text-[22px] font-bold tabular-nums" style={{ color: "rgba(235,235,245,0.85)", letterSpacing: "-0.02em" }}>
            {gallons.toFixed(2)}
          </p>
          <p className="text-[11px] font-medium" style={{ color: "rgba(235,235,245,0.35)" }}>gallons</p>
        </div>
        <div className="w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="text-center">
          <p className="text-[22px] font-bold tabular-nums" style={{ color: "rgba(235,235,245,0.85)", letterSpacing: "-0.02em" }}>
            {cups.toFixed(1)}
          </p>
          <p className="text-[11px] font-medium" style={{ color: "rgba(235,235,245,0.35)" }}>cups</p>
        </div>
        <div className="w-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="text-center">
          <p className="text-[22px] font-bold tabular-nums" style={{ color: "rgba(235,235,245,0.85)", letterSpacing: "-0.02em" }}>
            {Math.round(pct * 100)}%
          </p>
          <p className="text-[11px] font-medium" style={{ color: "rgba(235,235,245,0.35)" }}>done</p>
        </div>
      </div>
    </div>
  );
}

export function HydrationView({ userId }: { userId: string }) {
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [customOz, setCustomOz] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  const log = useMutation(api.hydration.log);
  const remove = useMutation(api.hydration.remove);
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"hydration_logs"> | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDate(now);
  }, []);

  const selectedISO = selectedDate ? toISO(selectedDate) : null;
  const entries = useQuery(
    api.hydration.getByDate,
    selectedISO ? { userId, date: selectedISO } : "skip"
  ) ?? [];

  const totalOz = entries.reduce((sum, e) => sum + e.ozAmount, 0);
  const isToday = selectedDate && today
    ? toISO(selectedDate) === toISO(today)
    : false;

  async function handleQuickAdd(oz: number) {
    await log({ userId, ozAmount: oz });
  }

  async function handleCustomAdd() {
    const oz = parseFloat(customOz);
    if (!oz || oz <= 0) return;
    await log({ userId, ozAmount: oz });
    setCustomOz("");
    setCustomOpen(false);
  }

  async function handleDelete(id: Id<"hydration_logs">) {
    setPendingDeleteId(id);
  }

  function goBack() {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  }

  function goForward() {
    if (!selectedDate || !today) return;
    if (toISO(selectedDate) === toISO(today)) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  }

  if (!selectedDate || !today) return null;

  const atToday = toISO(selectedDate) === toISO(today);
  const dateLabel = isToday
    ? "Today"
    : selectedDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <p className="text-xs font-medium text-[#6a6a6a]">Daily goal: 1 gallon</p>
        <h1 className="text-[52px] leading-none font-bold" style={{ color: ACCENT, letterSpacing: "-0.03em" }}>
          Hydration
        </h1>
      </div>

      {/* Date nav */}
      <div className="px-5 mb-6 flex items-center gap-3">
        <button onClick={goBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}>
          <svg width="14" height="14" fill="none" stroke="rgba(235,235,245,0.5)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold flex-1 text-center" style={{ color: "rgba(235,235,245,0.85)", letterSpacing: "-0.01em" }}>
          {dateLabel}
        </span>
        <button
          onClick={goForward}
          disabled={atToday}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)", opacity: atToday ? 0.3 : 1 }}
        >
          <svg width="14" height="14" fill="none" stroke="rgba(235,235,245,0.5)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Ring chart */}
      <div className="flex justify-center mb-8">
        <HydrationRing oz={totalOz} goal={GOAL_OZ} />
      </div>

      {/* Quick add */}
      <div className="px-5 mb-4">
        <p className="text-xs font-medium mb-3" style={{ color: "rgba(235,235,245,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Quick Add
        </p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((oz) => (
            <motion.button
              key={oz}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleQuickAdd(oz)}
              className="py-3 rounded-2xl flex flex-col items-center justify-center gap-0.5"
              style={{ background: "#1a1a1a", border: "1px solid rgba(56,189,248,0.14)" }}
            >
              <span className="text-[18px] font-bold tabular-nums" style={{ color: ACCENT, letterSpacing: "-0.02em" }}>{oz}</span>
              <span className="text-[10px] font-medium" style={{ color: "rgba(235,235,245,0.35)" }}>oz</span>
            </motion.button>
          ))}
        </div>

        {/* Custom amount */}
        <AnimatePresence>
          {customOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  value={customOz}
                  onChange={(e) => setCustomOz(e.target.value)}
                  placeholder="oz amount"
                  autoFocus
                  className="flex-1 rounded-xl px-4 py-3 text-[15px] font-medium text-[#f2f2f2] outline-none tabular-nums"
                  style={{ background: "#1a1a1a", border: "1px solid rgba(56,189,248,0.2)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCustomAdd}
                  disabled={!customOz || parseFloat(customOz) <= 0}
                  className="px-5 rounded-xl text-[14px] font-semibold"
                  style={{ background: ACCENT, color: "#0e0e0e", opacity: customOz && parseFloat(customOz) > 0 ? 1 : 0.35 }}
                >
                  Add
                </motion.button>
                <button
                  onClick={() => { setCustomOpen(false); setCustomOz(""); }}
                  className="w-11 rounded-xl flex items-center justify-center"
                  style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <svg width="14" height="14" fill="none" stroke="rgba(235,235,245,0.4)" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setCustomOpen(true)}
              className="w-full mt-3 py-3 rounded-2xl text-[13px] font-medium"
              style={{ background: "#1a1a1a", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(235,235,245,0.4)" }}
            >
              + Custom amount
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Entry log */}
      <div className="px-5">
        <p className="text-xs font-medium mb-3" style={{ color: "rgba(235,235,245,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {dateLabel}'s Log
        </p>

        {entries.length === 0 ? (
          <p className="text-center text-sm py-8" style={{ color: "rgba(235,235,245,0.25)" }}>
            No water logged yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(56,189,248,0.1)" }}>
                      <svg width="14" height="14" fill={ACCENT} viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14v-4H7l5-8v4h4l-5 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums" style={{ color: "rgba(235,235,245,0.9)", letterSpacing: "-0.01em" }}>
                        {entry.ozAmount} oz
                      </p>
                      <p className="text-[11px]" style={{ color: "rgba(235,235,245,0.35)" }}>
                        {formatTime(entry.loggedAt)}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(entry._id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full"
                    style={{ background: "rgba(255,69,58,0.1)" }}
                  >
                    <svg width="13" height="13" fill="none" stroke="#ff453a" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        itemName="this entry"
        subtitle="This water log entry will be removed."
        onConfirm={async () => {
          if (pendingDeleteId) await remove({ id: pendingDeleteId });
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}

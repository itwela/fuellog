"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { formatDayLabel, toISO } from "@/lib/utils";
import { SheetHeader } from "@/components/ui/SheetHeader";

type Unit = "lb" | "kg";
type WeightEntry = Doc<"weight_logs">;

const UNIT_STORAGE_KEY = "fuellog:weightUnit";

function formatWeight(value: number): string {
  // Trim a trailing ".0" so 182 shows as "182", but keep 182.4.
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDelta(delta: number, unit: Unit): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return `${sign}${formatWeight(Math.abs(delta))} ${unit}`;
}

/** Simple polyline trend of recent entries, oldest → newest. */
function Sparkline({ entries, accent }: { entries: WeightEntry[]; accent: string }) {
  const points = useMemo(() => {
    if (entries.length < 2) return null;
    const values = entries.map((e) => e.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const w = 100;
    const h = 28;
    return values
      .map((value, i) => {
        const x = (i / (values.length - 1)) * w;
        // Invert: heavier reads higher on the chart.
        const y = h - ((value - min) / span) * h;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [entries]);

  if (!points) return null;

  return (
    <svg
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="w-full h-8"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.85}
      />
    </svg>
  );
}

export function WeightCard({
  userId,
  accent,
  selectedDate,
}: {
  userId: string;
  accent: string;
  selectedDate: Date;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [unit, setUnit] = useState<Unit>("lb");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateISO = toISO(selectedDate);

  const summary = useQuery(api.weight.getSummary, { userId });
  const entryForDate = useQuery(api.weight.getEntryForDate, { userId, date: dateISO });
  const recent = useQuery(api.weight.getEntries, { userId, limit: 30 });
  const logWeight = useMutation(api.weight.logWeight);
  const removeEntry = useMutation(api.weight.removeEntry);

  // Remember the last unit used so the picker isn't a chore every time.
  useEffect(() => {
    const stored = window.localStorage.getItem(UNIT_STORAGE_KEY);
    if (stored === "lb" || stored === "kg") setUnit(stored);
  }, []);

  // Seed the sheet with whatever is already recorded for the selected day.
  useEffect(() => {
    if (!sheetOpen) return;
    setError(null);
    if (entryForDate) {
      setInput(formatWeight(entryForDate.weight));
      setUnit(entryForDate.unit);
    } else if (summary?.latest) {
      setInput(formatWeight(summary.latest.weight));
      setUnit(summary.latest.unit);
    } else {
      setInput("");
    }
  }, [sheetOpen, entryForDate, summary?.latest]);

  // Oldest → newest for the trend line.
  const trend = useMemo(() => (recent ? [...recent].reverse() : []), [recent]);

  async function handleSave() {
    const parsed = parseFloat(input);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a weight above 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await logWeight({ userId, weight: parsed, unit, date: dateISO });
      window.localStorage.setItem(UNIT_STORAGE_KEY, unit);
      setSheetOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that weigh-in");
    } finally {
      setSaving(false);
    }
  }

  const latest = summary?.latest ?? null;
  const displayEntry = entryForDate ?? latest;
  const showingSelectedDay = !!entryForDate;
  const changeWeek = summary?.changeFromWeekAgo ?? null;
  const changePrev = summary?.changeFromPrevious ?? null;

  return (
    <>
      <div className="px-4 pb-3">
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#6a6a6a]">
                {showingSelectedDay ? "Weight today" : displayEntry ? "Last weigh-in" : "Weight"}
              </p>

              {displayEntry ? (
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className="text-[32px] leading-none font-bold tabular-nums"
                    style={{ color: accent, letterSpacing: "-0.03em" }}
                  >
                    {formatWeight(displayEntry.weight)}
                  </span>
                  <span className="text-sm font-medium text-[#6a6a6a]">{displayEntry.unit}</span>
                </div>
              ) : (
                <p className="text-sm text-[#6a6a6a] mt-1">Not tracked yet</p>
              )}

              {displayEntry && !showingSelectedDay && (
                <p className="text-[10px] text-[#4a4a4a] mt-1">
                  {formatDayLabel(new Date(`${displayEntry.date}T12:00:00`))}
                </p>
              )}

              {(changeWeek !== null || changePrev !== null) && latest && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
                  {changePrev !== null && (
                    <span className="text-[11px] text-[#6a6a6a] tabular-nums">
                      {formatDelta(changePrev, latest.unit)} since last
                    </span>
                  )}
                  {changeWeek !== null && (
                    <span className="text-[11px] text-[#6a6a6a] tabular-nums">
                      {formatDelta(changeWeek, latest.unit)} in a week
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => setSheetOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: accent, color: "#0e0e0e" }}
              >
                {showingSelectedDay ? "Edit" : "Log"}
              </motion.button>
              {trend.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="text-[10px] text-[#6a6a6a] hover:text-[#f2f2f2] transition-colors"
                >
                  History
                </button>
              )}
            </div>
          </div>

          {trend.length >= 2 && (
            <div className="mt-2 -mb-1">
              <Sparkline entries={trend} accent={accent} />
            </div>
          )}
        </div>
      </div>

      {/* Log / edit sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-40 bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-50 px-5 pt-4 rounded-t-3xl"
              style={{
                background: "#1a1a1a",
                paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <SheetHeader onClose={() => setSheetOpen(false)} />

              <p className="text-base font-semibold text-[#f2f2f2]" style={{ letterSpacing: "-0.01em" }}>
                Weigh-in
              </p>
              <p className="text-xs text-[#6a6a6a] mb-4">{formatDayLabel(selectedDate)}</p>

              <div className="flex gap-2 mb-3">
                <input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleSave()}
                  placeholder="0.0"
                  className="flex-1 rounded-xl px-4 py-3 text-lg font-bold text-[#f2f2f2] placeholder-[#3a3a3a] outline-none tabular-nums"
                  style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.06)" }}
                />
                <div className="flex rounded-xl p-1 shrink-0" style={{ background: "#252525" }}>
                  {(["lb", "kg"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className="px-3 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: unit === u ? accent : "transparent",
                        color: unit === u ? "#0e0e0e" : "#6a6a6a",
                      }}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs mb-3" style={{ color: "#ff5252" }}>{error}</p>}

              <div className="flex gap-2">
                {entryForDate && (
                  <button
                    type="button"
                    onClick={async () => {
                      await removeEntry({ id: entryForDate._id });
                      setSheetOpen(false);
                    }}
                    className="px-4 py-3 rounded-xl text-sm font-medium text-[#6a6a6a]"
                    style={{ background: "#252525" }}
                  >
                    Delete
                  </button>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void handleSave()}
                  disabled={saving || !input.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: accent,
                    color: "#0e0e0e",
                    opacity: saving || !input.trim() ? 0.35 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save"}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History sheet */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              className="fixed inset-0 z-40 bg-black/60"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 38 }}
              className="fixed inset-x-0 bottom-0 z-50 px-5 pt-4 rounded-t-3xl max-h-[75vh] flex flex-col"
              style={{
                background: "#1a1a1a",
                paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <SheetHeader onClose={() => setHistoryOpen(false)} />
              <p className="text-base font-semibold text-[#f2f2f2] mb-3" style={{ letterSpacing: "-0.01em" }}>
                Weight history
              </p>

              <div className="flex-1 overflow-y-auto space-y-1.5 pb-2">
                {(recent ?? []).map((entry, i, arr) => {
                  const older = arr[i + 1];
                  const delta =
                    older && older.unit === entry.unit
                      ? Number((entry.weight - older.weight).toFixed(2))
                      : null;
                  return (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: "#252525" }}
                    >
                      <span className="text-xs text-[#b0b0b0]">
                        {formatDayLabel(new Date(`${entry.date}T12:00:00`))}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {delta !== null && delta !== 0 && (
                          <span className="text-[10px] text-[#6a6a6a] tabular-nums">
                            {formatDelta(delta, entry.unit)}
                          </span>
                        )}
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: accent }}
                        >
                          {formatWeight(entry.weight)} {entry.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {(recent ?? []).length === 0 && (
                  <p className="text-center text-[#6a6a6a] text-sm py-6">No weigh-ins recorded yet</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

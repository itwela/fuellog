"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Props {
  userId: string;
  onClose: () => void;
}

interface UsageStat {
  label: string;
  count: number;
  description: string;
  color: string;
}

export function SettingsSheet({ userId, onClose }: Props) {
  const usage = useQuery(api.aiUsage.getMonthly, { userId });

  const stats: UsageStat[] = usage
    ? [
        {
          label: "Food text parses",
          count: usage.text_parse,
          description: "When you describe or dictate a meal",
          color: "#b6ff4a",
        },
        {
          label: "Macro estimates",
          count: usage.text_estimate,
          description: "Per-item enrichment after parsing",
          color: "#4abaff",
        },
        {
          label: "Image scans",
          count: usage.image_estimate,
          description: "Photo-based food identification",
          color: "#fdcb40",
        },
        {
          label: "Grocery parses",
          count: usage.grocery_parse,
          description: "Grocery list AI parsing",
          color: "#c084fc",
        },
      ]
    : [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed inset-y-0 left-0 z-50 w-80 flex flex-col"
        style={{ background: "#111", borderRight: "0.5px solid rgba(84,84,88,0.35)" }}
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-8 pb-6">
          <div>
            <h2 className="text-base font-bold text-[#f2f2f2]">Settings</h2>
            <p className="text-xs text-[#555] mt-0.5">Living Proof</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="#888" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6">
          {/* AI Usage */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-[#555] uppercase tracking-widest">AI Usage</p>
              {usage && (
                <span className="text-xs text-[#444]">{usage.month}</span>
              )}
            </div>

            {/* Total */}
            <div
              className="rounded-2xl p-4 mb-3"
              style={{ background: "#1a1a1a", border: "0.5px solid rgba(84,84,88,0.25)" }}
            >
              <p className="text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1">
                Total this month
              </p>
              <p
                className="text-[42px] font-black leading-none"
                style={{ color: "#b6ff4a", letterSpacing: "-0.04em" }}
              >
                {usage?.total ?? "—"}
              </p>
              <p className="text-xs text-[#444] mt-1">AI calls</p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: "#161616", border: "0.5px solid rgba(84,84,88,0.2)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#ccc" }}>
                      {stat.label}
                    </p>
                    <p className="text-[11px] text-[#444] mt-0.5">{stat.description}</p>
                  </div>
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{ color: stat.count > 0 ? stat.color : "#333" }}
                  >
                    {stat.count}
                  </span>
                </div>
              ))}
            </div>

            {usage && usage.tokensIn + usage.tokensOut > 0 && (
              <div className="mt-3 rounded-xl px-4 py-3" style={{ background: "#161616", border: "0.5px solid rgba(84,84,88,0.2)" }}>
                <p className="text-xs text-[#444]">
                  Tokens — {usage.tokensIn.toLocaleString()} in / {usage.tokensOut.toLocaleString()} out
                </p>
              </div>
            )}
          </section>

          {/* App info */}
          <section>
            <p className="text-xs font-semibold text-[#555] uppercase tracking-widest mb-3">App</p>
            <div
              className="rounded-2xl px-4 py-3 space-y-2"
              style={{ background: "#1a1a1a", border: "0.5px solid rgba(84,84,88,0.25)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888]">Version</span>
                <span className="text-sm font-medium text-[#555]">0.1.0 beta</span>
              </div>
              <div className="h-px" style={{ background: "rgba(84,84,88,0.2)" }} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#888]">Built by</span>
                <span className="text-sm font-medium text-[#555]">Caveman Creative</span>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
}

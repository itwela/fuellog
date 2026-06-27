"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";
import { PlanWeekView } from "./PlanWeekView";
import { PlanDayView } from "./PlanDayView";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ACCENT = "#c084fc";

type View = "list" | "plan" | "day";

export function MealPlanView({ userId }: { userId: string }) {
  const [view, setView] = useState<View>("list");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<{ id: Id<"meal_plans">; name: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<{ id: Id<"meal_plans">; name: string } | null>(null);

  const plans = useQuery(api.mealplans.list, { userId }) ?? [];
  const createPlan = useMutation(api.mealplans.createPlan);
  const deletePlan = useMutation(api.mealplans.deletePlan);

  async function handleCreate() {
    if (!newName.trim()) return;
    const trimmed = newName.trim();
    const id = await createPlan({ userId, name: trimmed });
    setNewName("");
    setCreating(false);
    setSelectedPlan({ id, name: trimmed });
    setView("plan");
  }

  function openPlan(plan: { id: Id<"meal_plans">; name: string }) {
    setSelectedPlan(plan);
    setView("plan");
  }

  function openDay(day: string) {
    setSelectedDay(day);
    setView("day");
  }

  function backToList() {
    setView("list");
    setSelectedPlan(null);
    setSelectedDay(null);
  }

  function backToPlan() {
    setView("plan");
    setSelectedDay(null);
  }

  // Day view
  if (view === "day" && selectedPlan && selectedDay) {
    return (
      <PlanDayView
        planId={selectedPlan.id}
        planName={selectedPlan.name}
        day={selectedDay}
        onBack={backToPlan}
      />
    );
  }

  // Week view
  if (view === "plan" && selectedPlan) {
    return (
      <PlanWeekView
        planId={selectedPlan.id}
        planName={selectedPlan.name}
        onBack={backToList}
        onDaySelect={openDay}
      />
    );
  }

  // Plan list
  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-5 pt-12 pb-6">
        <p className="text-xs font-medium text-[#6a6a6a]">Pre-plan your meals</p>
        <h1
          className="text-[52px] leading-none font-bold"
          style={{ color: ACCENT, letterSpacing: "-0.03em" }}
        >
          Meal Plans
        </h1>
      </div>

      {/* Create input */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 mb-4 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="Plan name (e.g. Cut Week, Bulk Day)"
                className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none"
                style={{ background: "#1a1a1a", border: `1px solid ${ACCENT}44` }}
              />
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-3 rounded-xl text-sm font-bold"
                style={{ background: ACCENT, color: "#0e0e0e", opacity: newName.trim() ? 1 : 0.4 }}
              >
                Create
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plans list */}
      <div className="flex-1 px-4 space-y-2 pb-32 md:pb-4">
        <AnimatePresence>
          {plans.map((plan) => (
            <AliveCard
              key={plan._id}
              seed={`plan:${plan._id}`}
              accent={ACCENT}
              className="rounded-2xl overflow-hidden"
              style={{}}
            >
              <motion.div
                className="flex items-center justify-between gap-3 px-4 py-4 cursor-pointer"
                onClick={() => openPlan({ id: plan._id, name: plan.name })}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#f2f2f2] text-base truncate">{plan.name}</p>
                  <p className="text-[10px] text-[#6a6a6a] mt-0.5">
                    {plan.itemCount === 0
                      ? "No meals yet"
                      : `${plan.itemCount} meal${plan.itemCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => { e.stopPropagation(); setConfirmPlan({ id: plan._id, name: plan.name }); }}
                    className="p-1.5 rounded-lg text-[#6a6a6a]"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </motion.button>
                  <svg width="16" height="16" fill="none" stroke={ACCENT} strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </motion.div>
            </AliveCard>
          ))}
        </AnimatePresence>

        {plans.length === 0 && !creating && (
          <p className="text-center text-[#6a6a6a] text-sm pt-8">
            No plans yet — create one to pre-plan your meals
          </p>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setCreating(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 md:bottom-8 md:right-8"
        style={{ background: ACCENT }}
      >
        <svg width="24" height="24" fill="none" stroke="#0e0e0e" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </motion.button>

      <ConfirmDialog
        open={!!confirmPlan}
        itemName={confirmPlan?.name ?? ""}
        subtitle="This meal plan and all its items will be gone for good."
        onConfirm={async () => {
          if (confirmPlan) await deletePlan({ id: confirmPlan.id });
          setConfirmPlan(null);
        }}
        onCancel={() => setConfirmPlan(null)}
      />
    </div>
  );
}

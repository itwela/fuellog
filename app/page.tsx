"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MealLogView } from "@/components/meal/MealLogView";
import { FoodBankView } from "@/components/foodbank/FoodBankView";
import { GroceryView } from "@/components/grocery/GroceryView";
import { WorkoutView } from "@/components/workout/WorkoutView";
import { MealPlanView } from "@/components/mealplan/MealPlanView";
import { HydrationView } from "@/components/hydration/HydrationView";

export type Tab = "meal" | "food" | "grocery" | "workout" | "plans" | "water";

const USER_ID = "user_default"; // Replace with real auth later

const views: Record<Tab, React.FC<{ userId: string }>> = {
  meal: MealLogView,
  food: FoodBankView,
  grocery: GroceryView,
  workout: WorkoutView,
  plans: MealPlanView,
  water: HydrationView,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("meal");
  const [prevTab, setPrevTab] = useState<Tab>("meal");

  const tabs: Tab[] = ["meal", "water", "food", "grocery", "workout", "plans"];
  const direction = tabs.indexOf(activeTab) > tabs.indexOf(prevTab) ? 1 : -1;

  function handleTabChange(tab: Tab) {
    setPrevTab(activeTab);
    setActiveTab(tab);
  }

  const ActiveView = views[activeTab];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        userId={USER_ID}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 overflow-y-auto"
            >
              {/* Desktop: constrain content width, center it */}
              <div className="md:max-w-2xl md:mx-auto md:px-8">
                <ActiveView userId={USER_ID} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom nav — mobile only */}
        <div className="md:hidden">
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}

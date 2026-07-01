"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MealLogView } from "@/components/meal/MealLogView";
import { FoodBankView } from "@/components/foodbank/FoodBankView";
import { GroceryView } from "@/components/grocery/GroceryView";
import { WorkoutView } from "@/components/workout/WorkoutView";
import { MealPlanView } from "@/components/mealplan/MealPlanView";
import { HydrationView } from "@/components/hydration/HydrationView";

import type { Tab } from "@/lib/types";

const views: Record<Tab, React.FC<{ userId: string }>> = {
  meal: MealLogView,
  food: FoodBankView,
  grocery: GroceryView,
  workout: WorkoutView,
  plans: MealPlanView,
  water: HydrationView,
};

export default function AppPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("meal");
  const [prevTab, setPrevTab] = useState<Tab>("meal");
  const tabs: Tab[] = ["meal", "water", "food", "grocery", "workout", "plans"];

  function handleTabChange(tab: Tab) {
    setPrevTab(activeTab);
    setActiveTab(tab);
  }

  if (!isLoaded || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#b6ff4a] border-t-transparent animate-spin" />
      </div>
    );
  }

  const userId = user.id;
  const ActiveView = views[activeTab];

  return (
    <div className="h-full flex overflow-hidden">
      <DesktopSidebar activeTab={activeTab} onTabChange={handleTabChange} userId={userId} />

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
              <div className="md:max-w-2xl md:mx-auto md:px-8">
                <ActiveView userId={userId} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="md:hidden">
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
}

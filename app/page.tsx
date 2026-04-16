"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MealLogView } from "@/components/meal/MealLogView";
import { FoodBankView } from "@/components/foodbank/FoodBankView";
import { GroceryView } from "@/components/grocery/GroceryView";
import { WorkoutView } from "@/components/workout/WorkoutView";

export type Tab = "meal" | "food" | "grocery" | "workout";

const USER_ID = "user_default"; // Replace with real auth later

const views: Record<Tab, React.FC<{ userId: string }>> = {
  meal: MealLogView,
  food: FoodBankView,
  grocery: GroceryView,
  workout: WorkoutView,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("meal");
  const [prevTab, setPrevTab] = useState<Tab>("meal");

  const tabs: Tab[] = ["meal", "food", "grocery", "workout"];
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
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={activeTab}
              custom={direction}
              initial={{ x: direction * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
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

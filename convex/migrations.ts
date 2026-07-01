import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const migrateDefaultUser = mutation({
  args: { newUserId: v.string() },
  handler: async (ctx, { newUserId }) => {
    const OLD = "user_default";

    const mealLogs = await ctx.db.query("meal_logs").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of mealLogs) await ctx.db.patch(doc._id, { userId: newUserId });

    const foodBank = await ctx.db.query("food_bank").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of foodBank) await ctx.db.patch(doc._id, { userId: newUserId });

    const groceryLists = await ctx.db.query("grocery_lists").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of groceryLists) await ctx.db.patch(doc._id, { userId: newUserId });

    const exercises = await ctx.db.query("exercises").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of exercises) await ctx.db.patch(doc._id, { userId: newUserId });

    const workoutSessions = await ctx.db.query("workout_sessions").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of workoutSessions) await ctx.db.patch(doc._id, { userId: newUserId });

    const workoutRoutines = await ctx.db.query("workout_routines").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of workoutRoutines) await ctx.db.patch(doc._id, { userId: newUserId });

    const userGoals = await ctx.db.query("user_goals").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of userGoals) await ctx.db.patch(doc._id, { userId: newUserId });

    const mealPlans = await ctx.db.query("meal_plans").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of mealPlans) await ctx.db.patch(doc._id, { userId: newUserId });

    const hydrationLogs = await ctx.db.query("hydration_logs").withIndex("by_user", q => q.eq("userId", OLD)).collect();
    for (const doc of hydrationLogs) await ctx.db.patch(doc._id, { userId: newUserId });

    return {
      migrated: {
        meal_logs: mealLogs.length,
        food_bank: foodBank.length,
        grocery_lists: groceryLists.length,
        exercises: exercises.length,
        workout_sessions: workoutSessions.length,
        workout_routines: workoutRoutines.length,
        user_goals: userGoals.length,
        meal_plans: mealPlans.length,
        hydration_logs: hydrationLogs.length,
      },
    };
  },
});

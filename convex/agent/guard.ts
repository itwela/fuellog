import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import type { TableNames } from "../_generated/dataModel";

/** Tables owned directly (userId field) map to null; child tables map to their parent link. */
const OWNER_VIA: Record<string, { field: string } | null> = {
  meal_logs: null,
  food_bank: null,
  grocery_lists: null,
  exercises: null,
  workout_sessions: null,
  workout_routines: null,
  user_goals: null,
  meal_plans: null,
  hydration_logs: null,
  grocery_list_items: { field: "listId" },
  workout_session_exercises: { field: "sessionId" },
  meal_plan_items: { field: "planId" },
};

export const checkOwner = internalQuery({
  args: { table: v.string(), id: v.string(), userId: v.string() },
  handler: async (ctx, { table, id, userId }) => {
    const via = OWNER_VIA[table];
    if (via === undefined) return false;
    const normalized = ctx.db.normalizeId(table as TableNames, id);
    if (!normalized) return false;
    const doc = (await ctx.db.get(normalized)) as Record<string, unknown> | null;
    if (!doc) return false;
    if (via === null) return doc.userId === userId;
    const parent = (await ctx.db.get(doc[via.field] as never)) as Record<string, unknown> | null;
    return parent !== null && parent.userId === userId;
  },
});

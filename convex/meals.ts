import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** YYYY-MM-DD as a single instant: noon UTC on that civil day (stable across Convex regions). */
function dateToNoon(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12, 0, 0, 0);
}

function utcCivilDayBoundsMs(isoDate: string): { start: number; end: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return {
    start: Date.UTC(y, m - 1, d, 0, 0, 0, 0),
    end: Date.UTC(y, m - 1, d, 23, 59, 59, 999),
  };
}

// Get all meal logs for a user on a specific day
export const getByDate = query({
  args: {
    userId: v.string(),
    date: v.string(), // ISO date string YYYY-MM-DD (client’s calendar day)
  },
  handler: async (ctx, { userId, date }) => {
    const { start, end } = utcCivilDayBoundsMs(date);
    return await ctx.db
      .query("meal_logs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("loggedAt", start).lte("loggedAt", end)
      )
      .collect();
  },
});

// Returns all ISO dates (YYYY-MM-DD) in a given month that have at least one log
export const getLoggedDatesInMonth = query({
  args: {
    userId: v.string(),
    year: v.number(),
    month: v.number(), // 1-12
  },
  handler: async (ctx, { userId, year, month }) => {
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    const logs = await ctx.db
      .query("meal_logs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("loggedAt", start).lte("loggedAt", end)
      )
      .collect();

    const dates = new Set<string>();
    for (const log of logs) {
      const d = new Date(log.loggedAt);
      dates.add(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
      );
    }
    return Array.from(dates);
  },
});

export const log = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    quantity: v.optional(v.number()),
    aiEstimated: v.boolean(),
    logDate: v.optional(v.string()), // ISO date YYYY-MM-DD; defaults to today
  },
  handler: async (ctx, args) => {
    const { logDate, quantity, ...rest } = args;
    const loggedAt = logDate ? dateToNoon(logDate) : Date.now();
    const q = quantity ?? 1;

    const id = await ctx.db.insert("meal_logs", { ...rest, quantity: q, loggedAt });

    const existing = await ctx.db
      .query("food_bank")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { useCount: existing.useCount + 1, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("food_bank", {
        userId: args.userId,
        name: args.name,
        calories: args.calories,
        protein: args.protein,
        fat: args.fat,
        carbs: args.carbs,
        fiber: args.fiber,
        sugar: args.sugar,
        useCount: 1,
        updatedAt: Date.now(),
      });
    }

    return id;
  },
});

export const logBatch = mutation({
  args: {
    userId: v.string(),
    logDate: v.optional(v.string()), // ISO date YYYY-MM-DD; defaults to today
    meals: v.array(
      v.object({
        name: v.string(),
        mealType: v.union(
          v.literal("breakfast"),
          v.literal("lunch"),
          v.literal("dinner"),
          v.literal("snack")
        ),
        calories: v.optional(v.number()),
        protein: v.optional(v.number()),
        fat: v.optional(v.number()),
        carbs: v.optional(v.number()),
        fiber: v.optional(v.number()),
        sugar: v.optional(v.number()),
        quantity: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, { userId, logDate, meals }) => {
    const loggedAt = logDate ? dateToNoon(logDate) : Date.now();
    const now = Date.now();

    for (const meal of meals) {
      const { quantity, ...m } = meal;
      await ctx.db.insert("meal_logs", {
        userId,
        ...m,
        quantity: quantity ?? 1,
        aiEstimated: true,
        loggedAt,
      });

      const existing = await ctx.db
        .query("food_bank")
        .withIndex("by_user_name", (q) => q.eq("userId", userId).eq("name", meal.name))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { useCount: existing.useCount + 1, updatedAt: now });
      } else {
        await ctx.db.insert("food_bank", {
          userId,
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          fat: meal.fat,
          carbs: meal.carbs,
          fiber: meal.fiber,
          sugar: meal.sugar,
          useCount: 1,
          updatedAt: now,
        });
      }
    }
  },
});

export const update = mutation({
  args: {
    userId: v.string(),
    id: v.id("meal_logs"),
    name: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    calories: v.optional(v.number()),
    protein: v.optional(v.number()),
    fat: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, id, quantity, ...fields } = args;
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) {
      throw new Error("Meal not found");
    }
    await ctx.db.patch(id, {
      ...fields,
      ...(quantity !== undefined ? { quantity } : {}),
      aiEstimated: false,
    });
  },
});

export const remove = mutation({
  args: { userId: v.string(), id: v.id("meal_logs") },
  handler: async (ctx, { userId, id }) => {
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) {
      throw new Error("Meal not found");
    }
    await ctx.db.delete(id);
  },
});

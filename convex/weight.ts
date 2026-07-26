import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const unitValidator = v.union(v.literal("lb"), v.literal("kg"));

/** Most recent weigh-ins, newest first. */
export const getEntries = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    return await ctx.db
      .query("weight_logs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(limit ?? 60, 365));
  },
});

/** The single weigh-in for a given civil day, if there is one. */
export const getEntryForDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    return await ctx.db
      .query("weight_logs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .first();
  },
});

/**
 * Latest weigh-in plus how it compares to the most recent earlier entry and to
 * the closest entry at least 7 days back.
 */
export const getSummary = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const entries = await ctx.db
      .query("weight_logs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(60);

    const latest = entries[0] ?? null;
    if (!latest) {
      return { latest: null, previous: null, changeFromPrevious: null, changeFromWeekAgo: null };
    }

    const previous = entries[1] ?? null;

    // First entry dated a week or more before the latest one.
    const latestMs = Date.parse(`${latest.date}T00:00:00Z`);
    const weekAgoCutoff = latestMs - 7 * 24 * 60 * 60 * 1000;
    const weekAgoEntry =
      entries.find((e) => Date.parse(`${e.date}T00:00:00Z`) <= weekAgoCutoff) ?? null;

    // Only compare like with like — a lb entry against a kg entry is meaningless.
    const comparable = (other: typeof latest | null) =>
      other && other.unit === latest.unit ? Number((latest.weight - other.weight).toFixed(2)) : null;

    return {
      latest,
      previous,
      changeFromPrevious: comparable(previous),
      changeFromWeekAgo: comparable(weekAgoEntry),
    };
  },
});

/** Upsert — one weigh-in per civil day, so re-logging today corrects rather than duplicates. */
export const logWeight = mutation({
  args: {
    userId: v.string(),
    weight: v.number(),
    unit: unitValidator,
    date: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, weight, unit, date, notes }) => {
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error("Weight must be a positive number");
    }

    const existing = await ctx.db
      .query("weight_logs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { weight, unit, notes, loggedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("weight_logs", {
      userId,
      weight,
      unit,
      date,
      notes,
      loggedAt: Date.now(),
    });
  },
});

export const updateEntry = mutation({
  args: {
    id: v.id("weight_logs"),
    weight: v.optional(v.number()),
    unit: v.optional(unitValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, weight, unit, notes }) => {
    if (weight !== undefined && (!Number.isFinite(weight) || weight <= 0)) {
      throw new Error("Weight must be a positive number");
    }
    const patch: { weight?: number; unit?: "lb" | "kg"; notes?: string | undefined } = {};
    if (weight !== undefined) patch.weight = weight;
    if (unit !== undefined) patch.unit = unit;
    // An empty string clears the note rather than storing "".
    if (notes !== undefined) patch.notes = notes.trim() || undefined;
    await ctx.db.patch(id, patch);
  },
});

export const removeEntry = mutation({
  args: { id: v.id("weight_logs") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

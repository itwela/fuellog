import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getExercises = query({
  args: { userId: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, { userId, search }) => {
    if (search?.trim()) {
      return await ctx.db
        .query("exercises")
        .withSearchIndex("search_name", (idx) =>
          idx.search("name", search).eq("userId", userId)
        )
        .take(20);
    }
    return await ctx.db
      .query("exercises")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addExercise = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    muscleGroup: v.optional(v.string()),
    defaultSets: v.optional(v.number()),
    defaultReps: v.optional(v.string()),
    defaultWeight: v.optional(v.string()),
    gifUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("exercises", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateExercise = mutation({
  args: {
    id: v.id("exercises"),
    name: v.optional(v.string()),
    muscleGroup: v.optional(v.string()),
    defaultSets: v.optional(v.number()),
    defaultReps: v.optional(v.string()),
    defaultWeight: v.optional(v.string()),
    gifUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const removeExercise = mutation({
  args: { id: v.id("exercises") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

export const getSessions = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});

export const startSession = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    exerciseIds: v.array(v.id("exercises")),
  },
  handler: async (ctx, { userId, name, exerciseIds }) => {
    const sessionId = await ctx.db.insert("workout_sessions", {
      userId,
      name,
      startedAt: Date.now(),
      exerciseIds,
    });

    await Promise.all(
      exerciseIds.map(async (exerciseId, i) => {
        const ex = await ctx.db.get(exerciseId);
        const sets = Array.from({ length: ex?.defaultSets ?? 3 }, () => ({
          reps: undefined,
          weight: undefined,
          completed: false,
        }));
        await ctx.db.insert("workout_session_exercises", {
          sessionId,
          exerciseId,
          order: i,
          sets,
          completed: false,
        });
      })
    );

    return sessionId;
  },
});

export const getSessionExercises = query({
  args: { sessionId: v.id("workout_sessions") },
  handler: async (ctx, { sessionId }) => {
    const sessionExercises = await ctx.db
      .query("workout_session_exercises")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    return await Promise.all(
      sessionExercises.map(async (se) => ({
        ...se,
        exercise: await ctx.db.get(se.exerciseId),
      }))
    );
  },
});

export const updateSet = mutation({
  args: {
    id: v.id("workout_session_exercises"),
    setIndex: v.number(),
    reps: v.optional(v.number()),
    weight: v.optional(v.string()),
    completed: v.boolean(),
  },
  handler: async (ctx, { id, setIndex, reps, weight, completed }) => {
    const record = await ctx.db.get(id);
    if (!record) return;
    const sets = [...record.sets];
    sets[setIndex] = { reps, weight, completed };
    const allDone = sets.every((s) => s.completed);
    await ctx.db.patch(id, { sets, completed: allDone });
  },
});

export const completeSession = mutation({
  args: { id: v.id("workout_sessions") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { completedAt: Date.now() });
  },
});

import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function utcCivilDayBoundsMs(isoDate: string): { start: number; end: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return {
    start: Date.UTC(y, m - 1, d, 0, 0, 0, 0),
    end: Date.UTC(y, m - 1, d, 23, 59, 59, 999),
  };
}

/** Bounds for a Mon–Sun week given the Monday as YYYY-MM-DD. */
function utcWeekBoundsMs(weekStartDate: string): { start: number; end: number } {
  const [y, m, d] = weekStartDate.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const end = start + 7 * 24 * 60 * 60 * 1000 - 1;
  return { start, end };
}

async function joinSessionExercises(ctx: QueryCtx, sessionId: Id<"workout_sessions">) {
  const sessionExercises = await ctx.db
    .query("workout_session_exercises")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();

  return await Promise.all(
    sessionExercises
      .sort((a, b) => a.order - b.order)
      .map(async (se) => {
        const exercise = await ctx.db.get(se.exerciseId);
        return { ...se, exercise };
      })
  );
}

export const getExercises = query({
  args: { userId: v.string(), search: v.optional(v.string()) },
  handler: async (ctx, { userId, search }) => {
    let items;
    if (search?.trim()) {
      items = await ctx.db
        .query("exercises")
        .withSearchIndex("search_name", (idx) =>
          idx.search("name", search).eq("userId", userId)
        )
        .take(20);
    } else {
      items = await ctx.db
        .query("exercises")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .collect();
    }
    return await Promise.all(
      items.map(async (ex) => ({
        ...ex,
        imageUrl: ex.imageStorageId ? await ctx.storage.getUrl(ex.imageStorageId) : null,
      }))
    );
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
    imageStorageId: v.optional(v.string()),
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
    imageStorageId: v.optional(v.string()),
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
      sessionExercises.map(async (se) => {
        const exercise = await ctx.db.get(se.exerciseId);
        return {
          ...se,
          exercise: exercise
            ? {
                ...exercise,
                imageUrl: exercise.imageStorageId
                  ? await ctx.storage.getUrl(exercise.imageStorageId)
                  : null,
              }
            : null,
        };
      })
    );
  },
});

export const getSessionsByDate = query({
  args: {
    userId: v.string(),
    date: v.string(), // ISO date string YYYY-MM-DD (client's calendar day)
  },
  handler: async (ctx, { userId, date }) => {
    const { start, end } = utcCivilDayBoundsMs(date);
    const sessions = await ctx.db
      .query("workout_sessions")
      .withIndex("by_user_started", (q) =>
        q.eq("userId", userId).gte("startedAt", start).lte("startedAt", end)
      )
      .filter((q) => q.neq(q.field("completedAt"), undefined))
      .order("desc")
      .collect();

    return await Promise.all(
      sessions.map(async (session) => ({
        ...session,
        exercises: await joinSessionExercises(ctx, session._id),
      }))
    );
  },
});

export const getSessionsInWeek = query({
  args: {
    userId: v.string(),
    weekStartDate: v.string(), // Monday, ISO YYYY-MM-DD
  },
  handler: async (ctx, { userId, weekStartDate }) => {
    const { start, end } = utcWeekBoundsMs(weekStartDate);
    const sessions = await ctx.db
      .query("workout_sessions")
      .withIndex("by_user_started", (q) =>
        q.eq("userId", userId).gte("startedAt", start).lte("startedAt", end)
      )
      .filter((q) => q.neq(q.field("completedAt"), undefined))
      .order("desc")
      .collect();

    return await Promise.all(
      sessions.map(async (session) => ({
        ...session,
        exercises: await joinSessionExercises(ctx, session._id),
      }))
    );
  },
});

// Returns all ISO dates (YYYY-MM-DD) in a given month that have at least one completed session
export const getLoggedWorkoutDatesInMonth = query({
  args: {
    userId: v.string(),
    year: v.number(),
    month: v.number(), // 1-12
  },
  handler: async (ctx, { userId, year, month }) => {
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    const sessions = await ctx.db
      .query("workout_sessions")
      .withIndex("by_user_started", (q) =>
        q.eq("userId", userId).gte("startedAt", start).lte("startedAt", end)
      )
      .filter((q) => q.neq(q.field("completedAt"), undefined))
      .collect();

    const dates = new Set<string>();
    for (const session of sessions) {
      const d = new Date(session.startedAt);
      dates.add(
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
      );
    }
    return Array.from(dates);
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

export const getExerciseImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const getRoutines = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const routines = await ctx.db
      .query("workout_routines")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return await Promise.all(
      routines.map(async (r) => {
        const exercises = await Promise.all(
          r.exerciseIds.map((id) => ctx.db.get(id))
        );
        return { ...r, exercises: exercises.filter(Boolean) };
      })
    );
  },
});

export const createRoutine = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    exerciseIds: v.array(v.id("exercises")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workout_routines", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateRoutine = mutation({
  args: {
    id: v.id("workout_routines"),
    name: v.optional(v.string()),
    exerciseIds: v.optional(v.array(v.id("exercises"))),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
  },
});

export const deleteRoutine = mutation({
  args: { id: v.id("workout_routines") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

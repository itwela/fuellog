# Workout Log Calendar View

## Problem

Workout currently has two tabs — Library (browse/search exercises, start an ad-hoc workout) and Routines (start a saved routine). There's no way to see workout history. Meal Log already solves this shape of problem: a date strip + month calendar showing which days have logged data, with a list of that day's entries below. Workout should get the same experience for completed workouts, while keeping routine-switching and the ability to start a workout.

## Goals

- Default Workout view is a calendar/log view: pick a day (week strip or month calendar), see what workout(s) were completed that day.
- Keep the Routines tab exactly as it works today.
- Keep the ability to start a new workout (picking arbitrary exercises), just relocated since Library stops being a tab.

## Non-goals

- Editing or deleting a logged workout after the fact.
- Showing in-progress/abandoned sessions on the calendar.
- Any change to the live workout-tracking screen (`WorkoutSession.tsx`) itself.

## Data layer

`workout_sessions` already has `startedAt` (ms epoch) and `completedAt` (ms epoch, optional — set whenever a session is ended, whether via "End Session" or "Finish", per `WorkoutSession.tsx::handleEndSession`). "Logged" for calendar purposes means `completedAt` is set — abandoned/in-progress sessions never appear.

### Schema (`convex/schema.ts`)

Add a date-range index to `workout_sessions`, mirroring `meal_logs.by_user_date`:

```ts
workout_sessions: defineTable({ ... })
  .index("by_user", ["userId"])
  .index("by_user_started", ["userId", "startedAt"]),
```

### Queries (`convex/workout.ts`)

Mirror `convex/meals.ts`'s `getByDate` / `getLoggedDatesInMonth`, using `startedAt` as the session's "day" and filtering to `completedAt != undefined`:

- `getSessionsByDate({ userId, date: string })` — completed sessions whose `startedAt` falls within the given civil day (reuse the `utcCivilDayBoundsMs` pattern). For each session, join in its `workout_session_exercises` + exercise name (same shape `getSessionExercises` produces), so the UI can render exercise/set summaries without a second round of queries per card.
- `getLoggedWorkoutDatesInMonth({ userId, year, month })` — returns `string[]` of ISO dates in that month with ≥1 completed session, same shape as `meals.getLoggedDatesInMonth`.

No changes to `startSession`, `completeSession`, `updateSet`, or any routine/exercise mutation.

## UI changes

### Shared components get an `accent` prop

`components/meal/DateStrip.tsx` and `components/meal/MonthCalendar.tsx` currently hardcode `ACCENT = "#b6ff4a"` (meal green). Both become reusable across features:

- Add optional `accent?: string` prop to each, defaulting to `"#b6ff4a"` so `MealLogView` needs no changes.
- `WorkoutLogView` passes `accent="#ff5623"` (workout's existing accent).

### `components/workout/WorkoutLogView.tsx` (new)

Structured like `MealLogView`'s log-mode body:

- Header: "Training" label + day label (`formatDayLabel`), workout accent.
- `DateStrip` fed by `getLoggedWorkoutDatesInMonth` for the visible month, accent `#ff5623`.
- Calendar-icon tap opens `MonthCalendar` (same data, same accent).
- Body: list of `getSessionsByDate` results for the selected day, each rendered as a `WorkoutSessionCard`.
  - Empty state: "Nothing logged yet — tap + to start a workout" (selected day is today) / "Nothing logged on {day}" (past day).
- FAB (`+`, bottom-right, same position/style as Meal Log's and today's Library FAB) opens `StartWorkoutSheet`.

### `components/workout/WorkoutSessionCard.tsx` (new)

Read-only card (no delete/edit — out of scope), styled with `AliveCard` consistent with `ExerciseCard`/`MealCard`:

- Session name, start time.
- Each exercise in the session with its sets summarized (e.g. `3×10 @ 135lb`), pulling from the `sets` array already returned by `getSessionsByDate`.

### `components/workout/StartWorkoutSheet.tsx` (new)

Replaces the exercise-picking UI that currently lives inline in `WorkoutView`'s Library tab. Same bottom-sheet shell as `RoutineSheet.tsx` (`SheetHeader`, backdrop, slide-up panel):

- Search input + exercise list, reusing `ExerciseCard` in `selectable` mode (same search/select logic as today's Library tab).
- "Add exercise" affordance inside the sheet opens `AddExerciseSheet` stacked on top; on save, the new exercise appears in the list and can be selected immediately.
- Bottom action button "Start Workout (n)", disabled until ≥1 exercise selected. On tap: calls `startSession`, closes the sheet, and hands off to `WorkoutSession` full-screen exactly as today.

### `components/workout/WorkoutView.tsx` (modified)

- `WorkoutTab` narrows from `"library" | "routines"` to `"log" | "routines"`; default state becomes `"log"`.
- Tab bar renders "Log" / "Routines" (was "Library" / "Routines").
- `tab === "log"` renders `WorkoutLogView`; `tab === "routines"` renders the existing (unchanged) routines body.
- The inline search/select/FAB block that currently implements Library's "Start Workout" flow is deleted from `WorkoutView` and its logic moves into `StartWorkoutSheet`.
- `sessionId` / `WorkoutSession` full-screen takeover behavior is unchanged. When a session ends, control returns to `WorkoutView`, which is already showing the Log tab by default — the just-completed session appears via live query, no extra plumbing.

## Testing

- Manual: start a workout via the Log tab's `+`, complete it, confirm it appears as a `WorkoutSessionCard` on today in the Log tab, and as a dot on today in both the date strip and month calendar.
- Manual: start a workout via a routine, confirm same result.
- Manual: navigate to a past day with no sessions — empty state shows the past-day copy.
- Manual: add a brand-new exercise from inside `StartWorkoutSheet`, confirm it's selectable in the same sheet without closing/reopening.

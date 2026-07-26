import { api } from "../_generated/api";

export type ParamType = "string" | "number" | "boolean" | "json";

export type ParamSpec = {
  /** Arg name passed to the Convex function. */
  name: string;
  type: ParamType;
  required?: boolean;
  /** Applied when the param is absent. */
  default?: unknown;
  /** Allowed values, for the schema endpoint + nicer errors. */
  enum?: string[];
  description?: string;
};

export type AgentRoute = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string; // exact path, e.g. "/agent/meals"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any; // FunctionReference — table is heterogenous, dispatched via runQuery/runMutation
  kind: "query" | "mutation";
  params: ParamSpec[];
  /** Inject resolved userId into args (function's validator must accept userId). */
  injectUser: boolean;
  /** Run ownership guard on this param before dispatch: { param, table }. */
  owned?: { param: string; table: string };
  description: string;
};

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const MACROS: ParamSpec[] = [
  { name: "calories", type: "number" },
  { name: "protein", type: "number" },
  { name: "fat", type: "number" },
  { name: "carbs", type: "number" },
  { name: "fiber", type: "number" },
  { name: "sugar", type: "number" },
];

export const agentRoutes: AgentRoute[] = [
  // ---- meals ----
  {
    method: "GET", path: "/agent/meals", fn: api.meals.getByDate, kind: "query", injectUser: true,
    params: [{ name: "date", type: "string", required: true, description: "YYYY-MM-DD" }],
    description: "List meal logs for a day",
  },
  {
    method: "GET", path: "/agent/meals/month", fn: api.meals.getLoggedDatesInMonth, kind: "query", injectUser: true,
    params: [
      { name: "year", type: "number", required: true },
      { name: "month", type: "number", required: true, description: "1-12" },
    ],
    description: "Dates in a month that have meal logs",
  },
  {
    method: "POST", path: "/agent/meals", fn: api.meals.log, kind: "mutation", injectUser: true,
    params: [
      { name: "name", type: "string", required: true },
      { name: "mealType", type: "string", required: true, enum: MEAL_TYPES },
      ...MACROS,
      { name: "quantity", type: "number", description: "Servings; macros are per serving" },
      { name: "aiEstimated", type: "boolean", default: false },
      { name: "notes", type: "string" },
      { name: "logDate", type: "string", description: "YYYY-MM-DD, defaults to today" },
    ],
    description: "Log a meal (also upserts it into the food bank)",
  },
  {
    method: "POST", path: "/agent/meals/batch", fn: api.meals.logBatch, kind: "mutation", injectUser: true,
    params: [
      { name: "meals", type: "json", required: true, description: "Array of {name, mealType, calories?, protein?, fat?, carbs?, fiber?, sugar?, quantity?}" },
      { name: "logDate", type: "string" },
    ],
    description: "Log several meals at once",
  },
  {
    method: "PATCH", path: "/agent/meals", fn: api.meals.update, kind: "mutation", injectUser: true,
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string", required: true },
      { name: "mealType", type: "string", required: true, enum: MEAL_TYPES },
      ...MACROS,
      { name: "quantity", type: "number" },
      { name: "notes", type: "string" },
    ],
    description: "Update a meal log (name and mealType required by the app)",
  },
  {
    method: "DELETE", path: "/agent/meals", fn: api.meals.remove, kind: "mutation", injectUser: true,
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a meal log",
  },

  // ---- hydration ----
  {
    method: "GET", path: "/agent/hydration", fn: api.hydration.getByDate, kind: "query", injectUser: true,
    params: [{ name: "date", type: "string", required: true }],
    description: "List hydration logs for a day",
  },
  {
    method: "POST", path: "/agent/hydration", fn: api.hydration.log, kind: "mutation", injectUser: true,
    params: [
      { name: "ozAmount", type: "number", required: true },
      { name: "logDate", type: "string" },
    ],
    description: "Log water intake in oz",
  },
  {
    method: "DELETE", path: "/agent/hydration", fn: api.hydration.remove, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "hydration_logs" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a hydration log",
  },

  // ---- body weight ----
  {
    method: "GET", path: "/agent/weight", fn: api.weight.getEntries, kind: "query", injectUser: true,
    params: [{ name: "limit", type: "number", description: "Newest first, max 365, defaults to 60" }],
    description: "List body weight entries, newest first",
  },
  {
    method: "GET", path: "/agent/weight/day", fn: api.weight.getEntryForDate, kind: "query", injectUser: true,
    params: [{ name: "date", type: "string", required: true, description: "YYYY-MM-DD" }],
    description: "Get the weigh-in for one day, if any",
  },
  {
    method: "GET", path: "/agent/weight/summary", fn: api.weight.getSummary, kind: "query", injectUser: true,
    params: [],
    description: "Latest weigh-in plus change vs the previous entry and vs a week earlier",
  },
  {
    method: "POST", path: "/agent/weight", fn: api.weight.logWeight, kind: "mutation", injectUser: true,
    params: [
      { name: "weight", type: "number", required: true },
      { name: "unit", type: "string", required: true, enum: ["lb", "kg"] },
      { name: "date", type: "string", required: true, description: "YYYY-MM-DD" },
      { name: "notes", type: "string" },
    ],
    description: "Log a weigh-in (upserts — one entry per day, re-logging corrects it)",
  },
  {
    method: "PATCH", path: "/agent/weight", fn: api.weight.updateEntry, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "weight_logs" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "weight", type: "number" },
      { name: "unit", type: "string", enum: ["lb", "kg"] },
      { name: "notes", type: "string" },
    ],
    description: "Update a weigh-in",
  },
  {
    method: "DELETE", path: "/agent/weight", fn: api.weight.removeEntry, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "weight_logs" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a weigh-in",
  },

  // ---- goals ----
  { method: "GET", path: "/agent/goals", fn: api.goals.get, kind: "query", injectUser: true, params: [], description: "Get daily macro goals" },
  {
    method: "POST", path: "/agent/goals", fn: api.goals.set, kind: "mutation", injectUser: true,
    params: [
      { name: "calories", type: "number", required: true },
      { name: "protein", type: "number", required: true },
      { name: "carbs", type: "number", required: true },
      { name: "fat", type: "number", required: true },
    ],
    description: "Set daily macro goals",
  },

  // ---- grocery ----
  { method: "GET", path: "/agent/grocery/lists", fn: api.grocery.getLists, kind: "query", injectUser: true, params: [], description: "List active grocery lists" },
  {
    method: "GET", path: "/agent/grocery/list", fn: api.grocery.getList, kind: "query", injectUser: false,
    owned: { param: "listId", table: "grocery_lists" },
    params: [{ name: "listId", type: "string", required: true }],
    description: "Get one grocery list",
  },
  {
    method: "GET", path: "/agent/grocery/items", fn: api.grocery.getItems, kind: "query", injectUser: false,
    owned: { param: "listId", table: "grocery_lists" },
    params: [{ name: "listId", type: "string", required: true }],
    description: "List items in a grocery list",
  },
  {
    method: "POST", path: "/agent/grocery/lists", fn: api.grocery.createList, kind: "mutation", injectUser: true,
    params: [{ name: "name", type: "string", required: true }],
    description: "Create a grocery list",
  },
  {
    method: "POST", path: "/agent/grocery/items", fn: api.grocery.addItemsBatch, kind: "mutation", injectUser: false,
    owned: { param: "listId", table: "grocery_lists" },
    params: [
      { name: "listId", type: "string", required: true },
      { name: "items", type: "json", required: true, description: "Array of {name, quantity?, unit?}" },
    ],
    description: "Add items to a grocery list (order auto-assigned)",
  },
  {
    method: "PATCH", path: "/agent/grocery/item", fn: api.grocery.updateItemMeta, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "grocery_list_items" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string" },
      { name: "quantity", type: "string", description: "Empty string clears" },
      { name: "unit", type: "string", description: "Empty string clears" },
    ],
    description: "Update a grocery item's name/quantity/unit",
  },
  {
    method: "POST", path: "/agent/grocery/item/toggle", fn: api.grocery.toggleItem, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "grocery_list_items" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "checked", type: "boolean", required: true },
    ],
    description: "Check/uncheck a grocery item",
  },
  {
    method: "POST", path: "/agent/grocery/list/reset", fn: api.grocery.resetChecks, kind: "mutation", injectUser: false,
    owned: { param: "listId", table: "grocery_lists" },
    params: [{ name: "listId", type: "string", required: true }],
    description: "Uncheck every item in a list",
  },
  {
    method: "DELETE", path: "/agent/grocery/item", fn: api.grocery.removeItem, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "grocery_list_items" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a grocery item",
  },
  {
    method: "POST", path: "/agent/grocery/list/archive", fn: api.grocery.archiveList, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "grocery_lists" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Archive a grocery list",
  },
  {
    method: "POST", path: "/agent/grocery/list/duplicate", fn: api.grocery.duplicateList, kind: "mutation", injectUser: true,
    owned: { param: "id", table: "grocery_lists" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Duplicate a grocery list (items unchecked)",
  },
  {
    method: "PATCH", path: "/agent/grocery/list", fn: api.grocery.updateListMeta, kind: "mutation", injectUser: false,
    owned: { param: "listId", table: "grocery_lists" },
    params: [
      { name: "listId", type: "string", required: true },
      { name: "estimatedCost", type: "number" },
    ],
    description: "Update a grocery list's estimated cost",
  },

  // ---- grocery trips ----
  {
    method: "GET", path: "/agent/grocery/trips", fn: api.grocery.getTrips, kind: "query", injectUser: true,
    params: [{ name: "limit", type: "number", description: "Newest first, max 200, defaults to 50" }],
    description: "List saved shopping trips, newest first",
  },
  {
    method: "GET", path: "/agent/grocery/trips/stats", fn: api.grocery.getTripStats, kind: "query", injectUser: true,
    params: [],
    description: "Shopping frequency and spend: trips + spend in the last 30 days, average cost, average days between trips",
  },
  {
    method: "GET", path: "/agent/grocery/trip/items", fn: api.grocery.getTripItems, kind: "query", injectUser: false,
    owned: { param: "tripId", table: "grocery_trips" },
    params: [{ name: "tripId", type: "string", required: true }],
    description: "The items bought on one trip",
  },
  {
    method: "POST", path: "/agent/grocery/trips", fn: api.grocery.saveTrip, kind: "mutation", injectUser: true,
    owned: { param: "listId", table: "grocery_lists" },
    params: [
      { name: "listId", type: "string", required: true },
      { name: "actualCost", type: "number", description: "What was actually paid" },
      { name: "store", type: "string" },
      { name: "notes", type: "string" },
      { name: "shoppedAt", type: "number", description: "Epoch ms, defaults to now — set this to back-date a trip" },
      { name: "resetList", type: "boolean", description: "Uncheck the items afterwards; defaults true" },
    ],
    description: "Save a shopping trip, snapshotting the list's currently-checked items",
  },
  {
    method: "PATCH", path: "/agent/grocery/trip", fn: api.grocery.updateTrip, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "grocery_trips" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "actualCost", type: "number" },
      { name: "store", type: "string" },
      { name: "notes", type: "string" },
      { name: "shoppedAt", type: "number", description: "Epoch ms" },
    ],
    description: "Update a saved trip",
  },
  {
    method: "DELETE", path: "/agent/grocery/trip", fn: api.grocery.deleteTrip, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "grocery_trips" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a trip and its item snapshot",
  },

  // ---- foodbank ----
  {
    method: "GET", path: "/agent/foodbank", fn: api.foodbank.listPaginated, kind: "query", injectUser: true,
    params: [{ name: "paginationOpts", type: "json", default: { numItems: 50, cursor: null }, description: "{numItems, cursor}" }],
    description: "List food bank entries (paginated)",
  },
  {
    method: "GET", path: "/agent/foodbank/search", fn: api.foodbank.search, kind: "query", injectUser: true,
    params: [{ name: "query", type: "string", required: true }],
    description: "Search the food bank by name",
  },
  {
    method: "POST", path: "/agent/foodbank", fn: api.foodbank.upsert, kind: "mutation", injectUser: true,
    params: [{ name: "name", type: "string", required: true }, ...MACROS],
    description: "Create or update a food bank entry by name",
  },
  {
    method: "PATCH", path: "/agent/foodbank", fn: api.foodbank.update, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "food_bank" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string", required: true },
      ...MACROS,
    ],
    description: "Update a food bank entry by id",
  },
  {
    method: "DELETE", path: "/agent/foodbank", fn: api.foodbank.remove, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "food_bank" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a food bank entry",
  },

  // ---- exercises ----
  {
    method: "GET", path: "/agent/exercises", fn: api.workout.getExercises, kind: "query", injectUser: true,
    params: [{ name: "search", type: "string" }],
    description: "List (or search) exercises",
  },
  {
    method: "POST", path: "/agent/exercises", fn: api.workout.addExercise, kind: "mutation", injectUser: true,
    params: [
      { name: "name", type: "string", required: true },
      { name: "muscleGroup", type: "string" },
      { name: "defaultSets", type: "number" },
      { name: "defaultReps", type: "string" },
      { name: "defaultWeight", type: "string" },
    ],
    description: "Add an exercise",
  },
  {
    method: "PATCH", path: "/agent/exercises", fn: api.workout.updateExercise, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "exercises" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string" },
      { name: "muscleGroup", type: "string" },
      { name: "defaultSets", type: "number" },
      { name: "defaultReps", type: "string" },
      { name: "defaultWeight", type: "string" },
    ],
    description: "Update an exercise",
  },
  {
    method: "DELETE", path: "/agent/exercises", fn: api.workout.removeExercise, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "exercises" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete an exercise",
  },

  // ---- workouts (sessions) ----
  { method: "GET", path: "/agent/workouts", fn: api.workout.getSessions, kind: "query", injectUser: true, params: [], description: "List recent workout sessions (latest 20)" },
  {
    method: "GET", path: "/agent/workouts/by-date", fn: api.workout.getSessionsByDate, kind: "query", injectUser: true,
    params: [{ name: "date", type: "string", required: true }],
    description: "Completed sessions on a day, with exercises",
  },
  {
    method: "GET", path: "/agent/workouts/week", fn: api.workout.getSessionsInWeek, kind: "query", injectUser: true,
    params: [{ name: "weekStartDate", type: "string", required: true, description: "Monday, YYYY-MM-DD" }],
    description: "Completed sessions in a Mon-Sun week",
  },
  {
    method: "POST", path: "/agent/workouts", fn: api.workout.startSession, kind: "mutation", injectUser: true,
    params: [
      { name: "name", type: "string", required: true },
      { name: "exerciseIds", type: "json", required: true, description: "Array of exercise ids" },
    ],
    description: "Start a workout session",
  },
  {
    method: "GET", path: "/agent/workouts/exercises", fn: api.workout.getSessionExercises, kind: "query", injectUser: false,
    owned: { param: "sessionId", table: "workout_sessions" },
    params: [{ name: "sessionId", type: "string", required: true }],
    description: "Exercises + sets in a session",
  },
  {
    method: "POST", path: "/agent/workouts/set", fn: api.workout.updateSet, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_session_exercises" },
    params: [
      { name: "id", type: "string", required: true, description: "workout_session_exercises id" },
      { name: "setIndex", type: "number", required: true },
      { name: "reps", type: "number" },
      { name: "weight", type: "string" },
      { name: "completed", type: "boolean", required: true },
    ],
    description: "Record a set",
  },
  {
    method: "POST", path: "/agent/workouts/complete", fn: api.workout.completeSession, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_sessions" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Mark a session complete",
  },
  {
    method: "POST", path: "/agent/workouts/log", fn: api.workout.logPastSession, kind: "mutation", injectUser: true,
    params: [
      { name: "name", type: "string", required: true },
      { name: "exerciseIds", type: "json", required: true, description: "Array of exercise ids, in order" },
      { name: "date", type: "string", required: true, description: "YYYY-MM-DD of the day it happened" },
    ],
    description: "Record a workout that already happened, on any date, saved already-completed. Use this for 'I did X today' rather than starting a live session. Fill in reps/weight afterwards with POST /agent/workouts/sets",
  },
  {
    method: "GET", path: "/agent/workouts/session", fn: api.workout.getSession, kind: "query", injectUser: false,
    owned: { param: "sessionId", table: "workout_sessions" },
    params: [{ name: "sessionId", type: "string", required: true }],
    description: "One session with its exercises and sets joined",
  },
  {
    method: "PATCH", path: "/agent/workouts", fn: api.workout.updateSession, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_sessions" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string" },
      { name: "startedAt", type: "number", description: "Epoch ms — moves the session to another day/time" },
    ],
    description: "Rename a session or move it to a different date",
  },
  {
    method: "POST", path: "/agent/workouts/sets", fn: api.workout.replaceSets, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_session_exercises" },
    params: [
      { name: "id", type: "string", required: true, description: "workout_session_exercises id" },
      { name: "sets", type: "json", required: true, description: "Full replacement array of {reps?, weight?, completed}. Covers editing, adding and removing sets in one call" },
    ],
    description: "Replace an exercise's whole set list",
  },
  {
    method: "POST", path: "/agent/workouts/exercises", fn: api.workout.addExerciseToSession, kind: "mutation", injectUser: false,
    owned: { param: "sessionId", table: "workout_sessions" },
    params: [
      { name: "sessionId", type: "string", required: true },
      { name: "exerciseId", type: "string", required: true },
      { name: "setCount", type: "number", description: "Defaults to the exercise's defaultSets, or 3" },
    ],
    description: "Add an exercise to an existing session",
  },
  {
    method: "DELETE", path: "/agent/workouts/exercises", fn: api.workout.removeExerciseFromSession, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_session_exercises" },
    params: [{ name: "id", type: "string", required: true, description: "workout_session_exercises id" }],
    description: "Remove one exercise and its sets from a session",
  },
  {
    method: "DELETE", path: "/agent/workouts", fn: api.workout.deleteSession, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_sessions" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a session and all its sets",
  },

  // ---- routines ----
  { method: "GET", path: "/agent/routines", fn: api.workout.getRoutines, kind: "query", injectUser: true, params: [], description: "List workout routines with exercises" },
  {
    method: "POST", path: "/agent/routines", fn: api.workout.createRoutine, kind: "mutation", injectUser: true,
    params: [
      { name: "name", type: "string", required: true },
      { name: "exerciseIds", type: "json", required: true },
    ],
    description: "Create a routine",
  },
  {
    method: "PATCH", path: "/agent/routines", fn: api.workout.updateRoutine, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_routines" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string" },
      { name: "exerciseIds", type: "json" },
    ],
    description: "Update a routine",
  },
  {
    method: "DELETE", path: "/agent/routines", fn: api.workout.deleteRoutine, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "workout_routines" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a routine",
  },

  // ---- meal plans ----
  { method: "GET", path: "/agent/mealplans", fn: api.mealplans.list, kind: "query", injectUser: true, params: [], description: "List meal plans with item counts" },
  {
    method: "GET", path: "/agent/mealplans/items", fn: api.mealplans.getItems, kind: "query", injectUser: false,
    owned: { param: "planId", table: "meal_plans" },
    params: [{ name: "planId", type: "string", required: true }],
    description: "Items in a meal plan",
  },
  {
    method: "POST", path: "/agent/mealplans", fn: api.mealplans.createPlan, kind: "mutation", injectUser: true,
    params: [{ name: "name", type: "string", required: true }],
    description: "Create a meal plan",
  },
  {
    method: "PATCH", path: "/agent/mealplans", fn: api.mealplans.renamePlan, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "meal_plans" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string", required: true },
    ],
    description: "Rename a meal plan",
  },
  {
    method: "DELETE", path: "/agent/mealplans", fn: api.mealplans.deletePlan, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "meal_plans" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Delete a meal plan and its items",
  },
  {
    method: "POST", path: "/agent/mealplans/items", fn: api.mealplans.addItem, kind: "mutation", injectUser: false,
    owned: { param: "planId", table: "meal_plans" },
    params: [
      { name: "planId", type: "string", required: true },
      { name: "name", type: "string", required: true },
      { name: "mealType", type: "string", required: true, enum: MEAL_TYPES },
      { name: "day", type: "string", description: "e.g. monday" },
      ...MACROS,
      { name: "order", type: "number", default: 0 },
    ],
    description: "Add an item to a meal plan",
  },
  {
    method: "PATCH", path: "/agent/mealplans/item", fn: api.mealplans.updateItem, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "meal_plan_items" },
    params: [
      { name: "id", type: "string", required: true },
      { name: "name", type: "string" },
      { name: "mealType", type: "string", enum: MEAL_TYPES },
      ...MACROS,
    ],
    description: "Update a meal plan item",
  },
  {
    method: "DELETE", path: "/agent/mealplans/item", fn: api.mealplans.removeItem, kind: "mutation", injectUser: false,
    owned: { param: "id", table: "meal_plan_items" },
    params: [{ name: "id", type: "string", required: true }],
    description: "Remove a meal plan item",
  },

  // ---- reports & usage ----
  {
    method: "GET", path: "/agent/reports/week", fn: api.reports.getWeek, kind: "query", injectUser: true,
    params: [{ name: "weekStartDate", type: "string", required: true, description: "Monday, YYYY-MM-DD" }],
    description: "Weekly meals + hydration report",
  },
  { method: "GET", path: "/agent/ai-usage", fn: api.aiUsage.getMonthly, kind: "query", injectUser: true, params: [], description: "This month's AI usage stats" },
];

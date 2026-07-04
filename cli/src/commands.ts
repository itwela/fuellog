export type OptSpec = {
  flag: string;            // commander flag, e.g. "--date <date>"
  api: string;             // server param name
  type: "str" | "num" | "bool" | "json" | "date";
  required?: boolean;
  default?: string;        // commander-level default (pre-coercion)
  desc?: string;
};

export type CommandSpec = {
  /** "noun verb" — registrar nests under the noun. */
  name: string;
  desc: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  opts: OptSpec[];
  /** Destructive: refuse without --yes. */
  confirm?: boolean;
};

const macroOpts: OptSpec[] = [
  { flag: "--calories <n>", api: "calories", type: "num" },
  { flag: "--protein <n>", api: "protein", type: "num" },
  { flag: "--fat <n>", api: "fat", type: "num" },
  { flag: "--carbs <n>", api: "carbs", type: "num" },
  { flag: "--fiber <n>", api: "fiber", type: "num" },
  { flag: "--sugar <n>", api: "sugar", type: "num" },
];

export const commands: CommandSpec[] = [
  // meals
  { name: "meals list", desc: "List meals for a day", method: "GET", path: "/agent/meals",
    opts: [{ flag: "--date <date>", api: "date", type: "date", default: "today" }] },
  { name: "meals month", desc: "Dates with meals in a month", method: "GET", path: "/agent/meals/month",
    opts: [
      { flag: "--year <n>", api: "year", type: "num", required: true },
      { flag: "--month <n>", api: "month", type: "num", required: true, desc: "1-12" },
    ] },
  { name: "meals add", desc: "Log a meal", method: "POST", path: "/agent/meals",
    opts: [
      { flag: "--name <name>", api: "name", type: "str", required: true },
      { flag: "--type <type>", api: "mealType", type: "str", required: true, desc: "breakfast|lunch|dinner|snack" },
      ...macroOpts,
      { flag: "--quantity <n>", api: "quantity", type: "num", desc: "Servings" },
      { flag: "--notes <text>", api: "notes", type: "str" },
      { flag: "--date <date>", api: "logDate", type: "date" },
    ] },
  { name: "meals add-batch", desc: "Log several meals from JSON", method: "POST", path: "/agent/meals/batch",
    opts: [
      { flag: "--meals <json>", api: "meals", type: "json", required: true, desc: '[{"name","mealType",...}]' },
      { flag: "--date <date>", api: "logDate", type: "date" },
    ] },
  { name: "meals update", desc: "Update a meal (name+type required)", method: "PATCH", path: "/agent/meals",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str", required: true },
      { flag: "--type <type>", api: "mealType", type: "str", required: true },
      ...macroOpts,
      { flag: "--quantity <n>", api: "quantity", type: "num" },
      { flag: "--notes <text>", api: "notes", type: "str" },
    ] },
  { name: "meals delete", desc: "Delete a meal log", method: "DELETE", path: "/agent/meals", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },

  // hydration
  { name: "hydration list", desc: "Hydration logs for a day", method: "GET", path: "/agent/hydration",
    opts: [{ flag: "--date <date>", api: "date", type: "date", default: "today" }] },
  { name: "hydration log", desc: "Log water (oz)", method: "POST", path: "/agent/hydration",
    opts: [
      { flag: "--oz <n>", api: "ozAmount", type: "num", required: true },
      { flag: "--date <date>", api: "logDate", type: "date" },
    ] },
  { name: "hydration delete", desc: "Delete a hydration log", method: "DELETE", path: "/agent/hydration", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },

  // goals
  { name: "goals show", desc: "Show daily macro goals", method: "GET", path: "/agent/goals", opts: [] },
  { name: "goals set", desc: "Set daily macro goals", method: "POST", path: "/agent/goals",
    opts: [
      { flag: "--calories <n>", api: "calories", type: "num", required: true },
      { flag: "--protein <n>", api: "protein", type: "num", required: true },
      { flag: "--carbs <n>", api: "carbs", type: "num", required: true },
      { flag: "--fat <n>", api: "fat", type: "num", required: true },
    ] },

  // grocery
  { name: "grocery lists", desc: "List grocery lists", method: "GET", path: "/agent/grocery/lists", opts: [] },
  { name: "grocery show", desc: "Show one list", method: "GET", path: "/agent/grocery/list",
    opts: [{ flag: "--list <id>", api: "listId", type: "str", required: true }] },
  { name: "grocery items", desc: "Items in a list", method: "GET", path: "/agent/grocery/items",
    opts: [{ flag: "--list <id>", api: "listId", type: "str", required: true }] },
  { name: "grocery create-list", desc: "Create a grocery list", method: "POST", path: "/agent/grocery/lists",
    opts: [{ flag: "--name <name>", api: "name", type: "str", required: true }] },
  { name: "grocery add", desc: "Add items to a list", method: "POST", path: "/agent/grocery/items",
    opts: [
      { flag: "--list <id>", api: "listId", type: "str", required: true },
      { flag: "--items <json>", api: "items", type: "json", required: true, desc: '[{"name","quantity?","unit?"}]' },
    ] },
  { name: "grocery update-item", desc: "Update an item", method: "PATCH", path: "/agent/grocery/item",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str" },
      { flag: "--quantity <q>", api: "quantity", type: "str" },
      { flag: "--unit <u>", api: "unit", type: "str" },
    ] },
  { name: "grocery toggle", desc: "Check/uncheck an item", method: "POST", path: "/agent/grocery/item/toggle",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--checked <bool>", api: "checked", type: "str", required: true, desc: "true|false" },
    ] },
  { name: "grocery reset", desc: "Uncheck all items in a list", method: "POST", path: "/agent/grocery/list/reset",
    opts: [{ flag: "--list <id>", api: "listId", type: "str", required: true }] },
  { name: "grocery delete-item", desc: "Delete an item", method: "DELETE", path: "/agent/grocery/item", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },
  { name: "grocery archive", desc: "Archive a list", method: "POST", path: "/agent/grocery/list/archive", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },
  { name: "grocery duplicate", desc: "Duplicate a list", method: "POST", path: "/agent/grocery/list/duplicate",
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },
  { name: "grocery set-cost", desc: "Set a list's estimated cost", method: "PATCH", path: "/agent/grocery/list",
    opts: [
      { flag: "--list <id>", api: "listId", type: "str", required: true },
      { flag: "--cost <n>", api: "estimatedCost", type: "num" },
    ] },

  // foodbank
  { name: "foodbank list", desc: "List food bank entries", method: "GET", path: "/agent/foodbank", opts: [] },
  { name: "foodbank search", desc: "Search food bank", method: "GET", path: "/agent/foodbank/search",
    opts: [{ flag: "--query <text>", api: "query", type: "str", required: true }] },
  { name: "foodbank upsert", desc: "Create/update entry by name", method: "POST", path: "/agent/foodbank",
    opts: [{ flag: "--name <name>", api: "name", type: "str", required: true }, ...macroOpts] },
  { name: "foodbank update", desc: "Update entry by id", method: "PATCH", path: "/agent/foodbank",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str", required: true },
      ...macroOpts,
    ] },
  { name: "foodbank delete", desc: "Delete an entry", method: "DELETE", path: "/agent/foodbank", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },

  // exercises
  { name: "exercises list", desc: "List/search exercises", method: "GET", path: "/agent/exercises",
    opts: [{ flag: "--search <text>", api: "search", type: "str" }] },
  { name: "exercises add", desc: "Add an exercise", method: "POST", path: "/agent/exercises",
    opts: [
      { flag: "--name <name>", api: "name", type: "str", required: true },
      { flag: "--muscle <group>", api: "muscleGroup", type: "str" },
      { flag: "--sets <n>", api: "defaultSets", type: "num" },
      { flag: "--reps <reps>", api: "defaultReps", type: "str" },
      { flag: "--weight <w>", api: "defaultWeight", type: "str" },
    ] },
  { name: "exercises update", desc: "Update an exercise", method: "PATCH", path: "/agent/exercises",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str" },
      { flag: "--muscle <group>", api: "muscleGroup", type: "str" },
      { flag: "--sets <n>", api: "defaultSets", type: "num" },
      { flag: "--reps <reps>", api: "defaultReps", type: "str" },
      { flag: "--weight <w>", api: "defaultWeight", type: "str" },
    ] },
  { name: "exercises delete", desc: "Delete an exercise", method: "DELETE", path: "/agent/exercises", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },

  // workouts
  { name: "workouts list", desc: "Recent workout sessions", method: "GET", path: "/agent/workouts", opts: [] },
  { name: "workouts by-date", desc: "Completed sessions on a day", method: "GET", path: "/agent/workouts/by-date",
    opts: [{ flag: "--date <date>", api: "date", type: "date", default: "today" }] },
  { name: "workouts week", desc: "Sessions in a Mon-Sun week", method: "GET", path: "/agent/workouts/week",
    opts: [{ flag: "--start <date>", api: "weekStartDate", type: "date", required: true, desc: "Monday" }] },
  { name: "workouts start", desc: "Start a session", method: "POST", path: "/agent/workouts",
    opts: [
      { flag: "--name <name>", api: "name", type: "str", required: true },
      { flag: "--exercises <json>", api: "exerciseIds", type: "json", required: true, desc: '["<exerciseId>", ...]' },
    ] },
  { name: "workouts exercises", desc: "Exercises + sets in a session", method: "GET", path: "/agent/workouts/exercises",
    opts: [{ flag: "--session <id>", api: "sessionId", type: "str", required: true }] },
  { name: "workouts set", desc: "Record a set", method: "POST", path: "/agent/workouts/set",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true, desc: "session-exercise id" },
      { flag: "--index <n>", api: "setIndex", type: "num", required: true },
      { flag: "--reps <n>", api: "reps", type: "num" },
      { flag: "--weight <w>", api: "weight", type: "str" },
      { flag: "--done", api: "completed", type: "bool" },
    ] },
  { name: "workouts complete", desc: "Complete a session", method: "POST", path: "/agent/workouts/complete",
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },

  // routines
  { name: "routines list", desc: "List routines", method: "GET", path: "/agent/routines", opts: [] },
  { name: "routines create", desc: "Create a routine", method: "POST", path: "/agent/routines",
    opts: [
      { flag: "--name <name>", api: "name", type: "str", required: true },
      { flag: "--exercises <json>", api: "exerciseIds", type: "json", required: true },
    ] },
  { name: "routines update", desc: "Update a routine", method: "PATCH", path: "/agent/routines",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str" },
      { flag: "--exercises <json>", api: "exerciseIds", type: "json" },
    ] },
  { name: "routines delete", desc: "Delete a routine", method: "DELETE", path: "/agent/routines", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },

  // mealplans
  { name: "mealplans list", desc: "List meal plans", method: "GET", path: "/agent/mealplans", opts: [] },
  { name: "mealplans items", desc: "Items in a plan", method: "GET", path: "/agent/mealplans/items",
    opts: [{ flag: "--plan <id>", api: "planId", type: "str", required: true }] },
  { name: "mealplans create", desc: "Create a meal plan", method: "POST", path: "/agent/mealplans",
    opts: [{ flag: "--name <name>", api: "name", type: "str", required: true }] },
  { name: "mealplans rename", desc: "Rename a plan", method: "PATCH", path: "/agent/mealplans",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str", required: true },
    ] },
  { name: "mealplans delete", desc: "Delete a plan + items", method: "DELETE", path: "/agent/mealplans", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },
  { name: "mealplans add-item", desc: "Add an item to a plan", method: "POST", path: "/agent/mealplans/items",
    opts: [
      { flag: "--plan <id>", api: "planId", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str", required: true },
      { flag: "--type <type>", api: "mealType", type: "str", required: true },
      { flag: "--day <day>", api: "day", type: "str" },
      ...macroOpts,
    ] },
  { name: "mealplans update-item", desc: "Update a plan item", method: "PATCH", path: "/agent/mealplans/item",
    opts: [
      { flag: "--id <id>", api: "id", type: "str", required: true },
      { flag: "--name <name>", api: "name", type: "str" },
      { flag: "--type <type>", api: "mealType", type: "str" },
      ...macroOpts,
    ] },
  { name: "mealplans delete-item", desc: "Remove a plan item", method: "DELETE", path: "/agent/mealplans/item", confirm: true,
    opts: [{ flag: "--id <id>", api: "id", type: "str", required: true }] },

  // reports & usage
  { name: "reports week", desc: "Weekly meals + hydration", method: "GET", path: "/agent/reports/week",
    opts: [{ flag: "--start <date>", api: "weekStartDate", type: "date", required: true, desc: "Monday" }] },
  { name: "ai-usage show", desc: "This month's AI usage", method: "GET", path: "/agent/ai-usage", opts: [] },
];

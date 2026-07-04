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
];

# FuelLog Agent API + `fuel` CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An API-key-authenticated `/agent/*` HTTP API in FuelLog's Convex backend, plus a globally installed `fuel` CLI that gives AI agents full CRUD over meals, hydration, goals, grocery, foodbank, workouts, routines, meal plans, reports, and AI usage.

**Architecture:** New `convex/agent/` module: hashed API keys resolve a Bearer token to a `userId`; a declarative route table maps flat `/agent/...` paths to *existing* Convex functions (no rewrites), injecting `userId` where the function expects it and running an ownership guard where it doesn't. The CLI is a declarative command table over the same routes. `GET /agent/schema` serves the route table as machine-readable JSON.

**Tech Stack:** Convex HTTP actions (TypeScript), Node 20+, `commander`, `tsup`, `vitest`.

**Spec:** `"/Users/itwelaibomu/Desktop/Itwela Obsidian/docs/superpowers/specs/2026-07-04-agent-clis-design.md"` (this plan covers subsystem 1 of 3). One approved deviation: ids are passed as query/body params (`?id=...`) instead of path segments — Convex's `httpRouter` has no path parameters, and flat paths keep dispatch table-driven. CLI UX is unchanged.

## Global Constraints

- Repo: `/Users/itwelaibomu/Desktop/Code/fuellog` (git repo; commit after every task).
- Zero modifications to existing convex function files (`meals.ts`, `grocery.ts`, etc.). Only `schema.ts` gains a table; everything else is new files.
- New table name `api_keys` (snake_case, matching existing tables). Key format: `fuel_sk_` + 48 hex chars. Keys stored as SHA-256 hex only.
- Response envelope, always: `{ ok: true, data }` or `{ ok: false, error: { code, message, hint } }`.
- CLI exit codes: 0 success, 1 user error (4xx), 2 system error (network/5xx).
- CLI deps: `commander` only (runtime). Dev: `typescript`, `tsup`, `vitest`, `@types/node`.
- No interactive prompts. Destructive commands require `--yes`.
- Test everything against the **dev** deployment (`npx convex dev` must be running in the repo during backend tasks); prod deploy is the final task only.

---

### Task 1: `api_keys` table + key management functions

**Files:**
- Modify: `convex/schema.ts` (add one table at the end, before the closing `});`)
- Create: `convex/agent/keys.ts`

**Interfaces:**
- Produces: `sha256Hex(input: string): Promise<string>` (exported helper); `agent/keys:generate` action `{ userId, name } → { key }`; `internal.agent.keys.lookupByHash` `{ keyHash } → { userId, keyId } | null`; `internal.agent.keys.markUsed` `{ id }`; public `list` / `revoke`.

- [ ] **Step 1: Add the table to `convex/schema.ts`** — insert before the final `});`:

```ts
  api_keys: defineTable({
    userId: v.string(),
    name: v.string(),
    keyHash: v.string(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_hash", ["keyHash"])
    .index("by_user", ["userId"]),
```

- [ ] **Step 2: Create `convex/agent/keys.ts`**:

```ts
import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate an API key for a user. Prints the plaintext key ONCE; only the hash is stored. */
export const generate = action({
  args: { userId: v.string(), name: v.string() },
  handler: async (ctx, { userId, name }): Promise<{ key: string; note: string }> => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const key =
      "fuel_sk_" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const keyHash = await sha256Hex(key);
    await ctx.runMutation(internal.agent.keys.insert, { userId, name, keyHash });
    return { key, note: "Save this key now. It is not stored in plaintext and cannot be shown again." };
  },
});

export const insert = internalMutation({
  args: { userId: v.string(), name: v.string(), keyHash: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("api_keys", { ...args, createdAt: Date.now() });
  },
});

export const lookupByHash = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, { keyHash }) => {
    const row = await ctx.db
      .query("api_keys")
      .withIndex("by_hash", (q) => q.eq("keyHash", keyHash))
      .first();
    if (!row || row.revokedAt !== undefined) return null;
    return { userId: row.userId, keyId: row._id };
  },
});

export const markUsed = internalMutation({
  args: { id: v.id("api_keys") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { lastUsedAt: Date.now() });
  },
});

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("api_keys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map(({ keyHash: _hash, ...rest }) => rest);
  },
});

export const revoke = mutation({
  args: { userId: v.string(), id: v.id("api_keys") },
  handler: async (ctx, { userId, id }) => {
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Key not found");
    await ctx.db.patch(id, { revokedAt: Date.now() });
  },
});
```

- [ ] **Step 3: Push and verify against dev deployment**

Run (in `/Users/itwelaibomu/Desktop/Code/fuellog`; start `npx convex dev` in background if not running):
```bash
npx convex run agent/keys:generate '{"userId":"smoke-test-user","name":"plan-verify"}'
```
Expected: JSON containing `"key": "fuel_sk_..."` (48 hex chars after prefix).

```bash
npx convex run agent/keys:list '{"userId":"smoke-test-user"}'
```
Expected: one row with `name: "plan-verify"`, no `keyHash` field in output.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/agent/keys.ts
git commit -m "feat(agent): api_keys table + hashed key management"
```

---

### Task 2: Bearer auth helper + ownership guard

**Files:**
- Create: `convex/agent/auth.ts`
- Create: `convex/agent/guard.ts`

**Interfaces:**
- Consumes: `sha256Hex`, `internal.agent.keys.lookupByHash`, `internal.agent.keys.markUsed` (Task 1).
- Produces: `class AgentError(status, code, message, hint?)`; `authenticate(ctx, request): Promise<string>` (returns userId, throws AgentError 401); `internal.agent.guard.checkOwner` `{ table, id, userId } → boolean`.

- [ ] **Step 1: Create `convex/agent/auth.ts`**:

```ts
import { internal } from "../_generated/api";
import type { GenericActionCtx } from "convex/server";
import type { DataModel } from "../_generated/dataModel";
import { sha256Hex } from "./keys";

export class AgentError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public hint?: string
  ) {
    super(message);
  }
}

export async function authenticate(
  ctx: GenericActionCtx<DataModel>,
  request: Request
): Promise<string> {
  const header = request.headers.get("Authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key) {
    throw new AgentError(
      401,
      "unauthorized",
      "Missing API key",
      "Send header 'Authorization: Bearer <key>'. Generate a key with: npx convex run agent/keys:generate '{\"userId\":\"<you>\",\"name\":\"cli\"}'"
    );
  }
  const keyHash = await sha256Hex(key);
  const match = await ctx.runQuery(internal.agent.keys.lookupByHash, { keyHash });
  if (!match) {
    throw new AgentError(401, "unauthorized", "Invalid or revoked API key", "Generate a new key and run 'fuel auth login <key>'.");
  }
  await ctx.runMutation(internal.agent.keys.markUsed, { id: match.keyId });
  return match.userId;
}
```

- [ ] **Step 2: Create `convex/agent/guard.ts`** — ownership check for tables whose mutations trust the caller. Child tables resolve ownership through their parent:

```ts
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
```

- [ ] **Step 3: Verify it compiles and pushes**

Run: `npx convex dev --once`
Expected: "Convex functions ready" (no type errors).

- [ ] **Step 4: Commit**

```bash
git add convex/agent/auth.ts convex/agent/guard.ts
git commit -m "feat(agent): bearer auth helper + ownership guard"
```

---

### Task 3: Route table types + HTTP dispatcher + ping/schema endpoints

**Files:**
- Create: `convex/agent/routes.ts` (types + first two resource groups: meals, hydration — remaining groups land in Task 4)
- Create: `convex/http.ts`

**Interfaces:**
- Consumes: `authenticate`, `AgentError` (Task 2), `internal.agent.guard.checkOwner` (Task 2).
- Produces: `type ParamSpec`, `type AgentRoute`, `export const agentRoutes: AgentRoute[]`; HTTP endpoints `GET /agent/ping`, `GET /agent/schema`, and every route in the table. Later tasks only append rows to `agentRoutes`.

- [ ] **Step 1: Create `convex/agent/routes.ts`**:

```ts
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
```

- [ ] **Step 2: Create `convex/http.ts`** — auth, param coercion/validation, ownership guard, dispatch, envelope:

```ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { AgentError, authenticate } from "./agent/auth";
import { agentRoutes, type AgentRoute, type ParamSpec } from "./agent/routes";

const http = httpRouter();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ok(data: unknown): Response {
  return json(200, { ok: true, data: data === undefined ? null : data });
}

function fail(status: number, code: string, message: string, hint?: string): Response {
  return json(status, { ok: false, error: { code, message, ...(hint ? { hint } : {}) } });
}

function coerce(spec: ParamSpec, raw: unknown): unknown {
  if (typeof raw !== "string") return raw; // already typed (JSON body)
  switch (spec.type) {
    case "number": {
      const n = Number(raw);
      if (Number.isNaN(n)) throw new AgentError(400, "invalid_param", `Param '${spec.name}' must be a number, got '${raw}'`);
      return n;
    }
    case "boolean":
      if (raw === "true") return true;
      if (raw === "false") return false;
      throw new AgentError(400, "invalid_param", `Param '${spec.name}' must be 'true' or 'false', got '${raw}'`);
    case "json":
      try {
        return JSON.parse(raw);
      } catch {
        throw new AgentError(400, "invalid_param", `Param '${spec.name}' must be valid JSON`);
      }
    default:
      return raw;
  }
}

async function buildArgs(route: AgentRoute, request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  let raw: Record<string, unknown> = {};
  if (route.method === "GET" || route.method === "DELETE") {
    for (const [k, v] of url.searchParams.entries()) raw[k] = v;
  } else {
    const text = await request.text();
    if (text) {
      try {
        raw = JSON.parse(text);
      } catch {
        throw new AgentError(400, "invalid_body", "Request body must be valid JSON");
      }
    }
  }

  const valid = new Set(route.params.map((p) => p.name));
  for (const k of Object.keys(raw)) {
    if (!valid.has(k)) {
      throw new AgentError(400, "unknown_param", `Unknown param '${k}'`, `Valid params: ${[...valid].join(", ") || "(none)"}`);
    }
  }

  const args: Record<string, unknown> = {};
  for (const spec of route.params) {
    let value = raw[spec.name];
    if (value === undefined || value === "") {
      if (spec.default !== undefined) value = spec.default;
      else if (spec.required) {
        throw new AgentError(400, "missing_param", `Missing required param '${spec.name}'`, `GET /agent/schema describes every route's params.`);
      } else continue;
    } else {
      value = coerce(spec, value);
    }
    if (spec.enum && !spec.enum.includes(String(value))) {
      throw new AgentError(400, "invalid_param", `Param '${spec.name}' must be one of: ${spec.enum.join(", ")}`);
    }
    args[spec.name] = value;
  }
  return args;
}

function makeHandler(route: AgentRoute) {
  return httpAction(async (ctx, request) => {
    try {
      const userId = await authenticate(ctx, request);
      const args = await buildArgs(route, request);
      if (route.owned) {
        const id = args[route.owned.param];
        const owns = await ctx.runQuery(internal.agent.guard.checkOwner, {
          table: route.owned.table,
          id: String(id),
          userId,
        });
        if (!owns) {
          throw new AgentError(404, "not_found", `No ${route.owned.table} record with that id belongs to you`, `List records first to find a valid id.`);
        }
      }
      if (route.injectUser) args.userId = userId;
      const result =
        route.kind === "query"
          ? await ctx.runQuery(route.fn, args)
          : await ctx.runMutation(route.fn, args);
      return ok(result);
    } catch (err) {
      if (err instanceof AgentError) return fail(err.status, err.code, err.message, err.hint);
      const message = err instanceof Error ? err.message : String(err);
      // Convex arg validation errors are caller mistakes, not server faults.
      const isArgError = message.includes("ArgumentValidationError") || message.includes("Validator");
      return fail(
        isArgError ? 400 : 500,
        isArgError ? "invalid_args" : "server_error",
        message,
        isArgError ? "GET /agent/schema describes every route's params." : undefined
      );
    }
  });
}

http.route({
  path: "/agent/ping",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const userId = await authenticate(ctx, request);
      return ok({ userId, app: "fuellog" });
    } catch (err) {
      if (err instanceof AgentError) return fail(err.status, err.code, err.message, err.hint);
      throw err;
    }
  }),
});

http.route({
  path: "/agent/schema",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      await authenticate(ctx, request);
      return ok({
        app: "fuellog",
        envelope: "{ ok: true, data } | { ok: false, error: { code, message, hint } }",
        auth: "Authorization: Bearer <key>",
        routes: agentRoutes.map(({ fn: _fn, ...rest }) => rest),
      });
    } catch (err) {
      if (err instanceof AgentError) return fail(err.status, err.code, err.message, err.hint);
      throw err;
    }
  }),
});

for (const route of agentRoutes) {
  http.route({ path: route.path, method: route.method, handler: makeHandler(route) });
}

export default http;
```

- [ ] **Step 3: Verify with curl against the dev deployment**

Get the dev site URL: it is the `NEXT_PUBLIC_CONVEX_URL` in `.env.local` with `.convex.cloud` replaced by `.convex.site`. Save both for later steps:

```bash
cd /Users/itwelaibomu/Desktop/Code/fuellog
SITE=$(grep NEXT_PUBLIC_CONVEX_URL .env.local | cut -d= -f2 | sed 's/convex.cloud/convex.site/')
KEY=$(npx convex run agent/keys:generate '{"userId":"smoke-test-user","name":"task3"}' | grep -o 'fuel_sk_[0-9a-f]*')
curl -s "$SITE/agent/ping"                                    # expect 401 envelope with hint
curl -s -H "Authorization: Bearer $KEY" "$SITE/agent/ping"     # expect {"ok":true,"data":{"userId":"smoke-test-user","app":"fuellog"}}
curl -s -H "Authorization: Bearer $KEY" "$SITE/agent/meals?date=2026-07-04"   # expect {"ok":true,"data":[]}
curl -s -H "Authorization: Bearer $KEY" -X POST "$SITE/agent/meals" -H "Content-Type: application/json" \
  -d '{"name":"test rice","mealType":"lunch","calories":300}'  # expect ok with new id
curl -s -H "Authorization: Bearer $KEY" -X POST "$SITE/agent/meals" -d '{"name":"x","mealType":"brunch"}'
# expect 400 invalid_param: mealType must be one of breakfast, lunch, dinner, snack
```

- [ ] **Step 4: Commit**

```bash
git add convex/agent/routes.ts convex/http.ts
git commit -m "feat(agent): http dispatcher + ping/schema + meals & hydration routes"
```

---

### Task 4: Complete the route table (all remaining resources)

**Files:**
- Modify: `convex/agent/routes.ts` (append rows to `agentRoutes` — nothing else changes)

**Interfaces:**
- Consumes: `AgentRoute`, `ParamSpec`, `MACROS`, `MEAL_TYPES` from Task 3.
- Produces: the full agent surface. Paths listed below are exactly what the CLI (Task 6) calls.

- [ ] **Step 1: Append the following rows to `agentRoutes`** (before the closing `];`):

```ts
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
```

- [ ] **Step 2: Verify push + spot-check with curl** (reuse `$SITE`/`$KEY` pattern from Task 3):

```bash
npx convex dev --once   # expect: functions ready, no type errors
curl -s -H "Authorization: Bearer $KEY" "$SITE/agent/goals"        # {"ok":true,"data":null} on fresh user
curl -s -H "Authorization: Bearer $KEY" -X POST "$SITE/agent/goals" -d '{"calories":2400,"protein":180,"carbs":250,"fat":80}'
curl -s -H "Authorization: Bearer $KEY" "$SITE/agent/goals"        # now returns the goals doc
curl -s -H "Authorization: Bearer $KEY" "$SITE/agent/schema" | head -c 400   # routes JSON present
# Ownership guard: request a grocery list with a bogus id
curl -s -H "Authorization: Bearer $KEY" "$SITE/agent/grocery/items?listId=nonsense"   # 404 not_found envelope
```

- [ ] **Step 3: Commit**

```bash
git add convex/agent/routes.ts
git commit -m "feat(agent): full route table - goals, grocery, foodbank, workouts, routines, mealplans, reports"
```

---

### Task 5: CLI scaffold — config, dates, client, output (TDD)

**Files:**
- Create: `cli/package.json`, `cli/tsconfig.json`
- Create: `cli/src/dates.ts`, `cli/src/config.ts`, `cli/src/client.ts`, `cli/src/output.ts`
- Test: `cli/test/dates.test.ts`, `cli/test/config.test.ts`, `cli/test/output.test.ts`

**Interfaces:**
- Produces: `resolveDate(input: string): string`; `loadConfig(): { apiKey?: string; baseUrl: string }`, `saveConfig`, `deleteConfig`, `CONFIG_PATH`; `apiRequest(method, path, opts): Promise<unknown>` throwing `CliError { code, message, hint?, exitCode }`; `emit(data, { json?: boolean }): void`.
- The default base URL constant `DEFAULT_BASE_URL` is the **prod** convex.site URL derived from `.env.local`'s `NEXT_PUBLIC_CONVEX_URL` — check `npx convex deploy --help`/dashboard if `.env.local` holds the dev URL; fill the real prod URL at implementation time and note it in the commit message.

- [ ] **Step 1: Create `cli/package.json` and `cli/tsconfig.json`**:

```json
{
  "name": "fuel-cli",
  "version": "0.1.0",
  "private": true,
  "description": "Agent-first CLI for FuelLog",
  "type": "module",
  "bin": { "fuel": "./dist/index.js" },
  "scripts": {
    "build": "tsup src/index.ts --format esm --clean --banner.js '#!/usr/bin/env node'",
    "test": "vitest run",
    "smoke": "bash smoke.sh"
  },
  "dependencies": { "commander": "^12.1.0" },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsup": "^8.1.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

Run: `cd cli && npm install` — expect clean install.

- [ ] **Step 2: Write failing tests `cli/test/dates.test.ts`**:

```ts
import { describe, expect, it } from "vitest";
import { resolveDate } from "../src/dates";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("resolveDate", () => {
  it("passes through YYYY-MM-DD", () => {
    expect(resolveDate("2026-07-04")).toBe("2026-07-04");
  });
  it("resolves today (local time)", () => {
    expect(resolveDate("today")).toBe(iso(new Date()));
  });
  it("resolves yesterday", () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    expect(resolveDate("yesterday")).toBe(iso(y));
  });
  it("rejects garbage with a helpful error", () => {
    expect(() => resolveDate("July 4")).toThrow(/today, yesterday, or YYYY-MM-DD/);
  });
});
```

Run: `npx vitest run test/dates.test.ts` — expect FAIL (module not found).

- [ ] **Step 3: Implement `cli/src/dates.ts`**:

```ts
export function resolveDate(input: string): string {
  const lower = input.trim().toLowerCase();
  const base = new Date();
  if (lower === "today") return toIso(base);
  if (lower === "yesterday") {
    base.setDate(base.getDate() - 1);
    return toIso(base);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) return lower;
  throw new Error(`Invalid date '${input}'. Use today, yesterday, or YYYY-MM-DD.`);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
```

Run: `npx vitest run test/dates.test.ts` — expect 4 PASS.

- [ ] **Step 4: Write failing tests `cli/test/config.test.ts`** (config dir overridable for tests via `FUEL_CONFIG_DIR`):

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "fuel-test-"));
  process.env.FUEL_CONFIG_DIR = dir;
  delete process.env.FUEL_API_KEY;
  delete process.env.FUEL_BASE_URL;
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.FUEL_CONFIG_DIR;
});

describe("config", () => {
  it("round-trips saved config", async () => {
    const { saveConfig, loadConfig } = await import("../src/config");
    saveConfig({ apiKey: "fuel_sk_abc" });
    expect(loadConfig().apiKey).toBe("fuel_sk_abc");
  });
  it("env var beats file", async () => {
    const { saveConfig, loadConfig } = await import("../src/config");
    saveConfig({ apiKey: "fuel_sk_file" });
    process.env.FUEL_API_KEY = "fuel_sk_env";
    expect(loadConfig().apiKey).toBe("fuel_sk_env");
  });
  it("missing file yields no key and the default base url", async () => {
    const { loadConfig, DEFAULT_BASE_URL } = await import("../src/config");
    const cfg = loadConfig();
    expect(cfg.apiKey).toBeUndefined();
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL);
  });
});
```

Run: `npx vitest run test/config.test.ts` — expect FAIL.

- [ ] **Step 5: Implement `cli/src/config.ts`**:

```ts
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Prod convex.site URL. Derived from NEXT_PUBLIC_CONVEX_URL in ../.env.local
// (.convex.cloud -> .convex.site). FILL THE REAL VALUE AT IMPLEMENTATION TIME.
export const DEFAULT_BASE_URL = "https://REPLACE-WITH-PROD-DEPLOYMENT.convex.site";

function configDir(): string {
  return process.env.FUEL_CONFIG_DIR ?? join(homedir(), ".config", "fuel");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

export type CliConfig = { apiKey?: string; baseUrl: string };

export function loadConfig(): CliConfig {
  let fileCfg: { apiKey?: string; baseUrl?: string } = {};
  if (existsSync(configPath())) {
    try {
      fileCfg = JSON.parse(readFileSync(configPath(), "utf8"));
    } catch {
      // Corrupt config: ignore, env vars can still work.
    }
  }
  return {
    apiKey: process.env.FUEL_API_KEY ?? fileCfg.apiKey,
    baseUrl: process.env.FUEL_BASE_URL ?? fileCfg.baseUrl ?? DEFAULT_BASE_URL,
  };
}

export function saveConfig(cfg: { apiKey?: string; baseUrl?: string }): void {
  mkdirSync(configDir(), { recursive: true });
  const existing = existsSync(configPath()) ? JSON.parse(readFileSync(configPath(), "utf8")) : {};
  writeFileSync(configPath(), JSON.stringify({ ...existing, ...cfg }, null, 2) + "\n", { mode: 0o600 });
}

export function deleteConfig(): void {
  rmSync(configPath(), { force: true });
}
```

Run: `npx vitest run test/config.test.ts` — expect 3 PASS.

- [ ] **Step 6: Write failing tests `cli/test/output.test.ts`**:

```ts
import { describe, expect, it } from "vitest";
import { renderPretty } from "../src/output";

describe("renderPretty", () => {
  it("renders array of objects as aligned columns", () => {
    const out = renderPretty([
      { name: "rice", calories: 300 },
      { name: "chicken breast", calories: 220 },
    ]);
    expect(out).toContain("name");
    expect(out).toContain("chicken breast");
    expect(out.split("\n").length).toBeGreaterThanOrEqual(3); // header + 2 rows
  });
  it("renders plain object as key: value lines", () => {
    const out = renderPretty({ calories: 2400, protein: 180 });
    expect(out).toContain("calories: 2400");
  });
  it("renders scalars and null", () => {
    expect(renderPretty(null)).toBe("(none)");
    expect(renderPretty("done")).toBe("done");
  });
});
```

Run: `npx vitest run test/output.test.ts` — expect FAIL.

- [ ] **Step 7: Implement `cli/src/output.ts`**:

```ts
function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function renderPretty(data: unknown): string {
  if (data === null || data === undefined) return "(none)";
  if (Array.isArray(data)) {
    if (data.length === 0) return "(none)";
    if (typeof data[0] !== "object" || data[0] === null) return data.map(cell).join("\n");
    const rows = data as Record<string, unknown>[];
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => cell(r[c]).length)));
    const line = (vals: string[]) => vals.map((v, i) => v.padEnd(widths[i])).join("  ");
    return [line(cols), ...rows.map((r) => line(cols.map((c) => cell(r[c]))))].join("\n");
  }
  if (typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${cell(v)}`)
      .join("\n");
  }
  return String(data);
}

export function emit(data: unknown, opts: { json?: boolean } = {}): void {
  const machine = opts.json || !process.stdout.isTTY;
  process.stdout.write((machine ? JSON.stringify(data, null, 2) : renderPretty(data)) + "\n");
}
```

Run: `npx vitest run` — expect ALL PASS.

- [ ] **Step 8: Implement `cli/src/client.ts`** (exercised end-to-end by Task 6/7 against the dev deployment — no mocked HTTP tests):

```ts
import { loadConfig } from "./config";

export class CliError extends Error {
  constructor(
    public code: string,
    message: string,
    public hint: string | undefined,
    public exitCode: 1 | 2
  ) {
    super(message);
  }
}

type RequestOpts = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
};

export async function apiRequest(method: string, path: string, opts: RequestOpts = {}): Promise<unknown> {
  const { apiKey, baseUrl } = loadConfig();
  if (!apiKey) {
    throw new CliError(
      "no_key",
      "No API key configured.",
      "Run 'fuel auth login <key>' or set FUEL_API_KEY. Generate a key with: npx convex run agent/keys:generate",
      1
    );
  }
  const url = new URL(baseUrl.replace(/\/$/, "") + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }

  let response: Response;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  };
  try {
    response = await fetch(url, init);
  } catch {
    // One retry on network failure.
    try {
      response = await fetch(url, init);
    } catch (err) {
      throw new CliError("network", `Could not reach ${url.origin}: ${err instanceof Error ? err.message : err}`, "Check your connection and FUEL_BASE_URL.", 2);
    }
  }

  let payload: { ok?: boolean; data?: unknown; error?: { code?: string; message?: string; hint?: string } };
  try {
    payload = await response.json();
  } catch {
    throw new CliError("bad_response", `Server returned non-JSON (HTTP ${response.status})`, undefined, 2);
  }
  if (payload.ok) return payload.data;
  const err = payload.error ?? {};
  throw new CliError(
    err.code ?? "error",
    err.message ?? `HTTP ${response.status}`,
    err.hint,
    response.status >= 500 ? 2 : 1
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add cli
git commit -m "feat(cli): fuel scaffold - config, dates, client, output with tests"
```

---

### Task 6: Command table + registrar + entry point

**Files:**
- Create: `cli/src/commands.ts` (declarative table)
- Create: `cli/src/index.ts` (registrar + auth/schema commands)

**Interfaces:**
- Consumes: `apiRequest`, `CliError` (Task 5), `emit`, `resolveDate`, `saveConfig`/`deleteConfig`/`loadConfig`/`configPath`.
- Produces: the installed `fuel` binary. Option types: `str | num | bool | json | date`. `bool` options are value-less commander flags sent as `true`; `date` runs `resolveDate`.

- [ ] **Step 1: Create `cli/src/commands.ts`** — one row per command; `api` is the server arg name when it differs from the flag:

```ts
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
```

- [ ] **Step 2: Create `cli/src/index.ts`**:

```ts
import { Command } from "commander";
import { commands, type CommandSpec, type OptSpec } from "./commands";
import { apiRequest, CliError } from "./client";
import { emit } from "./output";
import { resolveDate } from "./dates";
import { configPath, deleteConfig, loadConfig, saveConfig } from "./config";

const program = new Command();
program
  .name("fuel")
  .description("Agent-first CLI for FuelLog. All output is JSON when piped; add --json to force it.")
  .option("--json", "Force JSON output")
  .version("0.1.0");

function coerceOpt(spec: OptSpec, raw: unknown): unknown {
  if (raw === undefined) return undefined;
  switch (spec.type) {
    case "num": {
      const n = Number(raw);
      if (Number.isNaN(n)) fatal("invalid_option", `Option ${spec.flag.split(" ")[0]} must be a number, got '${raw}'`, undefined, 1);
      return n;
    }
    case "bool":
      return true; // value-less flag
    case "json":
      try {
        return JSON.parse(String(raw));
      } catch {
        fatal("invalid_option", `Option ${spec.flag.split(" ")[0]} must be valid JSON`, `Example: '${spec.desc ?? "[...]"}'`, 1);
      }
      break;
    case "date":
      try {
        return resolveDate(String(raw));
      } catch (err) {
        fatal("invalid_option", err instanceof Error ? err.message : String(err), undefined, 1);
      }
      break;
    default:
      return raw;
  }
}

function fatal(code: string, message: string, hint: string | undefined, exitCode: number): never {
  const err = { ok: false, error: { code, message, ...(hint ? { hint } : {}) } };
  if (process.stderr.isTTY) {
    process.stderr.write(`error (${code}): ${message}\n${hint ? `hint: ${hint}\n` : ""}`);
  } else {
    process.stderr.write(JSON.stringify(err) + "\n");
  }
  process.exit(exitCode);
}

function register(spec: CommandSpec): void {
  const [noun, verb] = spec.name.split(" ");
  let parent = program.commands.find((c) => c.name() === noun);
  if (!parent) {
    parent = program.command(noun).description(`${noun} commands`);
  }
  const cmd = parent.command(verb).description(spec.desc);
  for (const opt of spec.opts) {
    const desc = opt.desc ?? "";
    if (opt.required) cmd.requiredOption(opt.flag, desc, opt.default);
    else cmd.option(opt.flag, desc, opt.default);
  }
  if (spec.confirm) cmd.option("--yes", "Confirm this destructive action");
  cmd.action(async (options: Record<string, unknown>) => {
    if (spec.confirm && !options.yes) {
      fatal("confirm_required", `'fuel ${spec.name}' is destructive.`, `Re-run with --yes to confirm.`, 1);
    }
    const payload: Record<string, unknown> = {};
    for (const opt of spec.opts) {
      // commander camelCases flags: "--date <date>" -> options.date
      const flagName = opt.flag.split(" ")[0].replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = coerceOpt(opt, options[flagName]);
      if (value !== undefined) payload[opt.api] = value;
    }
    try {
      const data =
        spec.method === "GET" || spec.method === "DELETE"
          ? await apiRequest(spec.method, spec.path, { query: payload })
          : await apiRequest(spec.method, spec.path, { body: payload });
      emit(data, { json: Boolean(program.opts().json) });
    } catch (err) {
      if (err instanceof CliError) fatal(err.code, err.message, err.hint, err.exitCode);
      throw err;
    }
  });
}

for (const spec of commands) register(spec);

// ---- auth ----
const auth = program.command("auth").description("Manage the API key");
auth
  .command("login <key>")
  .description("Save the API key to " + configPath())
  .action(async (key: string) => {
    saveConfig({ apiKey: key });
    try {
      const data = await apiRequest("GET", "/agent/ping");
      emit({ saved: true, ...(data as object) }, { json: Boolean(program.opts().json) });
    } catch (err) {
      deleteConfig();
      if (err instanceof CliError) fatal(err.code, `Key rejected: ${err.message}`, err.hint, err.exitCode);
      throw err;
    }
  });
auth
  .command("status")
  .description("Verify the configured key")
  .action(async () => {
    try {
      const data = await apiRequest("GET", "/agent/ping");
      emit({ authenticated: true, baseUrl: loadConfig().baseUrl, ...(data as object) }, { json: Boolean(program.opts().json) });
    } catch (err) {
      if (err instanceof CliError) fatal(err.code, err.message, err.hint, err.exitCode);
      throw err;
    }
  });
auth
  .command("logout")
  .description("Delete the stored key")
  .action(() => {
    deleteConfig();
    emit({ loggedOut: true }, { json: Boolean(program.opts().json) });
  });

// ---- schema ----
program
  .command("schema")
  .description("Full machine-readable API surface (teach an agent everything in one call)")
  .action(async () => {
    try {
      const data = await apiRequest("GET", "/agent/schema");
      emit(data, { json: true });
    } catch (err) {
      if (err instanceof CliError) fatal(err.code, err.message, err.hint, err.exitCode);
      throw err;
    }
  });

program.parseAsync(process.argv);
```

- [ ] **Step 3: Build and verify against the dev deployment**

```bash
cd /Users/itwelaibomu/Desktop/Code/fuellog/cli
npm run build            # expect dist/index.js with shebang
npm link                 # installs global 'fuel'
export FUEL_BASE_URL=$SITE   # dev site URL from Task 3
fuel auth login $KEY         # expect {"saved":true,"userId":"smoke-test-user","app":"fuellog"}
fuel meals add --name "plan rice" --type lunch --calories 300   # ok, returns id
fuel meals list | head -5    # JSON array containing "plan rice" (piped => JSON)
fuel meals delete --id <id-from-add>          # exit 1: confirm_required with hint
fuel meals delete --id <id-from-add> --yes    # ok
fuel meals list --date "July 4"; echo "exit=$?"   # error invalid_option ... exit=1
fuel schema | head -20       # routes JSON
```

- [ ] **Step 4: Run unit tests, then commit**

```bash
npm test    # all pass
git add cli
git commit -m "feat(cli): full fuel command surface - table-driven registrar + auth + schema"
```

---

### Task 7: Smoke test + agent README

**Files:**
- Create: `cli/smoke.sh`
- Create: `cli/README.md`

**Interfaces:**
- Consumes: the installed `fuel` binary; dev deployment; `FUEL_BASE_URL`/`FUEL_API_KEY` env.

- [ ] **Step 1: Create `cli/smoke.sh`** — full lifecycle per resource group against dev; fails fast; cleans up:

```bash
#!/usr/bin/env bash
# Smoke test: full create->read->update->delete lifecycle for every resource group.
# Usage: FUEL_BASE_URL=<dev .convex.site> FUEL_API_KEY=<key> bash smoke.sh
set -euo pipefail

fail() { echo "SMOKE FAIL: $1" >&2; exit 1; }
need() { command -v "$1" >/dev/null || fail "$1 not installed"; }
need fuel; need jq
[ -n "${FUEL_BASE_URL:-}" ] || fail "set FUEL_BASE_URL to the dev .convex.site URL"
[ -n "${FUEL_API_KEY:-}" ] || fail "set FUEL_API_KEY"

echo "== auth =="
fuel auth status | jq -e '.authenticated' >/dev/null || fail "auth status"

# Fixed date: server buckets civil days in UTC, so "today" is ambiguous near midnight.
SMOKE_DATE="2026-01-15"

echo "== meals =="
fuel meals add --name "smoke meal" --type lunch --calories 111 --date "$SMOKE_DATE" >/dev/null
MEAL_ID=$(fuel meals list --date "$SMOKE_DATE" | jq -r '.[] | select(.name=="smoke meal") | ._id' | head -1)
[ -n "$MEAL_ID" ] || fail "meal not found after add"
fuel meals update --id "$MEAL_ID" --name "smoke meal v2" --type dinner >/dev/null
fuel meals list --date "$SMOKE_DATE" | jq -e '.[] | select(.name=="smoke meal v2")' >/dev/null || fail "meal update"
fuel meals delete --id "$MEAL_ID" --yes >/dev/null
fuel meals list --date "$SMOKE_DATE" | jq -e "[.[] | select(._id==\"$MEAL_ID\")] | length == 0" >/dev/null || fail "meal delete"

echo "== hydration =="
fuel hydration log --oz 12 --date "$SMOKE_DATE" >/dev/null
HYD_ID=$(fuel hydration list --date "$SMOKE_DATE" | jq -r '.[0]._id')
fuel hydration delete --id "$HYD_ID" --yes >/dev/null

echo "== goals =="
fuel goals set --calories 2400 --protein 180 --carbs 250 --fat 80 >/dev/null
fuel goals show | jq -e '.calories == 2400' >/dev/null || fail "goals"

echo "== grocery =="
LIST_ID=$(fuel grocery create-list --name "smoke list" | jq -r '.')
fuel grocery add --list "$LIST_ID" --items '[{"name":"smoke eggs","quantity":"12"}]' >/dev/null
ITEM_ID=$(fuel grocery items --list "$LIST_ID" | jq -r '.[0]._id')
fuel grocery toggle --id "$ITEM_ID" --checked true >/dev/null
fuel grocery items --list "$LIST_ID" | jq -e '.[0].checked == true' >/dev/null || fail "grocery toggle"
fuel grocery update-item --id "$ITEM_ID" --quantity "6" >/dev/null
fuel grocery delete-item --id "$ITEM_ID" --yes >/dev/null
fuel grocery archive --id "$LIST_ID" --yes >/dev/null

echo "== foodbank =="
fuel foodbank upsert --name "smoke food" --calories 99 >/dev/null
FOOD_ID=$(fuel foodbank search --query "smoke food" | jq -r '.[0]._id')
fuel foodbank update --id "$FOOD_ID" --name "smoke food" --calories 100 >/dev/null
fuel foodbank delete --id "$FOOD_ID" --yes >/dev/null

echo "== workouts =="
EX_ID=$(fuel exercises add --name "smoke press" --muscle chest --sets 3 | jq -r '.')
SESSION_ID=$(fuel workouts start --name "smoke session" --exercises "[\"$EX_ID\"]" | jq -r '.')
SE_ID=$(fuel workouts exercises --session "$SESSION_ID" | jq -r '.[0]._id')
fuel workouts set --id "$SE_ID" --index 0 --reps 10 --weight "135" --done >/dev/null
fuel workouts complete --id "$SESSION_ID" >/dev/null
# getSessions has no date filter, so this is midnight-safe:
fuel workouts list | jq -e '.[] | select(.name=="smoke session") | .completedAt != null' >/dev/null || fail "workout complete"

echo "== routines =="
ROUTINE_ID=$(fuel routines create --name "smoke routine" --exercises "[\"$EX_ID\"]" | jq -r '.')
fuel routines update --id "$ROUTINE_ID" --name "smoke routine v2" >/dev/null
fuel routines delete --id "$ROUTINE_ID" --yes >/dev/null
fuel exercises delete --id "$EX_ID" --yes >/dev/null

echo "== mealplans =="
PLAN_ID=$(fuel mealplans create --name "smoke plan" | jq -r '.')
fuel mealplans add-item --plan "$PLAN_ID" --name "smoke oats" --type breakfast --calories 350 >/dev/null
PLAN_ITEM_ID=$(fuel mealplans items --plan "$PLAN_ID" | jq -r '.[0]._id')
fuel mealplans update-item --id "$PLAN_ITEM_ID" --calories 400 >/dev/null
fuel mealplans rename --id "$PLAN_ID" --name "smoke plan v2" >/dev/null
fuel mealplans delete --id "$PLAN_ID" --yes >/dev/null

echo "== reports & schema =="
MONDAY=$(date -v-mon +%Y-%m-%d 2>/dev/null || date -d "last monday" +%Y-%m-%d)
fuel reports week --start "$MONDAY" | jq -e 'has("meals")' >/dev/null || fail "reports"
fuel ai-usage show | jq -e 'has("total")' >/dev/null || fail "ai-usage"
fuel schema | jq -e '.routes | length > 40' >/dev/null || fail "schema"

echo "SMOKE PASS"
```

- [ ] **Step 2: Run it**

```bash
chmod +x cli/smoke.sh
FUEL_BASE_URL=$SITE FUEL_API_KEY=$KEY bash cli/smoke.sh
```
Expected: every section prints, ends `SMOKE PASS`. Fix anything that fails before proceeding (that's the point of the script).

- [ ] **Step 3: Write `cli/README.md`** — written for an agent reader:

```markdown
# fuel — FuelLog CLI

Agent-first CLI for FuelLog (meals, hydration, goals, grocery, foodbank, workouts, routines, meal plans).

## Setup
1. Get an API key: `npx convex run agent/keys:generate '{"userId":"<userId>","name":"cli"}'` (in the fuellog repo, `--prod` for production).
2. `fuel auth login <key>` (stored in ~/.config/fuel/config.json). Or set `FUEL_API_KEY`.
3. `FUEL_BASE_URL` overrides the target deployment (defaults to prod).

## For agents
- Run `fuel schema` once — it returns every route, param, type, and enum as JSON.
- Output is JSON whenever stdout is piped. Exit codes: 0 ok, 1 your mistake (read error.hint), 2 server/network.
- Destructive commands need `--yes`. Nothing ever prompts.
- Dates accept `today`, `yesterday`, or `YYYY-MM-DD`.

## Examples
    fuel meals add --name "chicken and rice" --type lunch --calories 650 --protein 45
    fuel meals list --date yesterday
    fuel hydration log --oz 16
    fuel goals show
    fuel grocery create-list --name "Week 28"
    fuel workouts start --name "push day" --exercises '["<exerciseId>"]'

## Dev loop
    npm run build && npm link   # rebuild global binary
    npm test                    # unit tests
    FUEL_BASE_URL=<dev site> FUEL_API_KEY=<key> npm run smoke
```

- [ ] **Step 4: Commit**

```bash
git add cli/smoke.sh cli/README.md
git commit -m "test(cli): full-lifecycle smoke script + agent-oriented README"
```

---

### Task 8: Production wiring

**Files:** none new — deploy + configure.

- [ ] **Step 1: Deploy backend to prod**

```bash
cd /Users/itwelaibomu/Desktop/Code/fuellog
npx convex deploy -y
```
Expected: deploy succeeds; note the prod URL printed.

- [ ] **Step 2: Confirm `DEFAULT_BASE_URL` in `cli/src/config.ts` matches the prod `.convex.site` URL** (fix, rebuild, re-link if not).

- [ ] **Step 3: Find the real userId and mint the real key**

Find Itwela's userId (the string existing app data uses):
```bash
npx convex run --prod meals:getLoggedDatesInMonth '{"userId":"<candidate>","year":2026,"month":7}' 
```
If the userId is unknown, inspect prod data first: `npx convex data meal_logs --prod --limit 1` and read the `userId` field. Then:
```bash
npx convex run --prod agent/keys:generate '{"userId":"<real userId>","name":"itwela-cli"}'
fuel auth login <printed key>     # no FUEL_BASE_URL set => prod
```
Expected: `{"saved":true,"userId":"<real userId>","app":"fuellog"}`.

- [ ] **Step 4: End-to-end prod verification (read-only + reversible)**

```bash
fuel meals list --date today
fuel goals show
fuel hydration log --oz 1 && fuel hydration list   # then delete the 1oz test row with --yes
```
Expected: real data comes back; test row cleans up.

- [ ] **Step 5: Push the repo**

```bash
git push origin main
```

- [ ] **Step 6: Update vault Project State** — add `fuel` CLI to `Claude 🟡/Project State.md` (what it is, where keys live, smoke command), commit vault.

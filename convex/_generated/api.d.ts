/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent_auth from "../agent/auth.js";
import type * as agent_guard from "../agent/guard.js";
import type * as agent_keys from "../agent/keys.js";
import type * as agent_routes from "../agent/routes.js";
import type * as aiUsage from "../aiUsage.js";
import type * as fileStorage from "../fileStorage.js";
import type * as foodbank from "../foodbank.js";
import type * as goals from "../goals.js";
import type * as grocery from "../grocery.js";
import type * as groceryActions from "../groceryActions.js";
import type * as http from "../http.js";
import type * as hydration from "../hydration.js";
import type * as lib_ai from "../lib/ai.js";
import type * as mealActions from "../mealActions.js";
import type * as mealplans from "../mealplans.js";
import type * as meals from "../meals.js";
import type * as migrations from "../migrations.js";
import type * as reports from "../reports.js";
import type * as weight from "../weight.js";
import type * as workout from "../workout.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agent/auth": typeof agent_auth;
  "agent/guard": typeof agent_guard;
  "agent/keys": typeof agent_keys;
  "agent/routes": typeof agent_routes;
  aiUsage: typeof aiUsage;
  fileStorage: typeof fileStorage;
  foodbank: typeof foodbank;
  goals: typeof goals;
  grocery: typeof grocery;
  groceryActions: typeof groceryActions;
  http: typeof http;
  hydration: typeof hydration;
  "lib/ai": typeof lib_ai;
  mealActions: typeof mealActions;
  mealplans: typeof mealplans;
  meals: typeof meals;
  migrations: typeof migrations;
  reports: typeof reports;
  weight: typeof weight;
  workout: typeof workout;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

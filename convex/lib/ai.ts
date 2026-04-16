"use node";

const BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Default free multimodal models (text + image on OpenRouter). Different providers to reduce single-provider 429s.
 * Parse uses one order; estimate uses another so the “big parse” and per-item enrichments don’t hit the same model first.
 */
const DEFAULT_PARSE_MODELS = [
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-3-12b-it:free",
] as const;

const DEFAULT_ESTIMATE_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-3-12b-it:free",
] as const;

function splitModelList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Shared list for all calls — OPENROUTER_MODELS=a,b,c */
function sharedModelChain(): string[] | null {
  const list = splitModelList(process.env.OPENROUTER_MODELS);
  return list.length > 0 ? list : null;
}

function mergeLegacyFirst(defaults: readonly string[]): string[] {
  const legacy = process.env.OPENROUTER_MODEL?.trim();
  if (!legacy) return [...defaults];
  const rest = defaults.filter((m) => m !== legacy);
  return [legacy, ...rest];
}

function parseModelChain(): string[] {
  const specific = splitModelList(process.env.OPENROUTER_MODELS_PARSE);
  if (specific.length > 0) return specific;
  const shared = sharedModelChain();
  if (shared) return shared;
  return mergeLegacyFirst(DEFAULT_PARSE_MODELS);
}

function estimateModelChain(): string[] {
  const specific = splitModelList(process.env.OPENROUTER_MODELS_ESTIMATE);
  if (specific.length > 0) return specific;
  const shared = sharedModelChain();
  if (shared) return shared;
  return mergeLegacyFirst(DEFAULT_ESTIMATE_MODELS);
}

/** Vision defaults to the estimate chain (same multimodal models). */
function visionModelChain(): string[] {
  const specific = splitModelList(process.env.OPENROUTER_MODELS_VISION);
  if (specific.length > 0) return specific;
  return estimateModelChain();
}

type OpenRouterChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function shouldTryNextOpenRouterModel(status: number): boolean {
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  if (status === 408 || status === 413) return true;
  // Wrong/bad request for this provider — another model id may work
  if (status === 400) return true;
  return false;
}

/**
 * Tries OpenRouter chat completions with each model until one succeeds.
 * Stops immediately on 401/403 (bad key).
 */
async function chatCompletionsWithModelFallback(
  body: Record<string, unknown>,
  models: string[],
  logTag: string
): Promise<{ data: OpenRouterChatResponse; modelUsed: string }> {
  if (models.length === 0) {
    throw new Error(`[${logTag}] No OpenRouter models configured. Set OPENROUTER_MODELS_PARSE / OPENROUTER_MODELS_ESTIMATE or OPENROUTER_MODELS.`);
  }
  let lastStatus = 0;
  let lastText = "";
  for (const model of models) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({ ...body, model }),
    });
    const text = await res.text();
    lastStatus = res.status;
    lastText = text;
    if (res.ok) {
      try {
        const data = JSON.parse(text) as OpenRouterChatResponse;
        console.log(`[${logTag}] ok model=${model}`);
        return { data, modelUsed: model };
      } catch {
        console.warn(`[${logTag}] invalid JSON from model=${model}`);
        continue;
      }
    }
    console.warn(`[${logTag}] HTTP ${res.status} model=${model}`, text.slice(0, 320));
    if (res.status === 401 || res.status === 403) {
      throw new Error(`[${logTag}] OpenRouter auth failed (${res.status}): ${text.slice(0, 400)}`);
    }
    if (!shouldTryNextOpenRouterModel(res.status)) {
      break;
    }
  }
  throw new Error(`[${logTag}] OpenRouter failed after ${models.length} model(s), last=${lastStatus}: ${lastText.slice(0, 600)}`);
}

/** OpenRouter attribution — set in Convex: `npx convex env set OPENROUTER_HTTP_REFERER https://...` */
function openRouterHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "https://fuellog.app",
  };
  const title = process.env.OPENROUTER_APP_TITLE?.trim();
  if (title) {
    headers["X-Title"] = title;
  }
  return headers;
}

interface MacroEstimate {
  name: string;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  sugar: number | null;
}

/** Coerce model output to a finite number; reject placeholders and junk strings. */
function coerceMacroNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (
      t === "" ||
      t === "?" ||
      t === "null" ||
      t === "unknown" ||
      t === "n/a" ||
      t === "na" ||
      t.includes("estimate")
    ) {
      return null;
    }
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function estimateMacrosFromText(
  foodDescription: string,
  knownValues: Partial<MacroEstimate>
): Promise<MacroEstimate> {
  const known = Object.entries(knownValues)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const safeName = foodDescription.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const prompt = `You are a nutrition expert. Give your best reasonable estimate for ONE typical serving of: "${safeName}".
${known ? `Already known (keep these mentally consistent; only fill gaps): ${known}.` : ""}

Rules:
- Output plain integers only for every numeric field (no decimals required for calories; grams can be one decimal or rounded).
- Never use null, "?", "unknown", or words — always guess numbers like a food-label estimate.
- "calories" is kcal for that serving. protein, fat, carbs, fiber, sugar are grams.

Respond with a single JSON object only, no markdown:
{"name":"${safeName}","calories":350,"protein":25,"fat":12,"carbs":30,"fiber":4,"sugar":8}`;

  const models = estimateModelChain();
  const { data } = await chatCompletionsWithModelFallback(
    {
      messages: [
        {
          role: "system",
          content:
            "You are a nutrition expert. Reply with one JSON object only — no markdown, no code fences, no explanation. Every nutrition field must be a numeric estimate, never null.",
        },
        { role: "user", content: prompt },
      ],
    },
    models,
    "estimateMacrosFromText"
  );

  const raw: string = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = (extractJSON(raw) ?? {}) as Record<string, unknown>;

  const est: MacroEstimate = {
    name: (typeof parsed.name === "string" ? parsed.name : null) ?? foodDescription,
    calories: coerceMacroNumber(parsed.calories),
    protein: coerceMacroNumber(parsed.protein),
    fat: coerceMacroNumber(parsed.fat),
    carbs: coerceMacroNumber(parsed.carbs),
    fiber: coerceMacroNumber(parsed.fiber),
    sugar: coerceMacroNumber(parsed.sugar),
  };

  // Prefer values already supplied by the user / parse; fill gaps from the model.
  return {
    name: est.name || foodDescription,
    calories: knownValues.calories ?? est.calories,
    protein: knownValues.protein ?? est.protein,
    fat: knownValues.fat ?? est.fat,
    carbs: knownValues.carbs ?? est.carbs,
    fiber: knownValues.fiber ?? est.fiber,
    sugar: knownValues.sugar ?? est.sugar,
  };
}

export interface ParsedMeal {
  name: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  sugar: number | null;
}

function extractJSON(raw: string): unknown {
  // Try direct parse first
  try { return JSON.parse(raw); } catch {}
  // Find the first {...} block and parse that
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

function fallbackFromLines(text: string): ParsedMeal[] {
  return text
    .split(/[\n,]+/)
    .map((l) => l.replace(/^[-•*\d.]+\s*/, "").trim())
    .filter((l) => l.length > 1)
    .map((name) => ({
      name,
      mealType: "snack" as const,
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
      fiber: null,
      sugar: null,
    }));
}

function normalizeParsedMeal(m: ParsedMeal, validTypes: Set<string>): ParsedMeal {
  return {
    name: typeof m.name === "string" && m.name.trim() ? m.name.trim() : "Unknown",
    mealType: (validTypes.has(m.mealType) ? m.mealType : "snack") as ParsedMeal["mealType"],
    calories: coerceMacroNumber(m.calories),
    protein: coerceMacroNumber(m.protein),
    fat: coerceMacroNumber(m.fat),
    carbs: coerceMacroNumber(m.carbs),
    fiber: coerceMacroNumber(m.fiber),
    sugar: coerceMacroNumber(m.sugar),
  };
}

function mealNeedsMacroFill(m: ParsedMeal): boolean {
  return (
    m.calories === null ||
    m.protein === null ||
    m.fat === null ||
    m.carbs === null
  );
}

/**
 * Fill missing macros after parse. Runs in parallel by default (much faster than sequential + stagger).
 * Set OPENROUTER_ENRICH_SEQUENTIAL=1 to force one-at-a-time if you hit rate limits.
 */
async function enrichMealsAfterParse(meals: ParsedMeal[]): Promise<ParsedMeal[]> {
  if (process.env.OPENROUTER_ENRICH_SEQUENTIAL === "1") {
    const out: ParsedMeal[] = [];
    for (const m of meals) {
      out.push(await enrichMealMacrosIfNeeded(m));
    }
    return out;
  }
  return Promise.all(meals.map((m) => enrichMealMacrosIfNeeded(m)));
}

async function enrichMealMacrosIfNeeded(m: ParsedMeal): Promise<ParsedMeal> {
  if (!mealNeedsMacroFill(m)) return m;
  try {
    const est = await estimateMacrosFromText(m.name, {
      ...(m.calories != null ? { calories: m.calories } : {}),
      ...(m.protein != null ? { protein: m.protein } : {}),
      ...(m.fat != null ? { fat: m.fat } : {}),
      ...(m.carbs != null ? { carbs: m.carbs } : {}),
      ...(m.fiber != null ? { fiber: m.fiber } : {}),
      ...(m.sugar != null ? { sugar: m.sugar } : {}),
    });
    return {
      ...m,
      calories: m.calories ?? est.calories,
      protein: m.protein ?? est.protein,
      fat: m.fat ?? est.fat,
      carbs: m.carbs ?? est.carbs,
      fiber: m.fiber ?? est.fiber,
      sugar: m.sugar ?? est.sugar,
    };
  } catch {
    return m;
  }
}

export async function parseMealsFromText(text: string, logDate?: string): Promise<ParsedMeal[]> {
  const dateContext = logDate
    ? `Context: these foods were eaten on ${new Date(logDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.`
    : "";

  const prompt = `You are a calorie tracking assistant. The user is logging what they ate. ${dateContext}

RULES:
- Every distinct food item, drink, or snack = ONE separate entry in the array. Never collapse multiple items into one.
- A simple list like "Orange chicken\\nCesar salad\\nTakis\\nMango Arizona" = 4 separate entries.
- Only combine with "and"/"with" when it's clearly one dish (e.g. "chicken and rice bowl" = one entry).
- For EACH entry you MUST estimate nutrition for one typical restaurant or home serving. Use plain numbers only (integers or one decimal for grams).
- Never use null, "?", "unknown", or placeholders for calories, protein, fat, carbs, fiber, or sugar — always guess realistic values.
- Infer mealType from context (time words, order, item type). Default to "snack".

Return ONLY a JSON object with key "meals" (array). Example shape:
{"meals":[{"name":"Orange Chicken","mealType":"lunch","calories":490,"protein":22,"fat":18,"carbs":58,"fiber":2,"sugar":14}]}

User input:
${text}`;

  const parseModels = parseModelChain();
  console.log(
    "[parseMealsFromText] OpenRouter parse chain:",
    parseModels.join(" → "),
    "key present:",
    !!process.env.OPENROUTER_API_KEY
  );

  let data: OpenRouterChatResponse;
  try {
    ({ data } = await chatCompletionsWithModelFallback(
      {
        messages: [
          {
            role: "system",
            content:
              "You are a calorie tracking assistant. Reply with one JSON object only — no markdown, no code fences. Every meal must include numeric estimates for calories and macros; never null or question marks.",
          },
          { role: "user", content: prompt },
        ],
      },
      parseModels,
      "parseMealsFromText"
    ));
  } catch (e) {
    console.error("[parseMealsFromText] all parse models failed:", e);
    const lines = fallbackFromLines(text);
    return enrichMealsAfterParse(lines);
  }

  const raw: string = data.choices?.[0]?.message?.content ?? "";
  if (raw.length > 0) {
    console.log("[parseMealsFromText] content length:", raw.length, "preview:", raw.slice(0, 160));
  }

  const parsed = extractJSON(raw);
  const rawMeals: ParsedMeal[] = (parsed && typeof parsed === "object" && "meals" in (parsed as object))
    ? ((parsed as { meals: ParsedMeal[] }).meals ?? [])
    : [];

  const validTypes = new Set(["breakfast", "lunch", "dinner", "snack"]);

  // If the model returned nothing useful, fall back to splitting by lines
  if (rawMeals.length === 0) {
    const lines = fallbackFromLines(text);
    return enrichMealsAfterParse(lines);
  }

  const meals = rawMeals.map((m) => normalizeParsedMeal(m, validTypes));
  return enrichMealsAfterParse(meals);
}

export interface ParsedGroceryItem {
  name: string;
  quantity?: string | null;
  unit?: string | null;
}

function normalizeParsedGroceryItem(m: unknown): ParsedGroceryItem | null {
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  let quantity: string | undefined;
  if (typeof o.quantity === "string" && o.quantity.trim()) quantity = o.quantity.trim();
  else if (typeof o.quantity === "number" && Number.isFinite(o.quantity)) quantity = String(o.quantity);
  let unit: string | undefined;
  if (typeof o.unit === "string" && o.unit.trim()) unit = o.unit.trim();
  return { name, quantity: quantity ?? null, unit: unit ?? null };
}

/** Split free text into rough line items when the model fails (no AI enrichment). */
function fallbackGroceryFromLines(text: string): ParsedGroceryItem[] {
  return text
    .split(/[\n;]+/)
    .map((l) => l.replace(/^[-•*\t]+/, "").trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      const m = line.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)?\s+(.+)$/i);
      if (m) {
        return { name: m[2].trim(), quantity: m[1], unit: null };
      }
      const m2 = line.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+)$/);
      if (m2 && m2[2].length <= 6) {
        return { name: m2[3].trim(), quantity: m2[1], unit: m2[2] };
      }
      return { name: line, quantity: null, unit: null };
    })
    .filter((x) => x.name.length > 0);
}

export async function parseGroceryListFromText(text: string): Promise<ParsedGroceryItem[]> {
  const prompt = `You are a grocery list assistant. The user will paste or type a shopping list in any format: bullet list, recipe ingredients, paragraph, voice transcript, or mixed.

RULES:
- Each DISTINCT product to buy = one object in the "items" array. Do not merge unrelated products.
- "name" is the product name only, concise (e.g. "whole milk", "chicken thighs boneless").
- If the user specified an amount, put the numeric or text amount in "quantity" (e.g. "2", "1.5", "dozen", "half") and the unit in "unit" when clear (e.g. "lb", "oz", "gallon", "cartons"). If it's one combined phrase like "2 lbs", use quantity "2" and unit "lbs".
- Omit "quantity" and "unit" or use null if not specified.
- No duplicate entries unless the user clearly listed the same item twice.

Return ONLY valid JSON, no markdown:
{"items":[{"name":"bananas","quantity":"6","unit":null},{"name":"oat milk","quantity":"1","unit":"gallon"}]}

User input:
${text}`;

  const parseModels = parseModelChain();
  console.log(
    "[parseGroceryListFromText] OpenRouter parse chain:",
    parseModels.join(" → "),
    "key present:",
    !!process.env.OPENROUTER_API_KEY
  );

  let data: OpenRouterChatResponse;
  try {
    ({ data } = await chatCompletionsWithModelFallback(
      {
        messages: [
          {
            role: "system",
            content:
              'You are a grocery list parser. Reply with one JSON object only — no markdown, no code fences. Shape: {"items":[{"name":string,"quantity":string|null,"unit":string|null}]}',
          },
          { role: "user", content: prompt },
        ],
      },
      parseModels,
      "parseGroceryListFromText"
    ));
  } catch (e) {
    console.error("[parseGroceryListFromText] all parse models failed:", e);
    return fallbackGroceryFromLines(text);
  }

  const raw: string = data.choices?.[0]?.message?.content ?? "";
  if (raw.length > 0) {
    console.log("[parseGroceryListFromText] content length:", raw.length, "preview:", raw.slice(0, 160));
  }

  const parsed = extractJSON(raw);
  const rawItems: unknown[] = (parsed && typeof parsed === "object" && "items" in (parsed as object))
    ? ((parsed as { items: unknown[] }).items ?? [])
    : [];

  const items = rawItems.map(normalizeParsedGroceryItem).filter((x): x is ParsedGroceryItem => x !== null);
  if (items.length === 0) {
    return fallbackGroceryFromLines(text);
  }
  return items;
}

export async function estimateMacrosFromImage(
  imageBase64: string,
  mimeType: string
): Promise<MacroEstimate> {
  const prompt = `You are a nutrition expert analyzing a photo of food. Identify what food is shown and estimate its nutritional content for a typical serving size.

Respond ONLY with valid JSON in this exact format, no explanation:
{
  "name": "<food name>",
  "calories": <number>,
  "protein": <number in grams>,
  "fat": <number in grams>,
  "carbs": <number in grams>,
  "fiber": <number in grams>,
  "sugar": <number in grams>
}`;

  const visionModels = visionModelChain();
  const { data } = await chatCompletionsWithModelFallback(
    {
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    },
    visionModels,
    "estimateMacrosFromImage"
  );

  const raw: string = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = ((extractJSON(raw) ?? {}) as Record<string, unknown>);

  return {
    name: (parsed.name as string) ?? "Unknown food",
    calories: coerceMacroNumber(parsed.calories),
    protein: coerceMacroNumber(parsed.protein),
    fat: coerceMacroNumber(parsed.fat),
    carbs: coerceMacroNumber(parsed.carbs),
    fiber: coerceMacroNumber(parsed.fiber),
    sugar: coerceMacroNumber(parsed.sugar),
  };
}

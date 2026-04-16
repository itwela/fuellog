# FuelLog

Personal nutrition tracker. Log meals, track macros, and build a food bank of your go-to foods — all powered by AI.

## Features

- **AI meal parsing** — paste text or speak a meal description, AI extracts individual foods with macros
- **Food bank** — auto-saves foods you've logged, searchable, reusable
- **Serving multiplier** — scale any meal's macros with − N + controls, apply to save
- **Date navigation** — week strip + month calendar, browse any day's log
- **Daily macro goals** — progress bars for calories, protein, carbs, fat
- **Desktop sidebar** — calorie ring overview at a glance

## Stack

- **Next.js** (App Router)
- **Convex** (real-time database + backend functions)
- **OpenRouter** (free AI models for meal parsing)

## Setup

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in your keys:
   - Convex: `npx convex dev` will generate your deployment URL
   - OpenRouter: get a free API key at [openrouter.ai](https://openrouter.ai)

4. Run Convex and Next.js in separate terminals:
   ```bash
   npx convex dev
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required variables.

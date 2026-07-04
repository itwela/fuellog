# fuel — FuelLog CLI

Agent-first CLI for FuelLog (meals, hydration, goals, grocery, foodbank, workouts, routines, meal plans).

## Setup
1. Get an API key: `npx convex run agent/keys:generate '{"userId":"<userId>","name":"cli"}'` (in the fuellog repo, add `--prod` for production).
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

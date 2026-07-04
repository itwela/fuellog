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

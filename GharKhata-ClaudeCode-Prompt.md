# GharKhata — Build Prompt for Claude Code

You are building a production-quality PWA. Read this whole file before writing any code. Build the full app, then verify it runs.

---

## What this is

A shared expense + home-budget app for **two people living together** (a couple in a rented flat). It tracks who spent what, who owes whom, monthly budgets, recurring bills, and shows visual insights. Mobile-first, installable as a PWA, real-time synced across both phones.

This is NOT a generic Splitwise clone. It's a calm, minimal "operating system for a shared home." Two users only. No social features, no groups, no ads.

---

## Stack (non-negotiable)

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS (utility-first, no component library)
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Charts:** Recharts
- **Routing:** React Router
- **Deploy target:** Vercel (build must pass `npm run build`)
- **PWA:** vite-plugin-pwa, installable, works offline-read

Do not add other heavy dependencies without need. Keep `package.json` lean.

---

## Database schema (Supabase / Postgres)

Generate a single `supabase/schema.sql` file I can paste into the Supabase SQL editor. Include Row Level Security so both users in the same household see shared data.

```
households        id, name, created_at
profiles          id (= auth.uid), household_id, display_name, color, created_at
categories        id, household_id, name, icon, type (fixed|variable|irregular), monthly_budget, sort_order, is_default
expenses          id, household_id, amount, category_id, paid_by (profile id),
                  split_type (equal|custom|mine|theirs), split_ratio (0-100, payer's share),
                  note, spent_on (date), created_at
recurring         id, household_id, name, amount, category_id, due_type (fixed_date|cycle),
                  due_day (1-31, for fixed_date), cycle_days (for cycle), last_paid_on, active
settlements       id, household_id, amount, from_profile, to_profile, settled_on, created_at
```

RLS rule: a row is visible/editable if its `household_id` matches the `household_id` on the requesting user's `profiles` row. Write the policies.

Do NOT seed any amounts or budgets. Start everything empty. The only seed is the default category LIST (names + icons + type), inserted during onboarding — with `monthly_budget` left NULL so the user sets them.

**Default categories to offer at onboarding** (user can edit/delete/add):
- Fixed: Rent, Furlenco/Rentals, WiFi, Electricity, Gas cylinder, Subscriptions
- Variable: Groceries, Vegetables & fruits, Dairy, Eating out, Ordering in, Transport, Household supplies, Personal care, Medical/Pharmacy, Phone recharge
- Irregular: Home setup, Repairs, Gifts & occasions, Travel, Clothing, Emergency

---

## Onboarding flow (first run — no pre-filled numbers)

A clean wizard, one question per screen:
1. **Create household** → household name (e.g. "Our Flat").
2. **Your name + color** → text + pick an accent dot.
3. **Invite partner** → generate a 6-char join code OR send Supabase magic-link email. Partner enters code → joins same household. Keep this simple but working.
4. **Pick categories** → show the default list as toggleable chips, all on by default, "add custom" allowed. Budgets left blank.
5. **Set budgets (optional, skippable)** → list chosen categories, each with an empty ₹ input. "Skip for now" is prominent.
6. Done → land on empty Dashboard with a friendly empty state.

Every screen must work with zero data. Empty states give direction, not apology (e.g. Dashboard with no expenses: "No expenses yet. Tap + to log your first one.").

---

## Screens (6 + onboarding)

Use a bottom tab bar: Home · Budget · Recurring · Settle · Insights. The + button floats above the tab bar.

### 1. Dashboard (Home)
- Month selector at top.
- Hero: total spent this month vs total budget, with a thin progress bar + health color (green <80%, amber 80-100%, red >100%). If no budgets set, show just the total spent.
- "Safe to spend per day" = (remaining budget) / (days left in month). Hide if no budget.
- Balance card: "She owes you ₹X" / "You owe her ₹X" / "All settled". Computed live from expenses + settlements.
- "Due this week" strip from `recurring`.
- Top 3-4 category mini-bars.
- Floating + opens Add Expense.

### 2. Add Expense (the core — must be fast)
- Big numeric amount entry (custom keypad or native number input, large).
- Category as horizontal scrolling chips.
- "Paid by" toggle (two names).
- Split: Equal (default) / Custom slider / Mine only / Theirs only.
- Optional note, date (defaults today).
- Save returns to where you came from. Whole flow should be doable in ~5 seconds.
- Editing an existing expense reuses this screen.

### 3. Budget vs Actuals
- List categories with `monthly_budget` set.
- Each row: name, spent / budget, progress bar colored by % (purple under, amber 80-100%, red over).
- Tap a category → set/edit its budget inline.
- Show uncategorized/over-budget clearly.

### 4. Recurring
- List of recurring items grouped by upcoming due date.
- `fixed_date` items show "due on the Nth"; `cycle` items (like gas cylinder) compute next-due from `last_paid_on + cycle_days` and show "next ~<date>".
- "Mark paid" → creates an expense in that category + advances the cycle / rolls to next month.
- Add/edit recurring. Support a lock-in/end-date note field for rentals (show a countdown if set).

### 5. Settle Up
- Two avatars + current net balance.
- "You paid ₹X / She paid ₹Y this month" breakdown.
- "Settle up" → records a settlement that zeroes the balance, logs to history.
- Settlement history list.

### 6. Insights
- Donut: spend by category (this month).
- Line: cumulative daily spend vs an "ideal pace" straight line to budget.
- Bar: this month vs last month total.
- Per-person split (you vs her share of total spend).
- "Cooking vs ordering" stat: avg cost per home-cooked vs ordered meal IF those categories have data (derive from Groceries+Veg+Dairy vs Ordering in+Eating out). Hide gracefully if no data.

---

## Balance math (get this exactly right)

For each expense, the payer covered `amount`. The non-payer's share depends on split:
- `equal`: non-payer owes amount/2
- `custom`: payer's share = split_ratio%; non-payer owes amount * (100 - split_ratio)/100
- `mine`: payer's expense, non-payer owes 0
- `theirs`: the whole thing is attributed to the other person; non-payer (the other) owes full amount

Net balance = sum of what each owes the other, minus settlements. Show direction + absolute value. Write unit-testable pure functions for this in `src/lib/balance.ts` and add a few Vitest tests.

---

## Design direction

Minimalist, calm, native-feeling. This is a couple's private app — warm but uncluttered.

- **Accent:** deep indigo/purple `#534AB7` (primary), with a soft tint `#EEEDFE` for fills. One accent only.
- **Surfaces:** white cards on a near-white app background `#FAFAF8`. 0.5px hairline borders `rgba(0,0,0,0.1)`. Generous whitespace.
- **Type:** system font stack or Inter. Big numbers are the hero (28-32px, weight 500). Labels 12-13px muted. Sentence case everywhere. Two weights: 400 and 500.
- **Color semantics:** green `#1D9E75` good/under, amber `#EF9F27` warning, red `#E24B4A` over. Each person gets a soft avatar color.
- **Radius:** 12px cards, 8px controls.
- **No gradients, no drop shadows** (except a subtle one under the floating + and bottom bar), no clutter.
- **Dark mode:** support it via Tailwind `dark:` — must be readable in both.
- Round every displayed number. Currency as `₹1,240` (Indian grouping via `toLocaleString('en-IN')`).
- Empty states are friendly and actionable, never apologetic.

Mobile-first (380px target). Tap targets ≥44px. Installable PWA with icon, name "GharKhata", standalone display.

---

## Code organization

```
src/
  lib/        supabase.ts, balance.ts (+ tests), dates.ts, format.ts
  hooks/      useExpenses, useRecurring, useBalance, useRealtime
  components/ shared UI (Card, Chip, ProgressBar, BottomBar, Fab, Avatar...)
  screens/    Onboarding/*, Dashboard, AddExpense, Budget, Recurring, Settle, Insights
  App.tsx, main.tsx
```

Use Supabase realtime subscriptions so both phones update live. Handle loading + error states everywhere. Keep components small and typed.

---

## Build order (do in this sequence)

1. Vite + TS + Tailwind + PWA scaffold; confirm `npm run dev` and `npm run build` work.
2. `schema.sql` + Supabase client + auth.
3. `balance.ts` + tests.
4. Onboarding wizard.
5. Add Expense + expense list.
6. Dashboard.
7. Budget.
8. Recurring.
9. Settle.
10. Insights.
11. PWA polish (manifest, icons, offline read), dark mode pass, empty states.
12. Final: run build, fix all type errors, write a short README with Supabase setup steps + env vars.

---

## Constraints

- Provide a `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never hardcode keys.
- No pre-filled financial numbers anywhere. App starts empty.
- Keep it to two users per household.
- `npm run build` must pass clean with no type errors before you call it done.
- Write a README I can follow to: create the Supabase project, run the schema, set env vars, run locally, deploy to Vercel.

Build it all. When finished, summarize what you built and give me the exact steps to get it live.

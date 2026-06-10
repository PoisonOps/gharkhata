# GharKhata

A shared expense and home-budget PWA for two people living together. Tracks who spent what, who owes whom, recurring bills, and shows visual insights. Real-time sync across both phones.

---

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Realtime)
- Recharts
- React Router
- vite-plugin-pwa (installable, offline-read)

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Wait for it to provision (~1 min).

### 2. Run the schema

1. In the Supabase dashboard, go to **SQL Editor**.
2. Open `supabase/schema.sql` from this repo.
3. Paste the entire file and click **Run**.

This creates all tables, indexes, RLS policies, and enables realtime.

### 3. Get your API keys

In the Supabase dashboard:
- **Settings → API → Project URL** → copy `URL`
- **Settings → API → Project API keys → anon public** → copy `anon key`

### 4. Set environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 6. Run tests

```bash
npm test
```

---

## Deploy to Vercel

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts. Then add env vars in the Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Option B — GitHub → Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Framework preset: **Vite**
4. Add the two env vars above.
5. Deploy.

---

## First run (onboarding)

1. Sign in with a magic link email.
2. Name your household (e.g. "Our Flat").
3. Enter your display name and pick an accent colour.
4. Share the 6-char join code with your partner, or enter theirs.
5. Choose categories (defaults are pre-selected).
6. Optionally set monthly budgets — or skip and fill in later.

---

## Project structure

```
src/
  lib/          supabase.ts, balance.ts (+tests), dates.ts, format.ts, defaultCategories.ts
  hooks/        useAuth, useProfile, useExpenses, useCategories, useRecurring, useSettlements
  components/   Card, Chip, ProgressBar, BottomBar, Fab, Avatar, Spinner, EmptyState, MonthPicker
  screens/
    Auth/        AuthScreen (magic-link)
    Onboarding/  6-step wizard
    Dashboard/   Home screen
    AddExpense/  Add/edit expense
    Budget/      Budget vs actuals
    Recurring/   Recurring bills
    Settle/      Settle up + history
    Insights/    Charts and stats
  App.tsx, main.tsx, index.css
supabase/
  schema.sql    Paste into Supabase SQL editor
```

---

## Balance logic

See `src/lib/balance.ts` and the 13 unit tests in `src/lib/balance.test.ts`.

- `equal` — each person pays half
- `custom` — payer's share is `split_ratio`%; non-payer owes the rest
- `mine` — fully the payer's expense; non-payer owes nothing
- `theirs` — fully attributed to the other person; non-payer owes full amount

Net balance accounts for all expenses and settlements. The Settle screen shows who owes whom and records a settlement that zeroes the balance.

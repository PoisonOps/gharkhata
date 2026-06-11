# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server at localhost:5173 (PWA SW enabled in dev)
npm run build      # tsc + vite build → dist/
npm test           # vitest run (unit tests only — balance math)
npm run lint       # eslint, zero warnings allowed
vercel --prod --yes  # deploy to production
```

Single test file: `npx vitest run src/lib/balance.test.ts`

TypeScript check without building: `npx tsc --noEmit`

## Architecture

### Data flow — offline-first

All reads come from **Dexie (IndexedDB)**, not Supabase directly. Supabase is only a sync target.

```
User action
  → write to Dexie (instant, useLiveQuery re-renders)
  → enqueue to sync_queue table in Dexie
  → if online: flush queue to Supabase via upsert

App boot / reconnect / foreground
  → pushToCloud() — sends pending sync_queue entries to Supabase
  → pullFromCloud() — fetches latest from Supabase, bulkPut into Dexie
```

Key files:
- `src/lib/localDb.ts` — Dexie schema. Tables mirror Supabase + `sync_queue` (++id, recordId, operation, payload). Compound index `[household_id+spent_on]` on expenses for efficient month range queries.
- `src/lib/sync.ts` — `pushToCloud` / `pullFromCloud` / `enqueue`. Also exports all typed write helpers: `createExpense`, `updateExpense`, `deleteExpense`, `createSettlement`, `createRecurring`, `updateRecurring`, `deleteRecurring`, `updateCategory`. **All screen writes must go through these, never direct Supabase calls.**
- `src/context/AppContext.tsx` — uses `useLiveQuery` (dexie-react-hooks) for all data. Sync triggers: mount, `online` event, `visibilitychange`. Exposes `profile | null | undefined` (undefined = Dexie query still initialising).

### Component tree

```
App.tsx
└── AppShell          (useAuth → decides auth vs app)
    └── AppProvider   (userId → wraps everything with offline-first context)
        └── InnerApp  (reads profile from context; routes to Onboarding or main app)
            ├── SyncBadge   (floating pill: offline / syncing / pending count)
            ├── Routes → Dashboard | Budget | Recurring | Settle | Insights
            │            AddExpense (also handles edit via /edit-expense/:id)
            ├── BottomBar
            └── Fab (→ /add-expense)
```

### Context shape (`useApp()`)

`profile` can be `undefined` (Dexie loading), `null` (not found), or `Profile`. Always check `profile?.household_id` before treating the user as fully onboarded. `loading` is only true during the initial bootstrap before Dexie has responded.

### Onboarding

Onboarding uses `supabase.rpc()` for three operations (bypasses RLS via `security definer` Postgres functions): `create_household_for_user`, `upsert_my_profile`, `join_household_by_code`. After completion it calls `window.location.reload()` — the bootstrap in AppContext then pulls the updated profile from Supabase into Dexie.

Do **not** replace `window.location.reload()` in Onboarding with a navigate call — the AppProvider needs a fresh boot to detect the new `household_id`.

### Auth

Email + password only. No magic links, no OTP (both cause issues in a PWA — links open in the wrong browser). Sign-in tries `signInWithPassword` first; if that fails with "invalid login credentials", it falls back to `signUp` (auto-registers new accounts). Supabase "Confirm email" must be **OFF** in the dashboard.

### Balance logic

`src/lib/balance.ts` — pure functions, no side effects, fully tested. `computeBalance(A, B, expenses, settlements)` returns `{ direction: 'settled'|'aOwes'|'bOwes', amount }`. Split types: `equal` (50/50), `custom` (payer's % in split_ratio field), `mine` (non-payer owes 0), `theirs` (non-payer owes full amount). All balance changes live here — do not inline balance math in components.

### Tailwind design tokens

```
primary       #534AB7   (purple — interactive elements)
primary-tint  #EEEDFE   (light purple background)
surface       #FAFAF8   (page background)
good          #1D9E75   (green — positive/settled)
warn          #EF9F27   (amber — warning/due soon)
over          #E24B4A   (red — over budget/overdue)
rounded-card  12px
rounded-control 8px
```

Dark mode via `dark:` prefix (class strategy). `pt-safe` is used for safe-area insets on mobile.

### Supabase

Project ref: `mpnkywlijfcjngtcqmmv`. Schema in `supabase/schema.sql` — run this in the SQL Editor for any new environment. RLS policies use the `my_household_id()` security-definer helper to avoid recursive policy loops. All tables are in the `supabase_realtime` publication (but realtime is a secondary mechanism — Dexie sync is primary).

### Hooks in `src/hooks/`

These older hooks (`useProfile`, `useExpenses`, etc.) are **not used by any screen** — screens use `useApp()` exclusively. `useAuth` is still used in `App.tsx` to detect the logged-in user before mounting AppProvider. Do not add new direct-Supabase hooks; extend AppContext or sync.ts instead.

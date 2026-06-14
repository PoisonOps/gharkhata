# GharKhata 🏠

> Shared home budget PWA for two — track expenses, settle up, recurring bills, and insights. Works fully offline. Syncs when you're back online.

**Live → [gharkhata.vercel.app](https://gharkhata.vercel.app)**  
**Built in → 2 days, idea to deployed**

---

## The Problem

Couples share expenses daily but tracking who paid what turns into a messy WhatsApp thread or a passive-aggressive spreadsheet. Existing apps are either too complex (Splitwise, with its bloat) or require both people to be online simultaneously.

GharKhata is lightweight, offline-first, and designed for exactly two people.

---

## How It Works

- One person logs an expense on their phone — even with no internet
- It syncs to the shared account the moment either partner comes online
- A running balance shows who owes whom at all times
- Recurring bills auto-log themselves each month
- Charts show spending patterns over time

---

## Features

- **Offline-first** — log expenses with no connection, full sync on reconnect
- **Real-time sync** — Supabase Realtime pushes updates instantly when both online
- **Split tracking** — custom splits, not just 50/50
- **Recurring bills** — rent, subscriptions, utilities auto-logged
- **Visual insights** — Recharts spending breakdowns by category and month
- **PWA** — installable on home screen (Android + iOS), works like a native app

---

## Architecture

**Offline strategy:** IndexedDB (via Dexie) as the local write-ahead store. On reconnect, Dexie syncs pending writes to Supabase. Conflict resolution: last-write-wins (timestamp-based).

```
User action → Dexie (local, instant)
                  ↓
           Supabase sync (on network)
                  ↓
           Supabase Realtime → Partner's Dexie
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Offline storage | Dexie (IndexedDB wrapper) |
| Backend/Auth | Supabase (Postgres + Auth + Realtime) |
| Charts | Recharts |
| Router | React Router v6 |
| PWA | vite-plugin-pwa (Workbox) |
| Hosting | Vercel |

---

## Running Locally

### 1. Clone and install

```bash
git clone https://github.com/PoisonOps/gharkhata.git
cd gharkhata
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `supabase/schema.sql` from this repo
3. Copy your project URL and anon key

### 3. Configure environment

```bash
cp .env.example .env.local
# Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 4. Run

```bash
npm run dev
```

---

## Honesty note

The sync conflict resolution is simple — last write wins. Two people editing the same expense simultaneously can lose data. A real fix would use CRDTs. Good enough for two people in the same house; not production-ready for larger teams.

---

Built by [Sahil Solankey](https://sahilsolankey.vercel.app) · shipped in 2 days

import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../lib/supabase'
import { db } from '../lib/localDb'
import { pullFromCloud, pushToCloud } from '../lib/sync'
import type { Profile, Household, Category, Expense, Settlement, Recurring } from '../lib/supabase'

interface AppState {
  profile: Profile | null | undefined // undefined = Dexie still initialising
  partner: Profile | null
  household: Household | null
  categories: Category[]
  expenses: Expense[]
  settlements: Settlement[]
  recurring: Recurring[]
  loading: boolean
  online: boolean
  syncing: boolean
  pendingCount: number
  refetchExpenses: (year: number, month: number) => void
  refetchCategories: () => void
  refetchSettlements: () => void
  refetchRecurring: () => void
}

const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

const EMPTY_PROFILES: Profile[] = []
const EMPTY_CATEGORIES: Category[] = []
const EMPTY_EXPENSES: Expense[] = []
const EMPTY_SETTLEMENTS: Settlement[] = []
const EMPTY_RECURRING: Recurring[] = []

export function AppProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)
  const prevHhId = useRef<string | null>(null)

  // ── Live queries from Dexie ──────────────────────────────────────────────
  // Auto re-render whenever underlying Dexie data changes (write or sync)

  const profile = useLiveQuery(() => db.profiles.get(userId), [userId])
  const hhId = profile?.household_id ?? null

  const allMembers = useLiveQuery(
    (): Promise<Profile[]> => hhId
      ? db.profiles.where('household_id').equals(hhId).toArray()
      : Promise.resolve(EMPTY_PROFILES),
    [hhId],
    EMPTY_PROFILES
  ) as Profile[]

  const partner: Profile | null = allMembers.find((m) => m.id !== userId) ?? null

  const household = useLiveQuery(
    (): Promise<Household | undefined> => hhId
      ? db.households.get(hhId)
      : Promise.resolve(undefined),
    [hhId]
  )

  const categories = useLiveQuery(
    (): Promise<Category[]> => hhId
      ? db.categories.where('household_id').equals(hhId).sortBy('sort_order')
      : Promise.resolve(EMPTY_CATEGORIES),
    [hhId],
    EMPTY_CATEGORIES
  ) as Category[]

  const expenses = useLiveQuery(
    (): Promise<Expense[]> => {
      if (!hhId) return Promise.resolve(EMPTY_EXPENSES)
      const from = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return db.expenses
        .where('[household_id+spent_on]')
        .between([hhId, from], [hhId, to], true, true)
        .reverse()
        .toArray()
    },
    [hhId, year, month],
    EMPTY_EXPENSES
  ) as Expense[]

  const settlements = useLiveQuery(
    (): Promise<Settlement[]> => hhId
      ? db.settlements.where('household_id').equals(hhId).toArray()
          .then((arr) => arr.sort((a, b) => b.settled_on.localeCompare(a.settled_on)))
      : Promise.resolve(EMPTY_SETTLEMENTS),
    [hhId],
    EMPTY_SETTLEMENTS
  ) as Settlement[]

  const recurring = useLiveQuery(
    (): Promise<Recurring[]> => hhId
      ? db.recurring.where('household_id').equals(hhId).filter((r) => r.active).sortBy('name')
      : Promise.resolve(EMPTY_RECURRING),
    [hhId],
    EMPTY_RECURRING
  ) as Recurring[]

  const pendingCount = (useLiveQuery(
    (): Promise<number> => db.sync_queue.count(),
    [],
    0
  ) as number | undefined) ?? 0

  // ── Sync logic ───────────────────────────────────────────────────────────

  const doSync = useCallback(async (hId: string) => {
    if (!navigator.onLine) return
    setSyncing(true)
    try {
      await pushToCloud()
      await pullFromCloud(hId, userId)
    } catch (e) {
      console.error('Sync failed:', e)
    } finally {
      setSyncing(false)
    }
  }, [userId])

  // Bootstrap: pull fresh profile from Supabase on mount (handles post-onboarding)
  useEffect(() => {
    const bootstrap = async () => {
      if (navigator.onLine) {
        try {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single()
          if (p) {
            await db.profiles.put(p)
            if (p.household_id) await doSync(p.household_id)
          }
        } catch (e) {
          console.error('Bootstrap failed:', e)
        }
      }
      setBootstrapped(true)
    }
    bootstrap()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync when household_id becomes available (right after onboarding completes)
  useEffect(() => {
    if (!hhId || hhId === prevHhId.current) return
    prevHhId.current = hhId
    if (bootstrapped) doSync(hhId)
  }, [hhId, bootstrapped, doSync])

  // Sync when network comes back
  useEffect(() => {
    const handleOnline = () => { setOnline(true); if (hhId) doSync(hhId) }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [hhId, doSync])

  // Sync when app comes to foreground
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && hhId) doSync(hhId)
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [hhId, doSync])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const refetchExpenses = useCallback((y: number, m: number) => {
    setYear(y)
    setMonth(m)
    if (navigator.onLine && hhId) pullFromCloud(hhId, userId, y, m).catch(console.error)
  }, [hhId, userId])

  const refetchCategories = useCallback(() => {}, [])
  const refetchSettlements = useCallback(() => {}, [])
  const refetchRecurring = useCallback(() => {}, [])

  const loading = !bootstrapped && profile === undefined

  return (
    <AppContext.Provider value={{
      profile,
      partner,
      household: household ?? null,
      categories,
      expenses,
      settlements,
      recurring,
      loading,
      online,
      syncing,
      pendingCount,
      refetchExpenses,
      refetchCategories,
      refetchSettlements,
      refetchRecurring,
    }}>
      {children}
    </AppContext.Provider>
  )
}

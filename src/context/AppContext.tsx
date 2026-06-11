import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, Household, Category, Expense, Settlement, Recurring } from '../lib/supabase'

interface AppState {
  profile: Profile | null
  partner: Profile | null
  household: Household | null
  categories: Category[]
  // current month expenses cached
  expenses: Expense[]
  settlements: Settlement[]
  recurring: Recurring[]
  expenseMonth: { year: number; month: number } | null
  loading: boolean
  refetchProfile: () => Promise<void>
  refetchCategories: () => Promise<void>
  refetchExpenses: (year: number, month: number) => Promise<void>
  refetchSettlements: () => Promise<void>
  refetchRecurring: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

interface AppProviderProps {
  userId: string
  children: ReactNode
}

export function AppProvider({ userId, children }: AppProviderProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [partner, setPartner] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [expenseMonth, setExpenseMonth] = useState<{ year: number; month: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!p) return

    setProfile(p)

    if (p.household_id) {
      const [{ data: hh }, { data: members }, { data: cats }] = await Promise.all([
        supabase.from('households').select('*').eq('id', p.household_id).single(),
        supabase.from('profiles').select('*').eq('household_id', p.household_id),
        supabase.from('categories').select('*').eq('household_id', p.household_id).order('sort_order'),
      ])
      setHousehold(hh ?? null)
      setCategories(cats ?? [])
      const other = (members ?? []).find((m: Profile) => m.id !== userId)
      setPartner(other ?? null)
    }
  }, [userId])

  const fetchExpenses = useCallback(async (year: number, month: number) => {
    const hhId = household?.id
    if (!hhId) return
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', hhId)
      .gte('spent_on', from)
      .lte('spent_on', to)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false })
    setExpenses(data ?? [])
    setExpenseMonth({ year, month })
  }, [household?.id])

  const fetchSettlements = useCallback(async () => {
    const hhId = household?.id
    if (!hhId) return
    const { data } = await supabase
      .from('settlements')
      .select('*')
      .eq('household_id', hhId)
      .order('settled_on', { ascending: false })
    setSettlements(data ?? [])
  }, [household?.id])

  const fetchRecurring = useCallback(async () => {
    const hhId = household?.id
    if (!hhId) return
    const { data } = await supabase
      .from('recurring')
      .select('*')
      .eq('household_id', hhId)
      .eq('active', true)
      .order('name')
    setRecurring(data ?? [])
  }, [household?.id])

  const fetchCategories = useCallback(async () => {
    const hhId = household?.id
    if (!hhId) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', hhId)
      .order('sort_order')
    setCategories(data ?? [])
  }, [household?.id])

  // Boot: load profile + household + categories in one shot
  useEffect(() => {
    setLoading(true)
    fetchProfile().finally(() => setLoading(false))
  }, [fetchProfile])

  // Once household is known, load the rest in parallel
  useEffect(() => {
    if (!household?.id) return
    const now = new Date()
    Promise.all([
      fetchExpenses(now.getFullYear(), now.getMonth() + 1),
      fetchSettlements(),
      fetchRecurring(),
    ])
  }, [household?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: invalidate on any change
  useEffect(() => {
    const hhId = household?.id
    if (!hhId) return

    const channel = supabase
      .channel('app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${hhId}` },
        () => { if (expenseMonth) fetchExpenses(expenseMonth.year, expenseMonth.month) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `household_id=eq.${hhId}` },
        () => fetchSettlements())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring', filter: `household_id=eq.${hhId}` },
        () => fetchRecurring())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `household_id=eq.${hhId}` },
        () => fetchCategories())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `household_id=eq.${hhId}` },
        () => fetchProfile())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [household?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{
      profile, partner, household, categories,
      expenses, settlements, recurring, expenseMonth,
      loading,
      refetchProfile: fetchProfile,
      refetchCategories: fetchCategories,
      refetchExpenses: fetchExpenses,
      refetchSettlements: fetchSettlements,
      refetchRecurring: fetchRecurring,
    }}>
      {children}
    </AppContext.Provider>
  )
}

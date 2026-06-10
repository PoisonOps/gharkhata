import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/supabase'
import { monthBounds } from '../lib/dates'

export function useExpenses(householdId: string | undefined, year: number, month: number) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    const { from, to } = monthBounds(year, month)
    const { data, error: err } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', householdId)
      .gte('spent_on', from)
      .lte('spent_on', to)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setExpenses(data ?? [])
    setLoading(false)
  }, [householdId, year, month])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    if (!householdId) return
    const channel = supabase
      .channel(`expenses-${householdId}-${year}-${month}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `household_id=eq.${householdId}` },
        () => { fetch() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [householdId, year, month, fetch])

  return { expenses, loading, error, refetch: fetch }
}

export function useAllExpenses(householdId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', householdId)
      .order('spent_on', { ascending: false })
    setExpenses(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { expenses, loading, refetch: fetch }
}

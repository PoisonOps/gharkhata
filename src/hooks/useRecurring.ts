import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Recurring } from '../lib/supabase'

export function useRecurring(householdId: string | undefined) {
  const [recurring, setRecurring] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    const { data } = await supabase
      .from('recurring')
      .select('*')
      .eq('household_id', householdId)
      .eq('active', true)
      .order('name')
    setRecurring(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!householdId) return
    const channel = supabase
      .channel(`recurring-${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recurring', filter: `household_id=eq.${householdId}` },
        () => { fetch() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [householdId, fetch])

  return { recurring, loading, refetch: fetch }
}

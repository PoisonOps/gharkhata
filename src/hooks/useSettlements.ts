import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Settlement } from '../lib/supabase'

export function useSettlements(householdId: string | undefined) {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    const { data } = await supabase
      .from('settlements')
      .select('*')
      .eq('household_id', householdId)
      .order('settled_on', { ascending: false })
    setSettlements(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!householdId) return
    const channel = supabase
      .channel(`settlements-${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `household_id=eq.${householdId}` },
        () => { fetch() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [householdId, fetch])

  return { settlements, loading, refetch: fetch }
}

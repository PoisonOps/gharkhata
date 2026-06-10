import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../lib/supabase'

export function useCategories(householdId: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId) return
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
    setCategories(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { categories, loading, refetch: fetch }
}

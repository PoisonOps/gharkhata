import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, Household } from '../lib/supabase'

export interface HouseholdContext {
  profile: Profile | null
  partner: Profile | null
  household: Household | null
  loading: boolean
  refetch: () => void
}

export function useProfile(userId: string | undefined): HouseholdContext {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [partner, setPartner] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!p) {
      setLoading(false)
      return
    }

    setProfile(p)

    if (p.household_id) {
      const [{ data: hh }, { data: members }] = await Promise.all([
        supabase.from('households').select('*').eq('id', p.household_id).single(),
        supabase.from('profiles').select('*').eq('household_id', p.household_id),
      ])
      setHousehold(hh ?? null)
      const other = (members ?? []).find((m: Profile) => m.id !== userId)
      setPartner(other ?? null)
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { profile, partner, household, loading, refetch: fetch }
}

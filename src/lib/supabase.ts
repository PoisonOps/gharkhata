import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in your keys.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// ─── Types matching schema.sql ───────────────────────────────────────────────

export interface Household {
  id: string
  name: string
  join_code: string
  created_at: string
}

export interface Profile {
  id: string
  household_id: string | null
  display_name: string
  color: string
  created_at: string
}

export type CategoryType = 'fixed' | 'variable' | 'irregular'

export interface Category {
  id: string
  household_id: string
  name: string
  icon: string
  type: CategoryType
  monthly_budget: number | null
  sort_order: number
  is_default: boolean
}

export type SplitType = 'equal' | 'custom' | 'mine' | 'theirs'

export interface Expense {
  id: string
  household_id: string
  amount: number
  category_id: string | null
  paid_by: string
  split_type: SplitType
  split_ratio: number | null
  note: string | null
  spent_on: string
  created_at: string
}

export type DueType = 'fixed_date' | 'cycle'

export interface Recurring {
  id: string
  household_id: string
  name: string
  amount: number
  category_id: string | null
  due_type: DueType
  due_day: number | null
  cycle_days: number | null
  last_paid_on: string | null
  end_date: string | null
  active: boolean
}

export interface Settlement {
  id: string
  household_id: string
  amount: number
  from_profile: string
  to_profile: string
  settled_on: string
  created_at: string
}

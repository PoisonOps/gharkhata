import Dexie, { type Table } from 'dexie'
import type { Profile, Household, Category, Expense, Settlement, Recurring } from './supabase'

export interface SyncEntry {
  id?: number
  operation: 'insert' | 'update' | 'delete'
  table: string
  recordId: string
  payload: Record<string, unknown>
  created_at: number
}

class GharKhataDB extends Dexie {
  profiles!: Table<Profile>
  households!: Table<Household>
  categories!: Table<Category>
  expenses!: Table<Expense>
  settlements!: Table<Settlement>
  recurring!: Table<Recurring>
  sync_queue!: Table<SyncEntry>

  constructor() {
    super('GharKhata')
    this.version(1).stores({
      profiles: 'id, household_id',
      households: 'id',
      categories: 'id, household_id, sort_order',
      // Compound index for efficient month-range queries
      expenses: 'id, [household_id+spent_on]',
      settlements: 'id, household_id, settled_on',
      recurring: 'id, household_id',
      sync_queue: '++id, recordId, created_at',
    })
  }
}

export const db = new GharKhataDB()

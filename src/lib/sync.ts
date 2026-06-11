import { supabase } from './supabase'
import { db, type SyncEntry } from './localDb'
import type { Expense, Settlement, Recurring, Category } from './supabase'

// ─── Sync queue helpers ──────────────────────────────────────────────────────

export async function enqueue(
  operation: SyncEntry['operation'],
  table: string,
  recordId: string,
  payload: Record<string, unknown>
) {
  const existing = await db.sync_queue.where('recordId').equals(recordId).first()

  if (existing) {
    if (existing.operation === 'insert' && operation === 'delete') {
      // Created and deleted while offline — cancel both
      await db.sync_queue.delete(existing.id!)
      return
    }
    if (existing.operation === 'insert' && operation === 'update') {
      // Merge update into the pending insert (stays as insert)
      await db.sync_queue.update(existing.id!, { payload, created_at: Date.now() })
      return
    }
    // update→update, update→delete: replace with latest
    await db.sync_queue.update(existing.id!, { operation, payload, created_at: Date.now() })
    return
  }

  await db.sync_queue.add({ operation, table, recordId, payload, created_at: Date.now() })
}

export function flushIfOnline() {
  if (navigator.onLine) pushToCloud().catch(console.error)
}

// ─── Push pending to Supabase ────────────────────────────────────────────────

export async function pushToCloud() {
  const queue = await db.sync_queue.orderBy('created_at').toArray()
  if (queue.length === 0) return

  for (const entry of queue) {
    try {
      let err: { message: string } | null = null

      if (entry.operation === 'delete') {
        const res = await (supabase.from(entry.table as 'expenses') as ReturnType<typeof supabase.from>).delete().eq('id', entry.recordId)
        err = res.error
      } else {
        const res = await (supabase.from(entry.table as 'expenses') as ReturnType<typeof supabase.from>).upsert(entry.payload as Record<string, unknown>)
        err = res.error
      }

      if (!err) {
        await db.sync_queue.delete(entry.id!)
      }
    } catch {
      // Network failure — stop and retry next time
      break
    }
  }
}

// ─── Pull from Supabase into Dexie ──────────────────────────────────────────

function monthStart(year: number, month: number): string {
  if (month < 1) { year--; month = 12 }
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function monthEnd(year: number, month: number): string {
  if (month > 12) { year++; month = 1 }
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

export async function pullFromCloud(
  householdId: string,
  userId: string,
  year?: number,
  month?: number
) {
  const now = new Date()
  const y = year ?? now.getFullYear()
  const m = month ?? now.getMonth() + 1

  const [profileRes, hhRes, membersRes, catsRes, settlementsRes, recurringRes, expensesRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('households').select('*').eq('id', householdId).single(),
      supabase.from('profiles').select('*').eq('household_id', householdId),
      supabase.from('categories').select('*').eq('household_id', householdId),
      supabase.from('settlements').select('*').eq('household_id', householdId).order('settled_on', { ascending: false }),
      supabase.from('recurring').select('*').eq('household_id', householdId),
      // Pull current month + previous month so balance and recent data are available
      supabase.from('expenses').select('*').eq('household_id', householdId)
        .gte('spent_on', monthStart(y, m - 1))
        .lte('spent_on', monthEnd(y, m))
        .order('spent_on', { ascending: false }),
    ])

  await db.transaction('rw', [
    db.profiles, db.households, db.categories,
    db.expenses, db.settlements, db.recurring,
  ], async () => {
    if (profileRes.data) await db.profiles.put(profileRes.data)
    if (hhRes.data) await db.households.put(hhRes.data)
    if (membersRes.data) await db.profiles.bulkPut(membersRes.data)
    if (catsRes.data) await db.categories.bulkPut(catsRes.data)
    if (settlementsRes.data) await db.settlements.bulkPut(settlementsRes.data)
    if (recurringRes.data) await db.recurring.bulkPut(recurringRes.data)
    if (expensesRes.data) await db.expenses.bulkPut(expensesRes.data)
  })
}

// ─── Typed write helpers ─────────────────────────────────────────────────────

type OmitGenerated<T> = Omit<T, 'id' | 'created_at'>

export async function createExpense(payload: OmitGenerated<Expense>): Promise<Expense> {
  const record: Expense = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }
  await db.expenses.put(record)
  await enqueue('insert', 'expenses', record.id, record as unknown as Record<string, unknown>)
  flushIfOnline()
  return record
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
  await db.expenses.update(id, updates)
  const record = await db.expenses.get(id)
  if (record) {
    await enqueue('update', 'expenses', id, record as unknown as Record<string, unknown>)
    flushIfOnline()
  }
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id)
  await enqueue('delete', 'expenses', id, { id })
  flushIfOnline()
}

export async function createSettlement(payload: OmitGenerated<Settlement>): Promise<Settlement> {
  const record: Settlement = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() }
  await db.settlements.put(record)
  await enqueue('insert', 'settlements', record.id, record as unknown as Record<string, unknown>)
  flushIfOnline()
  return record
}

export async function createRecurring(payload: OmitGenerated<Recurring> & { id?: string }): Promise<Recurring> {
  const record: Recurring = { ...payload, id: payload.id ?? crypto.randomUUID() }
  await db.recurring.put(record)
  await enqueue('insert', 'recurring', record.id, record as unknown as Record<string, unknown>)
  flushIfOnline()
  return record
}

export async function updateRecurring(id: string, updates: Partial<Recurring>): Promise<void> {
  await db.recurring.update(id, updates)
  const record = await db.recurring.get(id)
  if (record) {
    await enqueue('update', 'recurring', id, record as unknown as Record<string, unknown>)
    flushIfOnline()
  }
}

export async function deleteRecurring(id: string): Promise<void> {
  await updateRecurring(id, { active: false })
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  await db.categories.update(id, updates)
  const record = await db.categories.get(id)
  if (record) {
    await enqueue('update', 'categories', id, record as unknown as Record<string, unknown>)
    flushIfOnline()
  }
}

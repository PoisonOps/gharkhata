import { useState } from 'react'
import { createExpense, createRecurring, updateRecurring, deleteRecurring } from '../../lib/sync'
import { useApp } from '../../context/AppContext'
import { formatCurrency, formatDate } from '../../lib/format'
import { nextCycleDate, nextFixedDate, toDateStr, today } from '../../lib/dates'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'
import type { Recurring, DueType } from '../../lib/supabase'

export function RecurringScreen() {
  const { profile, household, categories, recurring, loading } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Recurring | null>(null)

  if (loading || !profile) return <div className="h-screen flex items-center justify-center"><Spinner /></div>

  const getNextDate = (r: Recurring) =>
    r.due_type === 'cycle'
      ? toDateStr(nextCycleDate(r.last_paid_on, r.cycle_days ?? 30))
      : toDateStr(nextFixedDate(r.due_day ?? 1))

  const sorted = [...recurring].sort((a, b) => getNextDate(a).localeCompare(getNextDate(b)))

  const markPaid = async (r: Recurring) => {
    await Promise.all([
      createExpense({
        household_id: household!.id,
        amount: r.amount,
        category_id: r.category_id,
        paid_by: profile.id,
        split_type: 'equal',
        split_ratio: null,
        note: r.name,
        spent_on: today(),
      }),
      updateRecurring(r.id, { last_paid_on: today() }),
    ])
  }

  return (
    <div className="pb-32 pt-safe">
      <div className="flex items-center justify-between px-4 pt-4 pb-4">
        <h1 className="text-lg font-medium dark:text-zinc-100">Recurring</h1>
        <button onClick={() => { setEditItem(null); setShowForm(true) }} className="text-sm font-medium text-primary">
          + Add
        </button>
      </div>

      <div className="px-4">
        {sorted.length === 0 ? (
          <EmptyState
            icon="🔄"
            title="No recurring bills"
            subtitle="Add rent, gas, WiFi and other regular expenses."
            action={{ label: 'Add one', onClick: () => setShowForm(true) }}
          />
        ) : (
          <Card className="divide-y divide-black/5 dark:divide-white/5">
            {sorted.map((r) => {
              const cat = categories.find((c) => c.id === r.category_id)
              const nextDate = getNextDate(r)
              const daysUntil = Math.ceil((new Date(nextDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              const isDue = daysUntil <= 3

              return (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-control bg-primary-tint dark:bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">
                    {cat?.icon ?? '🔄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-zinc-200">{r.name}</p>
                    <p className={`text-xs ${isDue ? 'text-over' : 'text-zinc-400'}`}>
                      {r.due_type === 'fixed_date' ? `Due on the ${r.due_day}th` : `Next ~${formatDate(nextDate)}`}
                      {isDue && daysUntil <= 0 ? ' · Overdue' : isDue ? ` · in ${daysUntil}d` : ''}
                    </p>
                    {r.end_date && <p className="text-xs text-zinc-400">Ends {formatDate(r.end_date)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium dark:text-zinc-100">{formatCurrency(r.amount)}</p>
                    <div className="flex gap-1 mt-1 justify-end">
                      <button onClick={() => markPaid(r)} className="text-xs px-2 py-0.5 bg-good/10 text-good rounded-full">Paid</button>
                      <button onClick={() => { setEditItem(r); setShowForm(true) }} className="text-xs px-2 py-0.5 bg-black/5 dark:bg-white/10 text-zinc-500 rounded-full">Edit</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>

      {showForm && (
        <RecurringForm
          item={editItem}
          householdId={household!.id}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSave={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function RecurringForm({ item, householdId, categories, onClose, onSave }: {
  item: Recurring | null
  householdId: string
  categories: ReturnType<typeof useApp>['categories']
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [amount, setAmount] = useState(String(item?.amount ?? ''))
  const [categoryId, setCategoryId] = useState<string | null>(item?.category_id ?? null)
  const [dueType, setDueType] = useState<DueType>(item?.due_type ?? 'fixed_date')
  const [dueDay, setDueDay] = useState(String(item?.due_day ?? 1))
  const [cycleDays, setCycleDays] = useState(String(item?.cycle_days ?? 30))
  const [endDate, setEndDate] = useState(item?.end_date ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!name.trim() || !amount) return
    setLoading(true)
    const payload = {
      household_id: householdId,
      name: name.trim(),
      amount: parseFloat(amount),
      category_id: categoryId,
      due_type: dueType,
      due_day: dueType === 'fixed_date' ? parseInt(dueDay) : null,
      cycle_days: dueType === 'cycle' ? parseInt(cycleDays) : null,
      last_paid_on: item?.last_paid_on ?? null,
      end_date: endDate || null,
      active: true,
    }
    try {
      if (item) {
        await updateRecurring(item.id, payload)
      } else {
        await createRecurring(payload)
      }
      onSave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setLoading(false)
    }
  }

  const del = async () => {
    if (!item || !confirm('Delete this recurring item?')) return
    await deleteRecurring(item.id)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="w-full bg-white dark:bg-zinc-900 rounded-t-2xl px-5 py-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-medium dark:text-zinc-100">{item ? 'Edit recurring' : 'Add recurring'}</h3>
          <button onClick={onClose} className="text-zinc-400 text-xl leading-none">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent, WiFi, Gas…"
              className="w-full h-10 px-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
              className="w-full h-10 px-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Category</label>
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => (
                <button key={c.id} onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                  className={`text-sm px-2 py-1 rounded-full transition-colors ${c.id === categoryId ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Repeats</label>
            <div className="flex gap-2">
              <button onClick={() => setDueType('fixed_date')}
                className={`flex-1 h-9 rounded-control text-sm transition-colors ${dueType === 'fixed_date' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'}`}>
                Monthly (fixed date)
              </button>
              <button onClick={() => setDueType('cycle')}
                className={`flex-1 h-9 rounded-control text-sm transition-colors ${dueType === 'cycle' ? 'bg-primary text-white' : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'}`}>
                Every N days
              </button>
            </div>
          </div>
          {dueType === 'fixed_date' && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Day of month</label>
              <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                className="w-full h-10 px-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          )}
          {dueType === 'cycle' && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Every how many days? (e.g. 45 for gas)</label>
              <input type="number" min={1} value={cycleDays} onChange={(e) => setCycleDays(e.target.value)}
                className="w-full h-10 px-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">End date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {error && <p className="text-sm text-over">{error}</p>}
          <button onClick={save} disabled={loading || !name.trim() || !amount}
            className="w-full h-12 bg-primary text-white rounded-control font-medium disabled:opacity-50">
            {loading ? 'Saving…' : item ? 'Save changes' : 'Add'}
          </button>
          {item && <button onClick={del} className="w-full h-10 text-over text-sm">Delete</button>}
        </div>
      </div>
    </div>
  )
}

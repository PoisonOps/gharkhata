import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useExpenses } from '../../hooks/useExpenses'
import { useCategories } from '../../hooks/useCategories'
import { formatCurrency } from '../../lib/format'
import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { MonthPicker } from '../../components/MonthPicker'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'

export function Budget() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const { user } = useAuth()
  const { profile, household } = useProfile(user?.id)
  const { expenses, loading: expLoading } = useExpenses(household?.id, year, month)
  const { categories, loading: catLoading, refetch } = useCategories(household?.id)

  if (expLoading || catLoading || !profile) {
    return <div className="h-screen flex items-center justify-center"><Spinner /></div>
  }

  const catSpend: Record<string, number> = {}
  for (const e of expenses) {
    if (e.category_id) catSpend[e.category_id] = (catSpend[e.category_id] ?? 0) + e.amount
  }

  const sorted = [...categories].sort((a, b) => {
    const aHas = a.monthly_budget !== null
    const bHas = b.monthly_budget !== null
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    return a.sort_order - b.sort_order
  })

  const saveBudget = async (id: string) => {
    setSaving(true)
    const val = parseFloat(editValue)
    await supabase
      .from('categories')
      .update({ monthly_budget: isNaN(val) || val <= 0 ? null : val })
      .eq('id', id)
    await refetch()
    setEditingId(null)
    setSaving(false)
  }

  const totalBudget = categories.reduce((s, c) => s + (c.monthly_budget ?? 0), 0)
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="pb-32 pt-safe">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-lg font-medium dark:text-zinc-100">Budget</h1>
      </div>
      <div className="flex justify-center py-2">
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      {totalBudget > 0 && (
        <div className="px-4 mb-3">
          <Card className="p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-zinc-500">Total</span>
              <span className="text-sm font-medium dark:text-zinc-100">{formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}</span>
            </div>
            <ProgressBar pct={(totalSpent / totalBudget) * 100} height={8} />
          </Card>
        </div>
      )}

      <div className="px-4">
        {sorted.length === 0 ? (
          <EmptyState icon="📊" title="No categories yet" subtitle="Complete onboarding to add categories." />
        ) : (
          <Card className="divide-y divide-black/5 dark:divide-white/5">
            {sorted.map((cat) => {
              const spent = catSpend[cat.id] ?? 0
              const budget = cat.monthly_budget
              const pct = budget ? (spent / budget) * 100 : 0
              const isEditing = editingId === cat.id

              return (
                <div key={cat.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 text-sm dark:text-zinc-300">{cat.name}</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 text-sm">₹</span>
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 h-7 px-2 text-sm rounded border border-primary/40 bg-white dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveBudget(cat.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <button
                          onClick={() => saveBudget(cat.id)}
                          disabled={saving}
                          className="text-xs text-primary font-medium px-1"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-zinc-400 px-1">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(cat.id); setEditValue(String(budget ?? '')) }}
                        className="text-xs text-zinc-400 hover:text-primary"
                      >
                        {budget ? formatCurrency(budget) : 'Set budget'}
                      </button>
                    )}
                  </div>
                  {budget ? (
                    <>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{formatCurrency(spent)} spent</span>
                        <span className={pct > 100 ? 'text-over' : pct >= 80 ? 'text-warn' : 'text-good'}>
                          {formatCurrency(budget - spent)} {pct > 100 ? 'over' : 'left'}
                        </span>
                      </div>
                      <ProgressBar pct={pct} height={5} />
                    </>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      {spent > 0 ? `Spent ${formatCurrency(spent)} (no budget set)` : 'No budget · No spend'}
                    </p>
                  )}
                </div>
              )
            })}
          </Card>
        )}
      </div>
    </div>
  )
}

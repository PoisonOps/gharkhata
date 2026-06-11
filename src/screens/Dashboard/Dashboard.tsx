import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { computeBalance } from '../../lib/balance'
import { formatCurrency } from '../../lib/format'
import { daysLeftInMonth, isDueSoon, nextCycleDate, nextFixedDate, toDateStr } from '../../lib/dates'
import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import { MonthPicker } from '../../components/MonthPicker'
import { Spinner } from '../../components/Spinner'
import { Avatar } from '../../components/Avatar'
import type { Expense, Category, Profile } from '../../lib/supabase'

export function Dashboard() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const navigate = useNavigate()

  const { profile, partner, categories, expenses: ctxExpenses,
    settlements, recurring, refetchExpenses, loading } = useApp()

  // If month picker changes, fetch that month
  const handleMonthChange = (y: number, m: number) => {
    setYear(y); setMonth(m)
    refetchExpenses(y, m)
  }

  if (loading || !profile) return <div className="h-screen flex items-center justify-center"><Spinner /></div>

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const expenses = ctxExpenses

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const totalBudget = categories.reduce((s, c) => s + (c.monthly_budget ?? 0), 0)
  const hasBudget = totalBudget > 0
  const pct = hasBudget ? (totalSpent / totalBudget) * 100 : 0
  const remaining = totalBudget - totalSpent
  const daysLeft = daysLeftInMonth()
  const safePerDay = hasBudget && remaining > 0 ? remaining / daysLeft : 0

  const balance = partner ? computeBalance(profile.id, partner.id, expenses, settlements) : null

  const dueSoon = recurring.filter((r) => {
    const nextDate = r.due_type === 'cycle'
      ? toDateStr(nextCycleDate(r.last_paid_on, r.cycle_days ?? 30))
      : toDateStr(nextFixedDate(r.due_day ?? 1))
    return isDueSoon(nextDate, 7)
  })

  const catSpend: Record<string, number> = {}
  for (const e of expenses) {
    if (e.category_id) catSpend[e.category_id] = (catSpend[e.category_id] ?? 0) + e.amount
  }
  const topCats = Object.entries(catSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([id, amt]) => ({ cat: categories.find((c) => c.id === id), amt }))
    .filter((x) => x.cat)

  return (
    <div className="pb-32 pt-safe">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-xs text-zinc-400">Good {getGreeting()},</p>
          <h1 className="text-lg font-medium dark:text-zinc-100">{profile.display_name} 👋</h1>
        </div>
        <Avatar name={profile.display_name} color={profile.color} size={36} />
      </div>

      <div className="flex justify-center py-3">
        <MonthPicker year={year} month={month} onChange={handleMonthChange} />
      </div>

      <div className="px-4 space-y-3">
        {/* Spend hero */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-zinc-400">Total spent</p>
              <p className="text-3xl font-medium tabular-nums dark:text-zinc-100">
                {formatCurrency(totalSpent)}
              </p>
              {hasBudget && (
                <p className="text-xs text-zinc-400 mt-0.5">of {formatCurrency(totalBudget)} budget</p>
              )}
            </div>
            {hasBudget && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                pct > 100 ? 'bg-over/10 text-over' : pct >= 80 ? 'bg-warn/10 text-warn' : 'bg-good/10 text-good'
              }`}>
                {Math.round(pct)}%
              </span>
            )}
          </div>
          {hasBudget && <ProgressBar pct={pct} />}
          {hasBudget && isCurrentMonth && safePerDay > 0 && (
            <p className="text-xs text-zinc-400 mt-2">
              Safe to spend: <span className="text-zinc-700 dark:text-zinc-300 font-medium">{formatCurrency(safePerDay)}/day</span>
            </p>
          )}
        </Card>

        {/* Balance */}
        {partner && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={profile.display_name} color={profile.color} size={36} />
              <div className="flex-1 text-center">
                {!balance || balance.direction === 'settled' ? (
                  <p className="text-sm font-medium text-good">All settled ✓</p>
                ) : balance.direction === 'bOwes' ? (
                  <p className="text-sm dark:text-zinc-300">
                    <span className="font-medium">{partner.display_name}</span> owes you{' '}
                    <span className="font-medium text-good">{formatCurrency(balance.amount)}</span>
                  </p>
                ) : (
                  <p className="text-sm dark:text-zinc-300">
                    You owe <span className="font-medium">{partner.display_name}</span>{' '}
                    <span className="font-medium text-over">{formatCurrency(balance.amount)}</span>
                  </p>
                )}
              </div>
              <Avatar name={partner.display_name} color={partner.color} size={36} />
            </div>
          </Card>
        )}

        {/* Due this week */}
        {dueSoon.length > 0 && isCurrentMonth && (
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Due this week</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {dueSoon.map((r) => (
                <div key={r.id} className="flex-shrink-0 bg-warn/10 rounded-control px-3 py-2">
                  <p className="text-xs font-medium text-warn">{r.name}</p>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{formatCurrency(r.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top categories */}
        {topCats.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">By category</p>
            <Card className="divide-y divide-black/5 dark:divide-white/5">
              {topCats.map(({ cat, amt }) => (
                <div key={cat!.id} className="flex items-center px-4 py-3 gap-3">
                  <span className="text-xl">{cat!.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm truncate dark:text-zinc-300">{cat!.name}</p>
                      <p className="text-sm font-medium dark:text-zinc-100 ml-2 flex-shrink-0">{formatCurrency(amt)}</p>
                    </div>
                    {cat!.monthly_budget && (
                      <ProgressBar pct={(amt / cat!.monthly_budget) * 100} height={4} />
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* Recent expenses */}
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Recent</p>
          {expenses.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-3xl mb-2">🧾</p>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No expenses yet</p>
              <p className="text-xs text-zinc-400 mt-1">Tap + to log your first one.</p>
            </Card>
          ) : (
            <Card className="divide-y divide-black/5 dark:divide-white/5">
              {expenses.slice(0, 10).map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  categories={categories}
                  profile={profile}
                  partner={partner}
                  onEdit={() => navigate(`/edit-expense/${e.id}`)}
                />
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ExpenseRow({ expense, categories, profile, partner, onEdit }: {
  expense: Expense
  categories: Category[]
  profile: Profile
  partner: Profile | null
  onEdit: () => void
}) {
  const cat = categories.find((c) => c.id === expense.category_id)
  const payer = expense.paid_by === profile.id ? profile : partner
  const dateStr = new Date(expense.spent_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div className="flex items-center px-4 py-3 gap-3 active:bg-black/5 dark:active:bg-white/5" onClick={onEdit}>
      <div className="w-9 h-9 rounded-control bg-primary-tint dark:bg-primary/20 flex items-center justify-center text-lg flex-shrink-0">
        {cat?.icon ?? '🏷️'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium dark:text-zinc-200 truncate">{cat?.name ?? 'Uncategorised'}</p>
        <p className="text-xs text-zinc-400">{expense.note ? `${expense.note} · ` : ''}{dateStr}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-medium dark:text-zinc-100">{formatCurrency(expense.amount)}</p>
        {payer && <p className="text-xs text-zinc-400">{payer.display_name}</p>}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useExpenses } from '../../hooks/useExpenses'
import { useCategories } from '../../hooks/useCategories'
import { formatCurrency } from '../../lib/format'
import { monthBounds } from '../../lib/dates'
import { totalSpentBy } from '../../lib/balance'
import { Card } from '../../components/Card'
import { MonthPicker } from '../../components/MonthPicker'
import { Spinner } from '../../components/Spinner'

const COLORS = ['#534AB7', '#E06040', '#2A8D6F', '#D4852A', '#5B8DD9', '#A04DB8', '#C05070', '#3D9E7D']

export function Insights() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { user } = useAuth()
  const { profile, partner, household } = useProfile(user?.id)
  const { expenses, loading } = useExpenses(household?.id, year, month)
  const { expenses: prevExpenses } = useExpenses(
    household?.id,
    month === 1 ? year - 1 : year,
    month === 1 ? 12 : month - 1,
  )
  const { categories } = useCategories(household?.id)

  const catSpend = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) {
      if (e.category_id) map[e.category_id] = (map[e.category_id] ?? 0) + e.amount
    }
    return map
  }, [expenses])

  const donutData = useMemo(() =>
    Object.entries(catSpend)
      .map(([id, val]) => ({
        name: categories.find((c) => c.id === id)?.name ?? 'Other',
        value: val,
        icon: categories.find((c) => c.id === id)?.icon ?? '🏷️',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [catSpend, categories]
  )

  const totalBudget = categories.reduce((s, c) => s + (c.monthly_budget ?? 0), 0)

  // Cumulative daily spend + ideal pace
  const dailyData = useMemo(() => {
    const { to } = monthBounds(year, month)
    const end = new Date(to)
    const days: { day: number; spent: number; ideal: number }[] = []
    let cumulative = 0

    const daysInMonth = end.getDate()
    const sorted = [...expenses].sort((a, b) => a.spent_on.localeCompare(b.spent_on))
    let ei = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      while (ei < sorted.length && sorted[ei].spent_on <= dateStr) {
        cumulative += sorted[ei].amount
        ei++
      }
      days.push({
        day: d,
        spent: cumulative,
        ideal: totalBudget ? (totalBudget / daysInMonth) * d : 0,
      })
      // Stop at today for current month
      if (year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate()) break
    }
    return days
  }, [expenses, year, month, totalBudget, now])

  // Month comparison
  const thisMonthTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const lastMonthTotal = prevExpenses.reduce((s, e) => s + e.amount, 0)

  // Per-person split
  const mySpend = profile ? totalSpentBy(profile.id, expenses) : 0
  const partnerSpend = partner ? totalSpentBy(partner.id, expenses) : 0

  // Cooking vs ordering stat
  const cookingCats = categories.filter((c) =>
    ['Groceries & ration'].includes(c.name)
  )
  const orderingCats = categories.filter((c) =>
    ['Cravings'].includes(c.name)
  )
  const cookingSpend = cookingCats.reduce((s, c) => s + (catSpend[c.id] ?? 0), 0)
  const orderingSpend = orderingCats.reduce((s, c) => s + (catSpend[c.id] ?? 0), 0)
  const hasFoodData = cookingSpend > 0 || orderingSpend > 0

  if (loading || !profile) return <div className="h-screen flex items-center justify-center"><Spinner /></div>

  return (
    <div className="pb-32 pt-safe">
      <div className="flex items-center px-4 pt-4 pb-2">
        <h1 className="text-lg font-medium dark:text-zinc-100 flex-1">Insights</h1>
      </div>
      <div className="flex justify-center py-2">
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      <div className="px-4 space-y-4">
        {/* Donut */}
        {donutData.length > 0 ? (
          <Card className="p-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Spend by category</p>
            <div className="flex gap-4 items-center">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 min-w-0">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs dark:text-zinc-300 truncate flex-1">{d.icon} {d.name}</span>
                    <span className="text-xs font-medium dark:text-zinc-100 flex-shrink-0">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-zinc-400 text-sm">No spend data for this month yet.</p>
          </Card>
        )}

        {/* Daily pace */}
        {dailyData.length > 1 && (
          <Card className="p-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Daily cumulative spend</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} width={36} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Day ${l}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="spent" stroke="#534AB7" strokeWidth={2} dot={false} name="Spent" />
                {totalBudget > 0 && (
                  <Line type="monotone" dataKey="ideal" stroke="#EF9F27" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Ideal pace" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Month comparison */}
        <Card className="p-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Month comparison</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={[
              { name: 'Last month', value: lastMonthTotal },
              { name: 'This month', value: thisMonthTotal },
            ]} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} width={36} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]}>
                <Cell fill="#534AB7" />
                <Cell fill="#2A8D6F" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Per-person split */}
        {(mySpend > 0 || partnerSpend > 0) && profile && partner && (
          <Card className="p-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Who paid what</p>
            <div className="flex gap-3">
              {[
                { p: profile, spend: mySpend },
                { p: partner, spend: partnerSpend },
              ].map(({ p, spend }) => {
                const total = mySpend + partnerSpend
                const pct = total > 0 ? (spend / total) * 100 : 0
                return (
                  <div key={p.id} className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-xs text-zinc-500">{p.display_name}</span>
                    </div>
                    <p className="text-lg font-medium dark:text-zinc-100">{formatCurrency(spend)}</p>
                    <p className="text-xs text-zinc-400">{Math.round(pct)}% of total</p>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Cooking vs ordering */}
        {hasFoodData && (
          <Card className="p-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Cooking vs ordering</p>
            <div className="flex gap-3">
              <div className="flex-1 text-center p-3 bg-good/10 rounded-control">
                <p className="text-lg">🛒</p>
                <p className="text-sm font-medium text-good">{formatCurrency(cookingSpend)}</p>
                <p className="text-xs text-zinc-400">Groceries & ration</p>
              </div>
              <div className="flex-1 text-center p-3 bg-warn/10 rounded-control">
                <p className="text-lg">🍕</p>
                <p className="text-sm font-medium text-warn">{formatCurrency(orderingSpend)}</p>
                <p className="text-xs text-zinc-400">Cravings</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

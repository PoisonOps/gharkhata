import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import { computeBalance, totalSpentBy } from '../../lib/balance'
import { formatCurrency, formatDate } from '../../lib/format'
import { today } from '../../lib/dates'
import { Card } from '../../components/Card'
import { Avatar } from '../../components/Avatar'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Spinner'

export function Settle() {
  const { profile, partner, household, expenses, settlements, refetchSettlements, loading } = useApp()

  if (loading || !profile) return <div className="h-screen flex items-center justify-center"><Spinner /></div>

  const balance = partner ? computeBalance(profile.id, partner.id, expenses, settlements) : null

  const settleUp = async () => {
    if (!balance || balance.direction === 'settled' || !partner || !household) return
    const [from, to] = balance.direction === 'bOwes'
      ? [partner.id, profile.id]
      : [profile.id, partner.id]
    await supabase.from('settlements').insert({
      household_id: household.id,
      amount: balance.amount,
      from_profile: from,
      to_profile: to,
      settled_on: today(),
    })
    await refetchSettlements()
  }

  const mySpend = totalSpentBy(profile.id, expenses)
  const partnerSpend = partner ? totalSpentBy(partner.id, expenses) : 0

  return (
    <div className="pb-32 pt-safe">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-medium dark:text-zinc-100">Settle up</h1>
      </div>

      <div className="px-4 space-y-3">
        <Card className="p-5">
          {partner ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={profile.display_name} color={profile.color} size={44} />
                  <p className="text-xs text-zinc-400">{profile.display_name}</p>
                  <p className="text-sm font-medium dark:text-zinc-200">{formatCurrency(mySpend)}</p>
                </div>
                <div className="flex-1 text-center">
                  {!balance || balance.direction === 'settled' ? (
                    <div>
                      <p className="text-2xl">🎉</p>
                      <p className="text-sm font-medium text-good">All settled</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-zinc-400 mb-1">
                        {balance.direction === 'bOwes' ? `${partner.display_name} owes` : `You owe ${partner.display_name}`}
                      </p>
                      <p className="text-xl font-medium text-primary">{formatCurrency(balance.amount)}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Avatar name={partner.display_name} color={partner.color} size={44} />
                  <p className="text-xs text-zinc-400">{partner.display_name}</p>
                  <p className="text-sm font-medium dark:text-zinc-200">{formatCurrency(partnerSpend)}</p>
                </div>
              </div>
              {balance && balance.direction !== 'settled' && (
                <button
                  onClick={settleUp}
                  className="w-full h-11 bg-primary text-white rounded-control font-medium text-sm active:scale-[0.99] transition-transform"
                >
                  Record settlement — {formatCurrency(balance.amount)}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-zinc-400">Partner hasn't joined yet.</p>
            </div>
          )}
        </Card>

        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">History</p>
          {settlements.length === 0 ? (
            <EmptyState icon="📜" title="No settlements yet" />
          ) : (
            <Card className="divide-y divide-black/5 dark:divide-white/5">
              {settlements.map((s) => {
                const fromP = s.from_profile === profile.id ? profile : partner
                const toP = s.to_profile === profile.id ? profile : partner
                return (
                  <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-good/10 flex items-center justify-center text-sm">✓</div>
                    <div className="flex-1">
                      <p className="text-sm dark:text-zinc-200">{fromP?.display_name ?? '?'} → {toP?.display_name ?? '?'}</p>
                      <p className="text-xs text-zinc-400">{formatDate(s.settled_on)}</p>
                    </div>
                    <p className="text-sm font-medium text-good">{formatCurrency(s.amount)}</p>
                  </div>
                )
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

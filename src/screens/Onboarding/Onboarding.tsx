import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DEFAULT_CATEGORIES } from '../../lib/defaultCategories'
import type { DefaultCategory } from '../../lib/defaultCategories'

const AVATAR_COLORS = [
  '#534AB7', '#E06040', '#2A8D6F', '#D4852A', '#5B8DD9', '#A04DB8', '#C05070', '#3D9E7D',
]

interface OnboardingProps {
  userEmail: string
}

type Step = 'household' | 'profile' | 'invite' | 'categories' | 'budgets' | 'done'

export function Onboarding({ userEmail }: OnboardingProps) {
  const [step, setStep] = useState<Step>('household')
  const [householdName, setHouseholdName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [color, setColor] = useState(AVATAR_COLORS[0])
  const [householdId, setHouseholdId] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joining, setJoining] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(
    new Set(DEFAULT_CATEGORIES.map((_, i) => i))
  )
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createHousehold = async () => {
    if (!householdName.trim()) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('create_household_for_user', {
      p_name: householdName.trim(),
    })
    if (err || !data) { setError(err?.message ?? 'Failed to create household'); setLoading(false); return }
    setHouseholdId(data.id)
    setJoinCode(data.join_code)
    setStep('profile')
    setLoading(false)
  }

  const saveProfile = async () => {
    if (!displayName.trim()) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.rpc('upsert_my_profile', {
      p_household_id: householdId,
      p_display_name: displayName.trim(),
      p_color: color,
    })
    if (err) { setError(err.message); setLoading(false); return }
    setStep('invite')
    setLoading(false)
  }

  const joinByCode = async () => {
    if (!joinCodeInput.trim()) return
    setJoining(true)
    setError(null)
    const { data, error: err } = await supabase.rpc('join_household_by_code', {
      p_code: joinCodeInput.trim(),
      p_display_name: displayName.trim() || userEmail.split('@')[0],
      p_color: color,
    })
    if (err) { setError(err.message); setJoining(false); return }
    if (data?.error) { setError(data.error); setJoining(false); return }
    window.location.reload()
    setJoining(false)
  }

  const saveCategories = async () => {
    const chosen = DEFAULT_CATEGORIES.filter((_, i) => selectedCategories.has(i))
    setLoading(true)
    setError(null)
    const rows = chosen.map((c: DefaultCategory, idx: number) => ({
      household_id: householdId,
      name: c.name,
      icon: c.icon,
      type: c.type,
      sort_order: idx,
      is_default: true,
      monthly_budget: null,
    }))
    const { error: err } = await supabase.from('categories').insert(rows)
    if (err) { setError(err.message); setLoading(false); return }
    setStep('budgets')
    setLoading(false)
  }

  const saveBudgets = async () => {
    setLoading(true)
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .eq('household_id', householdId)

    for (const cat of cats ?? []) {
      const val = budgets[cat.name]
      if (val && Number(val) > 0) {
        await supabase
          .from('categories')
          .update({ monthly_budget: Number(val) })
          .eq('id', cat.id)
      }
    }
    setLoading(false)
    window.location.reload()
  }

  const toggleCategory = (idx: number) => {
    const next = new Set(selectedCategories)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedCategories(next)
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-zinc-950 flex flex-col">
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-6 py-10">
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-8">
          {(['household', 'profile', 'invite', 'categories', 'budgets'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= (['household', 'profile', 'invite', 'categories', 'budgets'] as Step[]).indexOf(step)
                  ? 'bg-primary' : 'bg-black/10 dark:bg-white/10'
              }`}
            />
          ))}
        </div>

        {step === 'household' && (
          <div className="flex flex-col flex-1">
            <div className="mb-8">
              <span className="text-4xl">🏠</span>
              <h2 className="text-xl font-medium mt-3 dark:text-zinc-100">Name your home</h2>
              <p className="text-sm text-zinc-400 mt-1">What do you call your shared space?</p>
            </div>
            <input
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Our Flat"
              className="w-full h-12 px-4 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && createHousehold()}
            />
            {error && <p className="text-sm text-over mt-2">{error}</p>}
            <div className="mt-auto pt-6">
              <button
                onClick={createHousehold}
                disabled={loading || !householdName.trim()}
                className="w-full h-12 bg-primary text-white rounded-control font-medium text-sm disabled:opacity-50 active:scale-[0.99] transition-transform"
              >
                {loading ? 'Creating…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <div className="flex flex-col flex-1">
            <div className="mb-8">
              <span className="text-4xl">👤</span>
              <h2 className="text-xl font-medium mt-3 dark:text-zinc-100">Your name & colour</h2>
              <p className="text-sm text-zinc-400 mt-1">How should your partner see you?</p>
            </div>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your first name"
              className="w-full h-12 px-4 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-4"
            />
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Pick an accent colour</p>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-full transition-transform active:scale-95 ${color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {error && <p className="text-sm text-over mt-2">{error}</p>}
            <div className="mt-auto pt-6">
              <button
                onClick={saveProfile}
                disabled={loading || !displayName.trim()}
                className="w-full h-12 bg-primary text-white rounded-control font-medium text-sm disabled:opacity-50 active:scale-[0.99] transition-transform"
              >
                {loading ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'invite' && (
          <div className="flex flex-col flex-1">
            <div className="mb-8">
              <span className="text-4xl">🔗</span>
              <h2 className="text-xl font-medium mt-3 dark:text-zinc-100">Invite your partner</h2>
              <p className="text-sm text-zinc-400 mt-1">Share your join code or they can enter theirs</p>
            </div>

            <div className="bg-primary-tint dark:bg-primary/10 rounded-card p-5 mb-6 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Your join code</p>
              <p className="text-3xl font-medium tracking-[0.2em] text-primary">{joinCode}</p>
              <button
                onClick={() => navigator.clipboard.writeText(joinCode)}
                className="mt-2 text-xs text-primary/70"
              >
                Copy
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/10 dark:border-white/10" /></div>
              <div className="relative flex justify-center text-xs text-zinc-400 bg-surface dark:bg-zinc-950 px-3">or join with a code</div>
            </div>

            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full h-12 px-4 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-2"
            />
            {error && <p className="text-sm text-over mt-1 text-center">{error}</p>}
            <button
              onClick={joinByCode}
              disabled={joining || joinCodeInput.length < 6}
              className="w-full h-12 border border-primary text-primary rounded-control font-medium text-sm disabled:opacity-50 active:scale-[0.99] transition-transform"
            >
              {joining ? 'Joining…' : 'Join household'}
            </button>

            <div className="mt-auto pt-6">
              <button
                onClick={() => setStep('categories')}
                className="w-full h-12 bg-primary text-white rounded-control font-medium text-sm active:scale-[0.99] transition-transform"
              >
                Continue (invite later)
              </button>
            </div>
          </div>
        )}

        {step === 'categories' && (
          <div className="flex flex-col flex-1">
            <div className="mb-6">
              <span className="text-4xl">🗂️</span>
              <h2 className="text-xl font-medium mt-3 dark:text-zinc-100">Pick your categories</h2>
              <p className="text-sm text-zinc-400 mt-1">Tap to toggle. You can change these later.</p>
            </div>

            {(['fixed', 'variable', 'irregular'] as const).map((type) => (
              <div key={type} className="mb-5">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2 capitalize">{type}</p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CATEGORIES.map((cat, i) => (
                    cat.type === type && (
                      <button
                        key={i}
                        onClick={() => toggleCategory(i)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedCategories.has(i)
                            ? 'bg-primary text-white'
                            : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    )
                  ))}
                </div>
              </div>
            ))}

            {error && <p className="text-sm text-over mt-2">{error}</p>}
            <div className="mt-auto pt-6">
              <button
                onClick={saveCategories}
                disabled={loading || selectedCategories.size === 0}
                className="w-full h-12 bg-primary text-white rounded-control font-medium text-sm disabled:opacity-50 active:scale-[0.99] transition-transform"
              >
                {loading ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'budgets' && (
          <div className="flex flex-col flex-1">
            <div className="mb-6">
              <span className="text-4xl">💰</span>
              <h2 className="text-xl font-medium mt-3 dark:text-zinc-100">Set monthly budgets</h2>
              <p className="text-sm text-zinc-400 mt-1">Optional. You can fill these in later too.</p>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1">
              {DEFAULT_CATEGORIES.filter((_, i) => selectedCategories.has(i)).map((cat) => (
                <div key={cat.name} className="flex items-center gap-3">
                  <span className="text-xl w-7 text-center">{cat.icon}</span>
                  <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                  <div className="relative w-28">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₹</span>
                    <input
                      type="number"
                      value={budgets[cat.name] ?? ''}
                      onChange={(e) => setBudgets((b) => ({ ...b, [cat.name]: e.target.value }))}
                      placeholder="—"
                      className="w-full h-10 pl-7 pr-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 space-y-2">
              <button
                onClick={saveBudgets}
                disabled={loading}
                className="w-full h-12 bg-primary text-white rounded-control font-medium text-sm disabled:opacity-50 active:scale-[0.99] transition-transform"
              >
                {loading ? 'Saving…' : 'All done — open GharKhata'}
              </button>
              <button
                onClick={() => { setLoading(false); window.location.reload() }}
                className="w-full h-12 text-zinc-400 text-sm"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

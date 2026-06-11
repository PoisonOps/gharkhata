import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import { toInputDate } from '../../lib/format'
import type { SplitType } from '../../lib/supabase'
import { Spinner } from '../../components/Spinner'

const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Equal' },
  { value: 'custom', label: 'Custom' },
  { value: 'mine', label: 'Mine only' },
  { value: 'theirs', label: 'Theirs only' },
]

export function AddExpense() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)

  const { profile, partner, household, categories, loading } = useApp()

  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [paidBy, setPaidBy] = useState<string>('')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [splitRatio, setSplitRatio] = useState(50)
  const [note, setNote] = useState('')
  const [spentOn, setSpentOn] = useState(toInputDate())
  const [saving, setSaving] = useState(false)
  const [fetching, setFetching] = useState(isEditing)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile && !paidBy) setPaidBy(profile.id)
  }, [profile, paidBy])

  useEffect(() => {
    if (!id) return
    supabase.from('expenses').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setAmount(String(data.amount))
        setCategoryId(data.category_id)
        setPaidBy(data.paid_by)
        setSplitType(data.split_type)
        setSplitRatio(data.split_ratio ?? 50)
        setNote(data.note ?? '')
        setSpentOn(data.spent_on)
      }
      setFetching(false)
    })
  }, [id])

  const save = async () => {
    if (!amount || !household || !paidBy) return
    setSaving(true)
    setError(null)

    const payload = {
      household_id: household.id,
      amount: parseFloat(amount),
      category_id: categoryId,
      paid_by: paidBy,
      split_type: splitType,
      split_ratio: splitType === 'custom' ? splitRatio : null,
      note: note.trim() || null,
      spent_on: spentOn,
    }

    let err
    if (isEditing && id) {
      ({ error: err } = await supabase.from('expenses').update(payload).eq('id', id))
    } else {
      ({ error: err } = await supabase.from('expenses').insert(payload))
    }

    if (err) { setError(err.message); setSaving(false); return }
    navigate(-1)
  }

  const del = async () => {
    if (!id || !confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    navigate(-1)
  }

  if (fetching || loading || !profile) return <div className="h-screen flex items-center justify-center"><Spinner /></div>

  return (
    <div className="min-h-screen bg-surface dark:bg-zinc-950 flex flex-col pt-safe">
      <div className="flex items-center px-4 h-14 gap-3 border-b border-black/10 dark:border-white/10">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <h2 className="text-base font-medium dark:text-zinc-100 flex-1">
          {isEditing ? 'Edit expense' : 'Add expense'}
        </h2>
        {isEditing && (
          <button onClick={del} className="text-over text-sm px-2 py-1">Delete</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">
        <div className="text-center">
          <div className="relative inline-block">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl text-zinc-400 -ml-6">₹</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="text-5xl font-medium w-48 text-center bg-transparent border-none outline-none dark:text-zinc-100 placeholder-zinc-200 dark:placeholder-zinc-700"
            />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors ${
                  c.id === categoryId
                    ? 'bg-primary text-white'
                    : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <span>{c.icon}</span>
                <span className="whitespace-nowrap">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {partner && (
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-2">Paid by</p>
            <div className="flex gap-2">
              {[profile, partner].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPaidBy(p.id)}
                  className={`flex-1 h-10 rounded-control text-sm font-medium transition-colors ${
                    paidBy === p.id
                      ? 'bg-primary text-white'
                      : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {p.display_name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">Split</p>
          <div className="flex gap-2">
            {SPLIT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSplitType(value)}
                className={`flex-1 h-10 rounded-control text-xs font-medium transition-colors ${
                  splitType === value
                    ? 'bg-primary text-white'
                    : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {splitType === 'custom' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>{profile.display_name}: {splitRatio}%</span>
                <span>{partner?.display_name ?? 'Partner'}: {100 - splitRatio}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={splitRatio}
                onChange={(e) => setSplitRatio(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">Note (optional)</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was this for?"
            className="w-full h-10 px-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">Date</p>
          <input
            type="date"
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
            className="w-full h-10 px-3 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {error && <p className="text-sm text-over">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-surface/90 dark:bg-zinc-950/90 backdrop-blur border-t border-black/10 dark:border-white/10">
        <button
          onClick={save}
          disabled={saving || !amount || parseFloat(amount) <= 0}
          className="w-full h-12 bg-primary text-white rounded-control font-medium disabled:opacity-50 active:scale-[0.99] transition-transform"
        >
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </div>
  )
}

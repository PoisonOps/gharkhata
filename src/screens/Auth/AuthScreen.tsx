import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Try sign in first; if no account exists, sign up automatically
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

    if (!signInErr) { setLoading(false); return }

    if (signInErr.message.toLowerCase().includes('invalid login credentials') ||
        signInErr.message.toLowerCase().includes('invalid credentials')) {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) setError(signUpErr.message)
    } else {
      setError(signInErr.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-2xl font-medium text-zinc-900 dark:text-zinc-100">GharKhata</h1>
          <p className="text-sm text-zinc-400 mt-1">Your home's shared budget</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full h-12 px-4 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full h-12 px-4 rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-over">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-white rounded-control font-medium text-sm active:scale-[0.99] transition-transform disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
          <p className="text-xs text-center text-zinc-400">
            New here? Just enter an email and password to create your account.
          </p>
        </form>
      </div>
    </div>
  )
}

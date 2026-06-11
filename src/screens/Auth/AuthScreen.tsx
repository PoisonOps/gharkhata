import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (err) setError(err.message)
    else setSent(true)
    setLoading(false)
  }

  const handleDigit = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = digit
    setCode(next)
    if (digit && i < 5) inputs.current[i + 1]?.focus()
    if (next.every(d => d !== '')) verifyCode(next.join(''))
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      verifyCode(pasted)
    }
  }

  const verifyCode = async (token: string) => {
    setVerifying(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (err) {
      setError('Invalid or expired code. Try again.')
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    }
    setVerifying(false)
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

        {!sent ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 block">
                Email address
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
            {error && <p className="text-sm text-over">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-white rounded-control font-medium text-sm active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📬</div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Enter the 6-digit code</p>
              <p className="text-sm text-zinc-400 mt-1">
                Sent to <strong>{email}</strong>
              </p>
            </div>

            <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  className="w-11 h-14 text-center text-xl font-medium rounded-control border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              ))}
            </div>

            {verifying && (
              <p className="text-center text-sm text-zinc-400">Verifying…</p>
            )}
            {error && <p className="text-center text-sm text-over mt-1">{error}</p>}

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => { setSent(false); setCode(['', '', '', '', '', '']); setError(null) }}
                className="text-sm text-zinc-400"
              >
                ← Change email
              </button>
              <button
                onClick={() => sendCode({ preventDefault: () => {} } as React.FormEvent)}
                disabled={loading}
                className="text-sm text-primary disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

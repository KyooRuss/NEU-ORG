import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'

import { supabase } from '../lib/supabase'

type LoginPageProps = {
  // A message from App, e.g. when a student tries to open the dashboard.
  notice: string | null
  onDismissNotice: () => void
}

export default function LoginPage({ notice, onDismissNotice }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On success, App notices the new session and shows the dashboard.
  async function handleLogin() {
    setError(null)
    onDismissNotice()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (error) {
      setError(error.message)
    }
  }

  const message = error ?? notice

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-r from-brand-navy to-brand-blue px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-surface px-8 py-12 shadow-2xl sm:px-12">
        <div className="mb-10 text-center">
          {/* The logo stands in for the "O" in "NEU ORG". */}
          <h1
            aria-label="NEU ORG"
            className="flex items-center justify-center text-4xl leading-none font-bold tracking-tight text-brand-navy"
          >
            <span aria-hidden="true">NEU</span>
            <img
              src="/images/neu-org-logo.png"
              alt=""
              width={44}
              height={44}
              className="ml-2 size-11 shrink-0"
            />
            <span aria-hidden="true">RG</span>
          </h1>
          <p className="mt-2 text-[11px] text-zinc-600">Manage and Track Organizations</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleLogin()
          }}
        >
          <div className="space-y-4">
            <label className="flex h-11 items-center gap-3 rounded-md border border-zinc-300 bg-field px-3 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20">
              <Mail size={16} className="shrink-0 text-zinc-800" aria-hidden="true" />
              <span className="sr-only">Email address</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email Address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500"
              />
            </label>

            <label className="flex h-11 items-center gap-3 rounded-md border border-zinc-300 bg-field px-3 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20">
              <Lock size={16} className="shrink-0 text-zinc-800" aria-hidden="true" />
              <span className="sr-only">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500"
              />
            </label>
          </div>

          {/* Passwords are reset in the mobile app; the account is the same on both. */}
          <p className="mt-3 text-xs leading-relaxed text-zinc-600">
            Forgot your password, or signed up with Google? Open the NEU ORG mobile app, type your email, and tap{' '}
            <strong className="font-semibold">Forgot password?</strong>. Then log in here with your new password.
          </p>

          {message && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 h-11 w-full rounded-full bg-linear-to-r from-brand-navy to-brand-blue text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </main>
  )
} 

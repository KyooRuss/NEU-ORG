import { Lock, Mail } from 'lucide-react'
import { useState } from 'react'

import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedInAs, setSignedInAs] = useState<string | null>(null)

  async function handleLogin() {
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // TODO(Step 5): go to the dashboard based on the user's role.
    setSignedInAs(data.user.email ?? email)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-r from-brand-navy to-brand-blue px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-surface px-8 py-12 shadow-2xl sm:px-12">
        <div className="mb-10 flex items-center justify-center gap-1">
          {/* TODO: replace with the OrgFinder logo image. */}
          <div
            aria-hidden="true"
            className="size-12 shrink-0 rounded-full bg-linear-to-br from-violet-500 via-brand-blue to-sky-400"
          />
          <div>
            <p className="text-4xl leading-none font-bold tracking-tight text-brand-navy">
              RGFINDER
            </p>
            <p className="mt-1 text-[11px] text-zinc-600">Manage and Track Organizations</p>
          </div>
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

          <div className="mt-2 flex justify-end">
            {/* TODO: password reset flow. */}
            <button type="button" className="text-xs text-brand-blue hover:underline">
              Forgot password?
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {signedInAs && (
            <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Signed in as {signedInAs}
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

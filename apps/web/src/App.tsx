import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

import { fetchProfile, type Profile } from './lib/profile'
import { supabase } from './lib/supabase'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [loadedProfile, setLoadedProfile] = useState<Profile | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionChecked(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  // Ignore a profile left over from a previous login.
  const profile = loadedProfile?.id === userId ? loadedProfile : null

  // Load the role whenever a different user logs in. Kept out of
  // onAuthStateChange because Supabase calls inside it can deadlock.
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    fetchProfile(userId)
      .then(async (loaded) => {
        if (cancelled) return
        if (!loaded || loaded.role === 'student') {
          setNotice(
            loaded
              ? 'This dashboard is for officers and admins. Students use the NEU ORG mobile app.'
              : 'Your account has no profile yet. Please contact the OSAS admin.',
          )
          await supabase.auth.signOut()
          return
        }
        setLoadedProfile(loaded)
      })
      .catch(async (error: Error) => {
        if (cancelled) return
        setNotice(`Could not load your account: ${error.message}`)
        await supabase.auth.signOut()
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  if (!sessionChecked || (session && !profile)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface text-sm text-zinc-500">
        Loading…
      </main>
    )
  }

  if (!session || !profile) {
    return <LoginPage notice={notice} onDismissNotice={() => setNotice(null)} />
  }

  return <DashboardPage profile={profile} />
}

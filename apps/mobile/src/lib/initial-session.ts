import type { Session } from '@supabase/supabase-js';

import { nextScreen, type StudentScreen } from './onboarding';
import { fetchProfile } from './profile';
import { supabase } from './supabase';

export type FirstScreen = '/login' | StudentScreen;

let check: Promise<FirstScreen> | null = null;

// The screen to open when the app starts, worked out once. The splash screen
// stays up until it's known, and index.tsx opens it.
export function getFirstScreen() {
  check ??= decideFirstScreen();
  return check;
}

async function decideFirstScreen(): Promise<FirstScreen> {
  let session: Session | null = null;
  try {
    session = (await supabase.auth.getSession()).data.session;
  } catch {
    return '/login';
  }
  if (!session) return '/login';

  try {
    const profile = await fetchProfile(session.user.id);
    // Same rule as the login screen: admins use the web dashboard.
    if (!profile || profile.role === 'admin') {
      await supabase.auth.signOut();
      return '/login';
    }
    return nextScreen(profile);
  } catch {
    // Offline or the profile couldn't be read: logging in again checks everything.
    return '/login';
  }
}

import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

let check: Promise<Session | null> | null = null;

// The login session saved on the phone, read once when the app opens. The splash
// screen waits for it, and the first screen uses it to open home or login.
export function getInitialSession() {
  check ??= supabase.auth
    .getSession()
    .then(({ data }) => data.session)
    .catch(() => null);
  return check;
}

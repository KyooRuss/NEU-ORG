import './local-storage';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// True while Expo pre-renders web pages in Node. Checking `window` instead of
// `localStorage`, because Node 25+ has its own broken `localStorage` global.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: isServer ? undefined : localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the login session only while the app is open, to save battery.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

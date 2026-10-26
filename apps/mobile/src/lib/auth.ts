import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Signing in: "Continue with Google" finds out which NEU account the student
// uses, then a 6-digit code is emailed to it, and entering that code is what
// actually signs them in. Only @neu.edu.ph accounts are allowed (the database
// refuses others too, see the school_emails_only migration).

export const SCHOOL_DOMAIN = 'neu.edu.ph';

export function isSchoolEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`);
}

// Where Google sends the student back to: mobile://auth-callback in a real
// build, an exp:// link in Expo Go. Both are in Supabase's redirect URLs.
const redirectTo = Linking.createURL('auth-callback');

// Shows Google's account chooser and returns the email the student picked, or
// null if they closed it. The Google sign-in itself is signed out again right
// away: the emailed code is what signs them in.
export async function chooseGoogleAccount(): Promise<string | null> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Suggest school accounts, and always let them pick (not the last one used).
      queryParams: { hd: SCHOOL_DOMAIN, prompt: 'select_account' },
    },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;

  const params = readParams(result.url);
  if (params.error_description || params.error) {
    throw new Error(params.error_description ?? params.error);
  }
  if (!params.access_token || !params.refresh_token) {
    throw new Error('Google sign-in didn’t finish. Please try again.');
  }

  const session = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (session.error) throw session.error;
  const email = session.data.user?.email ?? null;
  // Only this phone's Google session; the student's other devices stay signed in.
  await supabase.auth.signOut({ scope: 'local' });

  if (!email) throw new Error('Your Google account has no email address.');
  return email;
}

// Emails a 6-digit code. The account already exists after the Google step.
export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw error;
}

// Signs in with the emailed code. Returns the user's id.
export async function verifyCode(email: string, code: string): Promise<string> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
  if (!data.user) throw new Error('That code didn’t work. Please try again.');
  return data.user.id;
}

// A message a student can act on, for any sign-in error.
export function signInErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('saving new user') || lower.includes('neu.edu.ph')) {
    return `Use your NEU Google account (@${SCHOOL_DOMAIN}).`;
  }
  if (lower.includes('expired') || lower.includes('invalid')) {
    return 'That code is wrong or has expired. Check the latest email, or send a new code.';
  }
  if (lower.includes('rate limit') || lower.includes('security purposes') || lower.includes('too many')) {
    return 'Too many codes were sent. Please wait a minute and try again.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Check your internet connection and try again.';
  }
  return message;
}

// The values in the link Google sends back, from after the "#" (tokens) or the
// "?" (errors). Parsed by hand: React Native's URLSearchParams is incomplete.
function readParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = [url.split('#')[1], url.split('?')[1]?.split('#')[0]];
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (key) params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return params;
}

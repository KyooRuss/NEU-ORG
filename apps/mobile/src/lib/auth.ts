import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Signing in, two ways that end the same: email + password, or "Continue with
// Google". Either one finds out which NEU account it is, then a 6-digit code is
// emailed to it, and entering that code is what signs the student in. New
// accounts must be @neu.edu.ph (the database refuses others too, see the
// school_emails_only migration).

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

// Which kind of code was emailed, so Verify and Resend use the matching one:
// signing in to an existing account, confirming a new account, or resetting a
// forgotten password.
export type CodeKind = 'email' | 'signup' | 'recovery';

const WRONG_PASSWORD =
  'Wrong password. If you usually use Continue with Google, use that, or tap “Forgot password?” to set one.';

// The email + password Login button. Emails a code and returns its kind, or,
// in development only, signs a seeded test account straight in (their
// mailboxes don't exist) and returns its user id.
export async function passwordStep(
  email: string,
  password: string,
): Promise<{ kind: CodeKind } | { userId: string }> {
  const cleanEmail = email.trim().toLowerCase();

  const signIn = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (!signIn.error) {
    if (__DEV__ && !isSchoolEmail(cleanEmail)) return { userId: signIn.data.user.id };
    // The password found the account; the emailed code is what signs them in.
    await supabase.auth.signOut({ scope: 'local' });
    await sendCode(cleanEmail, 'email');
    return { kind: 'email' };
  }

  const reason = signIn.error.message.toLowerCase();
  // Signed up before but never entered the code: send a new one.
  if (reason.includes('not confirmed')) {
    await sendCode(cleanEmail, 'signup');
    return { kind: 'signup' };
  }
  if (!reason.includes('invalid login credentials')) throw signIn.error;

  // Either a wrong password or no account yet. Trying to sign up tells which.
  if (!isSchoolEmail(cleanEmail)) throw new Error(`Use your NEU email (@${SCHOOL_DOMAIN}).`);
  const signUp = await supabase.auth.signUp({ email: cleanEmail, password });
  if (signUp.error) throw signUp.error;
  // Supabase answers this way for an email that already has an account.
  if (signUp.data.user && signUp.data.user.identities?.length === 0) throw new Error(WRONG_PASSWORD);
  // With "Confirm email" off, sign-up signs in right away; still require the code.
  if (signUp.data.session) {
    await supabase.auth.signOut({ scope: 'local' });
    await sendCode(cleanEmail, 'email');
    return { kind: 'email' };
  }
  // A new account: Supabase emailed its confirmation code.
  return { kind: 'signup' };
}

// Emails a 6-digit code of the given kind. For 'email' the account already
// exists (after the password or Google step).
export async function sendCode(email: string, kind: CodeKind) {
  const { error } =
    kind === 'email'
      ? await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      : kind === 'signup'
        ? await supabase.auth.resend({ type: 'signup', email })
        : await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Signs in with the emailed code. Returns the user's id.
export async function verifyCode(email: string, code: string, kind: CodeKind): Promise<string> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: kind });
  if (error) throw error;
  if (!data.user) throw new Error('That code didn’t work. Please try again.');
  return data.user.id;
}

// After a 'recovery' code: saves the new password on the signed-in account.
export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// A message a student can act on, for any sign-in error.
export function signInErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('saving new user') || lower.includes('only neu accounts')) {
    return `Use your NEU account (@${SCHOOL_DOMAIN}).`;
  }
  if (lower.includes('already registered')) return WRONG_PASSWORD;
  if (lower.includes('password should') || lower.includes('weak password')) {
    return 'Choose a stronger password (at least 8 characters, with letters and numbers).';
  }
  if (lower.includes('same password') || lower.includes('different from the old')) {
    return 'Choose a password different from your old one.';
  }
  // Supabase: "Token has expired or is invalid".
  if (lower.includes('token') || lower.includes('expired')) {
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

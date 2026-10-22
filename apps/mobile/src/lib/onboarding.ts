import { fetchProfile, type Profile } from './profile';
import { supabase } from './supabase';
import { needsTermsAcceptance } from './terms';

export type StudentScreen = '/terms' | '/assessment' | '/home';

// Where a logged-in student goes next: first the Terms & Privacy Policy, then the
// Profile Assessment, then home. Each step is shown only until it's done.
export function nextScreen(profile: Profile): StudentScreen {
  if (needsTermsAcceptance(profile)) return '/terms';
  if (!profile.assessment_completed_at) return '/assessment';
  return '/home';
}

// The same, for the logged-in user, after a step has just been completed.
export async function nextScreenForCurrentUser(): Promise<StudentScreen> {
  const { data } = await supabase.auth.getUser();
  const profile = data.user ? await fetchProfile(data.user.id) : null;
  return profile ? nextScreen(profile) : '/home';
}

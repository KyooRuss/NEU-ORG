import type { Profile } from './profile';
import { supabase } from './supabase';

// Change this whenever the text below changes: everyone is asked to accept again.
export const TERMS_VERSION = '2026-10-v1';

export type TermsSection = { title: string; body: string };

// The Terms & Privacy Policy students accept after their first login
// (Data Privacy Act of 2012, Republic Act No. 10173).
export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. About NEU-ORG',
    body:
      'NEU-ORG is the student organizations app of New Era University Main Campus, managed by the Office of Student Affairs and Services (OSAS). It helps you find organizations, follow their events and announcements, and apply to join them. By using NEU-ORG you agree to these Terms and to how we handle your personal information as described below.',
  },
  {
    title: '2. Information we collect',
    body:
      'We collect your name and institutional email from your account; your student number, year level and department or program; the interests you choose; the organizations you apply to or join; and the feedback, ratings and comments you give on events.',
  },
  {
    title: '3. How we use your information',
    body:
      'We use your information to show you organizations, events and announcements; to process your membership applications; to recommend organizations that match your interests; and to summarize event feedback so organizations can improve. Recommendations are worked out within NEU-ORG itself by comparing your interests with each organization’s information. Your information is not sent to outside AI services and is never sold.',
  },
  {
    title: '4. Who can see your information',
    body:
      'OSAS administrators can see student accounts to manage the app. Officers of an organization you apply to or join can see the details needed to review your application and manage its members. Other students cannot see your personal information.',
  },
  {
    title: '5. How we protect and keep it',
    body:
      'Access to your information is limited by role, and only people who need it for the purposes above can see it. We keep your information while you use NEU-ORG and for as long as the University requires, then delete or anonymize it.',
  },
  {
    title: '6. Your rights',
    body:
      'Under the Data Privacy Act of 2012, you have the right to be informed about how your personal information is used, to access it, to have mistakes corrected, to object to its use, and to have it deleted or blocked when it is no longer needed or was used unlawfully.',
  },
  {
    title: '7. Using the app responsibly',
    body:
      'Give accurate information, keep your password private, and be respectful in your feedback and comments. OSAS may suspend accounts that misuse the app.',
  },
  {
    title: '8. Changes to these terms',
    body:
      'If these Terms change, you will be asked to read and accept the new version before you continue using NEU-ORG.',
  },
];

// True when the user hasn't accepted the current version yet.
export function needsTermsAcceptance(profile: Profile) {
  return profile.terms_version !== TERMS_VERSION;
}

// Records that the logged-in user accepted the current version.
export async function acceptTerms() {
  const { error } = await supabase.rpc('accept_terms', { version: TERMS_VERSION });
  if (error) throw error;
}

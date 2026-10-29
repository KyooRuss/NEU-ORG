import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// The printed application form students bring to their interview. Each
// organization's officers upload their own on the web dashboard.
export type ApplicationForm = { name: string; url: string };

const FORM_BUCKET = 'org-forms';

// Null when the organization hasn't uploaded one.
export async function fetchApplicationForm(organizationId: string): Promise<ApplicationForm | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('application_form_path, application_form_name')
    .eq('id', organizationId)
    .maybeSingle();
  if (error) throw error;
  const path = data?.application_form_path as string | null | undefined;
  if (!path) return null;
  return {
    name: (data?.application_form_name as string | null) || 'Application form',
    url: supabase.storage.from(FORM_BUCKET).getPublicUrl(path).data.publicUrl,
  };
}

// Opens it in the in-app browser, where the student can save or print it.
export async function openApplicationForm(form: ApplicationForm) {
  await WebBrowser.openBrowserAsync(form.url);
}

// Where the student stands with an organization. Declined counts as "none",
// since they can apply again.
export type ApplyState = 'none' | 'pending' | 'member';

// The IDs of the organizations the student is a member of.
export async function fetchMyMemberOrgIds(profileId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('profile_id', profileId);
  if (error) throw error;
  return new Set(data.map((row) => row.organization_id as string));
}

// The student's state for every organization they've joined or applied to.
// Organizations missing from the map are "none".
export async function fetchMyApplyStates(profileId: string): Promise<Map<string, ApplyState>> {
  const [memberOrgIds, applications] = await Promise.all([
    fetchMyMemberOrgIds(profileId),
    supabase
      .from('membership_applications')
      .select('organization_id')
      .eq('profile_id', profileId)
      .eq('status', 'pending'),
  ]);
  if (applications.error) throw applications.error;

  const states = new Map<string, ApplyState>();
  for (const row of applications.data) states.set(row.organization_id, 'pending');
  // Membership wins over an application.
  for (const orgId of memberOrgIds) states.set(orgId, 'member');
  return states;
}

// The student's details shown on the application form. The program is the one
// they chose in their Profile Assessment, empty if they haven't chosen one.
export type ApplicantInfo = {
  name: string;
  studentNo: string | null;
  program: string;
  email: string;
};

export async function fetchApplicantInfo(profileId: string): Promise<ApplicantInfo> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, student_no, department, email')
    .eq('id', profileId)
    .maybeSingle();
  if (error) throw error;
  return {
    name: data?.full_name ?? '',
    studentNo: data?.student_no ?? null,
    program: data?.department ?? '',
    email: data?.email ?? '',
  };
}

// Adds "https://" when the student leaves it off. Empty stays empty.
export function normalizeLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

type Application = {
  organizationId: string;
  profileId: string;
  program: string;
  socialUrl: string;
};

// Sends the student's application. Officers accept or decline it on the web
// dashboard's Recruitment page. Throws an Error with a message to show.
export async function applyToOrganization({ organizationId, profileId, program, socialUrl }: Application) {
  const { error } = await supabase.from('membership_applications').insert({
    organization_id: organizationId,
    profile_id: profileId,
    program: program.trim(),
    social_url: normalizeLink(socialUrl),
  });
  if (!error) return;

  // 23505: they already have a pending application (one per organization).
  if (error.code === '23505') return;
  // 42501: blocked by the database rules, i.e. recruitment closed or already a member.
  if (error.code === '42501') {
    throw new Error("This organization isn't accepting applications right now, or you're already a member.");
  }
  throw new Error("Your application couldn't be sent. Check your connection and try again.");
}

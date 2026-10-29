import { fetchMyMemberOrgIds } from './applications';
import { supabase } from './supabase';

// Org logos and photos live in this public storage bucket (same as the web dashboard).
const MEDIA_BUCKET = 'org-media';

// The public link to a file in the org media bucket, or null when there's no file.
export function orgMediaUrl(path: string | null): string | null {
  return path ? supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

export type OrgListItem = {
  id: string;
  name: string;
  description: string | null;
  categories: string[];
  logoUrl: string | null;
  // Whether students can apply to join right now.
  recruitmentOpen: boolean;
};

export type Testimonial = { author: string; text: string };

export type OrgDetails = OrgListItem & {
  vision: string | null;
  mission: string | null;
  roomNumber: string | null;
  telegramContact: string | null;
  facebookContact: string | null;
  reasonsToJoin: string[];
  testimonials: Testimonial[];
  photoUrls: string[];
};

// Every active organization, A to Z, or only the ones recruiting right now.
// Students can only read active ones.
export async function fetchOrganizations({ recruitingOnly = false } = {}): Promise<OrgListItem[]> {
  let query = supabase
    .from('organizations')
    .select('id, name, description, categories, logo_path, recruitment_open')
    .eq('status', 'active');
  if (recruitingOnly) query = query.eq('recruitment_open', true);
  const { data, error } = await query.order('name');
  if (error) throw error;

  return data.map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description,
    categories: org.categories ?? [],
    logoUrl: orgMediaUrl(org.logo_path),
    recruitmentOpen: org.recruitment_open ?? false,
  }));
}

// The active organizations the student is a member of, A to Z.
export async function fetchMyOrganizations(profileId: string): Promise<OrgListItem[]> {
  const memberOrgIds = await fetchMyMemberOrgIds(profileId);
  if (memberOrgIds.size === 0) return [];

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, description, categories, logo_path, recruitment_open')
    .eq('status', 'active')
    .in('id', [...memberOrgIds])
    .order('name');
  if (error) throw error;

  return data.map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description,
    categories: org.categories ?? [],
    logoUrl: orgMediaUrl(org.logo_path),
    recruitmentOpen: org.recruitment_open ?? false,
  }));
}

// One organization's full profile, or null if it doesn't exist or was archived.
export async function fetchOrganization(id: string): Promise<OrgDetails | null> {
  const { data: org, error } = await supabase
    .from('organizations')
    .select(
      'id, name, description, categories, logo_path, recruitment_open, vision, mission, room_number, telegram_contact, facebook_contact, reasons_to_join, testimonials, photo_paths',
    )
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    categories: org.categories ?? [],
    logoUrl: orgMediaUrl(org.logo_path),
    recruitmentOpen: org.recruitment_open ?? false,
    vision: org.vision,
    mission: org.mission,
    roomNumber: org.room_number,
    telegramContact: org.telegram_contact,
    facebookContact: org.facebook_contact,
    reasonsToJoin: ((org.reasons_to_join ?? []) as string[]).filter((reason) => reason.trim()),
    testimonials: ((org.testimonials ?? []) as Testimonial[]).filter((item) => item.text?.trim()),
    photoUrls: ((org.photo_paths ?? []) as string[]).flatMap((path) => orgMediaUrl(path) ?? []),
  };
}

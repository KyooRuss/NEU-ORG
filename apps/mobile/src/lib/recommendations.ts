import { supabase } from './supabase';

// Org logos and photos live in this public storage bucket (same as the web dashboard).
const MEDIA_BUCKET = 'org-media';

export type RecommendedOrg = {
  id: string;
  name: string;
  logoUrl: string | null;
  // Whether students can apply to join right now.
  recruitmentOpen: boolean;
  // Why it was recommended, e.g. "Matches your Technology, Programming".
  reason: string;
};

type ScoredRow = {
  organization_id: string;
  score: number;
  matched_categories: string[];
  related_words: string[];
};

// The logged-in student's recommended organizations, best first (see
// recommend_for_me() in the database). Only orgs with a real reason are kept.
export async function fetchRecommendations(limit = 5): Promise<RecommendedOrg[]> {
  const { data, error } = await supabase.rpc('recommend_for_me');
  if (error) throw error;

  const ranked = (data as ScoredRow[])
    .map((row) => ({ ...row, reason: reasonFor(row) }))
    .filter((row) => row.reason !== null)
    .slice(0, limit);
  if (ranked.length === 0) return [];

  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, logo_path, recruitment_open')
    .in(
      'id',
      ranked.map((row) => row.organization_id),
    );
  if (orgsError) throw orgsError;

  const byId = new Map(orgs.map((org) => [org.id, org]));
  return ranked.flatMap((row) => {
    const org = byId.get(row.organization_id);
    if (!org) return [];
    return [
      {
        id: org.id,
        name: org.name,
        logoUrl: org.logo_path
          ? supabase.storage.from(MEDIA_BUCKET).getPublicUrl(org.logo_path).data.publicUrl
          : null,
        recruitmentOpen: org.recruitment_open ?? false,
        reason: row.reason as string,
      },
    ];
  });
}

// "Matches your …" from the matching categories and related words (up to 3), or
// "From your college" when that's the only link. Null when there's no real reason.
function reasonFor(row: ScoredRow): string | null {
  const words: string[] = [];
  for (const word of [...row.matched_categories, ...row.related_words]) {
    if (!words.some((item) => item.toLowerCase() === word.toLowerCase())) words.push(word);
  }
  if (words.length > 0) return `Matches your ${words.slice(0, 3).join(', ')}`;
  // The only points that don't come with a word are the +2 for the student's college.
  if (row.score >= 2) return 'From your college';
  return null;
}

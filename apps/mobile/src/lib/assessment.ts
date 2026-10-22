import { supabase } from './supabase';

// Up to this many interests, skills and activities each.
export const MAX_PICKS = 3;
// Longest interest, skill or activity a student can type in.
export const MAX_LABEL_LENGTH = 40;

// Keep in sync with COLLEGES in apps/web/src/lib/organizations.ts: organizations
// use the same list, which is how "open to your college" recommendations work.
export const COLLEGES = [
  'College of Accountancy',
  'College of Arts and Sciences',
  'College of Business Administration',
  'College of Communication',
  'College of Computer Studies',
  'College of Criminology',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Medical Technology',
  'College of Music',
  'College of Nursing',
  'College of Physical Therapy',
  'College of Respiratory Therapy',
];

export const YEAR_LEVELS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
  { value: 5, label: '5th Year' },
];

export type PickKind = 'interest' | 'skill' | 'activity';

export type AssessmentOptions = Record<PickKind, string[]>;

export type Assessment = {
  firstName: string;
  lastName: string;
  department: string;
  yearLevel: number;
  interests: string[];
  skills: string[];
  activities: string[];
};

// The picker choices (admins manage them in the database). Interests also list the
// organization categories, so picking one is an exact match with those orgs.
export async function fetchAssessmentOptions(): Promise<AssessmentOptions> {
  const [options, categories] = await Promise.all([
    supabase.from('assessment_options').select('kind, label').order('sort'),
    supabase.from('category_embeddings').select('name').order('name'),
  ]);
  if (options.error) throw options.error;

  const byKind: AssessmentOptions = { interest: [], skill: [], activity: [] };
  for (const { kind, label } of options.data as { kind: PickKind; label: string }[]) {
    byKind[kind].push(label);
  }
  if (!categories.error) {
    for (const { name } of categories.data as { name: string }[]) {
      if (!includesLabel(byKind.interest, name)) byKind.interest.push(name);
    }
  }
  return byKind;
}

export async function saveAssessment(assessment: Assessment) {
  const { error } = await supabase.rpc('save_profile_assessment', {
    p_first_name: assessment.firstName,
    p_last_name: assessment.lastName,
    p_department: assessment.department,
    p_year_level: assessment.yearLevel,
    p_interests: assessment.interests,
    p_skills: assessment.skills,
    p_activities: assessment.activities,
  });
  if (error) throw error;
}

// A starting guess from the account name: the last word is the last name.
export function splitFullName(fullName: string | null) {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { firstName: words[0] ?? '', lastName: '' };
  return { firstName: words.slice(0, -1).join(' '), lastName: words[words.length - 1] };
}

// Whether the list has this label, ignoring upper/lower case.
export function includesLabel(labels: string[], label: string) {
  const key = label.trim().toLowerCase();
  return labels.some((item) => item.toLowerCase() === key);
}

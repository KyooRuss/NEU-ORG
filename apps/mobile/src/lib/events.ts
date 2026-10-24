import { fetchMyMemberOrgIds } from './applications';
import { orgMediaUrl } from './organizations';
import { supabase } from './supabase';

// Event posters live in this public storage bucket (same as the web dashboard).
const EVENT_BUCKET = 'event-media';
// How many past events to show; older ones aren't useful in the app.
const PAST_LIMIT = 50;

export type EventWhen = 'upcoming' | 'past';

// Who the officers made the event for.
export type Audience = 'everyone' | 'members' | 'colleges';

export type EventItem = {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: Date;
  // Some events have no end time.
  endsAt: Date | null;
  posterUrl: string | null;
  audience: Audience;
  // Only filled in when audience is "colleges".
  audienceColleges: string[];
  // An outside sign-up form, e.g. Google Forms.
  registrationUrl: string | null;
  org: { id: string; name: string; department: string; logoUrl: string | null };
};

const EVENT_COLUMNS =
  'id, title, description, venue, starts_at, ends_at, poster_path, audience, audience_colleges, registration_url, organizations(id, name, department, logo_path)';

type EventRow = {
  id: string;
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  ends_at: string | null;
  poster_path: string | null;
  audience: Audience;
  audience_colleges: string[] | null;
  registration_url: string | null;
  organizations: { id: string; name: string; department: string; logo_path: string | null } | null;
};

function toEvent(row: EventRow): EventItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    venue: row.venue,
    startsAt: new Date(row.starts_at),
    endsAt: row.ends_at ? new Date(row.ends_at) : null,
    posterUrl: row.poster_path
      ? supabase.storage.from(EVENT_BUCKET).getPublicUrl(row.poster_path).data.publicUrl
      : null,
    audience: row.audience,
    audienceColleges: row.audience_colleges ?? [],
    registrationUrl: row.registration_url,
    org: {
      id: row.organizations?.id ?? '',
      name: row.organizations?.name ?? 'Organization',
      department: row.organizations?.department ?? '',
      logoUrl: orgMediaUrl(row.organizations?.logo_path ?? null),
    },
  };
}

// Approved events that haven't ended yet (soonest first), or ones that have
// (latest first). An event without an end time ends when it starts.
export async function fetchEvents(when: EventWhen): Promise<EventItem[]> {
  // Quoted because the timestamp has dots and colons, which PostgREST filters use.
  const now = `"${new Date().toISOString()}"`;
  const query = supabase.from('events').select(EVENT_COLUMNS).eq('status', 'approved');

  const { data, error } =
    when === 'upcoming'
      ? await query
          .or(`ends_at.gte.${now},and(ends_at.is.null,starts_at.gte.${now})`)
          .order('starts_at', { ascending: true })
      : await query
          .or(`ends_at.lt.${now},and(ends_at.is.null,starts_at.lt.${now})`)
          .order('starts_at', { ascending: false })
          .limit(PAST_LIMIT);
  if (error) throw error;
  return (data as unknown as EventRow[]).map(toEvent);
}

// One approved event, or null if it doesn't exist or isn't public.
export async function fetchEvent(id: string): Promise<EventItem | null> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  return data ? toEvent(data as unknown as EventRow) : null;
}

export function hasEnded(event: EventItem): boolean {
  return (event.endsAt ?? event.startsAt).getTime() < Date.now();
}

// What the events page needs to know about the student: the organizations
// they're in, the events they've rated, and their college.
export type EventContext = {
  memberOrgIds: Set<string>;
  ratedEventIds: Set<string>;
  department: string | null;
};

export async function fetchEventContext(profileId: string): Promise<EventContext> {
  const [memberOrgIds, rated, profile] = await Promise.all([
    fetchMyMemberOrgIds(profileId),
    supabase.from('event_feedback').select('event_id').eq('profile_id', profileId),
    supabase.from('profiles').select('department').eq('id', profileId).maybeSingle(),
  ]);
  if (rated.error) throw rated.error;
  return {
    memberOrgIds,
    ratedEventIds: new Set(rated.data.map((row) => row.event_id as string)),
    department: profile.data?.department ?? null,
  };
}

// The six things students rate, 1 to 5. Keep in sync with FEEDBACK_CATEGORIES
// in apps/web/src/lib/feedback.ts, where officers see the averages.
export const FEEDBACK_CATEGORIES = [
  { key: 'execution', label: 'Execution' },
  { key: 'program_content', label: 'Program Content' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'audio_visual', label: 'Audio-Visual Quality' },
  { key: 'registration', label: 'Registration Process' },
  { key: 'instructions', label: 'Instructions and Guidelines' },
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['key'];
export type FeedbackRatings = Record<FeedbackCategory, number>;

// Saves the student's ratings for an event that has ended. Throws an Error with
// a message to show.
export async function submitFeedback(eventId: string, ratings: FeedbackRatings) {
  const { error } = await supabase.from('event_feedback').insert({ event_id: eventId, ...ratings });
  if (!error) return;
  // 23505: they already rated this event.
  if (error.code === '23505') return;
  // 42501: blocked by the database rules, i.e. the event hasn't ended yet.
  if (error.code === '42501') throw new Error('You can rate this event once it has ended.');
  throw new Error("Your feedback couldn't be sent. Check your connection and try again.");
}

// "Fri, May 29, 2026"
export function formatEventDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// "2:00 PM"
export function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// "2:00 PM – 5:00 PM", or just the start when there's no end time.
export function formatEventTimeRange(event: EventItem): string {
  const start = formatEventTime(event.startsAt);
  if (!event.endsAt) return start;
  const sameDay = event.endsAt.toDateString() === event.startsAt.toDateString();
  const end = sameDay
    ? formatEventTime(event.endsAt)
    : `${formatEventDate(event.endsAt)}, ${formatEventTime(event.endsAt)}`;
  return `${start} – ${end}`;
}

// The small label shown on cards for events that aren't open to everyone.
export function audienceLabel(event: EventItem, myDepartment: string | null): string | null {
  if (event.audience === 'members') return 'Members only';
  if (event.audience === 'colleges') {
    return myDepartment && event.audienceColleges.includes(myDepartment) ? 'For your college' : 'Select colleges';
  }
  return null;
}

import type { Href } from 'expo-router';

import { fetchEventContext, formatEventDate, formatEventTime } from './events';
import { orgMediaUrl } from './organizations';
import { supabase } from './supabase';

// Notifications aren't stored. They're built from announcements, approved
// events, application results and event times; the notification_reads table
// only remembers which ones the student has read.

// How far back the feed goes.
const FEED_DAYS = 30;
// How long after an event ends the "rate it" reminder stays.
const RATE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

export type NotificationKind = 'announcement' | 'event' | 'accepted' | 'declined' | 'reminder' | 'rate';

export type NotificationItem = {
  // Unique, and what's saved when it's read, e.g. "announcement:<id>".
  key: string;
  kind: NotificationKind;
  // From one of the student's organizations, or about their own application.
  mine: boolean;
  title: string;
  body: string;
  at: Date;
  // What opens when it's tapped.
  target: { event: string } | { organization: string } | { announcement: string };
};

// The screen a notification opens when it's tapped, or null if there's
// nothing to open (an application whose organization was deleted).
export function notificationHref(item: NotificationItem): Href | null {
  if ('event' in item.target) return { pathname: '/event/[id]', params: { id: item.target.event } };
  if ('announcement' in item.target) {
    return { pathname: '/announcement/[id]', params: { id: item.target.announcement } };
  }
  if (item.target.organization) {
    return { pathname: '/organization/[id]', params: { id: item.target.organization } };
  }
  return null;
}

type OrgRef = { id: string; name: string } | null;

function orgName(org: OrgRef) {
  return org?.name ?? 'An organization';
}

// "today" or "tomorrow", for reminders.
function dayWord(date: Date) {
  return date.toDateString() === new Date().toDateString() ? 'today' : 'tomorrow';
}

// Everything for the student from the last 30 days, newest first.
export async function fetchNotifications(profileId: string): Promise<NotificationItem[]> {
  const now = new Date();
  const since = new Date(now.getTime() - FEED_DAYS * DAY).toISOString();
  const { memberOrgIds, ratedEventIds } = await fetchEventContext(profileId);
  const myOrgs = [...memberOrgIds];

  // The database only returns the announcements the student may see:
  // university-wide ones, plus members-only ones from their organizations.
  const announcements = supabase
    .from('announcements')
    .select('id, title, description, created_at, organizations(id, name)')
    .gte('created_at', since);
  const newEvents = supabase
    .from('events')
    .select('id, title, venue, starts_at, approved_at, organizations(id, name)')
    .eq('status', 'approved')
    .gte('approved_at', since);
  const decisions = supabase
    .from('membership_applications')
    .select('id, status, decided_at, organizations(id, name)')
    .eq('profile_id', profileId)
    .in('status', ['accepted', 'declined'])
    .gte('decided_at', since);
  // Events from the student's organizations starting in the next 24 hours,
  // or that ended (or, without an end time, started) in the last week.
  const soon = myOrgs.length
    ? supabase
        .from('events')
        .select('id, title, starts_at')
        .eq('status', 'approved')
        .in('organization_id', myOrgs)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', new Date(now.getTime() + DAY).toISOString())
    : null;
  const rateFrom = `"${new Date(now.getTime() - RATE_DAYS * DAY).toISOString()}"`;
  const nowQuoted = `"${now.toISOString()}"`;
  const ended = myOrgs.length
    ? supabase
        .from('events')
        .select('id, title, starts_at, ends_at')
        .eq('status', 'approved')
        .in('organization_id', myOrgs)
        .or(
          `and(ends_at.gte.${rateFrom},ends_at.lt.${nowQuoted}),and(ends_at.is.null,starts_at.gte.${rateFrom},starts_at.lt.${nowQuoted})`,
        )
    : null;

  const [a, e, d, s, r] = await Promise.all([announcements, newEvents, decisions, soon, ended]);
  for (const result of [a, e, d, s, r]) if (result?.error) throw result.error;

  const items: NotificationItem[] = [];

  for (const row of (a.data ?? []) as unknown as {
    id: string;
    title: string;
    description: string;
    created_at: string;
    organizations: OrgRef;
  }[]) {
    items.push({
      key: `announcement:${row.id}`,
      kind: 'announcement',
      mine: !!row.organizations && memberOrgIds.has(row.organizations.id),
      title: `${orgName(row.organizations)}: ${row.title}`,
      body: row.description,
      at: new Date(row.created_at),
      target: { announcement: row.id },
    });
  }

  for (const row of (e.data ?? []) as unknown as {
    id: string;
    title: string;
    venue: string;
    starts_at: string;
    approved_at: string;
    organizations: OrgRef;
  }[]) {
    items.push({
      key: `event:${row.id}`,
      kind: 'event',
      mine: !!row.organizations && memberOrgIds.has(row.organizations.id),
      title: `${orgName(row.organizations)} added a new event`,
      body: `“${row.title}” is happening on ${formatEventDate(new Date(row.starts_at))} at ${row.venue}.`,
      at: new Date(row.approved_at),
      target: { event: row.id },
    });
  }

  for (const row of (d.data ?? []) as unknown as {
    id: string;
    status: 'accepted' | 'declined';
    decided_at: string;
    organizations: OrgRef;
  }[]) {
    const accepted = row.status === 'accepted';
    items.push({
      key: `application:${row.id}`,
      kind: accepted ? 'accepted' : 'declined',
      mine: true,
      title: accepted
        ? `You’re now a member of ${orgName(row.organizations)}!`
        : `Your application to ${orgName(row.organizations)} wasn’t accepted this time.`,
      body: accepted
        ? 'Welcome! Their events and announcements will show up under My Organizations.'
        : 'You can apply again the next time they open recruitment.',
      at: new Date(row.decided_at),
      target: { organization: row.organizations?.id ?? '' },
    });
  }

  for (const row of (s?.data ?? []) as { id: string; title: string; starts_at: string }[]) {
    const startsAt = new Date(row.starts_at);
    items.push({
      key: `reminder:${row.id}`,
      kind: 'reminder',
      mine: true,
      title: `${row.title} starts ${dayWord(startsAt)} at ${formatEventTime(startsAt)}`,
      body: 'Don’t miss it! Tap to see the venue and details.',
      // "Arrives" a day before the event.
      at: new Date(Math.min(now.getTime(), startsAt.getTime() - DAY)),
      target: { event: row.id },
    });
  }

  for (const row of (r?.data ?? []) as { id: string; title: string; starts_at: string; ends_at: string | null }[]) {
    if (ratedEventIds.has(row.id)) continue;
    items.push({
      key: `rate:${row.id}`,
      kind: 'rate',
      mine: true,
      title: `How was ${row.title}?`,
      body: 'Rate it now. Your feedback is anonymous and helps the officers improve.',
      at: new Date(row.ends_at ?? row.starts_at),
      target: { event: row.id },
    });
  }

  return items.sort((x, y) => y.at.getTime() - x.at.getTime());
}

// PGRST205: table not in PostgREST's schema cache. 42P01: table doesn't exist.
function isMissingTable(error: { code?: string }) {
  return error.code === 'PGRST205' || error.code === '42P01';
}

export type Announcement = {
  id: string;
  title: string;
  description: string;
  // "university" for everyone, "department" for the organization's members only.
  audience: 'university' | 'department';
  // The date the officer chose as "Date Posted".
  date: Date;
  org: { id: string; name: string; logoUrl: string | null };
};

// One announcement, or null if it was deleted or the student may not see it.
export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, description, audience, announcement_date, organizations(id, name, logo_path)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    title: string;
    description: string;
    audience: 'university' | 'department';
    announcement_date: string;
    organizations: { id: string; name: string; logo_path: string | null } | null;
  };
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    audience: row.audience,
    // A plain date ("2026-10-24"); noon keeps it on the same day in every time zone.
    date: new Date(`${row.announcement_date}T12:00:00`),
    org: {
      id: row.organizations?.id ?? '',
      name: orgName(row.organizations),
      logoUrl: orgMediaUrl(row.organizations?.logo_path ?? null),
    },
  };
}

// The keys of the notifications the student has read. Until the
// notification_reads migration is in Supabase, everything counts as unread
// instead of the whole feed failing to load.
export async function fetchReadKeys(profileId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_key')
    .eq('profile_id', profileId);
  if (error) {
    if (isMissingTable(error)) return new Set();
    throw error;
  }
  return new Set(data.map((row) => row.notification_key as string));
}

export async function markRead(keys: string[]) {
  if (keys.length === 0) return;
  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      keys.map((key) => ({ notification_key: key })),
      { onConflict: 'profile_id,notification_key', ignoreDuplicates: true },
    );
  if (error) throw error;
  notifyReadChanged();
}

export async function fetchUnreadCount(profileId: string): Promise<number> {
  const [items, read] = await Promise.all([fetchNotifications(profileId), fetchReadKeys(profileId)]);
  return items.filter((item) => !read.has(item.key)).length;
}

// Lets the bell's badge update as soon as something is marked read.
const listeners = new Set<() => void>();

export function onReadChanged(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyReadChanged() {
  for (const listener of listeners) listener();
}

// "just now", "5 minutes ago", "3 days ago"
export function timeAgo(date: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [
    [60 * 60 * 24 * 7, 'week'],
    [60 * 60 * 24, 'day'],
    [60 * 60, 'hour'],
    [60, 'minute'],
  ];
  for (const [size, name] of units) {
    if (seconds >= size) {
      const count = Math.floor(seconds / size);
      return `${count} ${name}${count === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

import type { OrgEvent } from './events'

// What the search box and filters above every event list hold.
export type EventFilterValues = {
  query: string
  organizationId: string
  // "2026-10" from the month picker, or "" for any month.
  month: string
}

export const NO_FILTERS: EventFilterValues = { query: '', organizationId: '', month: '' }

export function hasFilters(filters: EventFilterValues) {
  return !!(filters.query.trim() || filters.organizationId || filters.month)
}

// Keeps the events that match the search (event title, organization, department or venue), the
// chosen organization, and the chosen month.
export function filterEvents(events: OrgEvent[], filters: EventFilterValues) {
  const search = filters.query.trim().toLowerCase()
  const range = filters.month ? monthRange(filters.month) : null

  return events.filter(
    (event) =>
      (!search ||
        [event.title, event.organization_name, event.organization_department, event.venue].some((text) => text.toLowerCase().includes(search))) &&
      (!filters.organizationId || event.organization_id === filters.organizationId) &&
      // An event that runs across two months shows in both.
      (!range || (new Date(event.starts_at) < range.end && new Date(event.ends_at) >= range.start)),
  )
}

function monthRange(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return { start: new Date(year, monthNumber - 1, 1), end: new Date(year, monthNumber, 1) }
}

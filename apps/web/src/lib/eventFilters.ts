import type { OrgEvent } from './events'

// What the search box and filters above every event list hold.
export type EventFilterValues = {
  query: string
  organizationId: string
  // The organization's department, or "" for any.
  department: string
}

export const NO_FILTERS: EventFilterValues = { query: '', organizationId: '', department: '' }

export function hasFilters(filters: EventFilterValues) {
  return !!(filters.query.trim() || filters.organizationId || filters.department)
}

// Keeps the events that match the search (event title, organization, department or venue)
// and the chosen organization and department.
export function filterEvents(events: OrgEvent[], filters: EventFilterValues) {
  const search = filters.query.trim().toLowerCase()

  return events.filter(
    (event) =>
      (!search ||
        [event.title, event.organization_name, event.organization_department, event.venue].some((text) =>
          text.toLowerCase().includes(search),
        )) &&
      (!filters.organizationId || event.organization_id === filters.organizationId) &&
      (!filters.department || event.organization_department === filters.department),
  )
}

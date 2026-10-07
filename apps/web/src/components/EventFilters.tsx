import { Search, X } from 'lucide-react'

import { type EventFilterValues, hasFilters, NO_FILTERS } from '../lib/eventFilters'
import type { OrgEvent } from '../lib/events'

// The search box, Organization and Month filters, and Clear, shown above every event list.
export default function EventFilters({
  events,
  filters,
  onChange,
}: {
  // The page's events, before filtering. The Organization list is built from them.
  events: OrgEvent[] | null
  filters: EventFilterValues
  onChange: (filters: EventFilterValues) => void
}) {
  const set = (changes: Partial<EventFilterValues>) => onChange({ ...filters, ...changes })

  // Each organization once, A to Z. The chosen one stays listed even when the
  // current tab has none of its events, so the dropdown still shows it.
  const organizations = new Map((events ?? []).map((event) => [event.organization_id, event.organization_name]))
  if (filters.organizationId && !organizations.has(filters.organizationId)) {
    organizations.set(filters.organizationId, 'Selected organization')
  }
  const options = [...organizations].sort((a, b) => a[1].localeCompare(b[1]))

  const fieldClass =
    'rounded-full bg-field py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-brand-blue/40'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-48 flex-1 sm:max-w-72">
        <span className="sr-only">Search events</span>
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filters.query}
          onChange={(change) => set({ query: change.target.value })}
          placeholder="Search event or organization"
          className={`w-full pr-4 pl-9 placeholder:text-zinc-500 ${fieldClass}`}
        />
      </label>

      <label>
        <span className="sr-only">Organization</span>
        <select
          value={filters.organizationId}
          onChange={(change) => set({ organizationId: change.target.value })}
          className={`max-w-64 px-4 ${fieldClass}`}
        >
          <option value="">All organizations</option>
          {options.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Month</span>
        <input
          type="month"
          value={filters.month}
          onChange={(change) => set({ month: change.target.value })}
          className={`px-4 ${fieldClass}`}
        />
      </label>

      {hasFilters(filters) && (
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <X size={14} aria-hidden="true" />
          Clear
        </button>
      )}
    </div>
  )
}

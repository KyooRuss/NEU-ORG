import { Search } from 'lucide-react'

import type { EventFilterValues } from '../lib/eventFilters'
import type { OrgEvent } from '../lib/events'
import { DEPARTMENT_OPTIONS } from '../lib/organizations'
import FilterMenu, { FilterOption, FilterSection } from './FilterMenu'

// The search box, the Organization / Department filter menu, and the Month picker, shown above every event list.
export default function EventFilters({
  events,
  filters,
  onChange,
  showMonth = true,
}: {
  // The page's events, before filtering. The Organization choices are built from them.
  events: OrgEvent[] | null
  filters: EventFilterValues
  onChange: (filters: EventFilterValues) => void
  // False hides the Month picker (Event Requests doesn't use it).
  showMonth?: boolean
}) {
  const set = (changes: Partial<EventFilterValues>) => onChange({ ...filters, ...changes })

  // Each organization once, A to Z, only from the chosen department. The chosen one
  // stays listed even when the current tab has none of its events.
  const organizations = new Map(
    (events ?? [])
      .filter((event) => !filters.department || event.organization_department === filters.department)
      .map((event) => [event.organization_id, event.organization_name]),
  )
  if (filters.organizationId && !organizations.has(filters.organizationId)) {
    organizations.set(filters.organizationId, 'Selected organization')
  }
  const organizationOptions = [...organizations].sort((a, b) => a[1].localeCompare(b[1]))

  function chooseDepartment(department: string) {
    // Drop the chosen organization if it isn't in the new department.
    const keepOrganization =
      !department ||
      (events ?? []).some(
        (event) => event.organization_id === filters.organizationId && event.organization_department === department,
      )
    set({ department, organizationId: keepOrganization ? filters.organizationId : '' })
  }

  const active = !!(filters.organizationId || filters.department)
  const label = active
    ? `Filter: ${[organizations.get(filters.organizationId), filters.department].filter(Boolean).join(', ')}`
    : 'Filter by organization or department'

  const fieldClass =
    'rounded-full bg-field py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-brand-blue/40'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-64 flex-1 sm:w-80 sm:max-w-80">
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

      {/* One pick in each section; the menu stays open so both can be chosen. */}
      <FilterMenu label={label} active={active}>
        <FilterSection title="Organization">
          <FilterOption
            label="All Organizations"
            selected={!filters.organizationId}
            onSelect={() => set({ organizationId: '' })}
          />
          {organizationOptions.map(([id, name]) => (
            <FilterOption
              key={id}
              label={name}
              selected={filters.organizationId === id}
              onSelect={() => set({ organizationId: id })}
            />
          ))}
        </FilterSection>
        <FilterSection title="Department">
          <FilterOption label="All Departments" selected={!filters.department} onSelect={() => chooseDepartment('')} />
          {DEPARTMENT_OPTIONS.map((department) => (
            <FilterOption
              key={department}
              label={department}
              selected={filters.department === department}
              onSelect={() => chooseDepartment(department)}
            />
          ))}
        </FilterSection>
      </FilterMenu>

      {showMonth && (
        <label>
          <span className="sr-only">Month</span>
          <input
            type="month"
            value={filters.month}
            onChange={(change) => set({ month: change.target.value })}
            className={`px-4 ${fieldClass}`}
          />
        </label>
      )}
    </div>
  )
}

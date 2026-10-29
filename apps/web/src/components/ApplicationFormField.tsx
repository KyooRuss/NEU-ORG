import { FileText, Upload, X } from 'lucide-react'

import { FORM_MAX_BYTES, FORM_TYPES } from '../lib/organizations'
import type useOrganizationForm from './useOrganizationForm'

// The membership application form students download from the apply sheet in the
// mobile app. Optional: without one, the app just doesn't offer a download.
// Shared by the Add Organization page and the edit form.
export default function ApplicationFormField({ form }: { form: ReturnType<typeof useOrganizationForm> }) {
  const { formName, formLink } = form

  const input = (
    <input
      type="file"
      accept={FORM_TYPES.join(',')}
      className="sr-only"
      onChange={(event) => {
        form.handleApplicationForm(event.target.files?.[0])
        event.target.value = ''
      }}
    />
  )

  return (
    <div>
      <p className="text-sm font-medium text-brand-navy">Application Form</p>
      <p className="text-xs text-zinc-500">
        Students download it when they apply and bring it to their interview. PDF or Word, up to{' '}
        {FORM_MAX_BYTES / 1024 / 1024} MB.
      </p>

      {formName ? (
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-surface p-3 ring-1 ring-zinc-200">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <FileText size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            {formLink ? (
              <a
                href={formLink}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium text-brand-blue hover:underline"
              >
                {formName}
              </a>
            ) : (
              <p className="truncate text-sm font-medium text-zinc-800">{formName}</p>
            )}
            {!formLink && <p className="text-xs text-zinc-500">Uploads when you save.</p>}
          </div>
          <label className="cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-blue transition hover:bg-brand-blue/10 focus-within:ring-2 focus-within:ring-brand-blue/40">
            Replace
            {input}
          </label>
          <button
            type="button"
            onClick={form.removeApplicationForm}
            aria-label="Remove application form"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-3 py-4 text-sm font-medium text-brand-blue transition hover:border-brand-blue/60 focus-within:ring-2 focus-within:ring-brand-blue/40">
          <Upload size={16} aria-hidden="true" />
          Upload Application Form
          {input}
        </label>
      )}
    </div>
  )
}

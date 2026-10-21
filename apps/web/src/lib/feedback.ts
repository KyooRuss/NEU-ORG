import { supabase } from './supabase'

// The six categories students rate, 1 to 5, in the mobile app's feedback form.
export const FEEDBACK_CATEGORIES = [
  { key: 'execution', label: 'Execution' },
  { key: 'program_content', label: 'Program Content' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'audio_visual', label: 'Audio-Visual Quality' },
  { key: 'registration', label: 'Registration Process' },
  { key: 'instructions', label: 'Instructions and Guidelines' },
] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['key']

export type FeedbackSummary = {
  responses: number
  // Each category's average, as a score out of 100. Null while nobody has answered.
  scores: Record<FeedbackCategory, number | null>
  // The average of the six category scores, out of 100.
  overall: number | null
}

type SummaryRow = { responses: number } & Record<FeedbackCategory, number | string | null>

// A 1–5 average as a score out of 100: 4.76 becomes 95.2.
function toScore(average: number | string | null) {
  return average === null ? null : (Number(average) / 5) * 100
}

export async function fetchFeedbackSummary(eventId: string): Promise<FeedbackSummary> {
  const { data, error } = await supabase.rpc('event_feedback_summary', { target_event: eventId })
  if (error) throw new Error(error.message)

  const row = (data as SummaryRow[])[0]
  const scores = Object.fromEntries(
    FEEDBACK_CATEGORIES.map(({ key }) => [key, toScore(row?.[key] ?? null)]),
  ) as FeedbackSummary['scores']
  const rated = Object.values(scores).filter((score) => score !== null)

  return {
    responses: row?.responses ?? 0,
    scores,
    overall: rated.length > 0 ? rated.reduce((sum, score) => sum + score, 0) / rated.length : null,
  }
}

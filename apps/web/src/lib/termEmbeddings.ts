import { embedTerms } from './embeddings'
import { supabase } from './supabase'

let running = false

// Gives every word students can pick, or have typed, in the mobile Profile
// Assessment an AI embedding, so recommendations understand what it means
// ("Photography" ends up close to a camera club). The phone can't run the model,
// so this runs in the background in an admin's browser when the dashboard opens.
// Only new words are processed; nothing loads when there are none.
export function embedMissingTerms() {
  if (running) return
  running = true
  embedNewTerms()
    .catch((error) => console.warn('Could not update the AI data for profile assessment words.', error))
    .finally(() => {
      running = false
    })
}

async function embedNewTerms() {
  const [options, profiles, known] = await Promise.all([
    supabase.from('assessment_options').select('label'),
    supabase
      .from('profiles')
      .select('interests, skills, preferred_activities')
      .not('assessment_completed_at', 'is', null),
    supabase.from('term_embeddings').select('term'),
  ])
  if (options.error) throw options.error
  if (profiles.error) throw profiles.error
  if (known.error) throw known.error

  const knownWords = new Set(known.data.map(({ term }) => term.toLowerCase()))
  const words: string[] = [
    ...options.data.map(({ label }) => label),
    ...profiles.data.flatMap((profile) => [
      ...profile.interests,
      ...profile.skills,
      ...profile.preferred_activities,
    ]),
  ]

  // Once each, ignoring upper/lower case.
  const missing = new Map<string, string>()
  for (const word of words) {
    const key = word.trim().toLowerCase()
    if (key && !knownWords.has(key) && !missing.has(key)) missing.set(key, word.trim())
  }
  if (missing.size === 0) return

  const terms = [...missing.values()]
  const embeddings = await embedTerms(terms)
  const { error } = await supabase
    .from('term_embeddings')
    .insert(terms.map((term, index) => ({ term, embedding: embeddings[index] })))
  if (error) throw error
}

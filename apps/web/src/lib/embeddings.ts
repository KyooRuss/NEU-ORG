// Turns organization and category text into embeddings (384 numbers describing its
// meaning) for AI recommendations. Uses the free multilingual-e5-small model, which
// runs right here (in the browser, or in Node for `npm run embed:orgs`) and also
// understands Tagalog. Nothing is sent to an AI service.
//
// The model is about 135 MB. It downloads the first time it's used and the browser
// keeps it cached after that, so it's only loaded when something needs embedding.
//
// No imports from the rest of the app, so the Node script can use this file as-is.

import type { FeatureExtractionPipeline } from '@huggingface/transformers'

const MODEL = 'Xenova/multilingual-e5-small'

// What the embedding of an organization is made from.
export type EmbeddingSource = {
  name: string
  categories: string[]
  description: string | null
  vision: string | null
  mission: string | null
  reasons_to_join: string[]
}

let extractor: Promise<FeatureExtractionPipeline> | null = null

function loadModel() {
  extractor ??= import('@huggingface/transformers').then(({ pipeline }) =>
    pipeline('feature-extraction', MODEL, { dtype: 'q8' }),
  )
  return extractor
}

async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const model = await loadModel()
  const output = await model(texts, { pooling: 'mean', normalize: true })
  return output.tolist() as number[][]
}

// The model was trained with these prefixes: "passage: " for the text being searched
// (organizations) and "query: " for what's searched with (categories / interests).
export function embedOrganizations(orgs: EmbeddingSource[]) {
  return embed(orgs.map((org) => `passage: ${organizationText(org)}`))
}

export function embedCategories(names: string[]) {
  return embed(names.map((name) => `query: ${name}`))
}

// The model reads at most ~512 tokens (a few paragraphs), so the most telling parts go first.
function organizationText(org: EmbeddingSource) {
  return [
    `${org.name}.`,
    org.categories.length ? `Categories: ${org.categories.join(', ')}.` : '',
    org.description ?? '',
    org.reasons_to_join.length ? `Reasons to join: ${org.reasons_to_join.join('; ')}.` : '',
    org.mission ?? '',
    org.vision ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

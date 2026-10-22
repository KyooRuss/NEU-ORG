// Makes (or remakes) the AI recommendation embeddings for every organization and
// every category, using the same model and text as the web dashboard.
// Run from the project root with: npm run embed:orgs
// Needs SUPABASE_URL and SUPABASE_SECRET_KEY in the root .env, and the web app's
// packages installed (cd apps/web && npm install).
// Run it once after the recommendation migration is in Supabase, and again any time
// embeddings may be missing (e.g. orgs saved while the model couldn't load).
// The first run downloads the ~135 MB model.

import { createClient } from '@supabase/supabase-js';

import { embedCategories, embedOrganizations, embedTerms } from '../../apps/web/src/lib/embeddings.ts';

const BATCH_SIZE = 16;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  fail('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the root .env file.');
}
if (!SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
  fail('SUPABASE_SECRET_KEY must be the secret key (sb_secret_...), not the publishable key.');
}

// The secret key bypasses RLS. It must never be used in the mobile or web app.
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Archived orgs too, so they're ready if restored.
const { data: orgs, error: orgsError } = await supabase
  .from('organizations')
  .select('id, name, categories, description, vision, mission, reasons_to_join');
if (orgsError) fail(`Could not load organizations: ${orgsError.message}`);

console.log(`Loading the model and embedding ${orgs.length} organizations…`);
for (let start = 0; start < orgs.length; start += BATCH_SIZE) {
  const batch = orgs.slice(start, start + BATCH_SIZE);
  const embeddings = await embedOrganizations(batch);
  const { error } = await supabase
    .from('organization_embeddings')
    .upsert(batch.map((org, index) => ({ organization_id: org.id, embedding: embeddings[index] })));
  if (error) fail(`Could not save organization embeddings: ${error.message}`);
}

// Every category in use plus any already saved, once each ignoring upper/lower case.
// A saved name keeps its spelling.
const { data: saved, error: savedError } = await supabase.from('category_embeddings').select('name');
if (savedError) fail(`Could not load categories: ${savedError.message}`);
const categories = new Map();
for (const name of [...saved.map((row) => row.name), ...orgs.flatMap((org) => org.categories)]) {
  const key = name.trim().toLowerCase();
  if (key && !categories.has(key)) categories.set(key, name.trim());
}
const names = [...categories.values()];

const categoryEmbeddings = await embedCategories(names);
const { error: categoriesError } = await supabase
  .from('category_embeddings')
  .upsert(names.map((name, index) => ({ name, embedding: categoryEmbeddings[index] })));
if (categoriesError) fail(`Could not save category embeddings: ${categoriesError.message}`);

// Profile Assessment words: the picker options plus anything students typed.
// A saved word keeps its spelling.
const [termOptions, termProfiles, savedTerms] = await Promise.all([
  supabase.from('assessment_options').select('label'),
  supabase.from('profiles').select('interests, skills, preferred_activities'),
  supabase.from('term_embeddings').select('term'),
]);
const termsError = termOptions.error ?? termProfiles.error ?? savedTerms.error;
if (termsError) fail(`Could not load profile assessment words: ${termsError.message}`);
const termMap = new Map();
for (const word of [
  ...savedTerms.data.map((row) => row.term),
  ...termOptions.data.map((row) => row.label),
  ...termProfiles.data.flatMap((row) => [...row.interests, ...row.skills, ...row.preferred_activities]),
]) {
  const key = word.trim().toLowerCase();
  if (key && !termMap.has(key)) termMap.set(key, word.trim());
}
const terms = [...termMap.values()];

const termEmbeddings = await embedTerms(terms);
const { error: termsSaveError } = await supabase
  .from('term_embeddings')
  .upsert(terms.map((term, index) => ({ term, embedding: termEmbeddings[index] })));
if (termsSaveError) fail(`Could not save profile assessment word embeddings: ${termsSaveError.message}`);

console.log(
  `Done: ${orgs.length} organizations, ${names.length} categories (${names.join(', ')}) and ${terms.length} profile assessment words.`,
);

// Checks how accurate the organization recommendations are.
// Run from the project root with: npm run check:recommendations
// Needs the web app's packages installed (cd apps/web && npm install). The first
// run downloads the ~135 MB AI model.
//
// It builds a temporary database on this computer (PGlite) with the real
// recommendation migrations, fills it with the test organizations and students in
// recommendation-fixtures.mjs plus their real AI embeddings, and reports how often
// each student's expected organization comes first and in the top 3.
// Nothing is read from or written to Supabase.

import { readFileSync } from 'node:fs';

import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';

import { embedCategories, embedOrganizations, embedTerms } from '../../apps/web/src/lib/embeddings.ts';
import { organizations, students } from './recommendation-fixtures.mjs';

const MIGRATIONS = [
  '20261022120000_create_recommendation_embeddings.sql',
  '20261024120000_add_profile_assessment.sql',
  '20261024130000_allow_more_assessment_picks.sql',
  '20261025120000_recommend_for_me.sql',
];

const db = new PGlite({ extensions: { vector } });

// Just enough of the earlier migrations (auth, profiles, organizations) for the
// recommendation migrations to run.
await db.exec(`
  create schema auth;
  create schema extensions;
  create role anon;
  create role authenticated;
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create function public.is_admin() returns boolean language sql as $$ select true $$;
  create function public.is_officer_of(target_org text) returns boolean language sql as $$ select false $$;
  create function public.set_updated_at() returns trigger language plpgsql as $$
    begin new.updated_at = now(); return new; end $$;
  create table public.organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    categories text[] not null,
    department text not null,
    status text not null default 'active',
    description text
  );
  create table public.profiles (
    id uuid primary key,
    full_name text,
    department text,
    year_level smallint
  );
`);
for (const file of MIGRATIONS) {
  await db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
}

console.log('Loading the AI model and embedding the test data…');

const orgEmbeddings = await embedOrganizations(
  organizations.map((org) => ({ ...org, vision: null, mission: null, reasons_to_join: [] })),
);
for (const [index, org] of organizations.entries()) {
  const { rows } = await db.query(
    'insert into public.organizations (name, categories, department, description) values ($1, $2, $3, $4) returning id',
    [org.name, org.categories, org.department, org.description],
  );
  await db.query('insert into public.organization_embeddings (organization_id, embedding) values ($1, $2)', [
    rows[0].id,
    JSON.stringify(orgEmbeddings[index]),
  ]);
}

// Categories, like the web dashboard saves them.
const categories = unique(organizations.flatMap((org) => org.categories));
const categoryEmbeddings = await embedCategories(categories);
for (const [index, name] of categories.entries()) {
  await db.query('insert into public.category_embeddings (name, embedding) values ($1, $2)', [
    name,
    JSON.stringify(categoryEmbeddings[index]),
  ]);
}

// Assessment words: the picker options plus the students' own words, like the
// admin dashboard / embed:orgs would have processed them.
const { rows: options } = await db.query('select label from public.assessment_options');
const terms = unique([
  ...options.map((row) => row.label),
  ...students.flatMap((student) => [...student.interests, ...student.skills, ...student.activities]),
]);
const termEmbeddings = await embedTerms(terms);
for (const [index, term] of terms.entries()) {
  await db.query('insert into public.term_embeddings (term, embedding) values ($1, $2)', [
    term,
    JSON.stringify(termEmbeddings[index]),
  ]);
}

let first = 0;
let topThree = 0;
for (const student of students) {
  const { rows } = await db.query(
    `select o.name, s.score, s.matched_categories, s.related_words
     from public.score_organizations($1, $2, $3, $4) s
     join public.organizations o on o.id = s.organization_id`,
    [student.interests, student.skills, student.activities, student.department],
  );
  const rank = rows.findIndex((row) => row.name === student.expect) + 1;
  if (rank === 1) first += 1;
  if (rank >= 1 && rank <= 3) topThree += 1;

  const mark = rank === 1 ? 'PASS #1' : rank <= 3 ? `OK   #${rank}` : `MISS #${rank}`;
  console.log(`\n[${mark}] ${student.name} — expects ${student.expect}`);
  console.log(
    `  picks: ${student.interests.join(', ')} | skills: ${student.skills.join(', ') || '-'} | activities: ${student.activities.join(', ') || '-'} | ${student.department}`,
  );
  for (const row of rows.slice(0, 3)) {
    const why = [
      row.matched_categories.length ? `matches ${row.matched_categories.join(', ')}` : '',
      row.related_words.length ? `related to ${row.related_words.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    console.log(`   ${String(row.score).padStart(5)}  ${row.name}${why ? `  (${why})` : ''}`);
  }
}

const percent = (count) => `${Math.round((100 * count) / students.length)}%`;
console.log(`\nExpected organization ranked #1: ${first}/${students.length} (${percent(first)})`);
console.log(`Expected organization in the top 3: ${topThree}/${students.length} (${percent(topThree)})`);

function unique(words) {
  const byKey = new Map();
  for (const word of words) {
    const key = word.trim().toLowerCase();
    if (key && !byKey.has(key)) byKey.set(key, word.trim());
  }
  return [...byKey.values()];
}

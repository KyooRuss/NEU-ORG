-- AI recommendations: each organization and each category gets an "embedding",
-- 384 numbers that describe what its text means. Texts with similar meanings get
-- similar numbers, so "Basketball training and tournaments" lands close to the
-- "Sports" category even though the word never appears.
--
-- The web dashboard makes the embeddings in the browser with the free
-- multilingual-e5-small model (Transformers.js), which also understands Tagalog,
-- and saves them here whenever an organization is added or edited.
-- `npm run embed:orgs` (re)makes them for every organization at once.
--
-- Kept in their own tables so loading organizations (select *) stays light.

create extension if not exists vector with schema extensions;

create table public.organization_embeddings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  embedding extensions.vector(384) not null,
  updated_at timestamptz not null default now()
);

create trigger organization_embeddings_set_updated_at
  before update on public.organization_embeddings
  for each row execute function public.set_updated_at();

-- One row per category name. Also serves as the list of every category used so far.
create table public.category_embeddings (
  name text primary key check (char_length(trim(name)) > 0),
  embedding extensions.vector(384) not null,
  created_at timestamptz not null default now()
);

-- "Sports" and "sports" are the same category.
create unique index category_embeddings_name_key on public.category_embeddings (lower(name));

alter table public.organization_embeddings enable row level security;
alter table public.category_embeddings enable row level security;

create policy "Logged-in users can read organization embeddings"
  on public.organization_embeddings for select
  to authenticated
  using (true);

-- Officers edit their own organization's description, so they refresh its embedding too.
create policy "Admins and the org's officers can add its embedding"
  on public.organization_embeddings for insert
  to authenticated
  with check ((select public.is_admin()) or public.is_officer_of(organization_id::text));

create policy "Admins and the org's officers can update its embedding"
  on public.organization_embeddings for update
  to authenticated
  using ((select public.is_admin()) or public.is_officer_of(organization_id::text))
  with check ((select public.is_admin()) or public.is_officer_of(organization_id::text));

create policy "Logged-in users can read category embeddings"
  on public.category_embeddings for select
  to authenticated
  using (true);

-- Only admins set an organization's categories, so only they add new ones.
create policy "Admins can add category embeddings"
  on public.category_embeddings for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update category embeddings"
  on public.category_embeddings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Ranks active organizations for a student, highest score first:
--   +3   for each of the org's categories the student picked as an interest
--   +0-2 for each other interest whose meaning is close to the org's text
--   +2   when the org is open to the student's department (or University Wide)
--
-- How "close" works: the model's similarity scores are bunched together (about
-- 0.76-0.80 for unrelated pairs, 0.81-0.86 for related ones), so a fixed cutoff
-- is unreliable. Instead each interest is compared with the org's average
-- similarity to all categories, and only how much it stands out counts:
-- under 0.015 above average = 0 points, 0.045 or more = the full 2 points.
-- These numbers came from testing sample NEU orgs; tune them with real data.
--
-- related_categories lists the interests that earned at least 1 of those points,
-- so the app can say why an org was recommended. Every org scores 0 when nothing
-- matches; the app can then show them as "popular" or "new" instead.
create function public.recommend_organizations(
  interests text[],
  student_department text default null
)
returns table (
  organization_id uuid,
  score numeric,
  matched_categories text[],
  related_categories text[]
)
language sql
stable
set search_path = ''
as $$
  with picked as (
    select distinct lower(trim(interest)) as key
    from unnest(interests) as interest
    where trim(interest) <> ''
  ),
  orgs as (
    select o.id, o.name, o.categories, o.department, e.embedding
    from public.organizations o
    left join public.organization_embeddings e on e.organization_id = o.id
    where o.status = 'active'
  ),
  -- How close every category is to every org, minus that org's average.
  standouts as (
    select
      o.id as org_id,
      c.name,
      (1 - (c.embedding operator(extensions.<=>) o.embedding))
        - avg(1 - (c.embedding operator(extensions.<=>) o.embedding)) over (partition by o.id)
        as standout
    from orgs o
    cross join public.category_embeddings c
    where o.embedding is not null
  ),
  -- Points for the student's interests that aren't already one of the org's categories.
  related as (
    select s.org_id, s.name, 2 * least(1, greatest(0, (s.standout - 0.015) / 0.03)) as points
    from standouts s
    join picked p on p.key = lower(s.name)
    join orgs o on o.id = s.org_id
    where p.key <> all (select lower(category) from unnest(o.categories) as category)
  )
  select
    o.id,
    round((
      3 * (select count(*) from unnest(o.categories) as category where lower(category) in (select key from picked))
      + coalesce((select sum(r.points) from related r where r.org_id = o.id), 0)
      + case
          when student_department is not null and o.department in ('University Wide', student_department) then 2
          else 0
        end
    )::numeric, 2),
    array(
      select category from unnest(o.categories) as category where lower(category) in (select key from picked)
    ),
    array(
      select r.name from related r where r.org_id = o.id and r.points >= 1 order by r.points desc
    )
  from orgs o
  order by 2 desc, o.name;
$$;

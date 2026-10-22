-- Profile Assessment: after accepting the Terms, students fill in their name,
-- program (college) and year level, and pick up to 3 interests/hobbies, skills
-- to improve and preferred activities. These feed the AI organization
-- recommendations (see 20261022120000_create_recommendation_embeddings.sql).
-- Students can also type their own entries; those stay on their profile only.

alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column interests text[] not null default '{}',
  add column skills text[] not null default '{}',
  add column preferred_activities text[] not null default '{}',
  add column assessment_completed_at timestamptz;

-- The choices offered in the mobile app's pickers. Admins can add, rename or
-- remove rows; the app shows them in "sort" order.
create table public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('interest', 'skill', 'activity')),
  label text not null check (char_length(trim(label)) between 1 and 40),
  sort smallint not null default 0
);

create unique index assessment_options_label_key on public.assessment_options (kind, lower(label));

alter table public.assessment_options enable row level security;

create policy "Logged-in users can read assessment options"
  on public.assessment_options for select
  to authenticated
  using (true);

create policy "Admins can manage assessment options"
  on public.assessment_options for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.assessment_options (kind, label, sort) values
  ('interest', 'Technology', 1),
  ('interest', 'Programming', 2),
  ('interest', 'Networking', 3),
  ('interest', 'Arts', 4),
  ('interest', 'Gaming', 5),
  ('interest', 'Design', 6),
  ('interest', 'Animation', 7),
  ('interest', 'Cyber Security', 8),
  ('interest', 'Artificial Intelligence', 9),
  ('interest', 'Analytics', 10),
  ('interest', 'Machine Learning', 11),
  ('interest', 'Innovation', 12),
  ('skill', 'Public Speaking', 1),
  ('skill', 'Leadership', 2),
  ('skill', 'Project Management', 3),
  ('skill', 'Arts', 4),
  ('skill', 'Programming', 5),
  ('skill', 'Cybersecurity', 6),
  ('skill', 'UI/UX Design', 7),
  ('skill', 'Graphic Design', 8),
  ('activity', 'Training', 1),
  ('activity', 'Forum', 2),
  ('activity', 'Seminar', 3),
  ('activity', 'Competition', 4),
  ('activity', 'E-sports', 5),
  ('activity', 'Workshop', 6);

-- AI embeddings for the words students pick or type (interests, skills,
-- activities). Made by the web dashboard in an admin's browser, or by
-- `npm run embed:orgs`. Kept apart from category_embeddings, which is the list
-- of organization categories.
create table public.term_embeddings (
  term text primary key check (char_length(trim(term)) > 0),
  embedding extensions.vector(384) not null,
  created_at timestamptz not null default now()
);

-- "Gaming" and "gaming" are the same word.
create unique index term_embeddings_term_key on public.term_embeddings (lower(term));

alter table public.term_embeddings enable row level security;

create policy "Logged-in users can read term embeddings"
  on public.term_embeddings for select
  to authenticated
  using (true);

create policy "Admins can add term embeddings"
  on public.term_embeddings for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update term embeddings"
  on public.term_embeddings for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Trims each label, drops blanks and repeats (ignoring upper/lower case), and
-- keeps the order they were picked in.
create function public.clean_labels(labels text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(label order by position), '{}')
  from (
    select distinct on (lower(trim(item))) trim(item) as label, position
    from unnest(coalesce(labels, '{}')) with ordinality as picked (item, position)
    where trim(item) <> ''
    order by lower(trim(item)), position
  ) as unique_labels;
$$;

-- Users can't update their own profile, so the assessment is saved through this
-- function. It only changes the logged-in user's own row, and only these fields.
create function public.save_profile_assessment(
  p_first_name text,
  p_last_name text,
  p_department text,
  p_year_level integer,
  p_interests text[],
  p_skills text[],
  p_activities text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_name_clean text := trim(coalesce(p_first_name, ''));
  last_name_clean text := trim(coalesce(p_last_name, ''));
  department_clean text := trim(coalesce(p_department, ''));
  interests_clean text[] := public.clean_labels(p_interests);
  skills_clean text[] := public.clean_labels(p_skills);
  activities_clean text[] := public.clean_labels(p_activities);
begin
  if (select auth.uid()) is null then
    raise exception 'You need to be logged in.';
  end if;
  if first_name_clean = '' or last_name_clean = '' then
    raise exception 'Enter your first and last name.';
  end if;
  if department_clean = '' then
    raise exception 'Choose your program.';
  end if;
  if p_year_level is null or p_year_level not between 1 and 5 then
    raise exception 'Choose your year level.';
  end if;
  if cardinality(interests_clean) not between 1 and 3 then
    raise exception 'Choose 1 to 3 interests or hobbies.';
  end if;
  if cardinality(skills_clean) > 3 or cardinality(activities_clean) > 3 then
    raise exception 'Choose up to 3 skills and up to 3 activities.';
  end if;
  if exists (
    select 1
    from unnest(interests_clean || skills_clean || activities_clean) as label
    where char_length(label) > 40
  ) then
    raise exception 'Keep each choice under 40 characters.';
  end if;

  update public.profiles
  set first_name = first_name_clean,
      last_name = last_name_clean,
      full_name = first_name_clean || ' ' || last_name_clean,
      department = department_clean,
      year_level = p_year_level,
      interests = interests_clean,
      skills = skills_clean,
      preferred_activities = activities_clean,
      assessment_completed_at = now()
  where id = (select auth.uid());
end;
$$;

revoke execute on function public.save_profile_assessment(text, text, text, integer, text[], text[], text[])
  from public, anon;
grant execute on function public.save_profile_assessment(text, text, text, integer, text[], text[], text[])
  to authenticated;

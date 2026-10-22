-- Students can pick as many interests, skills and activities as they like in the
-- Profile Assessment (it was up to 3 each). At least one interest is still
-- needed for recommendations. 30 per list only guards against misuse; the app
-- offers far fewer choices than that.

create or replace function public.save_profile_assessment(
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
  if cardinality(interests_clean) = 0 then
    raise exception 'Choose at least one interest or hobby.';
  end if;
  if greatest(cardinality(interests_clean), cardinality(skills_clean), cardinality(activities_clean)) > 30 then
    raise exception 'That''s too many choices in one list.';
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

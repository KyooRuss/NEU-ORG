-- Organization recommendations from the student's whole Profile Assessment:
-- interests, skills to improve, preferred activities and college. Replaces
-- recommend_organizations(), which only looked at interests.
--
-- Score for each active organization:
--   +3      each interest that is one of the org's categories (exact match)
--   +0..2   each other interest whose meaning is close to the org's text
--   +0..1.5 each skill to improve whose meaning is close to the org's text
--   +0..1.5 each preferred activity whose meaning is close to the org's text
--   +2      the org is under the student's own college. University Wide orgs get
--           nothing here: anyone can join them, which doesn't make them a fit.
--
-- "Close in meaning" uses the embeddings: a word's similarity to the org minus
-- the org's average similarity to every word the AI knows, i.e. how much the word
-- stands out for that org (raw similarities are bunched together, so a fixed
-- cutoff doesn't work). Under 0.015 above average = no points, 0.045 or more =
-- full points. Tested with `npm run check:recommendations`.
--
-- Words without an embedding yet (a student's new custom word, before an admin
-- opens the web dashboard) only count when they exactly match a category.

drop function public.recommend_organizations(text[], text);

create function public.score_organizations(
  interests text[],
  skills text[],
  activities text[],
  student_department text default null
)
returns table (
  organization_id uuid,
  score numeric,
  -- Interests that are one of the org's categories.
  matched_categories text[],
  -- Interests, skills and activities close in meaning to the org, best first.
  related_words text[]
)
language sql
stable
set search_path = ''
as $$
  with picks as (
    select distinct on (kind, lower(trim(word))) kind, trim(word) as word, lower(trim(word)) as key
    from (
      select 'interest' as kind, unnest(coalesce(interests, '{}')) as word
      union all
      select 'skill', unnest(coalesce(skills, '{}'))
      union all
      select 'activity', unnest(coalesce(activities, '{}'))
    ) as all_picks
    where trim(word) <> ''
  ),
  -- Every word the AI knows (assessment words and org categories), once each.
  vocabulary as (
    select distinct on (lower(name)) lower(name) as key, embedding
    from (
      select term as name, embedding, 1 as preference from public.term_embeddings
      union all
      select name, embedding, 2 from public.category_embeddings
    ) as words
    order by lower(name), preference
  ),
  orgs as (
    select o.id, o.name, o.categories, o.department, e.embedding
    from public.organizations o
    left join public.organization_embeddings e on e.organization_id = o.id
    where o.status = 'active'
  ),
  standouts as (
    select
      o.id as org_id,
      v.key,
      (1 - (v.embedding operator(extensions.<=>) o.embedding))
        - avg(1 - (v.embedding operator(extensions.<=>) o.embedding)) over (partition by o.id)
        as standout
    from orgs o
    cross join vocabulary v
    where o.embedding is not null
  ),
  exact as (
    select o.id as org_id, p.word
    from orgs o
    join picks p on p.kind = 'interest'
    where p.key in (select lower(category) from unnest(o.categories) as category)
  ),
  related as (
    select
      s.org_id,
      p.word,
      (case p.kind when 'interest' then 2 else 1.5 end)
        * least(1, greatest(0, (s.standout - 0.015) / 0.03)) as points
    from standouts s
    join picks p on p.key = s.key
    -- An exact match already scored 3 for that interest.
    where not (
      p.kind = 'interest'
      and exists (select 1 from exact x where x.org_id = s.org_id and lower(x.word) = p.key)
    )
  )
  select
    o.id,
    round((
      3 * (select count(*) from exact x where x.org_id = o.id)
      + coalesce((select sum(r.points) from related r where r.org_id = o.id), 0)
      + case when o.department = student_department then 2 else 0 end
    )::numeric, 2),
    array(select x.word from exact x where x.org_id = o.id),
    -- Words that earned at least half their points, so the app can say why.
    array(
      select r.word
      from related r
      where r.org_id = o.id and r.points >= 0.75
      group by r.word
      order by max(r.points) desc
    )
  from orgs o
  order by 2 desc, o.name;
$$;

-- The logged-in student's recommendations, from their saved Profile Assessment.
create function public.recommend_for_me()
returns table (
  organization_id uuid,
  score numeric,
  matched_categories text[],
  related_words text[]
)
language sql
stable
set search_path = ''
as $$
  select scored.*
  from public.profiles p
  cross join lateral public.score_organizations(
    p.interests, p.skills, p.preferred_activities, p.department
  ) as scored
  where p.id = (select auth.uid());
$$;

revoke execute on function public.score_organizations(text[], text[], text[], text) from public, anon;
grant execute on function public.score_organizations(text[], text[], text[], text) to authenticated;
revoke execute on function public.recommend_for_me() from public, anon;
grant execute on function public.recommend_for_me() to authenticated;

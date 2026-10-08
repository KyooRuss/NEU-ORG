-- Organization IDs shown to admins: the year the org was added, then its number
-- within that year, e.g. "2026-001" for the first org added in 2026. The database
-- assigns it when the org is created, and it never changes afterwards. Numbers
-- of deleted orgs aren't reused.

alter table public.organizations
  add column org_code text unique check (org_code ~ '^\d{4}-\d{3,}$');

-- Existing orgs, numbered by when they were added (Philippine time).
update public.organizations as org
set org_code = numbered.code
from (
  select
    id,
    to_char(created_at at time zone 'Asia/Manila', 'YYYY') || '-' ||
      lpad(
        row_number() over (
          partition by extract(year from created_at at time zone 'Asia/Manila')
          order by created_at, id
        )::text,
        3,
        '0'
      ) as code
  from public.organizations
) as numbered
where org.id = numbered.id;

alter table public.organizations alter column org_code set not null;

create function public.set_org_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  org_year text;
  last_number int;
begin
  if tg_op = 'UPDATE' then
    new.org_code = old.org_code;
    return new;
  end if;

  org_year = to_char(new.created_at at time zone 'Asia/Manila', 'YYYY');
  -- Two orgs added at the same moment wait for each other instead of getting the same number.
  perform pg_advisory_xact_lock(hashtext('org_code'), org_year::int);

  select max(split_part(org_code, '-', 2)::int)
  into last_number
  from public.organizations
  where org_code like org_year || '-%';

  new.org_code = org_year || '-' || lpad((coalesce(last_number, 0) + 1)::text, 3, '0');
  return new;
end;
$$;

create trigger organizations_set_org_code
  before insert or update on public.organizations
  for each row execute function public.set_org_code();

-- Officers can now be the organization's President or its Adviser. Each
-- organization has at most one active person in each position. Admins add them
-- with assign_officer (the web dashboard's "Add admin"), which makes whoever
-- held that position in the organization inactive.
--
-- Advisers get officer access like presidents: sync_officer_role already makes
-- anyone with an active officer row an "officer".

alter table public.officers
  drop constraint officers_position_is_president,
  add constraint officers_position_check check (position in ('President', 'Adviser'));

-- One active person per position per organization (was: one active row per organization).
drop index public.officers_one_active_per_org;
create unique index officers_one_active_per_org_position
  on public.officers (organization_id, position)
  where status = 'active';

-- Makes the account the active holder of a position in an organization. The
-- current holder of that position (if any) becomes inactive. Returns the officer id.
-- A person holds one position per organization; adding them again changes it.
create function public.assign_officer(target_profile uuid, target_org uuid, target_position text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_profile uuid;
  new_officer_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can add officers.' using errcode = '42501';
  end if;

  if target_position not in ('President', 'Adviser') then
    raise exception 'Choose President or Adviser as the position.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_profile
      and role <> 'admin'
      and status = 'active'
  ) then
    raise exception 'Only active accounts can be added as officers.';
  end if;

  -- Locking the organization makes two admins adding at once take turns.
  perform 1
  from public.organizations
  where id = target_org
    and status = 'active'
  for update;

  if not found then
    raise exception 'This organization was not found or is archived.';
  end if;

  update public.officers
  set status = 'inactive'
  where organization_id = target_org
    and position = target_position
    and status = 'active'
    and profile_id <> target_profile
  returning profile_id into previous_profile;

  -- Reuses the row if this person was an officer of this organization before.
  insert into public.officers (profile_id, organization_id, position, status)
  values (target_profile, target_org, target_position, 'active')
  on conflict (profile_id, organization_id)
    do update set status = 'active', position = target_position
  returning id into new_officer_id;

  if previous_profile is not null then
    perform public.sync_officer_role(previous_profile);
  end if;
  perform public.sync_officer_role(target_profile);

  return new_officer_id;
end;
$$;

-- assign_president stays for older callers; it's assign_officer with "President".
create or replace function public.assign_president(target_profile uuid, target_org uuid)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.assign_officer(target_profile, target_org, 'President');
$$;

-- Same as before, except reactivating is refused only while someone else holds
-- the same position in the organization.
create or replace function public.set_officer_status(target_officer uuid, new_status public.officer_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  officer public.officers;
  current_holder text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change officers.' using errcode = '42501';
  end if;

  select *
  into officer
  from public.officers
  where id = target_officer;

  if not found then
    raise exception 'This officer was not found.';
  end if;

  -- Same lock as assign_officer, so the two can't overlap.
  perform 1
  from public.organizations
  where id = officer.organization_id
  for update;

  if new_status = 'active' then
    if not exists (
      select 1
      from public.profiles
      where id = officer.profile_id
        and status = 'active'
    ) then
      raise exception 'This account is suspended or inactive, so it can''t be reactivated.';
    end if;

    select coalesce(p.full_name, p.email)
    into current_holder
    from public.officers o
    join public.profiles p on p.id = o.profile_id
    where o.organization_id = officer.organization_id
      and o.position = officer.position
      and o.status = 'active'
      and o.id <> officer.id;

    if current_holder is not null then
      raise exception '% is already the active % of this organization. Use Add admin to replace them.',
        current_holder, lower(officer.position);
    end if;
  end if;

  update public.officers
  set status = new_status
  where id = target_officer;

  perform public.sync_officer_role(officer.profile_id);
end;
$$;

-- Logged-in users may call it; the function checks for an admin itself.
revoke execute on function public.assign_officer(uuid, uuid, text) from public, anon;
grant execute on function public.assign_officer(uuid, uuid, text) to authenticated;

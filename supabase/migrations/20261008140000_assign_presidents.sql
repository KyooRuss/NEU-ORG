-- Officers are organization presidents only, and each organization has at most
-- one active president. Admins assign a president with assign_president, which
-- makes the current president inactive. They deactivate or reactivate one with
-- set_officer_status.
--
-- Both functions keep profiles.role in step with the officers table: "officer"
-- while someone is an active president of at least one organization, "student"
-- otherwise. A replaced president goes back to "student" and loses the officer
-- panel.

-- Existing rows become presidents. If an organization already has more than one
-- active row, keep the newest and make the rest inactive, so the index below
-- can be created.
update public.officers
set position = 'President'
where position <> 'President';

update public.officers o
set status = 'inactive'
where o.status = 'active'
  and exists (
    select 1
    from public.officers newer
    where newer.organization_id = o.organization_id
      and newer.status = 'active'
      and (newer.created_at, newer.id) > (o.created_at, o.id)
  );

alter table public.officers
  drop constraint officers_position_check,
  alter column position set default 'President',
  add constraint officers_position_is_president check (position = 'President');

-- At most one active president per organization. Inactive rows are kept as history.
create unique index officers_one_active_per_org
  on public.officers (organization_id)
  where status = 'active';

-- Changes go through the functions below so the role always matches.
-- Admins can still read every row with the existing select policy.
drop policy "Admins can add officers" on public.officers;
drop policy "Admins can update officers" on public.officers;
drop policy "Admins can delete officers" on public.officers;

-- Sets a user's role to "officer" if they are an active president anywhere,
-- otherwise "student". Never touches admins. Internal: not callable from the app.
create function public.sync_officer_role(target_profile uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set role = case
    when exists (
      select 1
      from public.officers
      where profile_id = target_profile
        and status = 'active'
    ) then 'officer'::public.user_role
    else 'student'::public.user_role
  end
  where id = target_profile
    and role <> 'admin';
$$;

revoke execute on function public.sync_officer_role(uuid) from public, anon, authenticated;

-- Makes a student the active president of an organization. The current
-- president (if any) becomes inactive. Returns the new president's officer id.
create function public.assign_president(target_profile uuid, target_org uuid)
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
    raise exception 'Only admins can assign presidents.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_profile
      and role <> 'admin'
      and status = 'active'
  ) then
    raise exception 'Only active student accounts can be made president.';
  end if;

  -- Locking the organization makes two admins assigning at once take turns.
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
    and status = 'active'
    and profile_id <> target_profile
  returning profile_id into previous_profile;

  -- Reuses the row if this student was president of this organization before.
  insert into public.officers (profile_id, organization_id, position, status)
  values (target_profile, target_org, 'President', 'active')
  on conflict (profile_id, organization_id)
    do update set status = 'active', position = 'President'
  returning id into new_officer_id;

  if previous_profile is not null then
    perform public.sync_officer_role(previous_profile);
  end if;
  perform public.sync_officer_role(target_profile);

  return new_officer_id;
end;
$$;

-- Deactivates or reactivates a president. Reactivating is refused while the
-- organization has another active president; assign_president replaces them.
create function public.set_officer_status(target_officer uuid, new_status public.officer_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  officer public.officers;
  current_president text;
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

  -- Same lock as assign_president, so the two can't overlap.
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
      raise exception 'This account is suspended or inactive, so it can''t be reactivated as president.';
    end if;

    select coalesce(p.full_name, p.email)
    into current_president
    from public.officers o
    join public.profiles p on p.id = o.profile_id
    where o.organization_id = officer.organization_id
      and o.status = 'active'
      and o.id <> officer.id;

    if current_president is not null then
      raise exception '% is already the active president of this organization. Use Assign president to replace them.',
        current_president;
    end if;
  end if;

  update public.officers
  set status = new_status
  where id = target_officer;

  perform public.sync_officer_role(officer.profile_id);
end;
$$;

-- Logged-in users may call these; each function checks for an admin itself.
revoke execute on function public.assign_president(uuid, uuid) from public, anon;
revoke execute on function public.set_officer_status(uuid, public.officer_status) from public, anon;
grant execute on function public.assign_president(uuid, uuid) to authenticated;
grant execute on function public.set_officer_status(uuid, public.officer_status) to authenticated;

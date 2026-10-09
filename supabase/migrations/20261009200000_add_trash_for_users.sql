-- Trash for Users > Admin Officers, Students and Professors. Moving someone to
-- Trash sets archived_at, which hides them from the list until an admin restores
-- them (archived_at back to null). Deleting for good still goes through
-- remove_officer, delete_student and delete_professor.
--
-- Students and professors are archived with plain updates; the existing
-- "Admins can update profiles" policy covers them. Officers go through
-- archive_officer, which also makes them inactive and updates their role.

alter table public.profiles
  add column archived_at timestamptz;

alter table public.officers
  add column archived_at timestamptz;

-- Moves the officer to Trash. They become inactive, so they lose officer access
-- unless they hold another active position. Restoring leaves them inactive.
create function public.archive_officer(target_officer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  archived_profile uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can move officers to Trash.' using errcode = '42501';
  end if;

  update public.officers
  set archived_at = now(),
      status = 'inactive'
  where id = target_officer
    and archived_at is null
  returning profile_id into archived_profile;

  if archived_profile is null then
    raise exception 'This officer was not found, or is already in Trash.';
  end if;

  perform public.sync_officer_role(archived_profile);
end;
$$;

-- Logged-in users may call it; the function checks for an admin itself.
revoke execute on function public.archive_officer(uuid) from public, anon;
grant execute on function public.archive_officer(uuid) to authenticated;

-- An officer made active again (by assign_officer reusing their row, or
-- set_officer_status) comes out of Trash, so they show up on Admin Officers.
create function public.officers_unarchive_when_active()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' then
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create trigger officers_unarchive_when_active
  before update on public.officers
  for each row execute function public.officers_unarchive_when_active();

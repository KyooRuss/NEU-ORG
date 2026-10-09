-- Lets admins remove an officer entry for good (the trash button on Users >
-- Admin Officers). Goes through a function, like the other officer changes, so
-- the person's role is updated too: they lose officer access unless they still
-- hold another active position.

create function public.remove_officer(target_officer uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_profile uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can remove officers.' using errcode = '42501';
  end if;

  delete from public.officers
  where id = target_officer
  returning profile_id into removed_profile;

  if removed_profile is null then
    raise exception 'This officer was not found.';
  end if;

  perform public.sync_officer_role(removed_profile);
end;
$$;

-- Logged-in users may call it; the function checks for an admin itself.
revoke execute on function public.remove_officer(uuid) from public, anon;
grant execute on function public.remove_officer(uuid) to authenticated;

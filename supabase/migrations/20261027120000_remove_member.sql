-- Removing members: officers remove a member of their organization from the
-- Members page of the web dashboard (e.g. someone who left). Admins can too.
--
-- organization_members has no delete policy, so this runs as "security
-- definer" and checks for itself that the caller may do it. A removed student
-- is no longer a member, so they can apply again later.

create function public.remove_member(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.organization_members;
begin
  -- "for update" locks the row, so two officers can't remove it at the same time.
  select * into member
  from public.organization_members
  where id = target_member_id
  for update;

  if not found
    or not (public.is_officer_of(member.organization_id::text) or (select public.is_admin())) then
    raise exception 'This member was not found, or your account is not allowed to remove them.';
  end if;

  delete from public.organization_members
  where id = target_member_id;
end;
$$;

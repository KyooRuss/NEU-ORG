-- Officers accept or decline membership applications from the Recruitment page.
-- Accepting marks the application and adds the student as a member together, so
-- one never happens without the other.
--
-- Neither table lets officers write to it directly, so these run as "security
-- definer" and check for themselves that the caller is an officer of the
-- application's organization.

create function public.accept_application(target_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.membership_applications;
begin
  -- "for update" locks the row, so two officers can't decide it at the same time.
  select * into application
  from public.membership_applications
  where id = target_application_id
  for update;

  if not found or not public.is_officer_of(application.organization_id::text) then
    raise exception 'This application was not found, or your account is not allowed to decide it.';
  end if;

  if application.status <> 'pending' then
    raise exception 'This application has already been decided.';
  end if;

  update public.membership_applications
  set status = 'accepted', decided_by = auth.uid(), decided_at = now()
  where id = target_application_id;

  insert into public.organization_members (organization_id, profile_id)
  values (application.organization_id, application.profile_id)
  on conflict (organization_id, profile_id) do nothing;
end;
$$;

create function public.decline_application(target_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.membership_applications;
begin
  select * into application
  from public.membership_applications
  where id = target_application_id
  for update;

  if not found or not public.is_officer_of(application.organization_id::text) then
    raise exception 'This application was not found, or your account is not allowed to decide it.';
  end if;

  if application.status <> 'pending' then
    raise exception 'This application has already been decided.';
  end if;

  update public.membership_applications
  set status = 'declined', decided_by = auth.uid(), decided_at = now()
  where id = target_application_id;
end;
$$;

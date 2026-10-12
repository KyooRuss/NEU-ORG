-- Officers can edit their own organization's profile from the web dashboard:
-- the description, vision, mission, contact details, reasons to join,
-- testimonials, logo and photos. The name, categories, department, program
-- eligibility and status stay with the admins.

-- True when the logged-in user holds an active position in the organization.
-- It takes the ID as text so the storage policies below can pass a folder name
-- straight in. "security definer" lets it read officers without running into
-- the officers RLS policies.
create function public.is_officer_of(target_org text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.officers
    where profile_id = (select auth.uid())
      and organization_id::text = target_org
      and status = 'active'
      and archived_at is null
  );
$$;

-- Only while the organization is active: one in Trash can't be edited by its officers.
create policy "Officers can update their own organization"
  on public.organizations for update
  to authenticated
  using (status = 'active' and public.is_officer_of(id::text))
  with check (status = 'active' and public.is_officer_of(id::text));

-- The policy above opens the whole row, so this keeps the admin-only columns
-- closed. Changes made without a logged-in user (the seed script, the SQL
-- editor) are left alone.
create function public.protect_organization_admin_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.name is distinct from old.name
    or new.categories is distinct from old.categories
    or new.department is distinct from old.department
    or new.program_eligibility is distinct from old.program_eligibility
    or new.status is distinct from old.status
    or new.archived_at is distinct from old.archived_at
  then
    raise exception 'Only an admin can change an organization''s name, categories, department, program eligibility or status.';
  end if;

  return new;
end;
$$;

create trigger organizations_protect_admin_columns
  before update on public.organizations
  for each row execute function public.protect_organization_admin_columns();

-- Logos and photos are stored as <org id>/logo/... and <org id>/photos/..., so
-- the first folder says which organization a file belongs to.
-- Public URLs work without this; Storage needs it before officers can remove files.
create policy "Officers can list their org media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'org-media' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can upload their org media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'org-media' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can replace their org media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'org-media' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can remove their org media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'org-media' and public.is_officer_of((storage.foldername(name))[1]));

-- Organizations: the student orgs admins (OSAS) manage on the web dashboard.
-- "Deleting" an org archives it (it moves to Trash); admins can restore it or
-- delete it for good from there.

create type public.org_status as enum ('active', 'archived');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  -- Preset (Academic, Cultural, Sports, Religious, Special Interest) or custom names.
  categories text[] not null check (cardinality(categories) between 1 and 3),
  description text,
  mission_vision text,
  room_number text,
  telegram_contact text,
  facebook_contact text,
  program_eligibility text not null default 'All Programs',
  reasons_to_join text[] not null default '{}',
  -- A list of {"author": "...", "text": "..."} objects.
  testimonials jsonb not null default '[]' check (jsonb_typeof(testimonials) = 'array'),
  -- Paths inside the "org-media" storage bucket.
  logo_path text,
  photo_paths text[] not null default '{}',
  status public.org_status not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No two orgs with the same name, ignoring upper/lower case.
create unique index organizations_name_key on public.organizations (lower(name));

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;

-- Students and officers browse active orgs in the mobile app.
create policy "Logged-in users can read active organizations"
  on public.organizations for select
  to authenticated
  using (status = 'active');

create policy "Admins can read all organizations"
  on public.organizations for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can add organizations"
  on public.organizations for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update organizations"
  on public.organizations for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete organizations"
  on public.organizations for delete
  to authenticated
  using ((select public.is_admin()));

-- Logos and event photos, stored as <org id>/logo/... and <org id>/photos/...
-- Anyone can view them (they show in the app); only admins can change them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-media',
  'org-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
);

-- Public URLs work without this; Storage needs it before admins can remove files.
create policy "Admins can list org media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'org-media' and (select public.is_admin()));

create policy "Admins can upload org media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'org-media' and (select public.is_admin()));

create policy "Admins can replace org media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'org-media' and (select public.is_admin()));

create policy "Admins can remove org media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'org-media' and (select public.is_admin()));

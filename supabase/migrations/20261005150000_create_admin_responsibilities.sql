-- Admin responsibilities: the numbered list on the admin dashboard. Admins
-- (OSAS) can add, edit and delete items; nobody else can see them.

create table public.admin_responsibilities (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) > 0),
  -- Lower numbers show first.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_responsibilities_set_updated_at
  before update on public.admin_responsibilities
  for each row execute function public.set_updated_at();

alter table public.admin_responsibilities enable row level security;

create policy "Admins can read responsibilities"
  on public.admin_responsibilities for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can add responsibilities"
  on public.admin_responsibilities for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update responsibilities"
  on public.admin_responsibilities for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete responsibilities"
  on public.admin_responsibilities for delete
  to authenticated
  using ((select public.is_admin()));

-- Start with the list from the dashboard design.
insert into public.admin_responsibilities (body, position)
values
  ('Add, edit, deactivate, or delete user accounts and manage user roles.', 1),
  ('Add, edit, approve, or remove website content such as posts, announcements, and information.', 2),
  ('View, update, organize, and maintain records stored in the system.', 3),
  ('Review and approve or reject requests submitted by users or other staff.', 4),
  ('Monitor activities, view logs, manage system status, and ensure the website is functioning properly.', 5);

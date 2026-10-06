-- Memorandums: files (PDFs, documents, images) that admins (OSAS) upload on the
-- web dashboard. Every logged-in user can read them; only admins can add or
-- delete them.

create table public.memorandums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  -- The original name of the uploaded file, shown under the title.
  file_name text not null,
  -- Path inside the "memorandums" storage bucket.
  file_path text not null unique,
  uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.memorandums enable row level security;

create policy "Logged-in users can read memorandums"
  on public.memorandums for select
  to authenticated
  using (true);

create policy "Admins can add memorandums"
  on public.memorandums for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can delete memorandums"
  on public.memorandums for delete
  to authenticated
  using ((select public.is_admin()));

-- Private bucket: files open through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memorandums',
  'memorandums',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]
);

create policy "Logged-in users can read memorandum files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'memorandums');

create policy "Admins can upload memorandum files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'memorandums' and (select public.is_admin()));

create policy "Admins can remove memorandum files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'memorandums' and (select public.is_admin()));

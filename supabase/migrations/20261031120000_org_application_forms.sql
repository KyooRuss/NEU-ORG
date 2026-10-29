-- Each organization can upload its own membership application form (PDF or
-- Word). Students download it from the apply sheet in the mobile app and bring
-- it, filled out, to their interview. Officers manage their own organization's
-- form; admins manage any. Orgs without one just don't show the download.

alter table public.organizations
  -- Path inside the "org-forms" storage bucket.
  add column application_form_path text,
  -- The original name of the uploaded file, shown to students.
  add column application_form_name text;

-- Stored as <org id>/<random name>.<ext>, so the first folder says which
-- organization a file belongs to. Public like org-media: anyone with the link
-- can download it, and the app only shows links to logged-in students.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-forms',
  'org-forms',
  true,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- Public URLs work without the select policies; Storage needs them before files can be removed.
create policy "Admins can list org forms"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'org-forms' and (select public.is_admin()));

create policy "Admins can upload org forms"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'org-forms' and (select public.is_admin()));

create policy "Admins can remove org forms"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'org-forms' and (select public.is_admin()));

create policy "Officers can list their org forms"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'org-forms' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can upload their org forms"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'org-forms' and public.is_officer_of((storage.foldername(name))[1]));

create policy "Officers can remove their org forms"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'org-forms' and public.is_officer_of((storage.foldername(name))[1]));

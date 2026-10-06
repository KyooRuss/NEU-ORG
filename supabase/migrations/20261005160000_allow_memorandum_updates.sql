-- Let admins fix a memorandum's title or replace its file (for example, after
-- uploading the wrong one). A replaced file gets a new path, so Storage only
-- needs the existing upload and remove policies.

create policy "Admins can update memorandums"
  on public.memorandums for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

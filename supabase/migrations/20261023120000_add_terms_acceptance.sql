-- Terms & Privacy consent. Students accept the mobile app's Terms & Privacy
-- Policy after their first login (Data Privacy Act of 2012). The app keeps the
-- terms text and its version; changing the version asks everyone to accept again.

alter table public.profiles
  -- The version of the terms the user last accepted, e.g. "2026-10-v1".
  add column terms_version text,
  add column terms_accepted_at timestamptz;

-- Users can't update their own profile, so accepting goes through this function.
-- It only changes these two columns, and only on the logged-in user's own row.
create function public.accept_terms(version text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set terms_version = version,
      terms_accepted_at = now()
  where id = (select auth.uid());
$$;

revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

-- Whether an organization is taking membership applications. Officers open and
-- close recruitment from the Recruitment page on the web dashboard; students can
-- only apply while it's open.
--
-- Officers can already update their own organization, and the trigger that keeps
-- the admin-only columns closed doesn't list this one, so officers can change it.
alter table public.organizations
  add column recruitment_open boolean not null default false;

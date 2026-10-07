-- Student details and account status on profiles. Admins (OSAS) list students
-- on the web dashboard under Users > Students, and can suspend or reactivate
-- their accounts there. The existing "Admins can update profiles" policy covers
-- those changes; users still can't update their own profile.

create type public.account_status as enum ('active', 'suspended', 'inactive');

alter table public.profiles
  -- "2022-00002"
  add column student_no text unique check (student_no ~ '^\d{4}-\d{5}$'),
  add column year_level smallint check (year_level between 1 and 5),
  add column status public.account_status not null default 'active';

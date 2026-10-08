-- The department (college) an organization is under, chosen by the admin when
-- adding it. "University Wide" is for orgs open to students of every course.
-- The web app lists the choices (DEPARTMENT_OPTIONS in apps/web/src/lib/organizations.ts).

alter table public.organizations
  add column department text check (char_length(trim(department)) > 0);

-- Existing orgs: their program eligibility is the best guess. Admins can change it.
update public.organizations
set department = case
  when program_eligibility = 'All Programs' then 'University Wide'
  else program_eligibility
end;

alter table public.organizations alter column department set not null;

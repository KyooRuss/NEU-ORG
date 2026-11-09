-- Matches saved records to NEU's actual list of colleges (COLLEGES in
-- apps/web/src/lib/organizations.ts and apps/mobile/src/lib/assessment.ts).
-- College names are saved as plain text, so the two renamed colleges are updated
-- wherever they appear. Only exact matches change; other text stays as it is.

-- A rename isn't a real edit, so "last updated" stays the same. The web
-- notifications and event lists rely on events.updated_at, and a new time could
-- bring old notifications back.
alter table public.organizations disable trigger organizations_set_updated_at;
alter table public.events disable trigger events_set_updated_at;

update public.organizations
set department = 'College of Informatics & Computing Studies'
where department = 'College of Computer Studies';

update public.organizations
set department = 'College of Engineering & Architecture'
where department = 'College of Engineering and Architecture';

update public.organizations
set program_eligibility = 'College of Informatics & Computing Studies'
where program_eligibility = 'College of Computer Studies';

update public.organizations
set program_eligibility = 'College of Engineering & Architecture'
where program_eligibility = 'College of Engineering and Architecture';

update public.profiles
set department = 'College of Informatics & Computing Studies'
where department = 'College of Computer Studies';

update public.profiles
set department = 'College of Engineering & Architecture'
where department = 'College of Engineering and Architecture';

update public.professor_invites
set department = 'College of Informatics & Computing Studies'
where department = 'College of Computer Studies';

update public.professor_invites
set department = 'College of Engineering & Architecture'
where department = 'College of Engineering and Architecture';

update public.membership_applications
set program = 'College of Informatics & Computing Studies'
where program = 'College of Computer Studies';

update public.membership_applications
set program = 'College of Engineering & Architecture'
where program = 'College of Engineering and Architecture';

update public.events
set audience_colleges = array_replace(
  array_replace(
    audience_colleges,
    'College of Computer Studies',
    'College of Informatics & Computing Studies'
  ),
  'College of Engineering and Architecture',
  'College of Engineering & Architecture'
)
where audience_colleges && array[
  'College of Computer Studies',
  'College of Engineering and Architecture'
];

alter table public.organizations enable trigger organizations_set_updated_at;
alter table public.events enable trigger events_set_updated_at;

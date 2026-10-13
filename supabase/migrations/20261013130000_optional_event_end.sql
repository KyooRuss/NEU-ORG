-- Some events have no set end time: officers don't always know when one will
-- finish. The end is now optional. An event without one counts as upcoming for
-- the whole day it starts on.
--
-- The "ends after start" check still applies whenever an end time is given.
alter table public.events alter column ends_at drop not null;

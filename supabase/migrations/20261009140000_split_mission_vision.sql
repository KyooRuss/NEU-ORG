-- The add-organization page asks for the vision and the mission separately.
-- Text already saved in the combined "mission_vision" field moves to "mission";
-- admins can move the vision part over by editing the organization.

alter table public.organizations rename column mission_vision to mission;
alter table public.organizations add column vision text;

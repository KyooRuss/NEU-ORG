-- A "professor" role for faculty accounts. Kept in its own migration because
-- Postgres can't use a new enum value in the same transaction that adds it;
-- the next migration (add_professors) does that.

alter type public.user_role add value if not exists 'professor';

-- Ensures the metadata column exists on messages (older DBs created the table
-- before this column was part of add_messages_table.sql).
alter table public.messages add column if not exists metadata jsonb;

-- Force PostgREST to reload its schema cache so the new column is visible.
notify pgrst, 'reload schema';

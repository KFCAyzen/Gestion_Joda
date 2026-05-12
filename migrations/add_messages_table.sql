-- Messages internes (staff -> étudiants)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  content text not null,
  read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_to_user_id_created_at on public.messages(to_user_id, created_at desc);
create index if not exists idx_messages_from_user_id_created_at on public.messages(from_user_id, created_at desc);

alter table public.messages enable row level security;

-- Read: a recipient can read their messages
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_select_own'
  ) then
    create policy messages_select_own
      on public.messages
      for select
      using (auth.uid() = to_user_id);
  end if;
end $$;

-- Update: a recipient can mark message as read
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_update_read_own'
  ) then
    create policy messages_update_read_own
      on public.messages
      for update
      using (auth.uid() = to_user_id)
      with check (auth.uid() = to_user_id);
  end if;
end $$;


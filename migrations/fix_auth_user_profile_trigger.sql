create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role text;
begin
  resolved_role := coalesce(
    nullif(new.raw_app_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'role', ''),
    'student'
  );

  insert into public.users (
    id,
    email,
    username,
    name,
    role,
    telephone,
    password_hash,
    must_change_password,
    is_active,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    resolved_role,
    nullif(new.raw_user_meta_data ->> 'telephone', ''),
    'managed_by_supabase_auth',
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, resolved_role = 'student'),
    coalesce((new.raw_user_meta_data ->> 'is_active')::boolean, true),
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    username = excluded.username,
    name = excluded.name,
    role = excluded.role,
    telephone = excluded.telephone,
    password_hash = coalesce(public.users.password_hash, excluded.password_hash),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

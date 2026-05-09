-- Lien explicite entre students et leur compte auth
alter table public.students
  add column if not exists user_id uuid references public.users(id) on delete set null;

-- Index pour accélérer les lookups
create index if not exists idx_students_user_id on public.students(user_id);

-- Remplir user_id depuis created_by pour les étudiants existants
-- (created_by stocke l'UUID auth de l'étudiant dans le flow StudentManagement)
update public.students s
set user_id = s.created_by
where s.user_id is null
  and exists (
    select 1 from public.users u
    where u.id = s.created_by and u.role = 'student'
  );

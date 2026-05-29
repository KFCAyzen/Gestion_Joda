-- ================================================================
-- Documents envoyés par le staff aux étudiants (staff -> étudiant)
-- Inverse de la table `documents` (qui couvre étudiant -> staff)
-- À exécuter dans Supabase SQL Editor
-- ================================================================

create table if not exists public.staff_documents (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete cascade,
    sent_by uuid references public.users(id) on delete set null,
    title text not null,
    description text,
    file_url text not null,
    file_name text not null,
    file_size bigint,
    mime_type text,
    storage_path text,
    downloaded_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_staff_documents_student_id_created_at
    on public.staff_documents (student_id, created_at desc);

create index if not exists idx_staff_documents_sent_by
    on public.staff_documents (sent_by);

alter table public.staff_documents enable row level security;

-- Nettoyage : recrée les policies à chaque exécution
drop policy if exists "staff_documents_student_read"   on public.staff_documents;
drop policy if exists "staff_documents_student_update" on public.staff_documents;
drop policy if exists "staff_documents_staff_all"      on public.staff_documents;

-- Étudiant : lecture de ses propres documents reçus
create policy "staff_documents_student_read" on public.staff_documents
    for select
    using (
        exists (
            select 1 from public.students s
            where s.id = staff_documents.student_id
              and s.created_by = auth.uid()
        )
    );

-- Étudiant : peut marquer comme téléchargé (downloaded_at)
create policy "staff_documents_student_update" on public.staff_documents
    for update
    using (
        exists (
            select 1 from public.students s
            where s.id = staff_documents.student_id
              and s.created_by = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.students s
            where s.id = staff_documents.student_id
              and s.created_by = auth.uid()
        )
    );

-- Staff : accès complet
create policy "staff_documents_staff_all" on public.staff_documents
    for all
    using (
        (select role from public.users where id = auth.uid())
            in ('agent', 'supervisor', 'admin', 'super_admin')
    )
    with check (
        (select role from public.users where id = auth.uid())
            in ('agent', 'supervisor', 'admin', 'super_admin')
    );

-- Vérification
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'staff_documents'
order by policyname;

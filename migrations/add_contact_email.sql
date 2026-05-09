-- Colonne pour le vrai email de contact (étudiants)
-- Distincte de users.email qui contient l'email auth (@students.joda.app)
alter table public.users
  add column if not exists contact_email text;

-- Remplir contact_email pour les utilisateurs non-étudiants (email = contact_email)
update public.users
set contact_email = email
where role != 'student' and contact_email is null;

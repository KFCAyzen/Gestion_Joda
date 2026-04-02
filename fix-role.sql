-- Script pour corriger la contrainte de rôle et ajouter super_admin

-- Supprimer l'ancienne contrainte (si elle existe)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Ajouter la nouvelle contrainte avec super_admin
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('student', 'agent', 'admin', 'supervisor', 'super_admin'));

-- Maintenant mettre à jour le rôle
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'superadmin@gmail.com';

-- Vérifier
SELECT email, role FROM users;
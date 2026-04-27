-- Corriger les rôles et désactiver must_change_password pour tous les users existants
UPDATE users SET role = 'super_admin', must_change_password = false WHERE email = 'superadmin@gmail.com';
UPDATE users SET role = 'admin', must_change_password = false WHERE email = 'kepseufrank@gmail.com';
UPDATE users SET must_change_password = false WHERE must_change_password = true;

-- Vérification
SELECT email, role, must_change_password FROM users;

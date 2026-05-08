-- Script pour lister toutes les tables existantes dans le schéma public

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

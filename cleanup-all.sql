-- ============================================
-- KOMPLETTER RESET - ALLES LÖSCHEN
-- ============================================

-- 1. Alle Predictions löschen
DELETE FROM predictions;

-- 2. Alle Profiles löschen
DELETE FROM profiles;

-- 3. Alle Auth Users löschen
DELETE FROM auth.users;

-- 4. Überprüfen dass alles leer ist
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL  
SELECT 'auth.users', COUNT(*) FROM auth.users;








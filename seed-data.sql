-- ============================================
-- F1 TIPPSPIEL - SEED DATA
-- ============================================
-- Führe dieses Script im Supabase SQL Editor aus:
-- 1. Gehe zu supabase.com -> Dein Projekt -> SQL Editor
-- 2. Kopiere dieses gesamte Script
-- 3. Klicke "Run"
-- ============================================

-- Zuerst: predictions_count Spalte hinzufügen falls nicht vorhanden
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS predictions_count INTEGER DEFAULT 0;

-- Temporär Foreign Key Constraint deaktivieren um User anzulegen
-- (Diese User können sich dann mit Passwort 'test1234' einloggen)

-- Benutzer in auth.users einfügen
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marvin@tippspiel.local', crypt('test1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"username": "Marshall-Marvin"}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nik@tippspiel.local', crypt('test1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"username": "Nürburgring-Nik"}'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sophie@tippspiel.local', crypt('test1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"username": "Safetycar-Sophie"}'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pascal@tippspiel.local', crypt('test1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"username": "Pitstop-Pascal"}'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shortshiftsimon@tippspiel.local', crypt('test1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"username": "Short-Shift-Simon"}'),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viola@tippspiel.local', crypt('test1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"username": "VSC-Viola"}'),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jannis@tippspiel.local', crypt('test1234', gen_salt('bf')), NOW(), NOW(), NOW(), '{"username": "Jackman-Jannis"}')
ON CONFLICT (id) DO NOTHING;

-- Profile für alle User
INSERT INTO profiles (id, username, total_points, predictions_count) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Marshall-Marvin', 0, 0),
  ('22222222-2222-2222-2222-222222222222', 'Nürburgring-Nik', 0, 0),
  ('33333333-3333-3333-3333-333333333333', 'Safetycar-Sophie', 0, 0),
  ('44444444-4444-4444-4444-444444444444', 'Pitstop-Pascal', 0, 0),
  ('55555555-5555-5555-5555-555555555555', 'Short-Shift-Simon', 0, 0),
  ('66666666-6666-6666-6666-666666666666', 'VSC-Viola', 0, 0),
  ('77777777-7777-7777-7777-777777777777', 'Jackman-Jannis', 0, 0)
ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;

-- ============================================
-- PREDICTIONS - Alle Tipps einfügen
-- ============================================
-- Driver Numbers:
-- VER=1, NOR=4, LEC=16, PIA=81, SAI=55, RUS=63, HAM=44
-- ALO=14, STR=18, HUL=27, ANT=12, GAS=10, TSU=22
-- HAD=6 (Hadjar)

-- Race IDs (based on round number):
-- 1=Bahrain, 2=Saudi, 3=Australia, 4=Japan, 5=China
-- 6=Miami, 7=Emilia-Romagna, 8=Monaco, 9=Spain, 10=Canada
-- 11=Austria, 12=Britain, 13=Belgium, 14=Hungary, 15=Netherlands
-- 16=Italy, 17=Azerbaijan, 18=Singapore, 19=USA, 20=Mexico
-- 21=Brazil, 22=Vegas, 23=Qatar, 24=Abu Dhabi

-- Lösche existierende Seed-Predictions (optional)
DELETE FROM predictions WHERE user_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
);

-- Marshall-Marvin Tipps
INSERT INTO predictions (user_id, race_id, session_type, p1_driver, points_earned) VALUES
  ('11111111-1111-1111-1111-111111111111', 3, 'race', 4, 0),   -- Australia: NOR
  ('11111111-1111-1111-1111-111111111111', 5, 'race', 63, 0),  -- China: RUS
  ('11111111-1111-1111-1111-111111111111', 4, 'race', 1, 0),   -- Japan: VER
  ('11111111-1111-1111-1111-111111111111', 1, 'race', 81, 0),  -- Bahrain: PIA
  ('11111111-1111-1111-1111-111111111111', 2, 'race', 4, 0),   -- Saudi: NOR
  ('11111111-1111-1111-1111-111111111111', 6, 'race', 1, 0),   -- Miami: VER
  ('11111111-1111-1111-1111-111111111111', 7, 'race', 4, 0),   -- Emilia-Romagna: NOR
  ('11111111-1111-1111-1111-111111111111', 8, 'race', 1, 0),   -- Monaco: VER
  ('11111111-1111-1111-1111-111111111111', 9, 'race', 63, 0),  -- Spain: RUS
  ('11111111-1111-1111-1111-111111111111', 10, 'race', 4, 0),  -- Canada: NOR
  ('11111111-1111-1111-1111-111111111111', 11, 'race', 4, 0),  -- Austria: NOR
  ('11111111-1111-1111-1111-111111111111', 12, 'race', 4, 0),  -- Britain: NOR
  ('11111111-1111-1111-1111-111111111111', 13, 'race', 1, 0),  -- Belgium: VER
  ('11111111-1111-1111-1111-111111111111', 14, 'race', 81, 0), -- Hungary: PIA
  ('11111111-1111-1111-1111-111111111111', 15, 'race', 81, 0), -- Netherlands: PIA
  ('11111111-1111-1111-1111-111111111111', 16, 'race', 1, 0),  -- Italy: VER
  ('11111111-1111-1111-1111-111111111111', 17, 'race', 1, 0),  -- Azerbaijan: VER
  ('11111111-1111-1111-1111-111111111111', 18, 'race', 1, 0),  -- Singapore: VER
  ('11111111-1111-1111-1111-111111111111', 19, 'race', 4, 0),  -- USA: NOR
  ('11111111-1111-1111-1111-111111111111', 20, 'race', 4, 0),  -- Mexico: NOR
  ('11111111-1111-1111-1111-111111111111', 22, 'race', 1, 0);  -- Vegas: VER

-- Nürburgring-Nik Tipps
INSERT INTO predictions (user_id, race_id, session_type, p1_driver, points_earned) VALUES
  ('22222222-2222-2222-2222-222222222222', 3, 'race', 1, 0),   -- Australia: VER
  ('22222222-2222-2222-2222-222222222222', 5, 'race', 44, 0),  -- China: HAM
  ('22222222-2222-2222-2222-222222222222', 4, 'race', 4, 0),   -- Japan: NOR
  ('22222222-2222-2222-2222-222222222222', 1, 'race', 63, 0),  -- Bahrain: RUS
  ('22222222-2222-2222-2222-222222222222', 2, 'race', 81, 0),  -- Saudi: PIA
  ('22222222-2222-2222-2222-222222222222', 6, 'race', 4, 0),   -- Miami: NOR
  ('22222222-2222-2222-2222-222222222222', 7, 'race', 16, 0),  -- Emilia-Romagna: LEC
  ('22222222-2222-2222-2222-222222222222', 8, 'race', 81, 0),  -- Monaco: PIA
  ('22222222-2222-2222-2222-222222222222', 9, 'race', 1, 0),   -- Spain: VER
  ('22222222-2222-2222-2222-222222222222', 10, 'race', 81, 0), -- Canada: PIA
  ('22222222-2222-2222-2222-222222222222', 11, 'race', 81, 0), -- Austria: PIA
  ('22222222-2222-2222-2222-222222222222', 12, 'race', 81, 0), -- Britain: PIA
  ('22222222-2222-2222-2222-222222222222', 13, 'race', 81, 0), -- Belgium: PIA
  ('22222222-2222-2222-2222-222222222222', 14, 'race', 63, 0), -- Hungary: RUS
  ('22222222-2222-2222-2222-222222222222', 15, 'race', 1, 0),  -- Netherlands: VER
  ('22222222-2222-2222-2222-222222222222', 16, 'race', 4, 0),  -- Italy: NOR
  ('22222222-2222-2222-2222-222222222222', 17, 'race', 63, 0), -- Azerbaijan: RUS
  ('22222222-2222-2222-2222-222222222222', 18, 'race', 63, 0), -- Singapore: RUS
  ('22222222-2222-2222-2222-222222222222', 19, 'race', 16, 0), -- USA: LEC
  ('22222222-2222-2222-2222-222222222222', 20, 'race', 12, 0); -- Mexico: ANT

-- Safetycar-Sophie Tipps
INSERT INTO predictions (user_id, race_id, session_type, p1_driver, points_earned) VALUES
  ('33333333-3333-3333-3333-333333333333', 3, 'race', 63, 0),  -- Australia: RUS
  ('33333333-3333-3333-3333-333333333333', 5, 'race', 81, 0),  -- China: PIA
  ('33333333-3333-3333-3333-333333333333', 4, 'race', 81, 0),  -- Japan: PIA
  ('33333333-3333-3333-3333-333333333333', 1, 'race', 4, 0),   -- Bahrain: NOR
  ('33333333-3333-3333-3333-333333333333', 2, 'race', 44, 0),  -- Saudi: HAM
  ('33333333-3333-3333-3333-333333333333', 6, 'race', 81, 0),  -- Miami: PIA
  ('33333333-3333-3333-3333-333333333333', 7, 'race', 81, 0),  -- Emilia-Romagna: PIA
  ('33333333-3333-3333-3333-333333333333', 8, 'race', 4, 0),   -- Monaco: NOR
  ('33333333-3333-3333-3333-333333333333', 9, 'race', 12, 0),  -- Spain: ANT
  ('33333333-3333-3333-3333-333333333333', 10, 'race', 4, 0),  -- Canada: NOR
  ('33333333-3333-3333-3333-333333333333', 11, 'race', 16, 0), -- Austria: LEC
  ('33333333-3333-3333-3333-333333333333', 12, 'race', 27, 0), -- Britain: HUL
  ('33333333-3333-3333-3333-333333333333', 13, 'race', 4, 0),  -- Belgium: NOR
  ('33333333-3333-3333-3333-333333333333', 15, 'race', 6, 0),  -- Netherlands: HAD
  ('33333333-3333-3333-3333-333333333333', 16, 'race', 81, 0), -- Italy: PIA
  ('33333333-3333-3333-3333-333333333333', 17, 'race', 55, 0), -- Azerbaijan: SAI
  ('33333333-3333-3333-3333-333333333333', 18, 'race', 55, 0), -- Singapore: SAI
  ('33333333-3333-3333-3333-333333333333', 19, 'race', 1, 0),  -- USA: VER
  ('33333333-3333-3333-3333-333333333333', 20, 'race', 63, 0); -- Mexico: RUS

-- Pitstop-Pascal Tipps
INSERT INTO predictions (user_id, race_id, session_type, p1_driver, points_earned) VALUES
  ('44444444-4444-4444-4444-444444444444', 5, 'race', 1, 0),   -- China: VER
  ('44444444-4444-4444-4444-444444444444', 4, 'race', 4, 0),   -- Japan: NOR
  ('44444444-4444-4444-4444-444444444444', 2, 'race', 81, 0),  -- Saudi: PIA
  ('44444444-4444-4444-4444-444444444444', 6, 'race', 4, 0),   -- Miami: NOR
  ('44444444-4444-4444-4444-444444444444', 9, 'race', 81, 0),  -- Spain: PIA
  ('44444444-4444-4444-4444-444444444444', 10, 'race', 81, 0), -- Canada: PIA
  ('44444444-4444-4444-4444-444444444444', 11, 'race', 4, 0),  -- Austria: NOR
  ('44444444-4444-4444-4444-444444444444', 13, 'race', 81, 0), -- Belgium: PIA
  ('44444444-4444-4444-4444-444444444444', 16, 'race', 1, 0),  -- Italy: VER
  ('44444444-4444-4444-4444-444444444444', 18, 'race', 1, 0),  -- Singapore: VER
  ('44444444-4444-4444-4444-444444444444', 19, 'race', 4, 0);  -- USA: NOR

-- Short-Shift-Simon Tipps
INSERT INTO predictions (user_id, race_id, session_type, p1_driver, points_earned) VALUES
  ('55555555-5555-5555-5555-555555555555', 5, 'race', 81, 0),  -- China: PIA
  ('55555555-5555-5555-5555-555555555555', 4, 'race', 81, 0),  -- Japan: PIA
  ('55555555-5555-5555-5555-555555555555', 1, 'race', 81, 0),  -- Bahrain: PIA
  ('55555555-5555-5555-5555-555555555555', 2, 'race', 81, 0),  -- Saudi: PIA
  ('55555555-5555-5555-5555-555555555555', 6, 'race', 63, 0),  -- Miami: RUS
  ('55555555-5555-5555-5555-555555555555', 8, 'race', 4, 0),   -- Monaco: NOR
  ('55555555-5555-5555-5555-555555555555', 9, 'race', 4, 0),   -- Spain: NOR
  ('55555555-5555-5555-5555-555555555555', 10, 'race', 4, 0),  -- Canada: NOR
  ('55555555-5555-5555-5555-555555555555', 11, 'race', 81, 0), -- Austria: PIA
  ('55555555-5555-5555-5555-555555555555', 12, 'race', 4, 0),  -- Britain: NOR
  ('55555555-5555-5555-5555-555555555555', 13, 'race', 4, 0),  -- Belgium: NOR
  ('55555555-5555-5555-5555-555555555555', 15, 'race', 63, 0), -- Netherlands: RUS
  ('55555555-5555-5555-5555-555555555555', 16, 'race', 63, 0), -- Italy: RUS
  ('55555555-5555-5555-5555-555555555555', 18, 'race', 63, 0), -- Singapore: RUS
  ('55555555-5555-5555-5555-555555555555', 19, 'race', 16, 0), -- USA: LEC
  ('55555555-5555-5555-5555-555555555555', 20, 'race', 4, 0),  -- Mexico: NOR
  ('55555555-5555-5555-5555-555555555555', 21, 'race', 1, 0);  -- Brazil: VER

-- VSC-Viola Tipps
INSERT INTO predictions (user_id, race_id, session_type, p1_driver, points_earned) VALUES
  ('66666666-6666-6666-6666-666666666666', 7, 'race', 4, 0),   -- Emilia-Romagna: NOR
  ('66666666-6666-6666-6666-666666666666', 9, 'race', 16, 0),  -- Spain: LEC
  ('66666666-6666-6666-6666-666666666666', 10, 'race', 81, 0), -- Canada: PIA
  ('66666666-6666-6666-6666-666666666666', 11, 'race', 16, 0), -- Austria: LEC
  ('66666666-6666-6666-6666-666666666666', 13, 'race', 16, 0), -- Belgium: LEC
  ('66666666-6666-6666-6666-666666666666', 14, 'race', 16, 0), -- Hungary: LEC
  ('66666666-6666-6666-6666-666666666666', 15, 'race', 1, 0),  -- Netherlands: VER
  ('66666666-6666-6666-6666-666666666666', 18, 'race', 1, 0),  -- Singapore: VER
  ('66666666-6666-6666-6666-666666666666', 19, 'race', 1, 0),  -- USA: VER
  ('66666666-6666-6666-6666-666666666666', 20, 'race', 12, 0), -- Mexico: ANT
  ('66666666-6666-6666-6666-666666666666', 21, 'race', 63, 0); -- Brazil: RUS

-- Jackman-Jannis Tipps
INSERT INTO predictions (user_id, race_id, session_type, p1_driver, points_earned) VALUES
  ('77777777-7777-7777-7777-777777777777', 12, 'race', 81, 0), -- Britain: PIA
  ('77777777-7777-7777-7777-777777777777', 21, 'race', 12, 0); -- Brazil: ANT

-- ============================================
-- Update prediction counts
-- ============================================
UPDATE profiles SET predictions_count = (
  SELECT COUNT(*) FROM predictions WHERE predictions.user_id = profiles.id
);

-- ============================================
-- Fertig! 🏁
-- ============================================
SELECT 
  p.username, 
  p.total_points,
  p.predictions_count,
  'Erfolgreich importiert!' as status
FROM profiles p
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
)
ORDER BY p.username;




-- ============================================
-- F1 TIPPSPIEL - SEED DATA MIT PUNKTEBERECHNUNG
-- ============================================
-- PUNKTESYSTEM:
-- - Korrekter P1/Sieger Tipp: 25 Punkte
-- ============================================

-- Zuerst: predictions_count Spalte hinzufügen falls nicht vorhanden
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS predictions_count INTEGER DEFAULT 0;

-- ============================================
-- RACE RESULTS - Tatsächliche Rennsieger 2025
-- ============================================
-- Füge die echten Ergebnisse ein (P1 = Sieger)
-- Driver Numbers: VER=1, NOR=4, LEC=16, PIA=81, SAI=55, RUS=63, HAM=44

-- Lösche alte Ergebnisse
DELETE FROM race_results;

-- Echte Rennsieger 2025 eintragen
-- (Passe diese an die tatsächlichen Ergebnisse an!)
INSERT INTO race_results (race_id, position, driver_number, fastest_lap, pole_position) VALUES
  -- Round 1: Bahrain GP - Winner: 
  (1, 1, 1, false, false),  -- VER gewonnen
  -- Round 2: Saudi Arabian GP
  (2, 1, 81, false, false), -- PIA gewonnen
  -- Round 3: Australian GP  
  (3, 1, 4, false, false),  -- NOR gewonnen
  -- Round 4: Japanese GP
  (4, 1, 1, false, false),  -- VER gewonnen
  -- Round 5: Chinese GP
  (5, 1, 4, false, false),  -- NOR gewonnen
  -- Round 6: Miami GP
  (6, 1, 4, false, false),  -- NOR gewonnen
  -- Round 7: Emilia Romagna GP
  (7, 1, 4, false, false),  -- NOR gewonnen
  -- Round 8: Monaco GP
  (8, 1, 16, false, false), -- LEC gewonnen
  -- Round 9: Spanish GP
  (9, 1, 4, false, false),  -- NOR gewonnen
  -- Round 10: Canadian GP
  (10, 1, 4, false, false), -- NOR gewonnen
  -- Round 11: Austrian GP
  (11, 1, 81, false, false), -- PIA gewonnen
  -- Round 12: British GP
  (12, 1, 44, false, false), -- HAM gewonnen
  -- Round 13: Belgian GP
  (13, 1, 63, false, false), -- RUS gewonnen
  -- Round 14: Hungarian GP
  (14, 1, 81, false, false), -- PIA gewonnen
  -- Round 15: Dutch GP
  (15, 1, 1, false, false),  -- VER gewonnen
  -- Round 16: Italian GP
  (16, 1, 16, false, false), -- LEC gewonnen
  -- Round 17: Azerbaijan GP
  (17, 1, 81, false, false), -- PIA gewonnen
  -- Round 18: Singapore GP
  (18, 1, 4, false, false),  -- NOR gewonnen
  -- Round 19: US GP
  (19, 1, 1, false, false),  -- VER gewonnen
  -- Round 20: Mexico GP
  (20, 1, 55, false, false), -- SAI gewonnen
  -- Round 21: Brazil GP
  (21, 1, 1, false, false),  -- VER gewonnen
  -- Round 22: Las Vegas GP
  (22, 1, 63, false, false)  -- RUS gewonnen
ON CONFLICT (race_id, position) DO UPDATE SET driver_number = EXCLUDED.driver_number;

-- ============================================
-- PUNKTE BERECHNEN
-- ============================================
-- Für jeden Tipp: Wenn p1_driver = race_results.driver_number (für position 1), dann 25 Punkte

-- Reset all points first
UPDATE predictions SET points_earned = 0;

-- Berechne Punkte für korrekte P1-Tipps
UPDATE predictions p
SET points_earned = 25
FROM race_results r
WHERE p.race_id = r.race_id 
  AND r.position = 1 
  AND p.p1_driver = r.driver_number
  AND p.session_type = 'race';

-- ============================================
-- UPDATE PROFILE TOTALS
-- ============================================
-- Update total_points für alle User
UPDATE profiles SET total_points = COALESCE((
  SELECT SUM(points_earned) 
  FROM predictions 
  WHERE predictions.user_id = profiles.id
), 0);

-- Update predictions_count für alle User
UPDATE profiles SET predictions_count = COALESCE((
  SELECT COUNT(*) 
  FROM predictions 
  WHERE predictions.user_id = profiles.id
), 0);

-- ============================================
-- ERGEBNIS ANZEIGEN
-- ============================================
SELECT 
  p.username,
  p.total_points,
  p.predictions_count,
  CASE 
    WHEN p.predictions_count > 0 
    THEN ROUND(p.total_points::numeric / p.predictions_count, 1)
    ELSE 0 
  END as avg_points
FROM profiles p
ORDER BY p.total_points DESC, p.predictions_count DESC;




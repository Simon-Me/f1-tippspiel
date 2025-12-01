-- F1 Tippspiel - Bonus-Tipps & Saison-Tipps Setup
-- Führe dieses Script im Supabase SQL Editor aus

-- =====================================================
-- 1. SAISON-TIPPS TABELLE
-- =====================================================
CREATE TABLE IF NOT EXISTS season_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  season INTEGER NOT NULL DEFAULT 2025,
  
  -- WM-Sieger Tipps (Top 3)
  wdc_p1_driver INTEGER,  -- World Driver Champion
  wdc_p2_driver INTEGER,
  wdc_p3_driver INTEGER,
  
  -- Konstrukteurs-WM (Top 3)
  wcc_p1_team TEXT,       -- World Constructor Champion
  wcc_p2_team TEXT,
  wcc_p3_team TEXT,
  
  -- Bonus Saison-Tipps
  most_wins_driver INTEGER,       -- Meiste Siege
  most_poles_driver INTEGER,      -- Meiste Pole Positions
  most_dnfs_driver INTEGER,       -- Meiste Ausfälle
  rookie_of_year INTEGER,         -- Beste Rookie
  
  points_earned INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  locked BOOLEAN DEFAULT FALSE,   -- Nach erstem Rennen gesperrt
  
  UNIQUE(user_id, season)
);

-- =====================================================
-- 2. BONUS-TIPPS PRO RENNEN (vereinfacht)
-- =====================================================
CREATE TABLE IF NOT EXISTS bonus_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  
  -- Ja/Nein Tipps
  safety_car BOOLEAN,             -- Gibt es ein Safety Car?
  rain_during_race BOOLEAN,       -- Regnet es während des Rennens?
  
  points_earned INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, race_id)
);

-- =====================================================
-- 3. ERGEBNISSE FÜR BONUS-TIPPS (vereinfacht)
-- =====================================================
CREATE TABLE IF NOT EXISTS bonus_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Ja/Nein Ergebnisse
  had_safety_car BOOLEAN,
  had_rain BOOLEAN,
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. SAISON-ERGEBNISSE
-- =====================================================
CREATE TABLE IF NOT EXISTS season_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season INTEGER NOT NULL UNIQUE DEFAULT 2025,
  
  -- WM-Sieger
  wdc_p1_driver INTEGER,
  wdc_p2_driver INTEGER,
  wdc_p3_driver INTEGER,
  
  -- Konstrukteurs-WM
  wcc_p1_team TEXT,
  wcc_p2_team TEXT,
  wcc_p3_team TEXT,
  
  -- Bonus
  most_wins_driver INTEGER,
  most_poles_driver INTEGER,
  most_dnfs_driver INTEGER,
  rookie_of_year INTEGER,
  
  finalized BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. ONBOARDING STATUS
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_car_id TEXT;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================
ALTER TABLE season_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_results ENABLE ROW LEVEL SECURITY;

-- Season Predictions
DROP POLICY IF EXISTS "Season predictions sind öffentlich sichtbar" ON season_predictions;
CREATE POLICY "Season predictions sind öffentlich sichtbar" ON season_predictions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "User können eigene season predictions erstellen" ON season_predictions;
CREATE POLICY "User können eigene season predictions erstellen" ON season_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User können eigene season predictions updaten" ON season_predictions;
CREATE POLICY "User können eigene season predictions updaten" ON season_predictions
  FOR UPDATE USING (auth.uid() = user_id AND locked = false);

-- Bonus Predictions
DROP POLICY IF EXISTS "Bonus predictions sind öffentlich sichtbar" ON bonus_predictions;
CREATE POLICY "Bonus predictions sind öffentlich sichtbar" ON bonus_predictions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "User können eigene bonus predictions erstellen" ON bonus_predictions;
CREATE POLICY "User können eigene bonus predictions erstellen" ON bonus_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User können eigene bonus predictions updaten" ON bonus_predictions;
CREATE POLICY "User können eigene bonus predictions updaten" ON bonus_predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- Results sind öffentlich lesbar
DROP POLICY IF EXISTS "Bonus results sind öffentlich sichtbar" ON bonus_results;
CREATE POLICY "Bonus results sind öffentlich sichtbar" ON bonus_results
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Season results sind öffentlich sichtbar" ON season_results;
CREATE POLICY "Season results sind öffentlich sichtbar" ON season_results
  FOR SELECT USING (true);

-- =====================================================
-- 7. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_season_predictions_user ON season_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_season_predictions_season ON season_predictions(season);
CREATE INDEX IF NOT EXISTS idx_bonus_predictions_user ON bonus_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_predictions_race ON bonus_predictions(race_id);

-- =====================================================
-- PUNKTE-SYSTEM:
-- =====================================================
-- 
-- SAISON-TIPPS (einmalig am Saisonende):
--   WDC P1 richtig: 100 Punkte
--   WDC P2 richtig: 50 Punkte
--   WDC P3 richtig: 30 Punkte
--   WDC auf Podium (falsche Position): 15 Punkte
--   WCC P1 richtig: 75 Punkte
--   WCC P2 richtig: 40 Punkte
--   WCC P3 richtig: 25 Punkte
--   Most Wins richtig: 40 Punkte
--   Most Poles richtig: 40 Punkte
--   Most DNFs richtig: 30 Punkte
--
-- BONUS-TIPPS PRO RENNEN (einfach!):
--   Safety Car richtig: 5 Punkte
--   Regen richtig: 8 Punkte
--   = Max 13 Punkte pro Rennen
--
-- Fertig! 🏎️


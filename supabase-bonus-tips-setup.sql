-- F1 Tippspiel - Weltmeister-Tipp Setup
-- Führe dieses Script im Supabase SQL Editor aus

-- =====================================================
-- SAISON-TIPPS TABELLE (nur Weltmeister)
-- =====================================================
CREATE TABLE IF NOT EXISTS season_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  season INTEGER NOT NULL DEFAULT 2025,
  
  -- Weltmeister-Tipp
  wdc_p1_driver INTEGER,  -- World Driver Champion
  
  points_earned INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  locked BOOLEAN DEFAULT FALSE,   -- Nach erstem Rennen gesperrt
  
  UNIQUE(user_id, season)
);

-- =====================================================
-- ONBOARDING STATUS
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipped_car_id TEXT;

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE season_predictions ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_season_predictions_user ON season_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_season_predictions_season ON season_predictions(season);

-- =====================================================
-- PUNKTE-SYSTEM:
-- =====================================================
-- 
-- WELTMEISTER-TIPP:
--   Richtig getippt: 100 Punkte = 1.000 Coins!
--
-- Fertig! 🏎️🏆

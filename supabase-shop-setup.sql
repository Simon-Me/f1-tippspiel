-- F1 Tippspiel Shop System - Datenbank Setup
-- Führe dieses Script im Supabase SQL Editor aus

-- 1. Füge coins Spalte zu profiles hinzu
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- 2. Setze initiale Coins auf aktuelle Punkte (einmalig)
UPDATE profiles SET coins = total_points WHERE coins = 0 OR coins IS NULL;

-- 3. Erstelle user_items Tabelle
CREATE TABLE IF NOT EXISTS user_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  equipped BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, item_id)
);

-- 4. RLS Policies für user_items
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;

-- Jeder kann Items aller User sehen (für Sammlung-Anzeige)
CREATE POLICY "User items sind öffentlich sichtbar" ON user_items
  FOR SELECT USING (true);

-- User können nur ihre eigenen Items einfügen
CREATE POLICY "User können eigene Items kaufen" ON user_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User können nur ihre eigenen Items updaten (equipped)
CREATE POLICY "User können eigene Items updaten" ON user_items
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_item_id ON user_items(item_id);

-- 6. Aktualisiere profiles RLS Policy für coins
-- (Falls nötig - nur wenn coins nicht updatebar sind)
-- DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
-- CREATE POLICY "Users can update own profile" ON profiles
--   FOR UPDATE USING (auth.uid() = id);

-- Erlaube API (Service Role) auch Updates
-- Das ist bereits durch den Service Role Key abgedeckt

-- Fertig! 🏎️


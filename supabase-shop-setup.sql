-- F1 Tippspiel Shop System - Datenbank Setup
-- Führe dieses Script im Supabase SQL Editor aus

-- 1. Füge coins Spalte zu profiles hinzu (falls nicht vorhanden)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 500;

-- 2. Setze Startguthaben für alle User
-- Bei 10 Punkte = 100 Coins - also bestehende Punkte * 10 + 500 Startguthaben
UPDATE profiles 
SET coins = GREATEST(500, COALESCE(total_points, 0) * 10 + 500) 
WHERE coins IS NULL OR coins < 500;

-- 3. Erstelle user_items Tabelle (für Shop)
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

DROP POLICY IF EXISTS "User items sind öffentlich sichtbar" ON user_items;
CREATE POLICY "User items sind öffentlich sichtbar" ON user_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "User können eigene Items kaufen" ON user_items;
CREATE POLICY "User können eigene Items kaufen" ON user_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User können eigene Items updaten" ON user_items;
CREATE POLICY "User können eigene Items updaten" ON user_items
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_item_id ON user_items(item_id);

-- =====================================================
-- WICHTIG: AVATAR STORAGE - In Supabase Storage UI machen!
-- =====================================================
-- 
-- 1. Gehe zu Storage im Supabase Dashboard
-- 2. Klicke "Create bucket"
-- 3. Name: "avatars"
-- 4. Setze auf "Public bucket" (damit Bilder ohne Auth angezeigt werden)
-- 5. Klicke "Create"
--
-- Dann setze diese Policy:
-- Storage > avatars > Policies > New Policy:
--   - Name: "Avatar upload"
--   - Operation: INSERT
--   - Policy: ((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text))
--
-- Und diese für SELECT:
--   - Name: "Avatar public read"  
--   - Operation: SELECT
--   - Policy: (bucket_id = 'avatars'::text)

-- Fertig! 🏎️💰
-- 
-- COIN SYSTEM:
-- - Startguthaben: 500 Coins
-- - Punkte Umrechnung: 10 Punkte = 100 Coins
-- - Shop: Items von 30 - 750 Coins

-- F1 Tippspiel Shop & Bets System - Datenbank Setup
-- Führe dieses Script im Supabase SQL Editor aus

-- 1. Füge coins Spalte zu profiles hinzu (falls nicht vorhanden)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 250;

-- 2. Setze Startguthaben für alle User die noch keine Coins haben
UPDATE profiles SET coins = 250 WHERE coins IS NULL OR coins = 0;

-- 3. Erstelle user_items Tabelle (für Shop)
CREATE TABLE IF NOT EXISTS user_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  equipped BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, item_id)
);

-- 4. Erstelle bets Tabelle (für Money Bets)
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  bet_type TEXT NOT NULL,
  selection TEXT NOT NULL,
  amount INTEGER NOT NULL,
  odds DECIMAL(3,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  winnings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS Policies für user_items
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

-- 6. RLS Policies für bets
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bets sind öffentlich sichtbar" ON bets;
CREATE POLICY "Bets sind öffentlich sichtbar" ON bets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "User können eigene Bets erstellen" ON bets;
CREATE POLICY "User können eigene Bets erstellen" ON bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User können eigene Bets updaten" ON bets;
CREATE POLICY "User können eigene Bets updaten" ON bets
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_item_id ON user_items(item_id);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_race_id ON bets(race_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);

-- Fertig! 🏎️💰
-- 
-- COIN SYSTEM:
-- - Startguthaben: 250 Coins
-- - Normale Tipps: 1:1 (25 Punkte = 25 Coins)
-- - Money Bets: Einsatz 10-100 Coins, Quoten 1.5x - 5x
-- - Shop: Items von 30 - 750 Coins

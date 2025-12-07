-- Tabelle für Marvin's Danke-Counter
CREATE TABLE IF NOT EXISTS marvin_thanks (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_clicks INTEGER DEFAULT 0,
  CHECK (id = 1) -- Nur eine Zeile erlaubt
);

-- Initial-Wert einfügen
INSERT INTO marvin_thanks (id, total_clicks) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- RPC Funktion zum Erhöhen des Counters
CREATE OR REPLACE FUNCTION increment_marvin_thanks()
RETURNS void AS $$
BEGIN
  UPDATE marvin_thanks SET total_clicks = total_clicks + 1 WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE marvin_thanks ENABLE ROW LEVEL SECURITY;

-- Jeder kann lesen
CREATE POLICY "Anyone can read marvin_thanks"
ON marvin_thanks FOR SELECT
TO public
USING (true);

-- Nur authenticated users können incrementen (über die RPC Funktion)
GRANT EXECUTE ON FUNCTION increment_marvin_thanks TO authenticated;






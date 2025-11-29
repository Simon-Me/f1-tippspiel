# 🏎️ Supabase Setup Guide für F1 Tippspiel

## Schritt 1: Supabase Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und klicke auf "Start your project"
2. Logge dich mit GitHub ein (oder erstelle einen Account)
3. Klicke auf "New Project"
4. Wähle deine Organisation
5. Gib folgende Daten ein:
   - **Name:** `f1-tippspiel`
   - **Database Password:** (wähle ein sicheres Passwort - speichere es!)
   - **Region:** Frankfurt (EU) oder die nächste zu dir
6. Klicke "Create new project" und warte ~2 Minuten

## Schritt 2: API Keys kopieren

1. Gehe zu **Project Settings** → **API** (linke Sidebar)
2. Kopiere folgende Werte:
   - **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - **anon public key** (der lange Key unter "Project API keys")

3. Erstelle die Datei `.env.local` im Projektordner:

```env
NEXT_PUBLIC_SUPABASE_URL=deine_project_url_hier
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_anon_key_hier
```

## Schritt 3: Datenbank-Tabellen erstellen

1. Gehe zu **SQL Editor** (linke Sidebar)
2. Klicke auf "New query"
3. Kopiere das folgende SQL und führe es aus:

```sql
-- Aktiviere UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profil-Tabelle für Benutzer
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rennen-Tabelle
CREATE TABLE races (
  id SERIAL PRIMARY KEY,
  season INTEGER NOT NULL,
  round INTEGER NOT NULL,
  race_name TEXT NOT NULL,
  circuit_name TEXT NOT NULL,
  country TEXT NOT NULL,
  race_date TIMESTAMP WITH TIME ZONE NOT NULL,
  quali_date TIMESTAMP WITH TIME ZONE,
  is_sprint BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'qualifying', 'racing', 'finished')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(season, round)
);

-- Tipps-Tabelle (Fahrer werden als Nummer gespeichert, Daten kommen aus der API)
-- Jetzt mit session_type für separate Quali/Sprint/Rennen Tipps!
CREATE TABLE predictions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT DEFAULT 'race' CHECK (session_type IN ('qualifying', 'sprint', 'race')),
  p1_driver INTEGER,
  p2_driver INTEGER,
  p3_driver INTEGER,
  fastest_lap_driver INTEGER,
  pole_driver INTEGER,
  points_earned INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, race_id, session_type)
);

-- Ergebnisse-Tabelle (für Punkteberechnung nach dem Rennen)
CREATE TABLE race_results (
  id SERIAL PRIMARY KEY,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL,
  driver_number INTEGER NOT NULL,
  points_scored DECIMAL(5,2) DEFAULT 0,
  fastest_lap BOOLEAN DEFAULT FALSE,
  pole_position BOOLEAN DEFAULT FALSE,
  UNIQUE(race_id, position)
);

-- Row Level Security aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

-- Policies für profiles
CREATE POLICY "Öffentliche Profile sind sichtbar" ON profiles FOR SELECT USING (true);
CREATE POLICY "Benutzer können eigenes Profil updaten" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Benutzer können eigenes Profil erstellen" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies für predictions
CREATE POLICY "Tipps sind öffentlich sichtbar" ON predictions FOR SELECT USING (true);
CREATE POLICY "Benutzer können eigene Tipps erstellen" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Benutzer können eigene Tipps updaten" ON predictions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Benutzer können eigene Tipps löschen" ON predictions FOR DELETE USING (auth.uid() = user_id);

-- Policies für races, race_results (öffentlich lesbar)
CREATE POLICY "Rennen sind öffentlich" ON races FOR SELECT USING (true);
CREATE POLICY "Rennen einfügen erlaubt" ON races FOR INSERT WITH CHECK (true);
CREATE POLICY "Ergebnisse sind öffentlich" ON race_results FOR SELECT USING (true);

-- Trigger für neues Profil bei Registrierung
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Funktion zum Aktualisieren der Gesamtpunkte
CREATE OR REPLACE FUNCTION update_total_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM predictions
    WHERE user_id = NEW.user_id
  )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_prediction_points_update
  AFTER UPDATE OF points_earned ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_total_points();
```

4. Klicke auf "Run" (oder Ctrl+Enter)

## Schritt 4: Auth aktivieren

1. Gehe zu **Authentication** → **Providers**
2. Stelle sicher, dass "Email" aktiviert ist
3. Optional: Deaktiviere "Confirm email" unter **Authentication** → **Settings** für einfacheres Testen

## ⚡ Wichtig: Fahrerdaten

**Fahrerdaten werden NICHT in der Datenbank gespeichert!**

Die App holt die aktuellen Fahrer automatisch aus der **OpenF1 API**. Das bedeutet:
- ✅ Immer aktuelle Fahrer (wenn jemand wechselt, wird das automatisch aktualisiert)
- ✅ Aktuelle Team-Farben und Startnummern
- ✅ Keine manuelle Pflege nötig

Die Tipps speichern nur die **Startnummer** des Fahrers. Die Fahrer-Infos (Name, Team, Farbe) werden live aus der API geladen.

## Migration: Session-Type hinzufügen (für bestehende DBs)

Falls du bereits eine predictions-Tabelle hast, führe dieses SQL aus:

```sql
-- Session-Type Spalte hinzufügen
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'race' CHECK (session_type IN ('qualifying', 'sprint', 'race'));

-- Unique Constraint aktualisieren (erlaubt jetzt separate Tipps pro Session)
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_user_id_race_id_key;
ALTER TABLE predictions ADD CONSTRAINT predictions_user_race_session_unique UNIQUE (user_id, race_id, session_type);

-- predictions_count für profiles hinzufügen
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS predictions_count INTEGER DEFAULT 0;
```

## Fertig! 🎉

Jetzt kannst du die App starten mit:
```bash
npm run dev
```

Öffne http://localhost:3000 und leg los!

---

## 📡 API Endpunkte

Die App stellt folgende API-Routen bereit:

| Route | Methode | Beschreibung |
|-------|---------|--------------|
| `/api/drivers` | GET | Holt aktuelle Fahrer aus OpenF1 API |
| `/api/sync-drivers` | POST | Synchronisiert Fahrer in die DB (optional) |

## 🔧 Troubleshooting

**Keine Fahrer werden angezeigt?**
- Prüfe ob die OpenF1 API erreichbar ist: https://api.openf1.org/v1/drivers?session_key=latest
- Außerhalb der Saison können Daten verzögert sein

**Auth funktioniert nicht?**
- Prüfe die Supabase URL und den anon key in `.env.local`
- Starte den Dev-Server neu nach Änderungen an `.env.local`

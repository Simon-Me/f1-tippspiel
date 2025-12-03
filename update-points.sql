-- ============================================
-- F1 TIPPSPIEL - PUNKTE UPDATE
-- Stand: GP22 (Las Vegas)
-- ============================================

-- Marshall-Marvin: 167 Punkte
UPDATE profiles SET total_points = 167 WHERE username = 'Marshall-Marvin';

-- Safetycar-Sophie: 162 Punkte
UPDATE profiles SET total_points = 162 WHERE username = 'Safetycar-Sophie';

-- Nürburgring-Nik: 156 Punkte
UPDATE profiles SET total_points = 156 WHERE username = 'Nürburgring-Nik';

-- VSC-Viola: 133 Punkte
UPDATE profiles SET total_points = 133 WHERE username = 'VSC-Viola';

-- Short-Shift-Simon: 129 Punkte
UPDATE profiles SET total_points = 129 WHERE username = 'Short-Shift-Simon';

-- Jackman-Jannis: 106 Punkte
UPDATE profiles SET total_points = 106 WHERE username = 'Jackman-Jannis';

-- Pitstop-Pascal: 78 Punkte
UPDATE profiles SET total_points = 78 WHERE username = 'Pitstop-Pascal';

-- Überprüfung: Zeige Rangliste
SELECT 
  username,
  total_points,
  predictions_count
FROM profiles
ORDER BY total_points DESC;









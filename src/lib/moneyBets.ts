// Money Bets System - Extra Wetten für Coins

export interface BetType {
  id: string
  name: string
  description: string
  icon: string
  category: 'prediction' | 'matchup' | 'special'
  odds: number // Multiplikator bei Gewinn
  minBet: number
  maxBet: number
  options?: string[] // Für Multiple Choice
}

export const BET_TYPES: BetType[] = [
  // === PREDICTION BETS ===
  {
    id: 'dnf_count',
    name: 'Ausfälle (DNF)',
    description: 'Wie viele Fahrer fallen aus?',
    icon: '💥',
    category: 'prediction',
    odds: 2.0,
    minBet: 10,
    maxBet: 100,
    options: ['0-2 Ausfälle', '3-5 Ausfälle', '6+ Ausfälle']
  },
  {
    id: 'pole_wins',
    name: 'Pole to Win',
    description: 'Gewinnt der Pole-Sitter das Rennen?',
    icon: '🏁',
    category: 'prediction',
    odds: 2.0,
    minBet: 10,
    maxBet: 100,
    options: ['Ja', 'Nein']
  },
  {
    id: 'safety_car',
    name: 'Safety Car',
    description: 'Gibt es mindestens 3+ Ausfälle? (oft = SC)',
    icon: '🚗',
    category: 'prediction',
    odds: 1.8,
    minBet: 10,
    maxBet: 100,
    options: ['Ja (3+ DNF)', 'Nein (0-2 DNF)']
  },
  {
    id: 'winning_margin',
    name: 'Siegabstand',
    description: 'Mit welchem Abstand gewinnt P1?',
    icon: '⏱️',
    category: 'prediction',
    odds: 2.5,
    minBet: 10,
    maxBet: 100,
    options: ['Unter 5 Sekunden', '5-15 Sekunden', 'Über 15 Sekunden']
  },

  // === MATCHUP BETS ===
  {
    id: 'head_to_head_1',
    name: 'Verstappen vs Norris',
    description: 'Wer ist am Ende vor dem anderen?',
    icon: '⚔️',
    category: 'matchup',
    odds: 2.0,
    minBet: 10,
    maxBet: 100,
    options: ['Verstappen', 'Norris']
  },
  {
    id: 'head_to_head_2',
    name: 'Leclerc vs Hamilton',
    description: 'Wer ist am Ende vor dem anderen?',
    icon: '⚔️',
    category: 'matchup',
    odds: 2.0,
    minBet: 10,
    maxBet: 100,
    options: ['Leclerc', 'Hamilton']
  },
  {
    id: 'head_to_head_3',
    name: 'Piastri vs Russell',
    description: 'Wer ist am Ende vor dem anderen?',
    icon: '⚔️',
    category: 'matchup',
    odds: 2.0,
    minBet: 10,
    maxBet: 100,
    options: ['Piastri', 'Russell']
  },
  {
    id: 'teammate_battle',
    name: 'Ferrari Duell',
    description: 'Leclerc oder Hamilton vorne?',
    icon: '🏎️',
    category: 'matchup',
    odds: 2.0,
    minBet: 10,
    maxBet: 100,
    options: ['Leclerc', 'Hamilton']
  },

  // === SPECIAL BETS ===
  {
    id: 'biggest_mover',
    name: 'Biggest Mover',
    description: 'Welches Team hat den größten Positionsgewinn?',
    icon: '📈',
    category: 'special',
    odds: 4.0,
    minBet: 10,
    maxBet: 50,
    options: ['Red Bull', 'McLaren', 'Ferrari', 'Mercedes', 'Aston Martin', 'Anderes Team']
  },
  {
    id: 'dnf_pick',
    name: 'DNF Vorhersage',
    description: 'Rate einen Fahrer der ausfällt',
    icon: '🎯',
    category: 'special',
    odds: 5.0,
    minBet: 10,
    maxBet: 50
    // Keine options - Fahrer auswählen
  },
  {
    id: 'team_double_points',
    name: 'Team Double Points',
    description: 'Beide Fahrer eines Teams in den Punkten?',
    icon: '✌️',
    category: 'special',
    odds: 2.5,
    minBet: 10,
    maxBet: 100,
    options: ['Red Bull', 'McLaren', 'Ferrari', 'Mercedes', 'Aston Martin', 'Alpine']
  },
  {
    id: 'underdog_top10',
    name: 'Underdog Top 10',
    description: 'Schafft ein Fahrer außerhalb Top 6 Teams die Punkte?',
    icon: '🌟',
    category: 'special',
    odds: 1.5,
    minBet: 10,
    maxBet: 100,
    options: ['Ja', 'Nein']
  }
]

// Kategorien für die UI
export const BET_CATEGORIES = {
  prediction: { name: 'Vorhersagen', icon: '🔮', description: 'Klassische Ja/Nein Wetten' },
  matchup: { name: 'Duelle', icon: '⚔️', description: 'Kopf-an-Kopf Vergleiche' },
  special: { name: 'Specials', icon: '✨', description: 'Besondere Wetten mit hohen Quoten' }
}

// Standard Einsätze
export const BET_AMOUNTS = [10, 25, 50, 100]

// Head to Head Fahrer Mapping (Code -> Nummer)
export const DRIVER_NUMBERS: Record<string, number> = {
  'Verstappen': 1,
  'Norris': 4,
  'Leclerc': 16,
  'Hamilton': 44,
  'Piastri': 81,
  'Russell': 63,
  'Sainz': 55,
  'Alonso': 14
}

// Team Fahrer Mapping
export const TEAM_DRIVERS: Record<string, number[]> = {
  'Red Bull': [1, 30],      // Verstappen, Lawson
  'McLaren': [4, 81],       // Norris, Piastri
  'Ferrari': [16, 44],      // Leclerc, Hamilton
  'Mercedes': [63, 12],     // Russell, Antonelli
  'Aston Martin': [14, 18], // Alonso, Stroll
  'Alpine': [10, 7],        // Gasly, Doohan
  'Williams': [23, 55],     // Albon, Sainz
  'RB': [22, 6],            // Tsunoda, Hadjar
  'Sauber': [27, 87],       // Hulkenberg, Bortoleto
  'Haas': [31, 43]          // Ocon, Bearman
}


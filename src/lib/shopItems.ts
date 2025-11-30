import { ShopItem } from './supabase'

export const SHOP_ITEMS: ShopItem[] = [
  // === HELME ===
  {
    id: 'helmet_verstappen',
    name: 'Verstappen Helm',
    description: 'Der ikonische blaue Helm des 4-fachen Weltmeisters',
    category: 'helmet',
    price: 500,
    rarity: 'legendary',
    image_url: '🪖',
    team: 'Red Bull Racing',
    driver: 'Max Verstappen',
    available: true
  },
  {
    id: 'helmet_hamilton',
    name: 'Hamilton Helm',
    description: 'Der legendäre lila Helm des 7-fachen Weltmeisters',
    category: 'helmet',
    price: 500,
    rarity: 'legendary',
    image_url: '🪖',
    team: 'Ferrari',
    driver: 'Lewis Hamilton',
    available: true
  },
  {
    id: 'helmet_leclerc',
    name: 'Leclerc Helm',
    description: 'Der elegante rote Helm des Ferrari-Stars',
    category: 'helmet',
    price: 400,
    rarity: 'epic',
    image_url: '🪖',
    team: 'Ferrari',
    driver: 'Charles Leclerc',
    available: true
  },
  {
    id: 'helmet_norris',
    name: 'Norris Helm',
    description: 'Der bunte Helm des McLaren-Fahrers',
    category: 'helmet',
    price: 400,
    rarity: 'epic',
    image_url: '🪖',
    team: 'McLaren',
    driver: 'Lando Norris',
    available: true
  },
  {
    id: 'helmet_alonso',
    name: 'Alonso Helm',
    description: 'Der klassische Helm der F1-Legende',
    category: 'helmet',
    price: 350,
    rarity: 'rare',
    image_url: '🪖',
    team: 'Aston Martin',
    driver: 'Fernando Alonso',
    available: true
  },
  {
    id: 'helmet_generic_red',
    name: 'Roter Racing Helm',
    description: 'Ein klassischer roter Rennhelm',
    category: 'helmet',
    price: 100,
    rarity: 'common',
    image_url: '🪖',
    available: true
  },
  {
    id: 'helmet_generic_blue',
    name: 'Blauer Racing Helm',
    description: 'Ein klassischer blauer Rennhelm',
    category: 'helmet',
    price: 100,
    rarity: 'common',
    image_url: '🪖',
    available: true
  },

  // === AUTOS ===
  {
    id: 'car_redbull_rb20',
    name: 'Red Bull RB20',
    description: 'Das dominante Auto der 2024 Saison',
    category: 'car',
    price: 1000,
    rarity: 'legendary',
    image_url: '🏎️',
    team: 'Red Bull Racing',
    available: true
  },
  {
    id: 'car_mclaren_mcl38',
    name: 'McLaren MCL38',
    description: 'Das schnelle Papaya-Orange Biest',
    category: 'car',
    price: 800,
    rarity: 'epic',
    image_url: '🏎️',
    team: 'McLaren',
    available: true
  },
  {
    id: 'car_ferrari_sf24',
    name: 'Ferrari SF-24',
    description: 'Die rote Göttin aus Maranello',
    category: 'car',
    price: 800,
    rarity: 'epic',
    image_url: '🏎️',
    team: 'Ferrari',
    available: true
  },
  {
    id: 'car_mercedes_w15',
    name: 'Mercedes W15',
    description: 'Der Silberpfeil',
    category: 'car',
    price: 600,
    rarity: 'rare',
    image_url: '🏎️',
    team: 'Mercedes',
    available: true
  },
  {
    id: 'car_aston_amr24',
    name: 'Aston Martin AMR24',
    description: 'Das grüne Juwel',
    category: 'car',
    price: 500,
    rarity: 'rare',
    image_url: '🏎️',
    team: 'Aston Martin',
    available: true
  },
  {
    id: 'car_generic_f1',
    name: 'F1 Bolide',
    description: 'Ein klassischer Formel 1 Wagen',
    category: 'car',
    price: 200,
    rarity: 'common',
    image_url: '🏎️',
    available: true
  },

  // === TROPHÄEN ===
  {
    id: 'trophy_wdc',
    name: 'WM-Pokal',
    description: 'Die ultimative Trophäe - der Weltmeister-Pokal',
    category: 'trophy',
    price: 2000,
    rarity: 'legendary',
    image_url: '🏆',
    available: true
  },
  {
    id: 'trophy_race_win',
    name: 'Rennsieg-Trophäe',
    description: 'Eine Trophäe für den Rennsieg',
    category: 'trophy',
    price: 300,
    rarity: 'rare',
    image_url: '🥇',
    available: true
  },
  {
    id: 'trophy_podium',
    name: 'Podiums-Trophäe',
    description: 'Eine Trophäe fürs Podium',
    category: 'trophy',
    price: 150,
    rarity: 'common',
    image_url: '🥈',
    available: true
  },

  // === BADGES ===
  {
    id: 'badge_monaco',
    name: 'Monaco Badge',
    description: 'Die Krone der F1 - Monte Carlo',
    category: 'badge',
    price: 250,
    rarity: 'epic',
    image_url: '🎰',
    available: true
  },
  {
    id: 'badge_monza',
    name: 'Monza Badge',
    description: 'Der Tempel der Geschwindigkeit',
    category: 'badge',
    price: 200,
    rarity: 'rare',
    image_url: '🇮🇹',
    available: true
  },
  {
    id: 'badge_silverstone',
    name: 'Silverstone Badge',
    description: 'Die Heimat des Motorsports',
    category: 'badge',
    price: 200,
    rarity: 'rare',
    image_url: '🇬🇧',
    available: true
  },
  {
    id: 'badge_spa',
    name: 'Spa Badge',
    description: 'Eau Rouge - Die legendäre Strecke',
    category: 'badge',
    price: 200,
    rarity: 'rare',
    image_url: '🇧🇪',
    available: true
  },
  {
    id: 'badge_suzuka',
    name: 'Suzuka Badge',
    description: 'Die Achterbahn Japans',
    category: 'badge',
    price: 200,
    rarity: 'rare',
    image_url: '🇯🇵',
    available: true
  },

  // === SPECIAL ===
  {
    id: 'special_drs',
    name: 'DRS Zone',
    description: 'Der Überholbooster',
    category: 'special',
    price: 150,
    rarity: 'rare',
    image_url: '⚡',
    available: true
  },
  {
    id: 'special_pitcrew',
    name: 'Pit Crew',
    description: 'Dein eigenes Boxenteam',
    category: 'special',
    price: 400,
    rarity: 'epic',
    image_url: '🔧',
    available: true
  },
  {
    id: 'special_champagne',
    name: 'Podiums-Champagner',
    description: 'Feier wie ein Champion',
    category: 'special',
    price: 100,
    rarity: 'common',
    image_url: '🍾',
    available: true
  },
  {
    id: 'special_checkered_flag',
    name: 'Zielflagge',
    description: 'Das Zeichen des Sieges',
    category: 'special',
    price: 75,
    rarity: 'common',
    image_url: '🏁',
    available: true
  }
]

export const RARITY_COLORS = {
  common: { bg: 'bg-gray-600', text: 'text-gray-300', border: 'border-gray-500' },
  rare: { bg: 'bg-blue-600', text: 'text-blue-300', border: 'border-blue-500' },
  epic: { bg: 'bg-purple-600', text: 'text-purple-300', border: 'border-purple-500' },
  legendary: { bg: 'bg-yellow-600', text: 'text-yellow-300', border: 'border-yellow-500' }
}

export const CATEGORY_LABELS = {
  helmet: '🪖 Helme',
  car: '🏎️ Autos',
  trophy: '🏆 Trophäen',
  badge: '🏅 Badges',
  special: '✨ Specials'
}


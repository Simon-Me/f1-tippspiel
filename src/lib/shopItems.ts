// Shop Items - Nur Autos!
// Startguthaben: 500 Coins
// 10 Punkte = 100 Coins

export interface CarItem {
  id: string
  name: string
  description: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image: string
}

export const CAR_ITEMS: CarItem[] = [
  // === LEGENDARY (3000-5000 Coins) - Nur für Top-Tipper ===
  {
    id: 'gold',
    name: 'Golden F1',
    description: 'Der ultimative Flex. Pures Gold auf der Strecke.',
    price: 5000,
    rarity: 'legendary',
    image: '/cars/gold.png'
  },
  {
    id: 'redbull',
    name: 'Red Bull RB20',
    description: 'Das dominante Auto des 4x Weltmeisters.',
    price: 4000,
    rarity: 'legendary',
    image: '/cars/redbull.png'
  },
  {
    id: 'ferrari',
    name: 'Ferrari SF-24',
    description: 'La Rossa - Die rote Göttin aus Maranello.',
    price: 3500,
    rarity: 'legendary',
    image: '/cars/ferrari.png'
  },
  
  // === EPIC (1500-2500 Coins) - Für gute Tipper ===
  {
    id: 'mercedes',
    name: 'Mercedes W15',
    description: 'Der Silberpfeil. 8x Konstrukteurs-Weltmeister.',
    price: 2500,
    rarity: 'epic',
    image: '/cars/mercedes.png'
  },
  {
    id: 'audi',
    name: 'Audi F1',
    description: 'Die Zukunft. Ab 2026 in der Formel 1.',
    price: 2000,
    rarity: 'epic',
    image: '/cars/audi.png'
  },
  {
    id: 'moncler',
    name: 'Moncler Racing',
    description: 'Luxus auf der Strecke. Für die Stylischen.',
    price: 1800,
    rarity: 'epic',
    image: '/cars/moncler.png'
  },
  {
    id: 'nike',
    name: 'Nike Speed',
    description: 'Just Do It. Auf 350 km/h.',
    price: 1500,
    rarity: 'epic',
    image: '/cars/nike.png'
  },
  
  // === RARE (600-1200 Coins) - Mit etwas Tippen erreichbar ===
  {
    id: 'williams',
    name: 'Williams FW46',
    description: 'Die Legende kehrt zurück. 9x Weltmeister-Team.',
    price: 1200,
    rarity: 'rare',
    image: '/cars/williams.png'
  },
  {
    id: 'haas',
    name: 'Haas VF-24',
    description: 'Das amerikanische Team. Made in USA.',
    price: 1000,
    rarity: 'rare',
    image: '/cars/haas.png'
  },
  {
    id: 'cocacola',
    name: 'Coca-Cola Racing',
    description: 'Erfrischend schnell. Taste the Speed.',
    price: 900,
    rarity: 'rare',
    image: '/cars/cocacola.png'
  },
  {
    id: 'mcdonalds',
    name: "McDonald's F1",
    description: "I'm lovin' it. Mit Extra Speed.",
    price: 800,
    rarity: 'rare',
    image: '/cars/mcdonalds.png'
  },
  {
    id: 'clubmate',
    name: 'Club-Mate Racer',
    description: 'Koffein-Power für die Nachtrennen.',
    price: 700,
    rarity: 'rare',
    image: '/cars/clubmate.png'
  },
  {
    id: 'jokoklaas',
    name: 'Joko & Klaas F1',
    description: 'Florida TV Special. Chaos auf der Strecke.',
    price: 600,
    rarity: 'rare',
    image: '/cars/jokoklaas.png'
  },
  
  // === COMMON (100-500 Coins) - Direkt kaufbar mit Startguthaben ===
  {
    id: 'prosieben',
    name: 'ProSieben Racing',
    description: 'We love to entertain you. Auf der Rennstrecke.',
    price: 500,
    rarity: 'common',
    image: '/cars/prosieben.png'
  },
  {
    id: 'funnyfrisch',
    name: 'Funny-Frisch Cruiser',
    description: 'Ungarisch scharf. Auch auf der Strecke.',
    price: 400,
    rarity: 'common',
    image: '/cars/funnyfrisch.png'
  },
  {
    id: 'fiat',
    name: 'Fiat 500 F1',
    description: 'Italienische Eleganz trifft Formel 1.',
    price: 350,
    rarity: 'common',
    image: '/cars/fiat.png'
  },
  {
    id: 'jeep',
    name: 'Jeep Offroad F1',
    description: 'Für die härtesten Strecken. Oder so.',
    price: 300,
    rarity: 'common',
    image: '/cars/jeep.png'
  },
  {
    id: 'opelcorsa',
    name: 'Opel Corsa F1',
    description: 'Deutschlands Liebling. Jetzt in schnell.',
    price: 250,
    rarity: 'common',
    image: '/cars/opelcorsa.png'
  },
  {
    id: 'lasagne',
    name: 'Lasagne Bolognese',
    description: 'Al dente auf der Strecke. Mama mia!',
    price: 200,
    rarity: 'common',
    image: '/cars/lasagne.png'
  },
  {
    id: 'bratwurst',
    name: 'Bratwurst Express',
    description: 'Mit Senf. Deutschlands schnellste Wurst.',
    price: 150,
    rarity: 'common',
    image: '/cars/bratwurst.png'
  },
  {
    id: 'multipla',
    name: 'Fiat Multipla F1',
    description: 'Das hässlichste Auto. Jetzt in schnell und hässlich.',
    price: 100,
    rarity: 'common',
    image: '/cars/multipla.png'
  }
]

export const RARITY_COLORS = {
  common: { bg: 'bg-gray-700', text: 'text-gray-300', border: 'border-gray-600', glow: '' },
  rare: { bg: 'bg-blue-900', text: 'text-blue-400', border: 'border-blue-500', glow: 'shadow-blue-500/20' },
  epic: { bg: 'bg-purple-900', text: 'text-purple-400', border: 'border-purple-500', glow: 'shadow-purple-500/30' },
  legendary: { bg: 'bg-yellow-900', text: 'text-yellow-400', border: 'border-yellow-500', glow: 'shadow-yellow-500/40' }
}

export const RARITY_LABELS = {
  common: 'Standard',
  rare: 'Selten',
  epic: 'Episch',
  legendary: 'Legendär'
}

// Für Kompatibilität
export const STARTING_COINS = 500

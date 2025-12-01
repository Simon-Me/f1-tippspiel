// Shop Items - Nur Autos!
// Startguthaben: 500 Coins
// 10 Punkte = 100 Coins
// Perfektes Event (Quali+Sprint+Rennen): 108 Punkte = 1080 Coins

export interface CarItem {
  id: string
  name: string
  description: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image: string
}

export const CAR_ITEMS: CarItem[] = [
  // === COMMON (100-500 Coins) - Direkt kaufbar mit Startguthaben ===
  {
    id: 'multipla',
    name: 'Fiat Multipla F1',
    description: 'Das hässlichste Auto. Jetzt in schnell und hässlich.',
    price: 100,
    rarity: 'common',
    image: '/cars/multipla.png'
  },
  {
    id: 'bratwurst',
    name: 'Bratwurst Express',
    description: 'Mit Senf. Deutschlands schnellste Wurst.',
    price: 150,
    rarity: 'common',
    image: '/cars/bratwurst.webp'
  },
  {
    id: 'lasagne',
    name: 'Lasagne Bolognese',
    description: 'Al dente auf der Strecke. Mama mia!',
    price: 200,
    rarity: 'common',
    image: '/cars/lasagne.webp'
  },
  {
    id: 'opelcorsa',
    name: 'Opel Corsa F1',
    description: 'Deutschlands Liebling. Jetzt in schnell.',
    price: 250,
    rarity: 'common',
    image: '/cars/opelcorsa.webp'
  },
  {
    id: 'jeep',
    name: 'Jeep Offroad F1',
    description: 'Für die härtesten Strecken. Oder so.',
    price: 300,
    rarity: 'common',
    image: '/cars/jeep.webp'
  },
  {
    id: 'fiat',
    name: 'Fiat 500 F1',
    description: 'Italienische Eleganz trifft Formel 1.',
    price: 350,
    rarity: 'common',
    image: '/cars/fiat.webp'
  },
  {
    id: 'funnyfrisch',
    name: 'Funny-Frisch Cruiser',
    description: 'Ungarisch scharf. Auch auf der Strecke.',
    price: 400,
    rarity: 'common',
    image: '/cars/funnyfrisch.webp'
  },
  {
    id: 'prosieben',
    name: 'ProSieben Racing',
    description: 'We love to entertain you. Auf der Rennstrecke.',
    price: 500,
    rarity: 'common',
    image: '/cars/prosieben.webp'
  },
  
  // === RARE (600-800 Coins) - Mit etwas Tippen erreichbar ===
  {
    id: 'jokoklaas',
    name: 'Joko & Klaas F1',
    description: 'Florida TV Special. Chaos auf der Strecke.',
    price: 600,
    rarity: 'rare',
    image: '/cars/jokoklaas.webp'
  },
  {
    id: 'mcdonalds',
    name: "McDonald's F1",
    description: "I'm lovin' it. Mit Extra Speed.",
    price: 800,
    rarity: 'rare',
    image: '/cars/mcdonalds.webp'
  },
  
  // === LEGENDARY (3000-5000 Coins) - Nur für Top-Tipper ===
  {
    id: 'ferrari',
    name: 'Ferrari SF-24',
    description: 'La Rossa - Die rote Göttin aus Maranello.',
    price: 3500,
    rarity: 'legendary',
    image: '/cars/ferrari.webp'
  },
  {
    id: 'redbull',
    name: 'Red Bull RB20',
    description: 'Das dominante Auto des 4x Weltmeisters.',
    price: 4000,
    rarity: 'legendary',
    image: '/cars/redbull.webp'
  },
  {
    id: 'gold',
    name: 'Golden F1',
    description: 'Der ultimative Flex. Pures Gold auf der Strecke.',
    price: 5000,
    rarity: 'legendary',
    image: '/cars/gold.webp'
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

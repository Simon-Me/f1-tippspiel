// Fahrer Headshots (offizielle F1 Media URLs - 2024/2025 Format)
export const DRIVER_HEADSHOTS: Record<number, string> = {
  1: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png',
  4: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png',
  16: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png',
  44: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png',
  81: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/1col/image.png',
  63: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/1col/image.png',
  55: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/1col/image.png',
  14: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/1col/image.png',
  10: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/1col/image.png',
  27: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png',
  22: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/Y/YUKTSU01_Yuki_Tsunoda/yuktsu01.png.transform/1col/image.png',
  18: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/1col/image.png',
  23: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/1col/image.png',
  31: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/1col/image.png',
  30: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/1col/image.png',
  87: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/1col/image.png',
  7: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/J/JACDOO01_Jack_Doohan/jacdoo01.png.transform/1col/image.png',
  12: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/K/KIMANT01_Kimi_Antonelli/kimant01.png.transform/1col/image.png',
  5: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/G/GABBOR01_Gabriel_Bortoleto/gabbor01.png.transform/1col/image.png',
  6: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/I/ISAHAD01_Isack_Hadjar/isahad01.png.transform/1col/image.png',
  43: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/1col/image.png',
  33: 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png',
}

// Fallback Bild für Fahrer
const DRIVER_FALLBACK = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback.png.transform/1col/image.png'

export function getDriverHeadshot(driverNumber: number): string {
  return DRIVER_HEADSHOTS[driverNumber] || DRIVER_FALLBACK
}

// Länder-Flaggen für Rennen (Emoji-basiert - funktioniert immer)
export const COUNTRY_FLAGS: Record<string, string> = {
  'bahrain': '🇧🇭',
  'saudi': '🇸🇦',
  'jeddah': '🇸🇦',
  'australia': '🇦🇺',
  'albert': '🇦🇺',
  'japan': '🇯🇵',
  'suzuka': '🇯🇵',
  'china': '🇨🇳',
  'shanghai': '🇨🇳',
  'miami': '🇺🇸',
  'imola': '🇮🇹',
  'monaco': '🇲🇨',
  'spain': '🇪🇸',
  'barcelona': '🇪🇸',
  'catalunya': '🇪🇸',
  'canada': '🇨🇦',
  'gilles': '🇨🇦',
  'austria': '🇦🇹',
  'red bull ring': '🇦🇹',
  'britain': '🇬🇧',
  'silverstone': '🇬🇧',
  'hungary': '🇭🇺',
  'hungaroring': '🇭🇺',
  'belgium': '🇧🇪',
  'spa': '🇧🇪',
  'netherlands': '🇳🇱',
  'zandvoort': '🇳🇱',
  'italy': '🇮🇹',
  'monza': '🇮🇹',
  'azerbaijan': '🇦🇿',
  'baku': '🇦🇿',
  'singapore': '🇸🇬',
  'marina bay': '🇸🇬',
  'usa': '🇺🇸',
  'austin': '🇺🇸',
  'americas': '🇺🇸',
  'mexico': '🇲🇽',
  'hermanos': '🇲🇽',
  'brazil': '🇧🇷',
  'interlagos': '🇧🇷',
  'paulo': '🇧🇷',
  'vegas': '🇺🇸',
  'las vegas': '🇺🇸',
  'qatar': '🇶🇦',
  'lusail': '🇶🇦',
  'abu dhabi': '🇦🇪',
  'yas': '🇦🇪',
}

export function getCountryFlag(raceName: string): string {
  const name = raceName.toLowerCase()
  for (const [key, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (name.includes(key)) {
      return flag
    }
  }
  return '🏁'
}

// Strecken-Hintergrundfarben (statt kaputte Bilder)
export const CIRCUIT_COLORS: Record<string, string> = {
  'bahrain': 'from-orange-900 to-red-900',
  'saudi': 'from-green-900 to-emerald-800',
  'australia': 'from-blue-900 to-cyan-800',
  'japan': 'from-red-900 to-pink-800',
  'china': 'from-red-800 to-yellow-700',
  'miami': 'from-cyan-800 to-blue-700',
  'imola': 'from-green-800 to-red-700',
  'monaco': 'from-red-900 to-white/20',
  'spain': 'from-yellow-700 to-red-700',
  'canada': 'from-red-800 to-white/30',
  'austria': 'from-red-800 to-white/30',
  'britain': 'from-blue-900 to-red-800',
  'hungary': 'from-red-800 to-green-800',
  'belgium': 'from-red-800 to-yellow-700',
  'netherlands': 'from-orange-700 to-blue-800',
  'italy': 'from-green-800 to-red-700',
  'azerbaijan': 'from-blue-800 to-red-700',
  'singapore': 'from-red-800 to-white/30',
  'usa': 'from-blue-900 to-red-800',
  'austin': 'from-blue-900 to-red-800',
  'mexico': 'from-green-800 to-red-700',
  'brazil': 'from-green-800 to-yellow-600',
  'vegas': 'from-purple-900 to-pink-700',
  'qatar': 'from-purple-900 to-red-800',
  'abu dhabi': 'from-red-900 to-gray-800',
}

export function getCircuitGradient(raceName: string): string {
  const name = raceName.toLowerCase()
  for (const [key, gradient] of Object.entries(CIRCUIT_COLORS)) {
    if (name.includes(key)) {
      return gradient
    }
  }
  return 'from-gray-800 to-gray-900'
}

// Legacy function - returns empty string now (images are broken)
export function getCircuitImage(raceName: string): string {
  return ''
}

// Helper um Flaggen zu bekommen
export function getNationalityFlag(nationality: string): string {
  const flags: Record<string, string> = {
    'Dutch': '🇳🇱',
    'British': '🇬🇧',
    'Monegasque': '🇲🇨',
    'Australian': '🇦🇺',
    'Spanish': '🇪🇸',
    'French': '🇫🇷',
    'German': '🇩🇪',
    'Japanese': '🇯🇵',
    'Canadian': '🇨🇦',
    'Thai': '🇹🇭',
    'Finnish': '🇫🇮',
    'Mexican': '🇲🇽',
    'Chinese': '🇨🇳',
    'Danish': '🇩🇰',
    'American': '🇺🇸',
    'Italian': '🇮🇹',
    'New Zealander': '🇳🇿',
    'Brazilian': '🇧🇷',
    'Argentine': '🇦🇷',
  }
  return flags[nationality] || '🏁'
}

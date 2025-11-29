// Synchronisiert Fahrer aus der OpenF1 API mit der Datenbank
import { supabase } from './supabase'

const OPENF1_API = 'https://api.openf1.org/v1'

interface OpenF1Driver {
  driver_number: number
  full_name: string
  team_name: string
  team_colour: string
  country_code: string
  headshot_url?: string
  session_key: number
}

// Team-Farben Mapping (OpenF1 liefert manchmal unterschiedliche Formate)
const normalizeTeamColor = (color: string): string => {
  if (!color) return '#666666'
  // Stelle sicher, dass es ein gültiger Hex-Code ist
  if (color.startsWith('#')) return color
  return `#${color}`
}

// Team-Namen normalisieren (für konsistente Darstellung)
const normalizeTeamName = (name: string): string => {
  const teamMappings: { [key: string]: string } = {
    'Red Bull Racing': 'Red Bull Racing',
    'Red Bull': 'Red Bull Racing',
    'Ferrari': 'Ferrari',
    'Scuderia Ferrari': 'Ferrari',
    'Mercedes': 'Mercedes',
    'Mercedes-AMG Petronas': 'Mercedes',
    'McLaren': 'McLaren',
    'McLaren F1 Team': 'McLaren',
    'Aston Martin': 'Aston Martin',
    'Aston Martin Aramco': 'Aston Martin',
    'Alpine': 'Alpine',
    'Alpine F1 Team': 'Alpine',
    'Williams': 'Williams',
    'Williams Racing': 'Williams',
    'RB': 'RB',
    'Visa Cash App RB': 'RB',
    'Kick Sauber': 'Sauber',
    'Sauber': 'Sauber',
    'Stake F1 Team Kick Sauber': 'Sauber',
    'Haas F1 Team': 'Haas',
    'Haas': 'Haas',
    'MoneyGram Haas F1 Team': 'Haas',
  }
  return teamMappings[name] || name
}

export async function syncDriversFromAPI(): Promise<{
  success: boolean
  driversCount: number
  error?: string
}> {
  try {
    // Hole die neueste Session um aktuelle Fahrer zu bekommen
    const sessionsResponse = await fetch(`${OPENF1_API}/sessions?session_key=latest`)
    if (!sessionsResponse.ok) {
      throw new Error('Konnte Sessions nicht laden')
    }
    
    const sessions = await sessionsResponse.json()
    if (!sessions.length) {
      throw new Error('Keine Session gefunden')
    }
    
    const latestSession = sessions[0]
    console.log(`Syncing drivers from session: ${latestSession.session_name} (${latestSession.meeting_name})`)
    
    // Hole Fahrer dieser Session
    const driversResponse = await fetch(`${OPENF1_API}/drivers?session_key=${latestSession.session_key}`)
    if (!driversResponse.ok) {
      throw new Error('Konnte Fahrer nicht laden')
    }
    
    const apiDrivers: OpenF1Driver[] = await driversResponse.json()
    
    // Dedupliziere Fahrer (API kann mehrere Einträge pro Fahrer haben)
    const uniqueDrivers = new Map<number, OpenF1Driver>()
    apiDrivers.forEach(driver => {
      if (!uniqueDrivers.has(driver.driver_number)) {
        uniqueDrivers.set(driver.driver_number, driver)
      }
    })
    
    // Alle alten Fahrer als inaktiv markieren
    await supabase
      .from('drivers')
      .update({ active: false })
      .neq('id', 0) // Update alle
    
    // Fahrer in DB einfügen oder aktualisieren
    for (const driver of uniqueDrivers.values()) {
      const driverData = {
        driver_number: driver.driver_number,
        full_name: driver.full_name,
        team_name: normalizeTeamName(driver.team_name),
        team_color: normalizeTeamColor(driver.team_colour),
        country_code: driver.country_code,
        headshot_url: driver.headshot_url || null,
        active: true
      }
      
      // Upsert: Update wenn existiert, sonst insert
      const { error } = await supabase
        .from('drivers')
        .upsert(driverData, { 
          onConflict: 'driver_number',
          ignoreDuplicates: false 
        })
      
      if (error) {
        console.error(`Error upserting driver ${driver.full_name}:`, error)
      }
    }
    
    return {
      success: true,
      driversCount: uniqueDrivers.size
    }
    
  } catch (error) {
    console.error('Error syncing drivers:', error)
    return {
      success: false,
      driversCount: 0,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}

// Hole aktuelle Fahrer direkt aus der API (ohne DB)
export async function getDriversFromAPI(): Promise<OpenF1Driver[]> {
  try {
    // Versuche erst die neueste Session
    const sessionsResponse = await fetch(`${OPENF1_API}/sessions?session_key=latest`)
    const sessions = await sessionsResponse.json()
    
    if (sessions.length === 0) {
      // Fallback: Hole Sessions von 2024/2025
      const fallbackResponse = await fetch(`${OPENF1_API}/sessions?year=2024`)
      const fallbackSessions = await fallbackResponse.json()
      if (fallbackSessions.length === 0) return []
      
      const lastSession = fallbackSessions[fallbackSessions.length - 1]
      const driversResponse = await fetch(`${OPENF1_API}/drivers?session_key=${lastSession.session_key}`)
      return driversResponse.json()
    }
    
    const driversResponse = await fetch(`${OPENF1_API}/drivers?session_key=${sessions[0].session_key}`)
    return driversResponse.json()
    
  } catch (error) {
    console.error('Error fetching drivers from API:', error)
    return []
  }
}



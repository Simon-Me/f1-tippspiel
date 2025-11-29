// OpenF1 API Client
// Dokumentation: https://openf1.org

const BASE_URL = 'https://api.openf1.org/v1'

export interface OpenF1Driver {
  driver_number: number
  full_name: string
  team_name: string
  team_colour: string
  country_code: string
  headshot_url?: string
}

export interface OpenF1Session {
  session_key: number
  session_name: string
  session_type: string
  date_start: string
  date_end: string
  circuit_key: number
  circuit_short_name: string
  country_name: string
  meeting_key: number
  meeting_name: string
  year: number
}

export interface OpenF1Position {
  driver_number: number
  position: number
  date: string
}

export interface OpenF1LapTime {
  driver_number: number
  lap_number: number
  lap_duration: number
  is_pit_out_lap: boolean
  sector_1_duration: number
  sector_2_duration: number
  sector_3_duration: number
}

export interface OpenF1Interval {
  driver_number: number
  gap_to_leader: number
  interval: number
  date: string
}

// Alle Fahrer einer Session abrufen
export async function getDrivers(sessionKey?: number): Promise<OpenF1Driver[]> {
  const params = sessionKey ? `?session_key=${sessionKey}` : ''
  const response = await fetch(`${BASE_URL}/drivers${params}`)
  if (!response.ok) throw new Error('Failed to fetch drivers')
  return response.json()
}

// Alle Sessions eines Jahres abrufen
export async function getSessions(year?: number): Promise<OpenF1Session[]> {
  const params = year ? `?year=${year}` : ''
  const response = await fetch(`${BASE_URL}/sessions${params}`)
  if (!response.ok) throw new Error('Failed to fetch sessions')
  return response.json()
}

// Aktuelle Session abrufen
export async function getLatestSession(): Promise<OpenF1Session | null> {
  const response = await fetch(`${BASE_URL}/sessions?session_key=latest`)
  if (!response.ok) throw new Error('Failed to fetch latest session')
  const data = await response.json()
  return data[0] || null
}

// Positionen einer Session abrufen
export async function getPositions(sessionKey: number): Promise<OpenF1Position[]> {
  const response = await fetch(`${BASE_URL}/position?session_key=${sessionKey}`)
  if (!response.ok) throw new Error('Failed to fetch positions')
  return response.json()
}

// Aktuelle Positionen (letzte)
export async function getLatestPositions(sessionKey: number): Promise<OpenF1Position[]> {
  const positions = await getPositions(sessionKey)
  
  // Gruppiere nach Fahrer und nimm die letzte Position
  const latestByDriver = new Map<number, OpenF1Position>()
  positions.forEach(pos => {
    const existing = latestByDriver.get(pos.driver_number)
    if (!existing || new Date(pos.date) > new Date(existing.date)) {
      latestByDriver.set(pos.driver_number, pos)
    }
  })
  
  return Array.from(latestByDriver.values())
    .sort((a, b) => a.position - b.position)
}

// Rundenzeiten abrufen
export async function getLapTimes(sessionKey: number, driverNumber?: number): Promise<OpenF1LapTime[]> {
  let url = `${BASE_URL}/laps?session_key=${sessionKey}`
  if (driverNumber) url += `&driver_number=${driverNumber}`
  
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch lap times')
  return response.json()
}

// Abstände abrufen
export async function getIntervals(sessionKey: number): Promise<OpenF1Interval[]> {
  const response = await fetch(`${BASE_URL}/intervals?session_key=${sessionKey}`)
  if (!response.ok) throw new Error('Failed to fetch intervals')
  return response.json()
}

// Meeting-Infos (Rennwochenenden) abrufen
export async function getMeetings(year?: number) {
  const params = year ? `?year=${year}` : ''
  const response = await fetch(`${BASE_URL}/meetings${params}`)
  if (!response.ok) throw new Error('Failed to fetch meetings')
  return response.json()
}

// Schnellste Runde einer Session ermitteln
export async function getFastestLap(sessionKey: number): Promise<{driver_number: number, lap_time: number} | null> {
  const laps = await getLapTimes(sessionKey)
  
  let fastest: {driver_number: number, lap_time: number} | null = null
  
  laps.forEach(lap => {
    if (lap.lap_duration && !lap.is_pit_out_lap) {
      if (!fastest || lap.lap_duration < fastest.lap_time) {
        fastest = {
          driver_number: lap.driver_number,
          lap_time: lap.lap_duration
        }
      }
    }
  })
  
  return fastest
}

// Helfer: Zeit formatieren
export function formatLapTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(3)
  return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs
}



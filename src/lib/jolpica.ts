// Jolpica F1 API Client (Ergast-compatible)
// Dokumentation: https://github.com/jolpica/jolpica-f1

const BASE_URL = 'https://api.jolpi.ca/ergast/f1'

// === Types ===

export interface JolpicaDriver {
  driverId: string
  permanentNumber: string
  code: string
  givenName: string
  familyName: string
  dateOfBirth: string
  nationality: string
  url: string
}

export interface JolpicaConstructor {
  constructorId: string
  name: string
  nationality: string
  url: string
}

export interface JolpicaCircuit {
  circuitId: string
  circuitName: string
  url: string
  Location: {
    lat: string
    long: string
    locality: string
    country: string
  }
}

export interface JolpicaRace {
  season: string
  round: string
  raceName: string
  date: string
  time?: string
  url: string
  Circuit: JolpicaCircuit
  Results?: JolpicaResult[]
  QualifyingResults?: JolpicaQualifyingResult[]
}

export interface JolpicaResult {
  number: string
  position: string
  positionText: string
  points: string
  grid: string
  laps: string
  status: string
  Driver: JolpicaDriver
  Constructor: JolpicaConstructor
  Time?: { millis: string; time: string }
  FastestLap?: { rank: string; lap: string; Time: { time: string } }
}

export interface JolpicaQualifyingResult {
  number: string
  position: string
  Driver: JolpicaDriver
  Constructor: JolpicaConstructor
  Q1?: string
  Q2?: string
  Q3?: string
}

// === API Functions ===

// Alle aktuellen Fahrer abrufen
export async function getCurrentDrivers(): Promise<JolpicaDriver[]> {
  const response = await fetch(`${BASE_URL}/current/drivers/`)
  if (!response.ok) throw new Error('Failed to fetch drivers')
  const data = await response.json()
  return data.MRData.DriverTable.Drivers
}

// Alle aktuellen Teams abrufen
export async function getCurrentConstructors(): Promise<JolpicaConstructor[]> {
  const response = await fetch(`${BASE_URL}/current/constructors/`)
  if (!response.ok) throw new Error('Failed to fetch constructors')
  const data = await response.json()
  return data.MRData.ConstructorTable.Constructors
}

// Fahrer mit Team-Zuordnung abrufen
export async function getDriversWithTeams(): Promise<Array<JolpicaDriver & { team: string; teamId: string }>> {
  // Hole alle Fahrer und ihre Ergebnisse vom letzten Rennen (enthält Team-Info)
  const response = await fetch(`${BASE_URL}/current/last/results/`)
  if (!response.ok) throw new Error('Failed to fetch results')
  const data = await response.json()
  
  const results = data.MRData.RaceTable.Races[0]?.Results || []
  
  return results.map((r: JolpicaResult) => ({
    ...r.Driver,
    team: r.Constructor.name,
    teamId: r.Constructor.constructorId
  }))
}

// Alle Rennen der aktuellen Saison
export async function getCurrentSchedule(): Promise<JolpicaRace[]> {
  const response = await fetch(`${BASE_URL}/current/`)
  if (!response.ok) throw new Error('Failed to fetch schedule')
  const data = await response.json()
  return data.MRData.RaceTable.Races
}

// Ergebnis eines bestimmten Rennens
export async function getRaceResults(round: number): Promise<JolpicaResult[] | null> {
  const response = await fetch(`${BASE_URL}/current/${round}/results/`)
  if (!response.ok) return null
  const data = await response.json()
  return data.MRData.RaceTable.Races[0]?.Results || null
}

// Qualifying-Ergebnis eines bestimmten Rennens
export async function getQualifyingResults(round: number): Promise<JolpicaQualifyingResult[] | null> {
  const response = await fetch(`${BASE_URL}/current/${round}/qualifying/`)
  if (!response.ok) return null
  const data = await response.json()
  return data.MRData.RaceTable.Races[0]?.QualifyingResults || null
}

// Letztes Rennergebnis
export async function getLastRaceResults(): Promise<JolpicaResult[] | null> {
  const response = await fetch(`${BASE_URL}/current/last/results/`)
  if (!response.ok) return null
  const data = await response.json()
  return data.MRData.RaceTable.Races[0]?.Results || null
}

// Letzte Qualifying-Ergebnisse
export async function getLastQualifyingResults(): Promise<JolpicaQualifyingResult[] | null> {
  const response = await fetch(`${BASE_URL}/current/last/qualifying/`)
  if (!response.ok) return null
  const data = await response.json()
  return data.MRData.RaceTable.Races[0]?.QualifyingResults || null
}

// WM-Stand Fahrer
export async function getDriverStandings(): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/current/driverStandings/`)
  if (!response.ok) throw new Error('Failed to fetch standings')
  const data = await response.json()
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || []
}

// WM-Stand Konstrukteure
export async function getConstructorStandings(): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/current/constructorStandings/`)
  if (!response.ok) throw new Error('Failed to fetch standings')
  const data = await response.json()
  return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || []
}

// === Helper ===

// Team-Farben mapping
export const TEAM_COLORS: Record<string, string> = {
  'red_bull': '#3671C6',
  'ferrari': '#E8002D',
  'mclaren': '#FF8000',
  'mercedes': '#27F4D2',
  'aston_martin': '#229971',
  'alpine': '#0093CC',
  'williams': '#64C4FF',
  'rb': '#6692FF',
  'sauber': '#52E252',
  'haas': '#B6BABD',
}

export function getTeamColor(teamId: string): string {
  return TEAM_COLORS[teamId] || '#666666'
}

// Fahrername formatieren
export function formatDriverName(driver: JolpicaDriver): string {
  return `${driver.givenName} ${driver.familyName}`
}



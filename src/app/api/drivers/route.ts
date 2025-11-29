import { NextResponse } from 'next/server'

const JOLPICA_API = 'https://api.jolpi.ca/ergast/f1'

// Team-Farben Mapping
const TEAM_COLORS: Record<string, string> = {
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

// Team-Namen normalisieren
const normalizeTeamName = (constructorId: string, name: string): string => {
  const teamMappings: Record<string, string> = {
    'red_bull': 'Red Bull Racing',
    'ferrari': 'Ferrari',
    'mclaren': 'McLaren',
    'mercedes': 'Mercedes',
    'aston_martin': 'Aston Martin',
    'alpine': 'Alpine',
    'williams': 'Williams',
    'rb': 'RB',
    'sauber': 'Sauber',
    'haas': 'Haas',
  }
  return teamMappings[constructorId] || name
}

// Fallback Fahrer falls API nicht erreichbar
const FALLBACK_DRIVERS = [
  { id: 1, driver_number: 1, code: 'VER', full_name: 'Max Verstappen', team_name: 'Red Bull Racing', team_id: 'red_bull', team_color: '#3671C6', nationality: 'Dutch' },
  { id: 4, driver_number: 4, code: 'NOR', full_name: 'Lando Norris', team_name: 'McLaren', team_id: 'mclaren', team_color: '#FF8000', nationality: 'British' },
  { id: 16, driver_number: 16, code: 'LEC', full_name: 'Charles Leclerc', team_name: 'Ferrari', team_id: 'ferrari', team_color: '#E8002D', nationality: 'Monegasque' },
  { id: 44, driver_number: 44, code: 'HAM', full_name: 'Lewis Hamilton', team_name: 'Ferrari', team_id: 'ferrari', team_color: '#E8002D', nationality: 'British' },
  { id: 81, driver_number: 81, code: 'PIA', full_name: 'Oscar Piastri', team_name: 'McLaren', team_id: 'mclaren', team_color: '#FF8000', nationality: 'Australian' },
  { id: 63, driver_number: 63, code: 'RUS', full_name: 'George Russell', team_name: 'Mercedes', team_id: 'mercedes', team_color: '#27F4D2', nationality: 'British' },
  { id: 55, driver_number: 55, code: 'SAI', full_name: 'Carlos Sainz', team_name: 'Williams', team_id: 'williams', team_color: '#64C4FF', nationality: 'Spanish' },
  { id: 14, driver_number: 14, code: 'ALO', full_name: 'Fernando Alonso', team_name: 'Aston Martin', team_id: 'aston_martin', team_color: '#229971', nationality: 'Spanish' },
  { id: 10, driver_number: 10, code: 'GAS', full_name: 'Pierre Gasly', team_name: 'Alpine', team_id: 'alpine', team_color: '#0093CC', nationality: 'French' },
  { id: 27, driver_number: 27, code: 'HUL', full_name: 'Nico Hulkenberg', team_name: 'Sauber', team_id: 'sauber', team_color: '#52E252', nationality: 'German' },
  { id: 22, driver_number: 22, code: 'TSU', full_name: 'Yuki Tsunoda', team_name: 'Red Bull Racing', team_id: 'red_bull', team_color: '#3671C6', nationality: 'Japanese' },
  { id: 18, driver_number: 18, code: 'STR', full_name: 'Lance Stroll', team_name: 'Aston Martin', team_id: 'aston_martin', team_color: '#229971', nationality: 'Canadian' },
  { id: 23, driver_number: 23, code: 'ALB', full_name: 'Alexander Albon', team_name: 'Williams', team_id: 'williams', team_color: '#64C4FF', nationality: 'Thai' },
  { id: 31, driver_number: 31, code: 'OCO', full_name: 'Esteban Ocon', team_name: 'Haas', team_id: 'haas', team_color: '#B6BABD', nationality: 'French' },
  { id: 87, driver_number: 87, code: 'BEA', full_name: 'Oliver Bearman', team_name: 'Haas', team_id: 'haas', team_color: '#B6BABD', nationality: 'British' },
  { id: 30, driver_number: 30, code: 'LAW', full_name: 'Liam Lawson', team_name: 'RB', team_id: 'rb', team_color: '#6692FF', nationality: 'New Zealander' },
  { id: 7, driver_number: 7, code: 'DOO', full_name: 'Jack Doohan', team_name: 'Alpine', team_id: 'alpine', team_color: '#0093CC', nationality: 'Australian' },
  { id: 12, driver_number: 12, code: 'ANT', full_name: 'Andrea Kimi Antonelli', team_name: 'Mercedes', team_id: 'mercedes', team_color: '#27F4D2', nationality: 'Italian' },
  { id: 5, driver_number: 5, code: 'BOR', full_name: 'Gabriel Bortoleto', team_name: 'Sauber', team_id: 'sauber', team_color: '#52E252', nationality: 'Brazilian' },
  { id: 6, driver_number: 6, code: 'HAD', full_name: 'Isack Hadjar', team_name: 'RB', team_id: 'rb', team_color: '#6692FF', nationality: 'French' },
]

interface JolpicaResult {
  number: string
  position: string
  Driver: {
    driverId: string
    permanentNumber: string
    code: string
    givenName: string
    familyName: string
    nationality: string
  }
  Constructor: {
    constructorId: string
    name: string
  }
}

export async function GET() {
  try {
    // Hole Fahrer vom letzten Rennen (enthält Team-Zuordnung)
    const response = await fetch(`${JOLPICA_API}/current/last/results/`, {
      next: { revalidate: 3600 } // Cache für 1 Stunde
    })
    
    if (!response.ok) {
      console.log('Jolpica API returned error, using fallback')
      return NextResponse.json({ 
        drivers: FALLBACK_DRIVERS,
        count: FALLBACK_DRIVERS.length,
        source: 'fallback'
      })
    }
    
    const data = await response.json()
    const results: JolpicaResult[] = data.MRData?.RaceTable?.Races?.[0]?.Results || []
    
    if (results.length === 0) {
      console.log('No results from Jolpica API, using fallback')
      return NextResponse.json({ 
        drivers: FALLBACK_DRIVERS,
        count: FALLBACK_DRIVERS.length,
        source: 'fallback'
      })
    }
    
    // Konvertiere zu unserem Format
    const drivers = results.map((r) => ({
      id: parseInt(r.Driver.permanentNumber) || parseInt(r.number),
      driver_number: parseInt(r.Driver.permanentNumber) || parseInt(r.number),
      code: r.Driver.code,
      full_name: `${r.Driver.givenName} ${r.Driver.familyName}`,
      team_name: normalizeTeamName(r.Constructor.constructorId, r.Constructor.name),
      team_id: r.Constructor.constructorId,
      team_color: TEAM_COLORS[r.Constructor.constructorId] || '#666666',
      nationality: r.Driver.nationality,
    }))
    
    // Sortiere nach Team
    drivers.sort((a, b) => a.team_name.localeCompare(b.team_name))
    
    return NextResponse.json({ 
      drivers,
      count: drivers.length,
      source: 'jolpica'
    })
    
  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json({ 
      drivers: FALLBACK_DRIVERS,
      count: FALLBACK_DRIVERS.length,
      source: 'fallback'
    })
  }
}

import { NextResponse } from 'next/server'

const JOLPICA_API = 'https://api.jolpi.ca/ergast/f1'

interface JolpicaResult {
  number: string
  position: string
  positionText: string
  points: string
  Driver: {
    driverId: string
    permanentNumber: string
    code: string
    givenName: string
    familyName: string
  }
  Constructor: {
    constructorId: string
    name: string
  }
  status: string
}

interface JolpicaQualifyingResult {
  number: string
  position: string
  Driver: {
    driverId: string
    permanentNumber: string
    code: string
    givenName: string
    familyName: string
  }
  Constructor: {
    constructorId: string
    name: string
  }
  Q1?: string
  Q2?: string
  Q3?: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const round = searchParams.get('round')
  const type = searchParams.get('type') || 'race' // 'race' oder 'qualifying'
  
  try {
    let url: string
    
    if (round) {
      // Spezifisches Rennen
      url = type === 'qualifying' 
        ? `${JOLPICA_API}/current/${round}/qualifying/`
        : `${JOLPICA_API}/current/${round}/results/`
    } else {
      // Letztes Rennen
      url = type === 'qualifying'
        ? `${JOLPICA_API}/current/last/qualifying/`
        : `${JOLPICA_API}/current/last/results/`
    }
    
    const response = await fetch(url, {
      next: { revalidate: 300 } // Cache für 5 Minuten
    })
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch results',
        results: null 
      }, { status: response.status })
    }
    
    const data = await response.json()
    const race = data.MRData?.RaceTable?.Races?.[0]
    
    if (!race) {
      return NextResponse.json({ 
        error: 'No results found',
        results: null 
      }, { status: 404 })
    }
    
    if (type === 'qualifying') {
      const qualifyingResults: JolpicaQualifyingResult[] = race.QualifyingResults || []
      
      const results = qualifyingResults.map((r) => ({
        position: parseInt(r.position),
        driver_number: parseInt(r.Driver.permanentNumber) || parseInt(r.number),
        driver_code: r.Driver.code,
        driver_name: `${r.Driver.givenName} ${r.Driver.familyName}`,
        team: r.Constructor.name,
        q1: r.Q1 || null,
        q2: r.Q2 || null,
        q3: r.Q3 || null,
      }))
      
      // Pole Position ist Position 1
      const polePosition = results.find(r => r.position === 1)
      
      return NextResponse.json({
        type: 'qualifying',
        raceName: race.raceName,
        date: race.date,
        round: parseInt(race.round),
        results,
        polePosition: polePosition ? polePosition.driver_number : null,
      })
    } else {
      const raceResults: JolpicaResult[] = race.Results || []
      
      const results = raceResults.map((r) => ({
        position: parseInt(r.position),
        driver_number: parseInt(r.Driver.permanentNumber) || parseInt(r.number),
        driver_code: r.Driver.code,
        driver_name: `${r.Driver.givenName} ${r.Driver.familyName}`,
        team: r.Constructor.name,
        points: parseFloat(r.points),
        status: r.status,
        positionText: r.positionText, // 'R' für Retired, 'D' für Disqualified
      }))
      
      // Sieger ist Position 1
      const winner = results.find(r => r.position === 1)
      // Top 3
      const podium = results.filter(r => r.position <= 3)
      
      return NextResponse.json({
        type: 'race',
        raceName: race.raceName,
        date: race.date,
        round: parseInt(race.round),
        results,
        winner: winner ? winner.driver_number : null,
        podium: podium.map(r => r.driver_number),
      })
    }
    
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      results: null 
    }, { status: 500 })
  }
}



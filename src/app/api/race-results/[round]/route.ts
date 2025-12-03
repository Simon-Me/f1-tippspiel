import { NextResponse } from 'next/server'

// API Route um CORS zu umgehen - holt alle Ergebnisse für ein Rennen
export async function GET(
  request: Request,
  { params }: { params: Promise<{ round: string }> }
) {
  const { round } = await params
  
  try {
    const [qualiRes, sprintRes, raceRes] = await Promise.all([
      fetch(`https://api.jolpi.ca/ergast/f1/2025/${round}/qualifying/`, { next: { revalidate: 300 } }),
      fetch(`https://api.jolpi.ca/ergast/f1/2025/${round}/sprint/`, { next: { revalidate: 300 } }),
      fetch(`https://api.jolpi.ca/ergast/f1/2025/${round}/results/`, { next: { revalidate: 300 } })
    ])
    
    const [qualiData, sprintData, raceData] = await Promise.all([
      qualiRes.json(),
      sprintRes.json(),
      raceRes.json()
    ])
    
    return NextResponse.json({
      qualifying: qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || [],
      sprint: sprintData.MRData?.RaceTable?.Races?.[0]?.SprintResults || [],
      race: raceData.MRData?.RaceTable?.Races?.[0]?.Results || []
    })
  } catch (error) {
    console.error('Fehler beim Laden der Ergebnisse:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}




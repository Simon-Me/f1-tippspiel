import { NextResponse } from 'next/server'

// API Route um CORS zu umgehen - holt alle Ergebnisse für ein Rennen
export async function GET(
  request: Request,
  { params }: { params: Promise<{ round: string }> }
) {
  const { round } = await params
  
  const results: {
    qualifying: unknown[]
    sprint: unknown[]
    race: unknown[]
  } = {
    qualifying: [],
    sprint: [],
    race: []
  }
  
  // Qualifying
  try {
    const qualiRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${round}/qualifying/`, { 
      next: { revalidate: 300 },
      headers: { 'Accept': 'application/json' }
    })
    if (qualiRes.ok) {
      const qualiData = await qualiRes.json()
      results.qualifying = qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults || []
    }
  } catch (e) {
    console.error('Quali fetch error:', e)
  }
  
  // Sprint
  try {
    const sprintRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${round}/sprint/`, { 
      next: { revalidate: 300 },
      headers: { 'Accept': 'application/json' }
    })
    if (sprintRes.ok) {
      const sprintData = await sprintRes.json()
      results.sprint = sprintData.MRData?.RaceTable?.Races?.[0]?.SprintResults || []
    }
  } catch (e) {
    console.error('Sprint fetch error:', e)
  }
  
  // Race
  try {
    const raceRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${round}/results/`, { 
      next: { revalidate: 300 },
      headers: { 'Accept': 'application/json' }
    })
    if (raceRes.ok) {
      const raceData = await raceRes.json()
      results.race = raceData.MRData?.RaceTable?.Races?.[0]?.Results || []
    }
  } catch (e) {
    console.error('Race fetch error:', e)
  }
  
  return NextResponse.json(results)
}




import { NextResponse } from 'next/server'

// API Route um CORS zu umgehen - cached für 5 Minuten
export async function GET(
  request: Request,
  { params }: { params: Promise<{ round: string }> }
) {
  const { round } = await params
  
  try {
    const res = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${round}.json`, {
      next: { revalidate: 300 } // 5 Minuten Cache
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'API nicht erreichbar' }, { status: 500 })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Fehler beim Laden der Renndetails:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}






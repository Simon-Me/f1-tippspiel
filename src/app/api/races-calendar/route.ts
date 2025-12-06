import { NextResponse } from 'next/server'

// API Route um CORS zu umgehen - cached für 5 Minuten
export async function GET() {
  try {
    const res = await fetch('https://api.jolpi.ca/ergast/f1/2025.json', {
      next: { revalidate: 300 } // 5 Minuten Cache
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'API nicht erreichbar' }, { status: 500 })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Fehler beim Laden der Rennen:', error)
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
  }
}






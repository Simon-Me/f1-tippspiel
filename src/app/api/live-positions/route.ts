import { NextResponse } from 'next/server'

// Server-side cache
let cachedData: {
  positions: LivePosition[]
  sessionInfo: SessionInfo | null
  timestamp: number
} | null = null

const CACHE_DURATION = 2 * 60 * 1000 // 2 Minuten Cache

interface LivePosition {
  position: number
  driver_number: number
  full_name?: string
  name_acronym?: string
}

interface SessionInfo {
  session_key: number
  session_name: string
  session_type: string
  meeting_name: string
  date_start: string
  date_end: string
}

interface OpenF1Position {
  position: number
  driver_number: number
}

interface OpenF1Driver {
  driver_number: number
  full_name: string
  name_acronym: string
}

interface OpenF1Session {
  session_key: number
  session_name: string
  session_type: string
  meeting_name: string
  date_start: string
  date_end: string
}

export async function GET() {
  try {
    const now = Date.now()
    
    // Cache noch gültig?
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        cacheAge: Math.round((now - cachedData.timestamp) / 1000)
      })
    }
    
    // Aktuelle Session finden
    const sessionRes = await fetch('https://api.openf1.org/v1/sessions?session_key=latest', {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 } // Next.js cache für 2 min
    })
    
    if (!sessionRes.ok) {
      // Fallback: Cached data wenn vorhanden
      if (cachedData) {
        return NextResponse.json({
          ...cachedData,
          fromCache: true,
          stale: true
        })
      }
      return NextResponse.json({ 
        positions: [], 
        sessionInfo: null, 
        error: 'Session nicht gefunden' 
      })
    }
    
    const sessions: OpenF1Session[] = await sessionRes.json()
    const latestSession = Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null
    
    if (!latestSession) {
      return NextResponse.json({ 
        positions: [], 
        sessionInfo: null, 
        error: 'Keine aktive Session' 
      })
    }
    
    // Prüfen ob Session aktiv ist (innerhalb der letzten 4 Stunden)
    const sessionEnd = new Date(latestSession.date_end || latestSession.date_start)
    const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000)
    const isActive = sessionEnd > fourHoursAgo
    
    if (!isActive) {
      cachedData = {
        positions: [],
        sessionInfo: latestSession,
        timestamp: now
      }
      return NextResponse.json({
        positions: [],
        sessionInfo: latestSession,
        isActive: false,
        message: 'Keine aktive Session gerade'
      })
    }
    
    // Live-Positionen holen
    const [positionsRes, driversRes] = await Promise.all([
      fetch(`https://api.openf1.org/v1/position?session_key=${latestSession.session_key}`, {
        headers: { 'Accept': 'application/json' }
      }),
      fetch(`https://api.openf1.org/v1/drivers?session_key=${latestSession.session_key}`, {
        headers: { 'Accept': 'application/json' }
      })
    ])
    
    let positions: LivePosition[] = []
    let drivers: OpenF1Driver[] = []
    
    if (positionsRes.ok) {
      const posData: OpenF1Position[] = await positionsRes.json()
      if (Array.isArray(posData)) {
        // Nur die neuesten Positionen pro Fahrer
        const latestPositions = new Map<number, number>()
        posData.forEach(p => {
          if (p.driver_number && p.position) {
            latestPositions.set(p.driver_number, p.position)
          }
        })
        
        // In sortiertes Array umwandeln
        positions = Array.from(latestPositions.entries())
          .map(([driver_number, position]) => ({ driver_number, position }))
          .sort((a, b) => a.position - b.position)
      }
    }
    
    if (driversRes.ok) {
      const driverData = await driversRes.json()
      if (Array.isArray(driverData)) {
        drivers = driverData
      }
    }
    
    // Fahrernamen hinzufügen
    positions = positions.map(p => {
      const driver = drivers.find(d => d.driver_number === p.driver_number)
      return {
        ...p,
        full_name: driver?.full_name,
        name_acronym: driver?.name_acronym
      }
    })
    
    // Cache aktualisieren
    cachedData = {
      positions,
      sessionInfo: latestSession,
      timestamp: now
    }
    
    return NextResponse.json({
      positions,
      sessionInfo: latestSession,
      isActive: true,
      fromCache: false,
      timestamp: now
    })
    
  } catch (error) {
    console.error('Error fetching live positions:', error)
    
    // Fallback auf cache
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        error: 'API Error - using cache'
      })
    }
    
    return NextResponse.json({ 
      positions: [], 
      sessionInfo: null, 
      error: 'Fehler beim Laden der Live-Daten' 
    }, { status: 500 })
  }
}









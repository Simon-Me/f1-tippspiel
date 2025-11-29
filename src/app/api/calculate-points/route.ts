import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Points system
const POINTS = {
  P1_CORRECT: 25,
  P2_CORRECT: 18,
  P3_CORRECT: 15,
  DRIVER_ON_PODIUM: 5,  // Fahrer auf Podium, aber falscher Platz
  FASTEST_LAP: 10,
  POLE_POSITION: 8,
  PERFECT_PODIUM_BONUS: 20,
}

interface RaceResult {
  position: string
  Driver: {
    code: string
    permanentNumber?: string
  }
  FastestLap?: {
    rank: string
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { raceId } = body

    // Hole letztes Rennergebnis von Jolpica API
    const response = await fetch('https://api.jolpi.ca/ergast/f1/current/last/results/')
    if (!response.ok) {
      return NextResponse.json({ error: 'Could not fetch race results' }, { status: 500 })
    }

    const data = await response.json()
    const raceData = data.MRData?.RaceTable?.Races?.[0]
    
    if (!raceData || !raceData.Results) {
      return NextResponse.json({ error: 'No race results found' }, { status: 404 })
    }

    const results: RaceResult[] = raceData.Results
    const raceName = raceData.raceName
    const raceRound = parseInt(raceData.round)

    // Finde P1, P2, P3 Fahrernummern
    const p1Driver = results.find(r => r.position === '1')
    const p2Driver = results.find(r => r.position === '2')
    const p3Driver = results.find(r => r.position === '3')
    const fastestLapDriver = results.find(r => r.FastestLap?.rank === '1')

    // Fahrernummern aus der Driver Info extrahieren
    // Jolpica gibt permanentNumber, wir brauchen es als Nummer
    const DRIVER_NUMBER_MAP: Record<string, number> = {
      'VER': 1, 'NOR': 4, 'LEC': 16, 'PIA': 81, 'SAI': 55,
      'RUS': 63, 'HAM': 44, 'ALO': 14, 'STR': 18, 'HUL': 27,
      'ANT': 12, 'GAS': 10, 'TSU': 22, 'OCO': 31, 'ALB': 23,
      'BOT': 77, 'ZHO': 24, 'MAG': 20, 'LAW': 30, 'HAD': 6,
      'BEA': 87, 'DOO': 7, 'COL': 43
    }

    const p1Num = p1Driver ? DRIVER_NUMBER_MAP[p1Driver.Driver.code] || parseInt(p1Driver.Driver.permanentNumber || '0') : null
    const p2Num = p2Driver ? DRIVER_NUMBER_MAP[p2Driver.Driver.code] || parseInt(p2Driver.Driver.permanentNumber || '0') : null
    const p3Num = p3Driver ? DRIVER_NUMBER_MAP[p3Driver.Driver.code] || parseInt(p3Driver.Driver.permanentNumber || '0') : null
    const flNum = fastestLapDriver ? DRIVER_NUMBER_MAP[fastestLapDriver.Driver.code] || parseInt(fastestLapDriver.Driver.permanentNumber || '0') : null

    // Finde das entsprechende Rennen in unserer DB
    let dbRaceId = raceId
    if (!dbRaceId) {
      const { data: raceRow } = await supabase
        .from('races')
        .select('id')
        .eq('season', 2025)
        .eq('round', raceRound)
        .maybeSingle()
      
      dbRaceId = raceRow?.id
    }

    if (!dbRaceId) {
      return NextResponse.json({ 
        error: 'Race not found in database',
        raceRound,
        raceName 
      }, { status: 404 })
    }

    // Hole alle Predictions für dieses Rennen
    const { data: predictions, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .eq('race_id', dbRaceId)
      .eq('session_type', 'race')

    if (predError) {
      return NextResponse.json({ error: predError.message }, { status: 500 })
    }

    const podium = [p1Num, p2Num, p3Num].filter(n => n !== null)
    const updates: { id: string; points: number; userId: string }[] = []

    // Berechne Punkte für jede Prediction
    for (const pred of predictions || []) {
      let points = 0

      // P1 korrekt
      if (pred.p1_driver && pred.p1_driver === p1Num) {
        points += POINTS.P1_CORRECT
      } else if (pred.p1_driver && podium.includes(pred.p1_driver)) {
        points += POINTS.DRIVER_ON_PODIUM
      }

      // P2 korrekt
      if (pred.p2_driver && pred.p2_driver === p2Num) {
        points += POINTS.P2_CORRECT
      } else if (pred.p2_driver && podium.includes(pred.p2_driver)) {
        points += POINTS.DRIVER_ON_PODIUM
      }

      // P3 korrekt
      if (pred.p3_driver && pred.p3_driver === p3Num) {
        points += POINTS.P3_CORRECT
      } else if (pred.p3_driver && podium.includes(pred.p3_driver)) {
        points += POINTS.DRIVER_ON_PODIUM
      }

      // Perfektes Podium Bonus (1-2-3 alle korrekt)
      if (pred.p1_driver === p1Num && pred.p2_driver === p2Num && pred.p3_driver === p3Num) {
        points += POINTS.PERFECT_PODIUM_BONUS
      }

      // Fastest Lap
      if (pred.fastest_lap_driver && pred.fastest_lap_driver === flNum) {
        points += POINTS.FASTEST_LAP
      }

      updates.push({ 
        id: pred.id, 
        points, 
        userId: pred.user_id 
      })
    }

    // Update alle Predictions
    for (const update of updates) {
      await supabase
        .from('predictions')
        .update({ points_earned: update.points })
        .eq('id', update.id)
    }

    // Update User Gesamtpunkte
    const userIds = [...new Set(updates.map(u => u.userId))]
    for (const userId of userIds) {
      const { data: userPreds } = await supabase
        .from('predictions')
        .select('points_earned')
        .eq('user_id', userId)

      const totalPoints = userPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0
      const predCount = userPreds?.length || 0

      await supabase
        .from('profiles')
        .update({ 
          total_points: totalPoints,
          predictions_count: predCount
        })
        .eq('id', userId)
    }

    return NextResponse.json({
      success: true,
      raceName,
      raceRound,
      results: {
        p1: p1Driver?.Driver.code,
        p2: p2Driver?.Driver.code,
        p3: p3Driver?.Driver.code,
        fastestLap: fastestLapDriver?.Driver.code
      },
      predictionsUpdated: updates.length,
      pointsAwarded: updates.map(u => ({ id: u.id, points: u.points }))
    })

  } catch (error) {
    console.error('Points calculation error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


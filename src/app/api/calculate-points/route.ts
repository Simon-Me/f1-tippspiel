import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Verwende Service Role Key für volle DB-Rechte (falls vorhanden)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Points system
const POINTS = {
  // Race
  RACE_P1: 25,
  RACE_P2: 18,
  RACE_P3: 15,
  RACE_ON_PODIUM: 5,
  RACE_FASTEST_LAP: 10,
  RACE_PERFECT_BONUS: 20,
  // Sprint
  SPRINT_P1: 15,
  SPRINT_P2: 10,
  SPRINT_P3: 5,
  // Qualifying
  QUALI_POLE: 10,
}

const DRIVER_NUMBER_MAP: Record<string, number> = {
  'VER': 1, 'NOR': 4, 'LEC': 16, 'PIA': 81, 'SAI': 55,
  'RUS': 63, 'HAM': 44, 'ALO': 14, 'STR': 18, 'HUL': 27,
  'ANT': 12, 'GAS': 10, 'TSU': 22, 'OCO': 31, 'ALB': 23,
  'BOT': 77, 'ZHO': 24, 'MAG': 20, 'LAW': 30, 'HAD': 6,
  'BEA': 87, 'DOO': 7, 'COL': 43, 'BOR': 5
}

function getDriverNumber(code: string, permanentNumber?: string): number {
  return DRIVER_NUMBER_MAP[code] || parseInt(permanentNumber || '0')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { sessionType = 'all', round } = body

    // Bestimme welche Runde berechnet werden soll
    let raceRound = round
    
    if (!raceRound) {
      // Suche aktuelles/letztes Rennen in der DB (letzte 3 Tage)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const { data: currentRace } = await supabase
        .from('races')
        .select('round')
        .eq('season', 2025)
        .gte('race_date', threeDaysAgo)
        .order('race_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (currentRace) {
        raceRound = currentRace.round
      } else {
        // Fallback: Hole letzte Runde aus API
        const lastRes = await fetch('https://api.jolpi.ca/ergast/f1/current/last/results/')
        const lastData = await lastRes.json()
        raceRound = parseInt(lastData.MRData?.RaceTable?.Races?.[0]?.round || '0')
      }
    }

    if (!raceRound) {
      return NextResponse.json({ error: 'Could not determine race round' }, { status: 400 })
    }
    
    console.log('Calculating points for round:', raceRound)

    const results: {
      qualifying?: { pole: string | null, points: number[] }
      sprint?: { p1: string | null, p2: string | null, p3: string | null, points: number[] }
      race?: { p1: string | null, p2: string | null, p3: string | null, fl: string | null, points: number[] }
    } = {}

    // Finde Rennen in DB
    const { data: dbRace, error: dbError } = await supabase
      .from('races')
      .select('id, race_name')
      .eq('season', 2025)
      .eq('round', raceRound)
      .maybeSingle()

    console.log('Looking for race round:', raceRound, 'Found:', dbRace, 'Error:', dbError)

    if (!dbRace) {
      return NextResponse.json({ 
        error: 'Race not found in database', 
        round: raceRound,
        dbError: dbError?.message 
      }, { status: 404 })
    }

    // === QUALIFYING ===
    if (sessionType === 'all' || sessionType === 'qualifying') {
      try {
        const qualiRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/qualifying/`)
        const qualiData = await qualiRes.json()
        const qualiResults = qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults

        if (qualiResults && qualiResults.length > 0) {
          const pole = qualiResults[0]
          const poleNum = getDriverNumber(pole.Driver.code, pole.Driver.permanentNumber)

          // Hole alle Qualifying Predictions
          const { data: predictions } = await supabase
            .from('predictions')
            .select('*')
            .eq('race_id', dbRace.id)
            .eq('session_type', 'qualifying')

          const pointsAwarded: number[] = []

          for (const pred of predictions || []) {
            let points = 0
            if (pred.pole_driver === poleNum) {
              points = POINTS.QUALI_POLE
            }
            pointsAwarded.push(points)

            await supabase
              .from('predictions')
              .update({ points_earned: points })
              .eq('id', pred.id)
          }

          results.qualifying = { pole: pole.Driver.code, points: pointsAwarded }
        }
      } catch (e) {
        console.error('Qualifying error:', e)
      }
    }

    // === SPRINT ===
    if (sessionType === 'all' || sessionType === 'sprint') {
      try {
        const sprintRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/sprint/`)
        const sprintData = await sprintRes.json()
        const sprintResults = sprintData.MRData?.RaceTable?.Races?.[0]?.SprintResults

        if (sprintResults && sprintResults.length > 0) {
          const p1 = sprintResults.find((r: { position: string }) => r.position === '1')
          const p2 = sprintResults.find((r: { position: string }) => r.position === '2')
          const p3 = sprintResults.find((r: { position: string }) => r.position === '3')

          const p1Num = p1 ? getDriverNumber(p1.Driver.code, p1.Driver.permanentNumber) : null
          const p2Num = p2 ? getDriverNumber(p2.Driver.code, p2.Driver.permanentNumber) : null
          const p3Num = p3 ? getDriverNumber(p3.Driver.code, p3.Driver.permanentNumber) : null

          // Hole alle Sprint Predictions
          const { data: predictions } = await supabase
            .from('predictions')
            .select('*')
            .eq('race_id', dbRace.id)
            .eq('session_type', 'sprint')

          const pointsAwarded: number[] = []

          for (const pred of predictions || []) {
            let points = 0
            if (pred.p1_driver === p1Num) points += POINTS.SPRINT_P1
            if (pred.p2_driver === p2Num) points += POINTS.SPRINT_P2
            if (pred.p3_driver === p3Num) points += POINTS.SPRINT_P3
            pointsAwarded.push(points)

            await supabase
              .from('predictions')
              .update({ points_earned: points })
              .eq('id', pred.id)
          }

          results.sprint = {
            p1: p1?.Driver.code || null,
            p2: p2?.Driver.code || null,
            p3: p3?.Driver.code || null,
            points: pointsAwarded
          }
        }
      } catch (e) {
        console.error('Sprint error:', e)
      }
    }

    // === RACE ===
    if (sessionType === 'all' || sessionType === 'race') {
      try {
        const raceRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/results/`)
        const raceData = await raceRes.json()
        const raceResults = raceData.MRData?.RaceTable?.Races?.[0]?.Results

        if (raceResults && raceResults.length > 0) {
          const p1 = raceResults.find((r: { position: string }) => r.position === '1')
          const p2 = raceResults.find((r: { position: string }) => r.position === '2')
          const p3 = raceResults.find((r: { position: string }) => r.position === '3')
          const fl = raceResults.find((r: { FastestLap?: { rank: string } }) => r.FastestLap?.rank === '1')

          const p1Num = p1 ? getDriverNumber(p1.Driver.code, p1.Driver.permanentNumber) : null
          const p2Num = p2 ? getDriverNumber(p2.Driver.code, p2.Driver.permanentNumber) : null
          const p3Num = p3 ? getDriverNumber(p3.Driver.code, p3.Driver.permanentNumber) : null
          const flNum = fl ? getDriverNumber(fl.Driver.code, fl.Driver.permanentNumber) : null
          const podium = [p1Num, p2Num, p3Num].filter(n => n !== null)

          // Hole alle Race Predictions
          const { data: predictions } = await supabase
            .from('predictions')
            .select('*')
            .eq('race_id', dbRace.id)
            .eq('session_type', 'race')

          const pointsAwarded: number[] = []

          for (const pred of predictions || []) {
            let points = 0

            // P1
            if (pred.p1_driver === p1Num) {
              points += POINTS.RACE_P1
            } else if (pred.p1_driver && podium.includes(pred.p1_driver)) {
              points += POINTS.RACE_ON_PODIUM
            }

            // P2
            if (pred.p2_driver === p2Num) {
              points += POINTS.RACE_P2
            } else if (pred.p2_driver && podium.includes(pred.p2_driver)) {
              points += POINTS.RACE_ON_PODIUM
            }

            // P3
            if (pred.p3_driver === p3Num) {
              points += POINTS.RACE_P3
            } else if (pred.p3_driver && podium.includes(pred.p3_driver)) {
              points += POINTS.RACE_ON_PODIUM
            }

            // Perfect Podium Bonus
            if (pred.p1_driver === p1Num && pred.p2_driver === p2Num && pred.p3_driver === p3Num) {
              points += POINTS.RACE_PERFECT_BONUS
            }

            // Fastest Lap
            if (pred.fastest_lap_driver === flNum) {
              points += POINTS.RACE_FASTEST_LAP
            }

            pointsAwarded.push(points)

            await supabase
              .from('predictions')
              .update({ points_earned: points })
              .eq('id', pred.id)
          }

          results.race = {
            p1: p1?.Driver.code || null,
            p2: p2?.Driver.code || null,
            p3: p3?.Driver.code || null,
            fl: fl?.Driver.code || null,
            points: pointsAwarded
          }
        }
      } catch (e) {
        console.error('Race error:', e)
      }
    }

    // Update alle User Gesamtpunkte
    const { data: allProfiles } = await supabase.from('profiles').select('id')
    
    let updatedProfiles = 0
    for (const profile of allProfiles || []) {
      const { data: userPreds } = await supabase
        .from('predictions')
        .select('points_earned')
        .eq('user_id', profile.id)

      const totalPoints = userPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0
      const predCount = userPreds?.length || 0

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          total_points: totalPoints,
          predictions_count: predCount
        })
        .eq('id', profile.id)
      
      if (!updateError) updatedProfiles++
    }

    // Markiere Rennen als finished
    await supabase
      .from('races')
      .update({ status: 'finished' })
      .eq('id', dbRace.id)

    console.log('Points calculated:', {
      round: raceRound,
      raceName: dbRace.race_name,
      profilesUpdated: updatedProfiles,
      results
    })

    return NextResponse.json({
      success: true,
      round: raceRound,
      raceName: dbRace.race_name,
      profilesUpdated: updatedProfiles,
      results
    })

  } catch (error) {
    console.error('Points calculation error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

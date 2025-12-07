import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Neues Punktesystem (vereinfacht)
const POINTS = {
  // Qualifikation
  QUALI_POLE: 3,        // Richtiger Pole-Tipp (nur exakt!)
  
  // Sprintrennen
  SPRINT_P1: 3,         // Richtiger P1
  SPRINT_P2: 2,         // Richtiger P2
  SPRINT_P3: 1,         // Richtiger P3
  SPRINT_ON_PODIUM: 1,  // Richtiger Name, falscher Podiumsplatz
  
  // Hauptrennen
  RACE_P1: 5,           // Richtiger P1
  RACE_P2: 4,           // Richtiger P2
  RACE_P3: 3,           // Richtiger P3
  RACE_ON_PODIUM: 1,    // Richtiger Name, falscher Podiumsplatz
  
  // Fastest Lap
  FASTEST_LAP: 1,       // Bonuspunkt für schnellste Runde
}

const DRIVER_NUMBER_MAP: Record<string, number> = {
  'VER': 1, 'NOR': 4, 'LEC': 16, 'PIA': 81, 'SAI': 55,
  'RUS': 63, 'HAM': 44, 'ALO': 14, 'STR': 18, 'HUL': 27,
  'ANT': 12, 'GAS': 10, 'TSU': 22, 'OCO': 31, 'ALB': 23,
  'BOT': 77, 'ZHO': 24, 'MAG': 20, 'LAW': 30, 'HAD': 6,
  'BEA': 87, 'DOO': 7, 'COL': 43, 'BOR': 5
}

function getDriverNumber(code: string, permanentNumber?: string): number {
  if (DRIVER_NUMBER_MAP[code]) return DRIVER_NUMBER_MAP[code]
  return parseInt(permanentNumber || '0')
}

// Berechne Punkte für ein einzelnes Rennen
async function calculateRacePoints(raceRound: number, dbRaceId: string) {
  const results: {
    qualifying?: { pole: string | null, calculated: boolean }
    sprint?: { p1: string | null, p2: string | null, p3: string | null, calculated: boolean }
    race?: { p1: string | null, p2: string | null, p3: string | null, fl: string | null, calculated: boolean }
  } = {}

  // === QUALIFYING ===
  try {
    const qualiRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/qualifying/`)
    const qualiData = await qualiRes.json()
    const qualiResults = qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults

    if (qualiResults?.length > 0) {
      const pole = qualiResults[0]
      const poleNum = getDriverNumber(pole.Driver.code, pole.Driver.permanentNumber)

      const { data: predictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('race_id', dbRaceId)
        .eq('session_type', 'qualifying')

      for (const pred of predictions || []) {
        // Nur exakter Pole-Tipp gibt Punkte
        const points = pred.pole_driver === poleNum ? POINTS.QUALI_POLE : 0
        await supabase.from('predictions').update({ points_earned: points }).eq('id', pred.id)
      }

      results.qualifying = { pole: pole.Driver.code, calculated: true }
    }
  } catch (e) { console.error('Quali error:', e) }

  // === SPRINT ===
  try {
    const sprintRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/sprint/`)
    const sprintData = await sprintRes.json()
    const sprintResults = sprintData.MRData?.RaceTable?.Races?.[0]?.SprintResults

    if (sprintResults?.length > 0) {
      const p1 = sprintResults.find((r: { position: string }) => r.position === '1')
      const p2 = sprintResults.find((r: { position: string }) => r.position === '2')
      const p3 = sprintResults.find((r: { position: string }) => r.position === '3')

      const p1Num = p1 ? getDriverNumber(p1.Driver.code, p1.Driver.permanentNumber) : null
      const p2Num = p2 ? getDriverNumber(p2.Driver.code, p2.Driver.permanentNumber) : null
      const p3Num = p3 ? getDriverNumber(p3.Driver.code, p3.Driver.permanentNumber) : null
      const sprintPodium = [p1Num, p2Num, p3Num].filter(n => n !== null)

      const { data: predictions } = await supabase
        .from('predictions')
        .select('*')
        .eq('race_id', dbRaceId)
        .eq('session_type', 'sprint')

      for (const pred of predictions || []) {
        let points = 0
        
        if (pred.p1_driver === p1Num) points += POINTS.SPRINT_P1
        else if (pred.p1_driver && sprintPodium.includes(pred.p1_driver)) points += POINTS.SPRINT_ON_PODIUM
        
        if (pred.p2_driver === p2Num) points += POINTS.SPRINT_P2
        else if (pred.p2_driver && sprintPodium.includes(pred.p2_driver)) points += POINTS.SPRINT_ON_PODIUM
        
        if (pred.p3_driver === p3Num) points += POINTS.SPRINT_P3
        else if (pred.p3_driver && sprintPodium.includes(pred.p3_driver)) points += POINTS.SPRINT_ON_PODIUM

        await supabase.from('predictions').update({ points_earned: points }).eq('id', pred.id)
      }

      results.sprint = { p1: p1?.Driver.code, p2: p2?.Driver.code, p3: p3?.Driver.code, calculated: true }
    }
  } catch (e) { console.error('Sprint error:', e) }

  // === RACE ===
  try {
    console.log(`[Race] Fetching results for round ${raceRound}`)
    const raceRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/results/`)
    const raceData = await raceRes.json()
    const raceResults = raceData.MRData?.RaceTable?.Races?.[0]?.Results

    console.log(`[Race] Found ${raceResults?.length || 0} results`)

    if (raceResults?.length > 0) {
      const p1 = raceResults.find((r: { position: string }) => r.position === '1')
      const p2 = raceResults.find((r: { position: string }) => r.position === '2')
      const p3 = raceResults.find((r: { position: string }) => r.position === '3')
      const fl = raceResults.find((r: { FastestLap?: { rank: string } }) => r.FastestLap?.rank === '1')

      const p1Num = p1 ? getDriverNumber(p1.Driver.code, p1.Driver.permanentNumber) : null
      const p2Num = p2 ? getDriverNumber(p2.Driver.code, p2.Driver.permanentNumber) : null
      const p3Num = p3 ? getDriverNumber(p3.Driver.code, p3.Driver.permanentNumber) : null
      const flNum = fl ? getDriverNumber(fl.Driver.code, fl.Driver.permanentNumber) : null
      const podium = [p1Num, p2Num, p3Num].filter(n => n !== null)

      console.log(`[Race] Podium: P1=${p1Num} (${p1?.Driver.code}), P2=${p2Num} (${p2?.Driver.code}), P3=${p3Num} (${p3?.Driver.code}), FL=${flNum} (${fl?.Driver.code})`)

      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .eq('race_id', dbRaceId)
        .eq('session_type', 'race')

      console.log(`[Race] Found ${predictions?.length || 0} race predictions for race_id ${dbRaceId}`)
      if (predError) console.error('[Race] Prediction fetch error:', predError)

      for (const pred of predictions || []) {
        let points = 0

        // P1 Tipp
        if (pred.p1_driver === p1Num) points += POINTS.RACE_P1
        else if (pred.p1_driver && podium.includes(pred.p1_driver)) points += POINTS.RACE_ON_PODIUM

        // P2 Tipp
        if (pred.p2_driver === p2Num) points += POINTS.RACE_P2
        else if (pred.p2_driver && podium.includes(pred.p2_driver)) points += POINTS.RACE_ON_PODIUM

        // P3 Tipp
        if (pred.p3_driver === p3Num) points += POINTS.RACE_P3
        else if (pred.p3_driver && podium.includes(pred.p3_driver)) points += POINTS.RACE_ON_PODIUM

        // Fastest Lap Bonus
        if (pred.fastest_lap_driver === flNum) points += POINTS.FASTEST_LAP

        console.log(`[Race] Prediction ${pred.id} by user ${pred.user_id}: Tips=${pred.p1_driver},${pred.p2_driver},${pred.p3_driver},${pred.fastest_lap_driver} → ${points} points`)
        
        const { data: updateData, error: updateError } = await supabase
          .from('predictions')
          .update({ points_earned: points })
          .eq('id', pred.id)
          .select()
        
        if (updateError) {
          console.error(`[Race] Update error for prediction ${pred.id}:`, updateError)
        } else {
          console.log(`[Race] ✓ Updated prediction ${pred.id}, result:`, updateData)
          
          // Verify the update
          const { data: verify } = await supabase.from('predictions').select('points_earned').eq('id', pred.id).single()
          console.log(`[Race] Verify prediction ${pred.id}: points_earned = ${verify?.points_earned}`)
        }
      }

      results.race = { p1: p1?.Driver.code, p2: p2?.Driver.code, p3: p3?.Driver.code, fl: fl?.Driver.code, calculated: true }
    }
  } catch (e) { console.error('Race error:', e) }

  return results
}

// Update alle Benutzer-Gesamtpunkte
async function updateAllProfiles() {
  const { data: allProfiles, error: fetchError } = await supabase.from('profiles').select('id, username, coins, total_points')
  if (fetchError) console.error('[UpdateProfiles] Fetch error:', fetchError)
  
  console.log(`[UpdateProfiles] Processing ${allProfiles?.length || 0} profiles`)
  
  let updated = 0
  for (const profile of allProfiles || []) {
    const { data: userPreds, error: predError } = await supabase
      .from('predictions')
      .select('points_earned')
      .eq('user_id', profile.id)

    if (predError) console.error(`[UpdateProfiles] Pred fetch error for ${profile.username}:`, predError)

    const newTotalPoints = userPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0
    const predCount = userPreds?.length || 0
    
    console.log(`[UpdateProfiles] ${profile.username}: ${userPreds?.length || 0} predictions, old=${profile.total_points}, new=${newTotalPoints}`)
    
    const oldTotalPoints = profile.total_points || 0
    const pointsDiff = Math.max(0, newTotalPoints - oldTotalPoints)
    const coinsDiff = pointsDiff * 10
    const newCoins = (profile.coins || 0) + coinsDiff

    const { error } = await supabase
      .from('profiles')
      .update({ total_points: newTotalPoints, predictions_count: predCount, coins: newCoins })
      .eq('id', profile.id)
    
    if (error) console.error(`[UpdateProfiles] Update error for ${profile.username}:`, error)
    else {
      console.log(`[UpdateProfiles] ✓ ${profile.username} updated to ${newTotalPoints} points`)
      updated++
    }
  }
  
  return updated
}

// HAUPT-ROUTE: Automatisch alle unberechneten Rennen finden und berechnen
export async function GET(request: Request) {
  console.log('[API] calculate-points called')
  
  try {
    const { searchParams } = new URL(request.url)
    const forceRound = searchParams.get('round')
    const recalcAll = searchParams.get('recalc') === 'all'
    const roundsParam = searchParams.get('rounds') // z.B. "23,24" für mehrere Runden
    
    console.log('[API] Params:', { forceRound, recalcAll, roundsParam })
  
  // KOMPLETT NEU BERECHNEN: ?recalc=all
  if (recalcAll) {
    console.log('[Recalc] Starting full recalculation with new points system...')
    
    try {
      // WICHTIG: Wir setzen Punkte NICHT mehr global auf 0!
      // Stattdessen berechnen wir jedes Rennen einzeln und updaten die Punkte
      
      // Alle vergangenen Rennen neu berechnen (nur die mit Tipps)
      const today = new Date().toISOString().split('T')[0]
      const { data: pastRaces, error: fetchError } = await supabase
        .from('races')
        .select('id, round, race_name')
        .eq('season', 2025)
        .lte('race_date', today)
        .order('round', { ascending: true })
      
      if (fetchError) {
        console.error('Fetch races error:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch races', details: fetchError }, { status: 500 })
      }
      
      const results: { round: number, name: string, quali: boolean, sprint: boolean, race: boolean }[] = []
      
      for (const race of pastRaces || []) {
        console.log(`[Recalc] Processing Round ${race.round}: ${race.race_name}`)
        const calcResult = await calculateRacePoints(race.round, race.id)
        
        // Markiere als finished wenn mindestens Race oder Quali berechnet wurde
        const hasResults = calcResult.race?.calculated || calcResult.qualifying?.calculated
        if (hasResults) {
          await supabase.from('races').update({ status: 'finished' }).eq('id', race.id)
        }
        
        results.push({ 
          round: race.round, 
          name: race.race_name, 
          quali: !!calcResult.qualifying?.calculated,
          sprint: !!calcResult.sprint?.calculated,
          race: !!calcResult.race?.calculated
        })
      }
      
      // 3. Profile-Punkte aktualisieren (OHNE Coins-Diff - nur Punkte zählen)
      const { data: allProfiles } = await supabase.from('profiles').select('id')
      let profilesUpdated = 0
      
      for (const profile of allProfiles || []) {
        const { data: userPreds } = await supabase
          .from('predictions')
          .select('points_earned')
          .eq('user_id', profile.id)

        const totalPoints = userPreds?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0
        const predCount = userPreds?.length || 0
        
        await supabase
          .from('profiles')
          .update({ total_points: totalPoints, predictions_count: predCount })
          .eq('id', profile.id)
        
        profilesUpdated++
      }
      
      return NextResponse.json({
        success: true,
        mode: 'recalc_all',
        racesProcessed: results.length,
        races: results,
        profilesUpdated,
        timestamp: new Date().toISOString()
      })
    } catch (err) {
      console.error('[Recalc] Error:', err)
      return NextResponse.json({ error: 'Recalc failed', details: String(err) }, { status: 500 })
    }
  }
  
  // Mehrere spezifische Runden berechnen (z.B. ?rounds=23,24)
  if (roundsParam) {
    const rounds = roundsParam.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r))
    console.log(`[Multi-Calc] Processing rounds: ${rounds.join(', ')}`)
    
    const results: { round: number, name: string, quali: boolean, sprint: boolean, race: boolean }[] = []
    
    for (const round of rounds) {
      const { data: dbRace } = await supabase
        .from('races')
        .select('id, race_name')
        .eq('season', 2025)
        .eq('round', round)
        .maybeSingle()
      
      if (dbRace) {
        console.log(`[Multi-Calc] Processing Round ${round}: ${dbRace.race_name}`)
        const calcResult = await calculateRacePoints(round, dbRace.id)
        
        if (calcResult.race?.calculated || calcResult.qualifying?.calculated) {
          await supabase.from('races').update({ status: 'finished' }).eq('id', dbRace.id)
        }
        
        results.push({
          round,
          name: dbRace.race_name,
          quali: !!calcResult.qualifying?.calculated,
          sprint: !!calcResult.sprint?.calculated,
          race: !!calcResult.race?.calculated
        })
      }
    }
    
    const profilesUpdated = await updateAllProfiles()
    
    return NextResponse.json({
      success: true,
      mode: 'multi',
      rounds,
      races: results,
      profilesUpdated
    })
  }
  
  // Wenn eine spezifische Runde angegeben, nur diese berechnen
  if (forceRound) {
    const round = parseInt(forceRound)
    console.log(`[Single-Calc] Starting calculation for round ${round}`)
    
    const { data: dbRace } = await supabase
      .from('races')
      .select('id, race_name')
      .eq('season', 2025)
      .eq('round', round)
      .maybeSingle()
    
    if (!dbRace) {
      console.log(`[Single-Calc] Race not found for round ${round}`)
      return NextResponse.json({ error: 'Race not found', round }, { status: 404 })
    }
    
    console.log(`[Single-Calc] Found race: ${dbRace.race_name} (ID: ${dbRace.id})`)
    
    const results = await calculateRacePoints(round, dbRace.id)
    console.log(`[Single-Calc] Calculation results:`, JSON.stringify(results))
    
    if (results.race?.calculated) {
      await supabase.from('races').update({ status: 'finished' }).eq('id', dbRace.id)
      console.log(`[Single-Calc] Marked race as finished`)
    }
    
    const profilesUpdated = await updateAllProfiles()
    console.log(`[Single-Calc] Updated ${profilesUpdated} profiles`)
    
    const response = { 
      success: true, 
      mode: 'single',
      round, 
      raceName: dbRace.race_name,
      results,
      profilesUpdated
    }
    console.log(`[Single-Calc] Returning:`, JSON.stringify(response))
    
    return NextResponse.json(response)
  }
  
  // AUTOMATISCHER MODUS: Finde alle Rennen die noch nicht "finished" sind
  const today = new Date().toISOString().split('T')[0]
  
  const { data: pendingRaces } = await supabase
    .from('races')
    .select('id, round, race_name, race_date, status')
    .eq('season', 2025)
    .lte('race_date', today) // Nur Rennen in der Vergangenheit
    .or('status.is.null,status.neq.finished')
    .order('round', { ascending: true })
  
  console.log(`[Auto-Calc] Found ${pendingRaces?.length || 0} pending races`)
  
  if (!pendingRaces || pendingRaces.length === 0) {
    return NextResponse.json({ 
      success: true, 
      mode: 'auto',
      message: 'No pending races to calculate',
      timestamp: new Date().toISOString()
    })
  }
  
  const calculated: { round: number, name: string, results: object }[] = []
  
  for (const race of pendingRaces) {
    console.log(`[Auto-Calc] Processing Round ${race.round}: ${race.race_name}`)
    
    const results = await calculateRacePoints(race.round, race.id)
    
    // Wenn das Rennen berechnet wurde, markiere als finished
    if (results.race?.calculated) {
      await supabase.from('races').update({ status: 'finished' }).eq('id', race.id)
      calculated.push({ round: race.round, name: race.race_name, results })
      console.log(`[Auto-Calc] ✓ Round ${race.round} finished`)
    }
  }
  
  // Update alle Profile einmal am Ende
  const profilesUpdated = await updateAllProfiles()
  
  return NextResponse.json({
    success: true,
    mode: 'auto',
    timestamp: new Date().toISOString(),
    pendingChecked: pendingRaces.length,
    calculated: calculated.length,
    races: calculated,
    profilesUpdated
  })
  } catch (error) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // POST verhält sich wie GET ohne Parameter
  return GET(request)
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Punkte-System für Bonus-Tipps
const BONUS_POINTS = {
  safety_car: 5,
  red_flag: 10,
  rain: 8,
  first_dnf: 15,
  driver_of_day: 10,
  most_overtakes: 10,
  total_dnfs: 5, // ±1 Toleranz
}

// Punkte-System für Saison-Tipps
const SEASON_POINTS = {
  wdc_p1: 100,
  wdc_p2: 50,
  wdc_p3: 30,
  wdc_on_podium: 15, // Fahrer auf Podium aber falsche Position
  wcc_p1: 75,
  wcc_p2: 40,
  wcc_p3: 25,
  wcc_on_podium: 10,
  most_wins: 40,
  most_poles: 40,
  most_dnfs: 30,
  rookie_of_year: 50,
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { raceId, type } = body

    if (type === 'bonus' && raceId) {
      return calculateBonusPoints(raceId)
    } else if (type === 'season') {
      return calculateSeasonPoints()
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function calculateBonusPoints(raceId: number) {
  // Bonus-Ergebnisse laden
  const { data: results } = await supabase
    .from('bonus_results')
    .select('*')
    .eq('race_id', raceId)
    .single()

  if (!results) {
    return NextResponse.json({ error: 'No results found for this race' }, { status: 404 })
  }

  // Alle Bonus-Predictions für dieses Rennen laden
  const { data: predictions } = await supabase
    .from('bonus_predictions')
    .select('*')
    .eq('race_id', raceId)

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ message: 'No predictions to evaluate' })
  }

  let totalUpdated = 0

  for (const pred of predictions) {
    let points = 0

    // Safety Car
    if (pred.safety_car !== null && pred.safety_car === results.had_safety_car) {
      points += BONUS_POINTS.safety_car
    }

    // Red Flag
    if (pred.red_flag !== null && pred.red_flag === results.had_red_flag) {
      points += BONUS_POINTS.red_flag
    }

    // Rain
    if (pred.rain_during_race !== null && pred.rain_during_race === results.had_rain) {
      points += BONUS_POINTS.rain
    }

    // First DNF
    if (pred.first_dnf_driver && pred.first_dnf_driver === results.first_dnf_driver) {
      points += BONUS_POINTS.first_dnf
    }

    // Driver of Day
    if (pred.driver_of_day && pred.driver_of_day === results.driver_of_day) {
      points += BONUS_POINTS.driver_of_day
    }

    // Most Overtakes
    if (pred.most_overtakes_driver && pred.most_overtakes_driver === results.most_overtakes_driver) {
      points += BONUS_POINTS.most_overtakes
    }

    // Total DNFs (±1 Toleranz)
    if (pred.total_dnfs !== null && results.total_dnfs !== null) {
      if (Math.abs(pred.total_dnfs - results.total_dnfs) <= 1) {
        points += BONUS_POINTS.total_dnfs
      }
    }

    // Update prediction mit Punkten
    if (points > 0) {
      await supabase
        .from('bonus_predictions')
        .update({ points_earned: points })
        .eq('id', pred.id)

      // User Punkte aktualisieren
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, coins')
        .eq('id', pred.user_id)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            total_points: profile.total_points + points,
            coins: profile.coins + points * 10
          })
          .eq('id', pred.user_id)
      }

      totalUpdated++
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `Evaluated ${predictions.length} predictions, ${totalUpdated} users received points` 
  })
}

async function calculateSeasonPoints() {
  // Saison-Ergebnisse laden
  const { data: results } = await supabase
    .from('season_results')
    .select('*')
    .eq('season', 2025)
    .single()

  if (!results || !results.finalized) {
    return NextResponse.json({ error: 'Season results not finalized yet' }, { status: 400 })
  }

  // Alle Saison-Predictions laden
  const { data: predictions } = await supabase
    .from('season_predictions')
    .select('*')
    .eq('season', 2025)

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ message: 'No predictions to evaluate' })
  }

  let totalUpdated = 0

  for (const pred of predictions) {
    let points = 0

    // WDC Predictions
    if (pred.wdc_p1_driver === results.wdc_p1_driver) points += SEASON_POINTS.wdc_p1
    else if ([results.wdc_p1_driver, results.wdc_p2_driver, results.wdc_p3_driver].includes(pred.wdc_p1_driver)) {
      points += SEASON_POINTS.wdc_on_podium
    }

    if (pred.wdc_p2_driver === results.wdc_p2_driver) points += SEASON_POINTS.wdc_p2
    else if ([results.wdc_p1_driver, results.wdc_p2_driver, results.wdc_p3_driver].includes(pred.wdc_p2_driver)) {
      points += SEASON_POINTS.wdc_on_podium
    }

    if (pred.wdc_p3_driver === results.wdc_p3_driver) points += SEASON_POINTS.wdc_p3
    else if ([results.wdc_p1_driver, results.wdc_p2_driver, results.wdc_p3_driver].includes(pred.wdc_p3_driver)) {
      points += SEASON_POINTS.wdc_on_podium
    }

    // WCC Predictions
    if (pred.wcc_p1_team === results.wcc_p1_team) points += SEASON_POINTS.wcc_p1
    else if ([results.wcc_p1_team, results.wcc_p2_team, results.wcc_p3_team].includes(pred.wcc_p1_team)) {
      points += SEASON_POINTS.wcc_on_podium
    }

    if (pred.wcc_p2_team === results.wcc_p2_team) points += SEASON_POINTS.wcc_p2
    else if ([results.wcc_p1_team, results.wcc_p2_team, results.wcc_p3_team].includes(pred.wcc_p2_team)) {
      points += SEASON_POINTS.wcc_on_podium
    }

    if (pred.wcc_p3_team === results.wcc_p3_team) points += SEASON_POINTS.wcc_p3
    else if ([results.wcc_p1_team, results.wcc_p2_team, results.wcc_p3_team].includes(pred.wcc_p3_team)) {
      points += SEASON_POINTS.wcc_on_podium
    }

    // Bonus Stats
    if (pred.most_wins_driver === results.most_wins_driver) points += SEASON_POINTS.most_wins
    if (pred.most_poles_driver === results.most_poles_driver) points += SEASON_POINTS.most_poles
    if (pred.most_dnfs_driver === results.most_dnfs_driver) points += SEASON_POINTS.most_dnfs
    if (pred.rookie_of_year === results.rookie_of_year) points += SEASON_POINTS.rookie_of_year

    // Update prediction und Profil
    if (points > 0) {
      await supabase
        .from('season_predictions')
        .update({ points_earned: points })
        .eq('id', pred.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, coins')
        .eq('id', pred.user_id)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            total_points: profile.total_points + points,
            coins: profile.coins + points * 10
          })
          .eq('id', pred.user_id)
      }

      totalUpdated++
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `Evaluated ${predictions.length} season predictions, ${totalUpdated} users received points` 
  })
}

// GET zum manuellen Triggern
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const raceId = searchParams.get('raceId')

  if (type === 'bonus' && raceId) {
    return calculateBonusPoints(parseInt(raceId))
  } else if (type === 'season') {
    return calculateSeasonPoints()
  }

  return NextResponse.json({ 
    info: 'Use ?type=bonus&raceId=X or ?type=season to calculate points',
    bonus_points: BONUS_POINTS,
    season_points: SEASON_POINTS
  })
}


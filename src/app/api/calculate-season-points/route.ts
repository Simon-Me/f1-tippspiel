import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
}

// Driver Code zu Nummer Mapping
const DRIVER_CODE_TO_NUMBER: Record<string, number> = {
  'VER': 1, 'PER': 11, 'HAM': 44, 'RUS': 63,
  'LEC': 16, 'SAI': 55, 'NOR': 4, 'PIA': 81,
  'ALO': 14, 'STR': 18, 'GAS': 10, 'OCO': 31,
  'ALB': 23, 'SAR': 2, 'TSU': 22, 'RIC': 3,
  'BOT': 77, 'ZHO': 24, 'MAG': 20, 'HUL': 27,
  'LAW': 30, 'COL': 43, 'BEA': 87, 'HAD': 6,
  'DOO': 61, 'ANT': 12, 'BOR': 38,
}

export async function GET() {
  try {
    // 1. Aktuelle Standings von der API holen
    const [driverRes, constructorRes] = await Promise.all([
      fetch('https://api.jolpi.ca/ergast/f1/2025/driverStandings.json'),
      fetch('https://api.jolpi.ca/ergast/f1/2025/constructorStandings.json')
    ])

    const driverData = await driverRes.json()
    const constructorData = await constructorRes.json()

    const driverStandings = driverData.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []
    const constructorStandings = constructorData.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || []

    if (driverStandings.length === 0) {
      return NextResponse.json({ 
        error: 'Keine WM-Standings verfügbar',
        info: 'Die Saison hat noch nicht begonnen oder es gibt noch keine Ergebnisse.'
      }, { status: 400 })
    }

    // 2. Ergebnisse extrahieren
    const wdc_p1 = DRIVER_CODE_TO_NUMBER[driverStandings[0]?.Driver?.code] || null
    const wdc_p2 = DRIVER_CODE_TO_NUMBER[driverStandings[1]?.Driver?.code] || null
    const wdc_p3 = DRIVER_CODE_TO_NUMBER[driverStandings[2]?.Driver?.code] || null

    const wcc_p1 = constructorStandings[0]?.Constructor?.name || null
    const wcc_p2 = constructorStandings[1]?.Constructor?.name || null
    const wcc_p3 = constructorStandings[2]?.Constructor?.name || null

    // Most Wins berechnen (Fahrer mit meisten Siegen)
    let mostWinsDriver = wdc_p1 // Default: WM-Sieger
    let maxWins = parseInt(driverStandings[0]?.wins || '0')
    for (const standing of driverStandings) {
      const wins = parseInt(standing.wins || '0')
      if (wins > maxWins) {
        maxWins = wins
        mostWinsDriver = DRIVER_CODE_TO_NUMBER[standing.Driver?.code]
      }
    }

    const results = {
      wdc_p1, wdc_p2, wdc_p3,
      wcc_p1, wcc_p2, wcc_p3,
      most_wins_driver: mostWinsDriver,
      standings_round: driverData.MRData?.StandingsTable?.StandingsLists?.[0]?.round || 0
    }

    // 3. Alle Saison-Predictions laden
    const { data: predictions } = await supabase
      .from('season_predictions')
      .select('*')
      .eq('season', 2025)

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ 
        results,
        message: 'Keine Saison-Tipps zum Auswerten vorhanden'
      })
    }

    // 4. Punkte berechnen für jeden User
    let totalUpdated = 0
    const userResults = []

    for (const pred of predictions) {
      let points = 0
      const breakdown: string[] = []

      // WDC Predictions
      if (pred.wdc_p1_driver === wdc_p1) {
        points += SEASON_POINTS.wdc_p1
        breakdown.push(`WDC P1 richtig: +${SEASON_POINTS.wdc_p1}`)
      } else if ([wdc_p1, wdc_p2, wdc_p3].includes(pred.wdc_p1_driver)) {
        points += SEASON_POINTS.wdc_on_podium
        breakdown.push(`WDC P1 auf Podium: +${SEASON_POINTS.wdc_on_podium}`)
      }

      if (pred.wdc_p2_driver === wdc_p2) {
        points += SEASON_POINTS.wdc_p2
        breakdown.push(`WDC P2 richtig: +${SEASON_POINTS.wdc_p2}`)
      } else if ([wdc_p1, wdc_p2, wdc_p3].includes(pred.wdc_p2_driver)) {
        points += SEASON_POINTS.wdc_on_podium
        breakdown.push(`WDC P2 auf Podium: +${SEASON_POINTS.wdc_on_podium}`)
      }

      if (pred.wdc_p3_driver === wdc_p3) {
        points += SEASON_POINTS.wdc_p3
        breakdown.push(`WDC P3 richtig: +${SEASON_POINTS.wdc_p3}`)
      } else if ([wdc_p1, wdc_p2, wdc_p3].includes(pred.wdc_p3_driver)) {
        points += SEASON_POINTS.wdc_on_podium
        breakdown.push(`WDC P3 auf Podium: +${SEASON_POINTS.wdc_on_podium}`)
      }

      // WCC Predictions (Team-Namen vergleichen)
      const normalizeTeam = (t: string | null) => t?.toLowerCase().replace(/[^a-z]/g, '') || ''
      
      if (normalizeTeam(pred.wcc_p1_team) === normalizeTeam(wcc_p1)) {
        points += SEASON_POINTS.wcc_p1
        breakdown.push(`WCC P1 richtig: +${SEASON_POINTS.wcc_p1}`)
      } else if ([wcc_p1, wcc_p2, wcc_p3].map(normalizeTeam).includes(normalizeTeam(pred.wcc_p1_team))) {
        points += SEASON_POINTS.wcc_on_podium
        breakdown.push(`WCC P1 in Top3: +${SEASON_POINTS.wcc_on_podium}`)
      }

      if (normalizeTeam(pred.wcc_p2_team) === normalizeTeam(wcc_p2)) {
        points += SEASON_POINTS.wcc_p2
        breakdown.push(`WCC P2 richtig: +${SEASON_POINTS.wcc_p2}`)
      } else if ([wcc_p1, wcc_p2, wcc_p3].map(normalizeTeam).includes(normalizeTeam(pred.wcc_p2_team))) {
        points += SEASON_POINTS.wcc_on_podium
        breakdown.push(`WCC P2 in Top3: +${SEASON_POINTS.wcc_on_podium}`)
      }

      if (normalizeTeam(pred.wcc_p3_team) === normalizeTeam(wcc_p3)) {
        points += SEASON_POINTS.wcc_p3
        breakdown.push(`WCC P3 richtig: +${SEASON_POINTS.wcc_p3}`)
      } else if ([wcc_p1, wcc_p2, wcc_p3].map(normalizeTeam).includes(normalizeTeam(pred.wcc_p3_team))) {
        points += SEASON_POINTS.wcc_on_podium
        breakdown.push(`WCC P3 in Top3: +${SEASON_POINTS.wcc_on_podium}`)
      }

      // Most Wins
      if (pred.most_wins_driver === mostWinsDriver) {
        points += SEASON_POINTS.most_wins
        breakdown.push(`Most Wins richtig: +${SEASON_POINTS.most_wins}`)
      }

      // Update prediction mit Punkten
      await supabase
        .from('season_predictions')
        .update({ points_earned: points })
        .eq('id', pred.id)

      // User Punkte aktualisieren
      if (points > 0) {
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

      userResults.push({
        user_id: pred.user_id,
        points,
        breakdown
      })
    }

    return NextResponse.json({ 
      success: true,
      results,
      evaluated: predictions.length,
      usersWithPoints: totalUpdated,
      details: userResults,
      pointSystem: SEASON_POINTS
    })

  } catch (error) {
    console.error('Error calculating season points:', error)
    return NextResponse.json({ error: 'Fehler beim Berechnen der Saison-Punkte' }, { status: 500 })
  }
}

// POST für manuelles Triggern
export async function POST() {
  return GET()
}


import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Nur 100 Punkte für den Weltmeister
const CHAMPION_POINTS = 100

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
    const driverRes = await fetch('https://api.jolpi.ca/ergast/f1/2025/driverStandings.json')
    const driverData = await driverRes.json()

    const driverStandings = driverData.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []

    if (driverStandings.length === 0) {
      return NextResponse.json({ 
        error: 'Keine WM-Standings verfügbar',
        info: 'Die Saison hat noch nicht begonnen oder es gibt noch keine Ergebnisse.'
      }, { status: 400 })
    }

    // 2. Weltmeister ermitteln
    const championCode = driverStandings[0]?.Driver?.code
    const championNumber = DRIVER_CODE_TO_NUMBER[championCode] || null
    const championName = driverStandings[0]?.Driver?.givenName + ' ' + driverStandings[0]?.Driver?.familyName
    const championPoints = driverStandings[0]?.points

    // 3. Alle Saison-Predictions laden
    const { data: predictions } = await supabase
      .from('season_predictions')
      .select('*')
      .eq('season', 2025)

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ 
        champion: { number: championNumber, name: championName, points: championPoints },
        message: 'Keine Saison-Tipps zum Auswerten vorhanden'
      })
    }

    // 4. Punkte vergeben
    let winners = 0
    const results = []

    for (const pred of predictions) {
      const isCorrect = pred.wdc_p1_driver === championNumber
      
      if (isCorrect) {
        // Update prediction mit Punkten
        await supabase
          .from('season_predictions')
          .update({ points_earned: CHAMPION_POINTS })
          .eq('id', pred.id)

        // User Punkte aktualisieren
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points, coins, username')
          .eq('id', pred.user_id)
          .single()

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              total_points: profile.total_points + CHAMPION_POINTS,
              coins: profile.coins + CHAMPION_POINTS * 10
            })
            .eq('id', pred.user_id)
          
          winners++
          results.push({
            username: profile.username,
            points: CHAMPION_POINTS,
            coins: CHAMPION_POINTS * 10
          })
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      champion: { 
        number: championNumber, 
        name: championName, 
        points: championPoints 
      },
      totalPredictions: predictions.length,
      winners,
      results
    })

  } catch (error) {
    console.error('Error calculating season points:', error)
    return NextResponse.json({ error: 'Fehler beim Berechnen der Saison-Punkte' }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}

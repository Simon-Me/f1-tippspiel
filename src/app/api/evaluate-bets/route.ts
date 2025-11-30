import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DRIVER_NUMBERS, TEAM_DRIVERS } from '@/lib/moneyBets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DRIVER_CODE_MAP: Record<string, string> = {
  'VER': 'Verstappen', 'NOR': 'Norris', 'LEC': 'Leclerc', 'PIA': 'Piastri',
  'SAI': 'Sainz', 'RUS': 'Russell', 'HAM': 'Hamilton', 'ALO': 'Alonso',
  'STR': 'Stroll', 'HUL': 'Hulkenberg', 'ANT': 'Antonelli', 'GAS': 'Gasly',
  'TSU': 'Tsunoda', 'OCO': 'Ocon', 'ALB': 'Albon', 'BOT': 'Bottas',
  'ZHO': 'Zhou', 'MAG': 'Magnussen', 'LAW': 'Lawson', 'HAD': 'Hadjar',
  'BEA': 'Bearman', 'DOO': 'Doohan', 'COL': 'Colapinto', 'BOR': 'Bortoleto'
}

interface RaceResult {
  position: string
  grid: string
  status: string
  Driver: { code: string, permanentNumber: string }
  Constructor: { name: string }
  FastestLap?: { rank: string }
  Time?: { time: string }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { round } = body

    // Finde das Rennen
    let raceRound = round
    if (!raceRound) {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const { data: currentRace } = await supabase
        .from('races')
        .select('round, id')
        .eq('season', 2025)
        .gte('race_date', threeDaysAgo)
        .order('race_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      if (currentRace) raceRound = currentRace.round
    }

    if (!raceRound) {
      return NextResponse.json({ error: 'No race found' }, { status: 400 })
    }

    // Lade Race Ergebnisse
    const raceRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/results/`)
    const raceData = await raceRes.json()
    const results: RaceResult[] = raceData.MRData?.RaceTable?.Races?.[0]?.Results || []

    if (results.length === 0) {
      return NextResponse.json({ error: 'No results available yet' }, { status: 400 })
    }

    // Lade Quali Ergebnisse für Pole Check
    const qualiRes = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/qualifying/`)
    const qualiData = await qualiRes.json()
    const poleDriver = qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults?.[0]?.Driver?.code

    // Finde Race in DB
    const { data: dbRace } = await supabase
      .from('races')
      .select('id')
      .eq('season', 2025)
      .eq('round', raceRound)
      .maybeSingle()

    if (!dbRace) {
      return NextResponse.json({ error: 'Race not in database' }, { status: 404 })
    }

    // Lade alle pending Bets für dieses Rennen
    const { data: pendingBets } = await supabase
      .from('bets')
      .select('*')
      .eq('race_id', dbRace.id)
      .eq('status', 'pending')

    if (!pendingBets || pendingBets.length === 0) {
      return NextResponse.json({ message: 'No pending bets' })
    }

    // Analyse der Ergebnisse
    const winner = results.find(r => r.position === '1')
    const winnerCode = winner?.Driver.code
    const winnerTime = winner?.Time?.time
    
    // DNF Count
    const dnfCount = results.filter(r => 
      r.status !== 'Finished' && 
      !r.status.includes('Lap') &&
      r.status !== '+1 Lap' &&
      r.status !== '+2 Laps'
    ).length
    
    // Pole to Win
    const poleWon = winnerCode === poleDriver
    
    // Positions gained per driver
    const posGained: Record<string, number> = {}
    results.forEach(r => {
      const gained = parseInt(r.grid) - parseInt(r.position)
      posGained[r.Driver.code] = gained
    })
    
    // Team with biggest position gains
    const teamGains: Record<string, number> = {}
    results.forEach(r => {
      const team = r.Constructor.name
      teamGains[team] = (teamGains[team] || 0) + (parseInt(r.grid) - parseInt(r.position))
    })
    const biggestMoverTeam = Object.entries(teamGains).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    
    // DNF drivers
    const dnfDrivers = results
      .filter(r => r.status !== 'Finished' && !r.status.includes('Lap'))
      .map(r => DRIVER_CODE_MAP[r.Driver.code] || r.Driver.code)
    
    // Winning margin in seconds
    let marginSeconds = 999
    if (winnerTime) {
      // Format: "1:23.456" or just seconds
      const timeMatch = winnerTime.match(/(\d+):?(\d+\.?\d*)/)
      if (timeMatch) {
        marginSeconds = parseFloat(timeMatch[2] || timeMatch[1])
      }
    }
    // Check second place time difference
    const secondPlace = results.find(r => r.position === '2')
    if (secondPlace?.Time?.time) {
      const match = secondPlace.Time.time.match(/\+?(\d+\.?\d*)/)
      if (match) marginSeconds = parseFloat(match[1])
    }
    
    // Head to head results
    const driverPositions: Record<string, number> = {}
    results.forEach(r => {
      const name = DRIVER_CODE_MAP[r.Driver.code]
      if (name) driverPositions[name] = parseInt(r.position)
    })
    
    // Team double points
    const teamInPoints: Record<string, number> = {}
    results.forEach(r => {
      if (parseInt(r.position) <= 10) {
        const team = r.Constructor.name
        teamInPoints[team] = (teamInPoints[team] || 0) + 1
      }
    })
    
    // Underdog in top 10
    const topTeams = ['Red Bull', 'McLaren', 'Ferrari', 'Mercedes', 'Aston Martin']
    const underdogTop10 = results.some(r => 
      parseInt(r.position) <= 10 && 
      !topTeams.some(t => r.Constructor.name.includes(t))
    )

    // Evaluate each bet
    let evaluated = 0
    let totalWinnings = 0

    for (const bet of pendingBets) {
      let won = false
      
      switch (bet.bet_type) {
        case 'dnf_count':
          if (bet.selection === '0-2 Ausfälle') won = dnfCount <= 2
          else if (bet.selection === '3-5 Ausfälle') won = dnfCount >= 3 && dnfCount <= 5
          else if (bet.selection === '6+ Ausfälle') won = dnfCount >= 6
          break
          
        case 'pole_wins':
          won = (bet.selection === 'Ja' && poleWon) || (bet.selection === 'Nein' && !poleWon)
          break
          
        case 'safety_car':
          const sc = dnfCount >= 3
          won = (bet.selection === 'Ja (3+ DNF)' && sc) || (bet.selection === 'Nein (0-2 DNF)' && !sc)
          break
          
        case 'winning_margin':
          if (bet.selection === 'Unter 5 Sekunden') won = marginSeconds < 5
          else if (bet.selection === '5-15 Sekunden') won = marginSeconds >= 5 && marginSeconds <= 15
          else if (bet.selection === 'Über 15 Sekunden') won = marginSeconds > 15
          break
          
        case 'head_to_head_1': // Verstappen vs Norris
          const verPos = driverPositions['Verstappen'] || 99
          const norPos = driverPositions['Norris'] || 99
          won = (bet.selection === 'Verstappen' && verPos < norPos) || 
                (bet.selection === 'Norris' && norPos < verPos)
          break
          
        case 'head_to_head_2': // Leclerc vs Hamilton
          const lecPos = driverPositions['Leclerc'] || 99
          const hamPos = driverPositions['Hamilton'] || 99
          won = (bet.selection === 'Leclerc' && lecPos < hamPos) || 
                (bet.selection === 'Hamilton' && hamPos < lecPos)
          break
          
        case 'head_to_head_3': // Piastri vs Russell
          const piaPos = driverPositions['Piastri'] || 99
          const rusPos = driverPositions['Russell'] || 99
          won = (bet.selection === 'Piastri' && piaPos < rusPos) || 
                (bet.selection === 'Russell' && rusPos < piaPos)
          break
          
        case 'teammate_battle': // Ferrari: Leclerc vs Hamilton
          const fLecPos = driverPositions['Leclerc'] || 99
          const fHamPos = driverPositions['Hamilton'] || 99
          won = (bet.selection === 'Leclerc' && fLecPos < fHamPos) || 
                (bet.selection === 'Hamilton' && fHamPos < fLecPos)
          break
          
        case 'biggest_mover':
          const teamMap: Record<string, string> = {
            'Red Bull': 'Red Bull', 'McLaren': 'McLaren', 'Ferrari': 'Ferrari',
            'Mercedes': 'Mercedes', 'Aston Martin': 'Aston Martin'
          }
          const selectedTeam = teamMap[bet.selection]
          if (bet.selection === 'Anderes Team') {
            won = !Object.values(teamMap).includes(biggestMoverTeam)
          } else {
            won = biggestMoverTeam.includes(selectedTeam)
          }
          break
          
        case 'dnf_pick':
          won = dnfDrivers.includes(bet.selection)
          break
          
        case 'team_double_points':
          won = (teamInPoints[bet.selection] || 0) >= 2
          break
          
        case 'underdog_top10':
          won = (bet.selection === 'Ja' && underdogTop10) || 
                (bet.selection === 'Nein' && !underdogTop10)
          break
      }

      const winnings = won ? Math.floor(bet.amount * bet.odds) : 0
      
      // Update bet
      await supabase
        .from('bets')
        .update({
          status: won ? 'won' : 'lost',
          winnings
        })
        .eq('id', bet.id)
      
      // Add winnings to user
      if (won) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('coins')
          .eq('id', bet.user_id)
          .single()
        
        await supabase
          .from('profiles')
          .update({ coins: (profile?.coins || 0) + winnings })
          .eq('id', bet.user_id)
        
        totalWinnings += winnings
      }
      
      evaluated++
    }

    return NextResponse.json({
      success: true,
      round: raceRound,
      evaluated,
      totalWinnings,
      analysis: {
        dnfCount,
        poleWon,
        marginSeconds,
        biggestMoverTeam,
        dnfDrivers,
        underdogTop10
      }
    })

  } catch (error) {
    console.error('Bet evaluation error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


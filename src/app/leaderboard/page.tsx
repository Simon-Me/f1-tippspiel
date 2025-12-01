'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile, Race } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { Trophy, Crown, Loader2, Check, X, ExternalLink } from 'lucide-react'
import Avatar from '@/components/Avatar'

interface Driver {
  driver_number: number
  full_name: string
}

interface TipDetail {
  session: 'qualifying' | 'sprint' | 'race'
  tipP1?: string
  tipP2?: string
  tipP3?: string
  tipFL?: string
  tipPole?: string
  tipP1Num?: number
  tipP2Num?: number
  tipP3Num?: number
  tipFLNum?: number
  tipPoleNum?: number
  points: number
}

interface PlayerTips {
  username: string
  oderId: string
  avatarUrl?: string
  tips: TipDetail[]
  totalEventPoints: number
}

interface SessionResult {
  qualifying?: { pole: number, poleName: string }
  sprint?: { p1: number, p2: number, p3: number, p1Name: string, p2Name: string, p3Name: string }
  race?: { p1: number, p2: number, p3: number, fl: number, p1Name: string, p2Name: string, p3Name: string, flName: string }
}

// Punktesystem
const POINTS = {
  RACE_P1: 25, RACE_P2: 18, RACE_P3: 15, RACE_ON_PODIUM: 5,
  RACE_FASTEST_LAP: 10, RACE_PERFECT_BONUS: 20,
  SPRINT_P1: 15, SPRINT_P2: 10, SPRINT_P3: 5,
  QUALI_POLE: 10
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [currentRace, setCurrentRace] = useState<Race | null>(null)
  const [playerTips, setPlayerTips] = useState<PlayerTips[]>([])
  const [sessionResults, setSessionResults] = useState<SessionResult>({})

  const fetchData = useCallback(async () => {
    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
      
      if (profilesData) setPlayers(profilesData)
      
      const driversRes = await fetch('/api/drivers')
      const driversJson = await driversRes.json()
      const driversList: Driver[] = driversJson.drivers || []

      // Fallback Fahrernamen falls API nicht vollständig
      const DRIVER_NAMES: Record<number, string> = {
        1: 'Verstappen', 4: 'Norris', 16: 'Leclerc', 81: 'Piastri', 55: 'Sainz',
        63: 'Russell', 44: 'Hamilton', 14: 'Alonso', 18: 'Stroll', 27: 'Hülkenberg',
        12: 'Antonelli', 10: 'Gasly', 22: 'Tsunoda', 31: 'Ocon', 23: 'Albon',
        77: 'Bottas', 24: 'Zhou', 20: 'Magnussen', 30: 'Lawson', 6: 'Hadjar',
        87: 'Bearman', 7: 'Doohan', 43: 'Colapinto', 5: 'Bortoleto'
      }
      
      const getDriverName = (num: number | null | undefined): string => {
        if (!num) return '-'
        const d = driversList.find(d => d.driver_number === num)
        return d?.full_name?.split(' ').pop() || DRIVER_NAMES[num] || '-'
      }
      
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const { data: races } = await supabase
        .from('races')
        .select('*')
        .eq('season', 2025)
        .gte('race_date', threeDaysAgo)
        .order('race_date', { ascending: true })
        .limit(1)
      
      if (races?.[0] && profilesData) {
        setCurrentRace(races[0])
        const raceRound = races[0].round

        // Lade Ergebnisse
        const results: SessionResult = {}
        const DRIVER_MAP: Record<string, number> = {
          'VER': 1, 'NOR': 4, 'LEC': 16, 'PIA': 81, 'SAI': 55,
          'RUS': 63, 'HAM': 44, 'ALO': 14, 'STR': 18, 'HUL': 27,
          'ANT': 12, 'GAS': 10, 'TSU': 22, 'OCO': 31, 'ALB': 23,
          'BOT': 77, 'ZHO': 24, 'MAG': 20, 'LAW': 30, 'HAD': 6,
          'BEA': 87, 'DOO': 7, 'COL': 43, 'BOR': 5
        }
        const getNum = (code: string) => DRIVER_MAP[code] || 0

        try {
          const [qualiRes, sprintRes, raceRes] = await Promise.all([
            fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/qualifying/`),
            fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/sprint/`),
            fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/results/`)
          ])

          const qualiData = await qualiRes.json()
          const qualiResults = qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults
          if (qualiResults?.[0]) {
            const poleNum = getNum(qualiResults[0].Driver.code)
            results.qualifying = { pole: poleNum, poleName: getDriverName(poleNum) }
          }

          const sprintData = await sprintRes.json()
          const sprintResults = sprintData.MRData?.RaceTable?.Races?.[0]?.SprintResults
          if (sprintResults?.length > 0) {
            const sp1 = sprintResults.find((r: { position: string }) => r.position === '1')
            const sp2 = sprintResults.find((r: { position: string }) => r.position === '2')
            const sp3 = sprintResults.find((r: { position: string }) => r.position === '3')
            const p1Num = sp1 ? getNum(sp1.Driver.code) : 0
            const p2Num = sp2 ? getNum(sp2.Driver.code) : 0
            const p3Num = sp3 ? getNum(sp3.Driver.code) : 0
            results.sprint = {
              p1: p1Num, p2: p2Num, p3: p3Num,
              p1Name: getDriverName(p1Num), p2Name: getDriverName(p2Num), p3Name: getDriverName(p3Num)
            }
          }

          const raceData = await raceRes.json()
          const raceResults = raceData.MRData?.RaceTable?.Races?.[0]?.Results
          if (raceResults?.length > 0) {
            const rp1 = raceResults.find((r: { position: string }) => r.position === '1')
            const rp2 = raceResults.find((r: { position: string }) => r.position === '2')
            const rp3 = raceResults.find((r: { position: string }) => r.position === '3')
            const fl = raceResults.find((r: { FastestLap?: { rank: string } }) => r.FastestLap?.rank === '1')
            const p1Num = rp1 ? getNum(rp1.Driver.code) : 0
            const p2Num = rp2 ? getNum(rp2.Driver.code) : 0
            const p3Num = rp3 ? getNum(rp3.Driver.code) : 0
            const flNum = fl ? getNum(fl.Driver.code) : 0
            results.race = {
              p1: p1Num, p2: p2Num, p3: p3Num, fl: flNum,
              p1Name: getDriverName(p1Num), p2Name: getDriverName(p2Num), 
              p3Name: getDriverName(p3Num), flName: getDriverName(flNum)
            }
          }
        } catch (e) {
          console.error('Error loading results:', e)
        }

        setSessionResults(results)
        
        // Lade Predictions und gruppiere nach Spieler
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .eq('race_id', races[0].id)
        
        if (preds) {
          const byPlayer: Record<string, PlayerTips> = {}
          
          profilesData.forEach(profile => {
            byPlayer[profile.id] = {
              username: profile.username,
              oderId: profile.id,
              avatarUrl: profile.avatar_url,
              tips: [],
              totalEventPoints: 0
            }
          })
          
          preds.forEach(pred => {
            const player = byPlayer[pred.user_id]
            if (!player) return
            
            if (pred.session_type === 'qualifying') {
              player.tips.push({
                session: 'qualifying',
                tipPole: getDriverName(pred.pole_driver),
                tipPoleNum: pred.pole_driver,
                points: pred.points_earned || 0
              })
              player.totalEventPoints += pred.points_earned || 0
            } else if (pred.session_type === 'sprint') {
              player.tips.push({
                session: 'sprint',
                tipP1: getDriverName(pred.p1_driver),
                tipP2: getDriverName(pred.p2_driver),
                tipP3: getDriverName(pred.p3_driver),
                tipP1Num: pred.p1_driver,
                tipP2Num: pred.p2_driver,
                tipP3Num: pred.p3_driver,
                points: pred.points_earned || 0
              })
              player.totalEventPoints += pred.points_earned || 0
            } else if (pred.session_type === 'race') {
              player.tips.push({
                session: 'race',
                tipP1: getDriverName(pred.p1_driver),
                tipP2: getDriverName(pred.p2_driver),
                tipP3: getDriverName(pred.p3_driver),
                tipFL: getDriverName(pred.fastest_lap_driver),
                tipP1Num: pred.p1_driver,
                tipP2Num: pred.p2_driver,
                tipP3Num: pred.p3_driver,
                tipFLNum: pred.fastest_lap_driver,
                points: pred.points_earned || 0
              })
              player.totalEventPoints += pred.points_earned || 0
            }
          })
          
          // Nur Spieler mit Tipps, sortiert nach Event-Punkten
          const sorted = Object.values(byPlayer)
            .filter(p => p.tips.length > 0)
            .sort((a, b) => b.totalEventPoints - a.totalEventPoints)
          
          setPlayerTips(sorted)
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoadingData(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loadingData) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16 px-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">F1 Tippspiel 2025</p>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            Rangliste
          </h1>
        </div>

        {/* Podium */}
        {players.length >= 2 && (
          <div className="flex items-end justify-center gap-4 mb-16 h-64">
            {/* 2. Platz */}
            <div className="flex flex-col items-center">
              {players[1]?.avatar_url ? (
                <img src={players[1].avatar_url} alt={players[1].username} className="w-16 h-16 rounded-full object-cover border-4 border-gray-400 mb-2" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 flex items-center justify-center text-2xl font-bold text-black mb-2">
                  {players[1]?.username.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="font-bold text-gray-300 mb-1">{players[1]?.username}</p>
              <p className="text-2xl font-bold mb-2">{players[1]?.total_points}</p>
              <div className="w-20 h-24 bg-gradient-to-t from-gray-700 to-gray-500 rounded-t-lg flex items-end justify-center pb-3">
                <span className="text-3xl font-bold text-gray-300">2</span>
              </div>
            </div>
            
            {/* 1. Platz */}
            <div className="flex flex-col items-center -mt-8">
              <Crown className="w-8 h-8 text-yellow-400 mb-1" />
              {players[0]?.avatar_url ? (
                <img src={players[0].avatar_url} alt={players[0].username} className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400 mb-2 ring-4 ring-yellow-400/30" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 flex items-center justify-center text-3xl font-bold text-black mb-2 ring-4 ring-yellow-400/30">
                  {players[0]?.username.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="font-bold text-yellow-400 mb-1">{players[0]?.username}</p>
              <p className="text-3xl font-bold mb-2">{players[0]?.total_points}</p>
              <div className="w-24 h-32 bg-gradient-to-t from-yellow-700 to-yellow-500 rounded-t-lg flex items-end justify-center pb-3">
                <span className="text-4xl font-bold text-yellow-300">1</span>
              </div>
            </div>
            
            {/* 3. Platz */}
            {players[2] && (
              <div className="flex flex-col items-center">
                {players[2]?.avatar_url ? (
                  <img src={players[2].avatar_url} alt={players[2].username} className="w-14 h-14 rounded-full object-cover border-4 border-orange-500 mb-2" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold text-black mb-2">
                    {players[2]?.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="font-bold text-orange-400 mb-1">{players[2]?.username}</p>
                <p className="text-xl font-bold mb-2">{players[2]?.total_points}</p>
                <div className="w-16 h-16 bg-gradient-to-t from-orange-800 to-orange-600 rounded-t-lg flex items-end justify-center pb-2">
                  <span className="text-2xl font-bold text-orange-300">3</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alle Spieler */}
        <div className="mb-12">
          <p className="text-gray-500 text-sm uppercase tracking-wider mb-3">Alle Spieler</p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            {players.map((player, idx) => {
              const isMe = player.id === user?.id
              return (
                <Link
                  href={isMe ? '/profile' : `/player/${player.id}`}
                  key={player.id} 
                  className={`flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors ${isMe ? 'bg-red-950/30' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-zinc-800 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <Avatar url={player.avatar_url} username={player.username} size="sm" />
                    <div>
                      <p className={`flex items-center gap-1 ${isMe ? 'text-red-400 font-medium' : 'text-white font-medium'}`}>
                        {player.username}
                        <ExternalLink className="w-3 h-3 text-gray-500" />
                      </p>
                      <p className="text-gray-600 text-sm">{player.predictions_count || 0} Tipps</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{player.total_points}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Auswertung für aktuelles Event */}
        {currentRace && playerTips.length > 0 && (
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-3">
              {getCountryFlag(currentRace.race_name)} Auswertung: {currentRace.race_name}
            </p>
            
            {/* Echte Ergebnisse - nur einmal anzeigen */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-5 mb-6 border border-zinc-800">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Offizielle Ergebnisse</h3>
              
              <div className="grid gap-4">
                {/* Qualifying */}
                {sessionResults.qualifying && (
                  <div className="flex items-center justify-between p-3 bg-blue-950/30 rounded-xl border border-blue-900/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-blue-600 text-white rounded">QUALI</span>
                      <span className="text-gray-400">Pole Position:</span>
                    </div>
                    <span className="text-white font-bold text-lg">{sessionResults.qualifying.poleName}</span>
                  </div>
                )}
                
                {/* Sprint */}
                {sessionResults.sprint && (
                  <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-900/30">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-purple-600 text-white rounded">SPRINT</span>
                      <span className="text-gray-400">Podium:</span>
                    </div>
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <span className="text-yellow-400 text-xs font-bold">P1</span>
                        <p className="text-white font-bold">{sessionResults.sprint.p1Name}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-400 text-xs font-bold">P2</span>
                        <p className="text-white font-bold">{sessionResults.sprint.p2Name}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-orange-400 text-xs font-bold">P3</span>
                        <p className="text-white font-bold">{sessionResults.sprint.p3Name}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Race */}
                {sessionResults.race && (
                  <div className="p-3 bg-red-950/30 rounded-xl border border-red-900/30">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-red-600 text-white rounded">RENNEN</span>
                      <span className="text-gray-400">Podium + FL:</span>
                    </div>
                    <div className="flex items-center justify-around">
                      <div className="text-center">
                        <span className="text-yellow-400 text-xs font-bold">P1</span>
                        <p className="text-white font-bold">{sessionResults.race.p1Name}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-400 text-xs font-bold">P2</span>
                        <p className="text-white font-bold">{sessionResults.race.p2Name}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-orange-400 text-xs font-bold">P3</span>
                        <p className="text-white font-bold">{sessionResults.race.p3Name}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-purple-400 text-xs font-bold">FL</span>
                        <p className="text-white font-bold">{sessionResults.race.flName}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!sessionResults.qualifying && !sessionResults.sprint && !sessionResults.race && (
                  <p className="text-gray-500 text-center py-4">Noch keine Ergebnisse verfügbar</p>
                )}
              </div>
            </div>

            {/* Spieler-Kacheln */}
            <div className="space-y-4">
              {playerTips.map((player, idx) => {
                const isMe = player.oderId === user?.id
                const qualiTip = player.tips.find(t => t.session === 'qualifying')
                const sprintTip = player.tips.find(t => t.session === 'sprint')
                const raceTip = player.tips.find(t => t.session === 'race')
                
                return (
                  <div 
                    key={player.oderId}
                    className={`rounded-2xl overflow-hidden ${isMe ? 'ring-2 ring-red-500/50' : ''}`}
                  >
                    {/* Header */}
                    <div className={`flex items-center justify-between p-4 ${isMe ? 'bg-red-950/40' : 'bg-zinc-900'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-black' :
                          idx === 1 ? 'bg-gray-400 text-black' :
                          idx === 2 ? 'bg-orange-500 text-black' :
                          'bg-zinc-700 text-gray-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <Avatar url={player.avatarUrl} username={player.username} size="sm" />
                        <span className={`font-bold text-lg ${isMe ? 'text-red-400' : 'text-white'}`}>
                          {player.username}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-green-400">+{player.totalEventPoints}</span>
                    </div>
                    
                    {/* Tipps */}
                    <div className="bg-zinc-950 p-4 space-y-3">
                      {/* Quali */}
                      {qualiTip && sessionResults.qualifying && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-1.5 py-0.5 bg-blue-900/50 text-blue-400 rounded">Q</span>
                            <span className="text-gray-400">Pole:</span>
                            <span className={qualiTip.tipPoleNum === sessionResults.qualifying.pole ? 'text-green-400 font-medium' : 'text-red-400'}>
                              {qualiTip.tipPole}
                            </span>
                            {qualiTip.tipPoleNum === sessionResults.qualifying.pole ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <X className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <span className={qualiTip.points > 0 ? 'text-green-400 font-bold' : 'text-gray-600'}>
                            {qualiTip.points > 0 ? `+${qualiTip.points}` : '0'}
                          </span>
                        </div>
                      )}
                      
                      {/* Sprint */}
                      {sprintTip && sessionResults.sprint && (() => {
                        const sprintPodium = [sessionResults.sprint.p1, sessionResults.sprint.p2, sessionResults.sprint.p3]
                        const getSprintColor = (tipNum: number | undefined, correctNum: number) => {
                          if (tipNum === correctNum) return 'text-green-400'
                          if (tipNum && sprintPodium.includes(tipNum)) return 'text-yellow-400'
                          return 'text-red-400'
                        }
                        const getSprintIcon = (tipNum: number | undefined, correctNum: number) => {
                          if (tipNum === correctNum) return <Check className="w-3 h-3 text-green-400" />
                          if (tipNum && sprintPodium.includes(tipNum)) return <span className="text-yellow-400">~</span>
                          return <X className="w-3 h-3 text-red-400" />
                        }
                        return (
                          <div className="text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold px-1.5 py-0.5 bg-purple-900/50 text-purple-400 rounded">S</span>
                              <span className={sprintTip.points > 0 ? 'text-green-400 font-bold' : 'text-gray-600'}>
                                {sprintTip.points > 0 ? `+${sprintTip.points}` : '0'}
                              </span>
                            </div>
                            <div className="flex gap-4 ml-6">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">P1:</span>
                                <span className={getSprintColor(sprintTip.tipP1Num, sessionResults.sprint.p1)}>
                                  {sprintTip.tipP1}
                                </span>
                                {getSprintIcon(sprintTip.tipP1Num, sessionResults.sprint.p1)}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">P2:</span>
                                <span className={getSprintColor(sprintTip.tipP2Num, sessionResults.sprint.p2)}>
                                  {sprintTip.tipP2}
                                </span>
                                {getSprintIcon(sprintTip.tipP2Num, sessionResults.sprint.p2)}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">P3:</span>
                                <span className={getSprintColor(sprintTip.tipP3Num, sessionResults.sprint.p3)}>
                                  {sprintTip.tipP3}
                                </span>
                                {getSprintIcon(sprintTip.tipP3Num, sessionResults.sprint.p3)}
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Race */}
                      {raceTip && sessionResults.race && (
                        <div className="text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold px-1.5 py-0.5 bg-red-900/50 text-red-400 rounded">R</span>
                            <span className={raceTip.points > 0 ? 'text-green-400 font-bold' : 'text-gray-600'}>
                              {raceTip.points > 0 ? `+${raceTip.points}` : '0'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 ml-6">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">P1:</span>
                              <span className={raceTip.tipP1Num === sessionResults.race.p1 ? 'text-green-400' : 
                                [sessionResults.race.p1, sessionResults.race.p2, sessionResults.race.p3].includes(raceTip.tipP1Num || 0) ? 'text-yellow-400' : 'text-red-400'}>
                                {raceTip.tipP1}
                              </span>
                              {raceTip.tipP1Num === sessionResults.race.p1 ? <Check className="w-3 h-3 text-green-400" /> : 
                               [sessionResults.race.p1, sessionResults.race.p2, sessionResults.race.p3].includes(raceTip.tipP1Num || 0) ? <span className="text-yellow-400 text-xs">~</span> : <X className="w-3 h-3 text-red-400" />}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">P2:</span>
                              <span className={raceTip.tipP2Num === sessionResults.race.p2 ? 'text-green-400' : 
                                [sessionResults.race.p1, sessionResults.race.p2, sessionResults.race.p3].includes(raceTip.tipP2Num || 0) ? 'text-yellow-400' : 'text-red-400'}>
                                {raceTip.tipP2}
                              </span>
                              {raceTip.tipP2Num === sessionResults.race.p2 ? <Check className="w-3 h-3 text-green-400" /> : 
                               [sessionResults.race.p1, sessionResults.race.p2, sessionResults.race.p3].includes(raceTip.tipP2Num || 0) ? <span className="text-yellow-400 text-xs">~</span> : <X className="w-3 h-3 text-red-400" />}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">P3:</span>
                              <span className={raceTip.tipP3Num === sessionResults.race.p3 ? 'text-green-400' : 
                                [sessionResults.race.p1, sessionResults.race.p2, sessionResults.race.p3].includes(raceTip.tipP3Num || 0) ? 'text-yellow-400' : 'text-red-400'}>
                                {raceTip.tipP3}
                              </span>
                              {raceTip.tipP3Num === sessionResults.race.p3 ? <Check className="w-3 h-3 text-green-400" /> : 
                               [sessionResults.race.p1, sessionResults.race.p2, sessionResults.race.p3].includes(raceTip.tipP3Num || 0) ? <span className="text-yellow-400 text-xs">~</span> : <X className="w-3 h-3 text-red-400" />}
                            </div>
                            {raceTip.tipFL && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">FL:</span>
                                <span className={raceTip.tipFLNum === sessionResults.race.fl ? 'text-green-400' : 'text-red-400'}>
                                  {raceTip.tipFL}
                                </span>
                                {raceTip.tipFLNum === sessionResults.race.fl ? <Check className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {player.tips.length === 0 && (
                        <p className="text-gray-600 text-sm">Keine Tipps abgegeben</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Legende */}
            <div className="mt-6 p-4 bg-zinc-900/50 rounded-xl">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Punktesystem</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-400" />
                  <span className="text-gray-400">Exakt richtig</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-xs">~</span>
                  <span className="text-gray-400">Podium, falsche Pos.</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-3 h-3 text-red-400" />
                  <span className="text-gray-400">Falsch</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-1.5 text-xs text-gray-500">
                <div>Rennen P1/P2/P3: <span className="text-white">25/18/15</span></div>
                <div>Rennen Podium~: <span className="text-yellow-400">+5 Pkt</span></div>
                <div>Sprint P1/P2/P3: <span className="text-white">15/10/5</span></div>
                <div>Sprint Podium~: <span className="text-yellow-400">+3 Pkt</span></div>
                <div>Quali Pole: <span className="text-white">10 Pkt</span></div>
                <div>Schnellste Runde: <span className="text-white">10 Pkt</span></div>
                <div>Perfektes Podium: <span className="text-white">+20 Bonus</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


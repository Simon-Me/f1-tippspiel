'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile, Prediction, Race } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { Trophy, Crown, Loader2, Check, X, Minus, ChevronDown, ChevronUp } from 'lucide-react'

interface Driver {
  driver_number: number
  full_name: string
}

interface PointBreakdown {
  label: string
  points: number
  correct: boolean
}

interface FormattedPrediction {
  type: string
  user: string
  tip: string
  points: number
  result?: string
  breakdown?: PointBreakdown[]
  isExpanded?: boolean
}

interface SessionResult {
  qualifying?: { pole: number | null, poleName: string }
  sprint?: { p1: number | null, p2: number | null, p3: number | null, p1Name: string, p2Name: string, p3Name: string }
  race?: { p1: number | null, p2: number | null, p3: number | null, fl: number | null, p1Name: string, p2Name: string, p3Name: string, flName: string }
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
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [currentRace, setCurrentRace] = useState<Race | null>(null)
  const [predictions, setPredictions] = useState<FormattedPrediction[]>([])
  const [sessionResults, setSessionResults] = useState<SessionResult>({})
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
      
      if (profilesData) setPlayers(profilesData)
      
      const driversRes = await fetch('/api/drivers')
      const driversJson = await driversRes.json()
      if (driversJson.drivers) setDrivers(driversJson.drivers)

      const getDriverName = (num: number | null) => {
        if (!num) return '-'
        const d = driversJson.drivers?.find((d: Driver) => d.driver_number === num)
        return d?.full_name?.split(' ').pop() || '-'
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

        // Lade die echten Ergebnisse von der API
        const results: SessionResult = {}
        
        try {
          const [qualiRes, sprintRes, raceRes] = await Promise.all([
            fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/qualifying/`),
            fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/sprint/`),
            fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/results/`)
          ])

          const DRIVER_MAP: Record<string, number> = {
            'VER': 1, 'NOR': 4, 'LEC': 16, 'PIA': 81, 'SAI': 55,
            'RUS': 63, 'HAM': 44, 'ALO': 14, 'STR': 18, 'HUL': 27,
            'ANT': 12, 'GAS': 10, 'TSU': 22, 'OCO': 31, 'ALB': 23,
            'BOT': 77, 'ZHO': 24, 'MAG': 20, 'LAW': 30, 'HAD': 6,
            'BEA': 87, 'DOO': 7, 'COL': 43, 'BOR': 5
          }
          const getNum = (code: string) => DRIVER_MAP[code] || 0

          const qualiData = await qualiRes.json()
          const qualiResults = qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults
          if (qualiResults?.[0]) {
            const poleCode = qualiResults[0].Driver.code
            results.qualifying = {
              pole: getNum(poleCode),
              poleName: getDriverName(getNum(poleCode))
            }
          }

          const sprintData = await sprintRes.json()
          const sprintResults = sprintData.MRData?.RaceTable?.Races?.[0]?.SprintResults
          if (sprintResults?.length > 0) {
            const sp1 = sprintResults.find((r: { position: string }) => r.position === '1')
            const sp2 = sprintResults.find((r: { position: string }) => r.position === '2')
            const sp3 = sprintResults.find((r: { position: string }) => r.position === '3')
            results.sprint = {
              p1: sp1 ? getNum(sp1.Driver.code) : null,
              p2: sp2 ? getNum(sp2.Driver.code) : null,
              p3: sp3 ? getNum(sp3.Driver.code) : null,
              p1Name: sp1 ? getDriverName(getNum(sp1.Driver.code)) : '-',
              p2Name: sp2 ? getDriverName(getNum(sp2.Driver.code)) : '-',
              p3Name: sp3 ? getDriverName(getNum(sp3.Driver.code)) : '-'
            }
          }

          const raceData = await raceRes.json()
          const raceResults = raceData.MRData?.RaceTable?.Races?.[0]?.Results
          if (raceResults?.length > 0) {
            const rp1 = raceResults.find((r: { position: string }) => r.position === '1')
            const rp2 = raceResults.find((r: { position: string }) => r.position === '2')
            const rp3 = raceResults.find((r: { position: string }) => r.position === '3')
            const fl = raceResults.find((r: { FastestLap?: { rank: string } }) => r.FastestLap?.rank === '1')
            results.race = {
              p1: rp1 ? getNum(rp1.Driver.code) : null,
              p2: rp2 ? getNum(rp2.Driver.code) : null,
              p3: rp3 ? getNum(rp3.Driver.code) : null,
              fl: fl ? getNum(fl.Driver.code) : null,
              p1Name: rp1 ? getDriverName(getNum(rp1.Driver.code)) : '-',
              p2Name: rp2 ? getDriverName(getNum(rp2.Driver.code)) : '-',
              p3Name: rp3 ? getDriverName(getNum(rp3.Driver.code)) : '-',
              flName: fl ? getDriverName(getNum(fl.Driver.code)) : '-'
            }
          }
        } catch (e) {
          console.error('Error loading results:', e)
        }

        setSessionResults(results)
        
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .eq('race_id', races[0].id)
        
        if (preds) {
          const formatted: FormattedPrediction[] = []
          
          preds.forEach(pred => {
            const profile = profilesData.find(p => p.id === pred.user_id)
            if (!profile) return
            
            if (pred.session_type === 'qualifying') {
              const driver = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.pole_driver)
              const driverName = driver?.full_name?.split(' ').pop() || '-'
              const isCorrect = results.qualifying && pred.pole_driver === results.qualifying.pole
              
              formatted.push({
                type: 'Quali',
                user: profile.username,
                tip: driverName,
                points: pred.points_earned || 0,
                result: results.qualifying ? results.qualifying.poleName : undefined,
                breakdown: results.qualifying ? [{
                  label: `Pole: ${driverName} ${isCorrect ? '✓' : `(war ${results.qualifying.poleName})`}`,
                  points: isCorrect ? POINTS.QUALI_POLE : 0,
                  correct: !!isCorrect
                }] : undefined
              })
            } else if (pred.session_type === 'sprint') {
              const d1 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p1_driver)
              const d2 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p2_driver)
              const d3 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p3_driver)
              const d1Name = d1?.full_name?.split(' ').pop() || '-'
              const d2Name = d2?.full_name?.split(' ').pop() || '-'
              const d3Name = d3?.full_name?.split(' ').pop() || '-'
              
              const breakdown: PointBreakdown[] = []
              if (results.sprint) {
                const p1Correct = pred.p1_driver === results.sprint.p1
                const p2Correct = pred.p2_driver === results.sprint.p2
                const p3Correct = pred.p3_driver === results.sprint.p3
                
                breakdown.push({
                  label: `P1: ${d1Name} ${p1Correct ? '✓' : `(war ${results.sprint.p1Name})`}`,
                  points: p1Correct ? POINTS.SPRINT_P1 : 0,
                  correct: p1Correct
                })
                breakdown.push({
                  label: `P2: ${d2Name} ${p2Correct ? '✓' : `(war ${results.sprint.p2Name})`}`,
                  points: p2Correct ? POINTS.SPRINT_P2 : 0,
                  correct: p2Correct
                })
                breakdown.push({
                  label: `P3: ${d3Name} ${p3Correct ? '✓' : `(war ${results.sprint.p3Name})`}`,
                  points: p3Correct ? POINTS.SPRINT_P3 : 0,
                  correct: p3Correct
                })
              }
              
              formatted.push({
                type: 'Sprint',
                user: profile.username,
                tip: `${d1Name} → ${d2Name} → ${d3Name}`,
                points: pred.points_earned || 0,
                result: results.sprint ? `${results.sprint.p1Name} → ${results.sprint.p2Name} → ${results.sprint.p3Name}` : undefined,
                breakdown: breakdown.length > 0 ? breakdown : undefined
              })
            } else if (pred.session_type === 'race') {
              const d1 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p1_driver)
              const d2 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p2_driver)
              const d3 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p3_driver)
              const fl = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.fastest_lap_driver)
              const d1Name = d1?.full_name?.split(' ').pop() || '-'
              const d2Name = d2?.full_name?.split(' ').pop() || '-'
              const d3Name = d3?.full_name?.split(' ').pop() || '-'
              const flName = fl?.full_name?.split(' ').pop() || '-'
              
              const breakdown: PointBreakdown[] = []
              if (results.race) {
                const podium = [results.race.p1, results.race.p2, results.race.p3]
                const p1Exact = pred.p1_driver === results.race.p1
                const p2Exact = pred.p2_driver === results.race.p2
                const p3Exact = pred.p3_driver === results.race.p3
                const p1OnPodium = !p1Exact && podium.includes(pred.p1_driver)
                const p2OnPodium = !p2Exact && podium.includes(pred.p2_driver)
                const p3OnPodium = !p3Exact && podium.includes(pred.p3_driver)
                const flCorrect = pred.fastest_lap_driver === results.race.fl
                const perfectPodium = p1Exact && p2Exact && p3Exact

                breakdown.push({
                  label: p1Exact ? `P1: ${d1Name} ✓` : p1OnPodium ? `P1: ${d1Name} (Podium, war ${results.race.p1Name})` : `P1: ${d1Name} (war ${results.race.p1Name})`,
                  points: p1Exact ? POINTS.RACE_P1 : p1OnPodium ? POINTS.RACE_ON_PODIUM : 0,
                  correct: p1Exact
                })
                breakdown.push({
                  label: p2Exact ? `P2: ${d2Name} ✓` : p2OnPodium ? `P2: ${d2Name} (Podium, war ${results.race.p2Name})` : `P2: ${d2Name} (war ${results.race.p2Name})`,
                  points: p2Exact ? POINTS.RACE_P2 : p2OnPodium ? POINTS.RACE_ON_PODIUM : 0,
                  correct: p2Exact
                })
                breakdown.push({
                  label: p3Exact ? `P3: ${d3Name} ✓` : p3OnPodium ? `P3: ${d3Name} (Podium, war ${results.race.p3Name})` : `P3: ${d3Name} (war ${results.race.p3Name})`,
                  points: p3Exact ? POINTS.RACE_P3 : p3OnPodium ? POINTS.RACE_ON_PODIUM : 0,
                  correct: p3Exact
                })
                if (pred.fastest_lap_driver) {
                  breakdown.push({
                    label: flCorrect ? `FL: ${flName} ✓` : `FL: ${flName} (war ${results.race.flName})`,
                    points: flCorrect ? POINTS.RACE_FASTEST_LAP : 0,
                    correct: flCorrect
                  })
                }
                if (perfectPodium) {
                  breakdown.push({
                    label: '🎯 Perfektes Podium Bonus!',
                    points: POINTS.RACE_PERFECT_BONUS,
                    correct: true
                  })
                }
              }
              
              formatted.push({
                type: 'Rennen',
                user: profile.username,
                tip: `${d1Name} → ${d2Name} → ${d3Name}${fl ? ` (FL: ${flName})` : ''}`,
                points: pred.points_earned || 0,
                result: results.race ? `${results.race.p1Name} → ${results.race.p2Name} → ${results.race.p3Name}` : undefined,
                breakdown: breakdown.length > 0 ? breakdown : undefined
              })
            }
          })
          
          setPredictions(formatted)
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-gray-300 to-gray-500 flex items-center justify-center text-2xl font-bold text-black mb-2">
                {players[1]?.username.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-gray-300 mb-1">{players[1]?.username}</p>
              <p className="text-2xl font-bold mb-2">{players[1]?.total_points}</p>
              <div className="w-20 h-24 bg-gradient-to-t from-gray-700 to-gray-500 rounded-t-lg flex items-end justify-center pb-3">
                <span className="text-3xl font-bold text-gray-300">2</span>
              </div>
            </div>
            
            {/* 1. Platz */}
            <div className="flex flex-col items-center -mt-8">
              <Crown className="w-8 h-8 text-yellow-400 mb-1" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-600 flex items-center justify-center text-3xl font-bold text-black mb-2 ring-4 ring-yellow-400/30">
                {players[0]?.username.charAt(0).toUpperCase()}
              </div>
              <p className="font-bold text-yellow-400 mb-1">{players[0]?.username}</p>
              <p className="text-3xl font-bold mb-2">{players[0]?.total_points}</p>
              <div className="w-24 h-32 bg-gradient-to-t from-yellow-700 to-yellow-500 rounded-t-lg flex items-end justify-center pb-3">
                <span className="text-4xl font-bold text-yellow-300">1</span>
              </div>
            </div>
            
            {/* 3. Platz */}
            {players[2] && (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold text-black mb-2">
                  {players[2]?.username.charAt(0).toUpperCase()}
                </div>
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
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 ${isMe ? 'bg-red-950/30' : ''}`}
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
                    <div>
                      <p className={isMe ? 'text-red-400 font-medium' : 'text-white font-medium'}>
                        {player.username}
                      </p>
                      <p className="text-gray-600 text-sm">{player.predictions_count || 0} Tipps</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold">{player.total_points}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Aktuelle Tipps mit Auswertung */}
        {currentRace && predictions.length > 0 && (
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-3">
              {getCountryFlag(currentRace.race_name)} Tipps für {currentRace.race_name}
            </p>
            <div className="bg-zinc-900 rounded-2xl overflow-hidden">
              {predictions.map((pred, idx) => {
                const isExpanded = expandedIdx === idx
                const hasBreakdown = pred.breakdown && pred.breakdown.length > 0
                
                return (
                  <div key={idx} className="border-b border-zinc-800 last:border-0">
                    <div 
                      className={`p-4 ${hasBreakdown ? 'cursor-pointer hover:bg-zinc-800/50' : ''}`}
                      onClick={() => hasBreakdown && setExpandedIdx(isExpanded ? null : idx)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            pred.type === 'Quali' ? 'bg-blue-900 text-blue-300' :
                            pred.type === 'Sprint' ? 'bg-purple-900 text-purple-300' :
                            'bg-red-900 text-red-300'
                          }`}>
                            {pred.type}
                          </span>
                          <span className="text-gray-500 text-sm">{pred.user}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {pred.points > 0 ? (
                            <span className="text-green-400 font-bold">+{pred.points}</span>
                          ) : pred.result ? (
                            <span className="text-gray-600">0</span>
                          ) : null}
                          {hasBreakdown && (
                            isExpanded ? 
                              <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </div>
                      
                      {/* Tipp */}
                      <div className="mt-2">
                        <p className="text-gray-500 text-xs mb-0.5">Dein Tipp:</p>
                        <p className="text-white font-medium">{pred.tip}</p>
                      </div>
                      
                      {/* Ergebnis (falls vorhanden) */}
                      {pred.result && (
                        <div className="mt-2">
                          <p className="text-gray-500 text-xs mb-0.5">Ergebnis:</p>
                          <p className="text-yellow-400 font-medium">{pred.result}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Aufschlüsselung */}
                    {isExpanded && hasBreakdown && (
                      <div className="px-4 pb-4 bg-zinc-950/50">
                        <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Punkteaufschlüsselung:</p>
                        <div className="space-y-1">
                          {pred.breakdown!.map((item, i) => (
                            <div 
                              key={i} 
                              className={`flex items-center justify-between text-sm p-2 rounded ${
                                item.correct ? 'bg-green-900/30' : 'bg-zinc-800/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {item.correct ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : item.points > 0 ? (
                                  <Minus className="w-4 h-4 text-yellow-400" />
                                ) : (
                                  <X className="w-4 h-4 text-red-400" />
                                )}
                                <span className={item.correct ? 'text-green-300' : 'text-gray-400'}>
                                  {item.label}
                                </span>
                              </div>
                              {item.points > 0 && (
                                <span className={item.correct ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>
                                  +{item.points}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Summe */}
                        <div className="mt-3 pt-2 border-t border-zinc-700 flex justify-between">
                          <span className="text-gray-400 font-medium">Gesamt:</span>
                          <span className="text-white font-bold text-lg">{pred.points} Punkte</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Legende */}
            <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Punktesystem</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>🏆 Rennen P1: <span className="text-white">25 Pkt</span></div>
                <div>🏆 Rennen P2: <span className="text-white">18 Pkt</span></div>
                <div>🏆 Rennen P3: <span className="text-white">15 Pkt</span></div>
                <div>📍 Auf Podium: <span className="text-white">5 Pkt</span></div>
                <div>⚡ Schnellste Runde: <span className="text-white">10 Pkt</span></div>
                <div>🎯 Perfektes Podium: <span className="text-white">+20 Pkt</span></div>
                <div>🚀 Sprint P1/P2/P3: <span className="text-white">15/10/5</span></div>
                <div>🔵 Quali Pole: <span className="text-white">10 Pkt</span></div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


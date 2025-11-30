'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile, Prediction, Race } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { Crown, Trophy, RefreshCw, Target, Zap, Calculator, Check, AlertCircle } from 'lucide-react'

interface Driver {
  driver_number: number
  full_name: string
}

interface LivePosition {
  position: number
  driver_number: number
  name_acronym?: string
}

interface LiveSession {
  session_name: string
  meeting_name: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [drivers, setDrivers] = useState<Driver[]>([])
  
  // Current Race & Predictions
  const [currentRace, setCurrentRace] = useState<Race | null>(null)
  const [allPredictions, setAllPredictions] = useState<{
    qualifying: { user: Profile, prediction: Prediction }[]
    sprint: { user: Profile, prediction: Prediction }[]
    race: { user: Profile, prediction: Prediction }[]
  }>({ qualifying: [], sprint: [], race: [] })
  
  // Live Simulation
  const [livePositions, setLivePositions] = useState<LivePosition[]>([])
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [simulatedStandings, setSimulatedStandings] = useState<{
    profile: Profile
    basePoints: number
    livePoints: number
    total: number
  }[]>([])
  
  // Points Calculation
  const [calculating, setCalculating] = useState(false)
  const [calcResult, setCalcResult] = useState<{success: boolean, message: string} | null>(null)
  const [lastRaceWithResults, setLastRaceWithResults] = useState<string | null>(null)

  // Daten laden
  const fetchData = useCallback(async () => {
      try {
      // Spieler
      const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .order('total_points', { ascending: false })
      
      if (profilesData) setPlayers(profilesData)
      
      // Fahrer
      const driversRes = await fetch('/api/drivers')
      const driversJson = await driversRes.json()
      if (driversJson.drivers) setDrivers(driversJson.drivers)
      
      // Aktuelles Rennen
      const { data: races } = await supabase
        .from('races')
        .select('*')
        .eq('season', 2025)
        .gte('race_date', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()) // 2 Tage zurück
        .order('race_date', { ascending: true })
        .limit(1)
      
      if (races && races.length > 0) {
        const race = races[0]
        setCurrentRace(race)
        
        // Alle Predictions für dieses Rennen
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .eq('race_id', race.id)
        
        if (preds && profilesData) {
          const grouped = {
            qualifying: [] as { user: Profile, prediction: Prediction }[],
            sprint: [] as { user: Profile, prediction: Prediction }[],
            race: [] as { user: Profile, prediction: Prediction }[]
          }
          
          preds.forEach(pred => {
            const userProfile = profilesData.find(p => p.id === pred.user_id)
            if (userProfile && grouped[pred.session_type as keyof typeof grouped]) {
              grouped[pred.session_type as keyof typeof grouped].push({
                user: userProfile,
                prediction: pred
              })
            }
          })
          
          setAllPredictions(grouped)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingData(false)
    }
  }, [])

  // Live-Positionen laden
  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/live-positions')
      if (!res.ok) return
      
      const data = await res.json()
      setLivePositions(data.positions || [])
      setLiveSession(data.sessionInfo)
      setIsLive(data.isActive || false)
      
      // Simulierte Punkte berechnen wenn live
      if (data.isActive && data.positions?.length > 0 && players.length > 0) {
        const positions = data.positions as LivePosition[]
        const p1 = positions[0]?.driver_number || 0
        const p2 = positions[1]?.driver_number || 0
        const p3 = positions[2]?.driver_number || 0
        
        // Session-Typ bestimmen
        const sessionName = (data.sessionInfo?.session_name || '').toLowerCase()
        let sessionType: 'qualifying' | 'sprint' | 'race' = 'race'
        if (sessionName.includes('quali')) sessionType = 'qualifying'
        else if (sessionName.includes('sprint') && !sessionName.includes('quali')) sessionType = 'sprint'
        
        const predictions = allPredictions[sessionType] || []
        
        const standings = players.map(player => {
          const playerPred = predictions.find(p => p.user.id === player.id)
          let livePoints = 0
          
          if (playerPred) {
            const pred = playerPred.prediction
            if (sessionType === 'qualifying') {
              if (pred.pole_driver === p1) livePoints = 10
            } else if (sessionType === 'sprint') {
              if (pred.p1_driver === p1) livePoints += 15
              if (pred.p2_driver === p2) livePoints += 10
              if (pred.p3_driver === p3) livePoints += 5
            } else {
              if (pred.p1_driver === p1) livePoints += 25
              if (pred.p2_driver === p2) livePoints += 18
              if (pred.p3_driver === p3) livePoints += 15
            }
          }
          
          return {
            profile: player,
            basePoints: player.total_points || 0,
            livePoints,
            total: (player.total_points || 0) + livePoints
          }
        }).sort((a, b) => b.total - a.total)
        
        setSimulatedStandings(standings)
      }
    } catch (e) {
      console.error(e)
    }
  }, [players, allPredictions])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchLive()
    const interval = setInterval(fetchLive, 120000) // Alle 2 Min
    return () => clearInterval(interval)
  }, [fetchLive])

  // Check ob Ergebnisse da sind
  useEffect(() => {
    async function checkResults() {
      try {
        const res = await fetch('https://api.jolpi.ca/ergast/f1/current/last/results/')
        const data = await res.json()
        const race = data.MRData?.RaceTable?.Races?.[0]
        if (race?.Results?.length > 0) {
          setLastRaceWithResults(race.raceName)
        }
      } catch (e) {
        console.error(e)
      }
    }
    checkResults()
  }, [])

  // Punkte berechnen
  const calculatePoints = async () => {
    setCalculating(true)
    setCalcResult(null)
    
    try {
      const res = await fetch('/api/calculate-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionType: 'all' })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setCalcResult({
          success: true,
          message: `Punkte für ${data.raceName} berechnet!`
        })
        // Daten neu laden
        setTimeout(() => {
          fetchData()
          setCalcResult(null)
        }, 2000)
      } else {
        setCalcResult({
          success: false,
          message: data.error || 'Fehler beim Berechnen'
        })
      }
    } catch (e) {
      setCalcResult({
        success: false,
        message: 'Server-Fehler'
      })
    } finally {
      setCalculating(false)
    }
  }

  const getDriverName = (num?: number | null) => {
    if (!num) return '-'
    const driver = drivers.find(d => d.driver_number === num)
    return driver?.full_name?.split(' ').pop() || `#${num}`
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
    </div>
    )
  }

  const userRank = user ? players.findIndex(p => p.id === user?.id) + 1 : 0

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold text-white">Rangliste</h1>
          </div>
          
          {/* Punkte berechnen Button */}
          {lastRaceWithResults && (
            <button
              onClick={calculatePoints}
              disabled={calculating}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                calculating 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {calculating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4" />
              )}
              {calculating ? 'Berechne...' : 'Punkte aktualisieren'}
            </button>
          )}
        </div>

        {/* Calc Result */}
        {calcResult && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            calcResult.success 
              ? 'bg-green-900/30 border border-green-700/50' 
              : 'bg-red-900/30 border border-red-700/50'
          }`}>
            {calcResult.success ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={calcResult.success ? 'text-green-400' : 'text-red-400'}>
              {calcResult.message}
            </span>
          </div>
        )}

        {/* LIVE SIMULATION */}
        {isLive && simulatedStandings.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-xl border border-green-700/50 overflow-hidden">
            <div className="p-4 border-b border-green-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <h2 className="font-bold text-green-400">
                  🏎️ LIVE: {liveSession?.session_name}
                </h2>
              </div>
              <span className="text-xs text-gray-500">Simulierte Punkte</span>
            </div>
            
            {/* Live Positionen */}
            <div className="px-4 py-3 border-b border-green-800/30 bg-black/20">
              <div className="flex gap-2 overflow-x-auto">
                {livePositions.slice(0, 6).map((pos, idx) => (
                  <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm ${
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    idx === 1 ? 'bg-gray-500/20 text-gray-300' :
                    idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-800/50 text-gray-400'
                  }`}>
                    <span className="font-bold">P{pos.position}</span>
                    <span>{pos.name_acronym || `#${pos.driver_number}`}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Rangliste */}
            <div className="divide-y divide-green-900/30">
              {simulatedStandings.slice(0, 10).map((standing, idx) => {
                const isMe = standing.profile.id === user?.id
                return (
                  <div key={standing.profile.id} className={`flex items-center justify-between px-4 py-3 ${isMe ? 'bg-red-950/30' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-orange-500 text-black' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`font-medium ${isMe ? 'text-red-400' : 'text-white'}`}>
                        {standing.profile.username}
                        {isMe && <span className="text-gray-500 ml-1">(Du)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm ${standing.livePoints > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                        {standing.livePoints > 0 ? `+${standing.livePoints}` : '+0'}
                      </span>
                      <span className="font-bold text-white text-lg">{standing.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Podium */}
        {players.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-8">
            {/* 2. Platz */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-xl font-bold text-black mb-2">
                {players[1].username.charAt(0).toUpperCase()}
              </div>
              <div className="text-gray-300 font-medium text-sm truncate max-w-16">{players[1].username}</div>
              <div className="text-gray-400 text-xs">{players[1].total_points} Pkt</div>
              <div className="w-16 h-14 bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-xl font-bold text-white">2</span>
              </div>
            </div>
            
            {/* 1. Platz */}
            <div className="flex flex-col items-center -mt-4">
              <div className="relative">
                <div className="w-18 h-18 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl font-bold text-black mb-2" style={{width: '4.5rem', height: '4.5rem'}}>
                  {players[0].username.charAt(0).toUpperCase()}
                </div>
                <Crown className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-yellow-400 font-bold truncate max-w-20">{players[0].username}</div>
              <div className="text-yellow-500 text-sm font-medium">{players[0].total_points} Pkt</div>
              <div className="w-20 h-20 bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-black">1</span>
              </div>
            </div>
            
            {/* 3. Platz */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold text-black mb-2">
                {players[2].username.charAt(0).toUpperCase()}
              </div>
              <div className="text-orange-400 font-medium text-sm truncate max-w-16">{players[2].username}</div>
              <div className="text-orange-500 text-xs">{players[2].total_points} Pkt</div>
              <div className="w-16 h-10 bg-gradient-to-t from-orange-700 to-orange-600 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-xl font-bold text-white">3</span>
              </div>
            </div>
          </div>
        )}

        {/* Alle Spieler Tabelle */}
        <div className="bg-[#111] rounded-xl overflow-hidden border border-gray-800 mb-8">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Alle Spieler
            </h2>
          </div>
          
          <div className="divide-y divide-gray-800/50">
            {players.map((player, idx) => {
              const isMe = player.id === user?.id
              return (
                <div key={player.id} className={`flex items-center justify-between px-4 py-3 ${isMe ? 'bg-red-950/30' : 'hover:bg-[#1a1a1a]'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-gray-800 text-gray-400'
                  }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <span className={`font-medium ${isMe ? 'text-red-400' : 'text-white'}`}>
                      {player.username}
                      </span>
                      {isMe && <span className="text-gray-500 text-sm ml-2">(Du)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-gray-500 text-sm">{player.predictions_count || 0} Tipps</span>
                    <span className="font-bold text-white text-lg">{player.total_points || 0}</span>
                  </div>
                </div>
              )
            })}
          </div>
          </div>

        {/* Alle Tipps für aktuelles Rennen */}
        {currentRace && (allPredictions.qualifying.length > 0 || allPredictions.sprint.length > 0 || allPredictions.race.length > 0) && (
          <div className="bg-[#111] rounded-xl overflow-hidden border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                {getCountryFlag(currentRace.race_name)} Tipps: {currentRace.race_name}
              </h2>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Qualifying */}
              {allPredictions.qualifying.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-3">QUALIFYING - Pole</h3>
                  <div className="flex flex-wrap gap-2">
                    {allPredictions.qualifying.map(({ user: u, prediction }) => (
                      <div key={u.id} className={`px-3 py-2 rounded-lg ${u.id === user?.id ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800'}`}>
                        <span className="text-gray-400 text-sm">{u.username}: </span>
                        <span className="text-blue-400 font-bold">{getDriverName(prediction.pole_driver)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sprint */}
              {allPredictions.sprint.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-3">SPRINT - Podium</h3>
                  <div className="space-y-2">
                    {allPredictions.sprint.map(({ user: u, prediction }) => (
                      <div key={u.id} className={`px-3 py-2 rounded-lg flex items-center justify-between ${u.id === user?.id ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800'}`}>
                        <span className="text-gray-400 text-sm">{u.username}</span>
                        <div className="flex gap-2">
                          <span className="text-yellow-400 font-bold">{getDriverName(prediction.p1_driver)}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-gray-300 font-bold">{getDriverName(prediction.p2_driver)}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-orange-400 font-bold">{getDriverName(prediction.p3_driver)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Race */}
              {allPredictions.race.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-3">RENNEN - Podium & Fastest Lap</h3>
                  <div className="space-y-2">
                    {allPredictions.race.map(({ user: u, prediction }) => (
                      <div key={u.id} className={`px-3 py-2 rounded-lg flex items-center justify-between ${u.id === user?.id ? 'bg-red-900/30 border border-red-700' : 'bg-gray-800'}`}>
                        <span className="text-gray-400 text-sm">{u.username}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400 font-bold">{getDriverName(prediction.p1_driver)}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-gray-300 font-bold">{getDriverName(prediction.p2_driver)}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-orange-400 font-bold">{getDriverName(prediction.p3_driver)}</span>
                          {prediction.fastest_lap_driver && (
                            <>
                              <span className="text-gray-600 mx-1">|</span>
                              <Zap className="w-3 h-3 text-purple-400" />
                              <span className="text-purple-400 text-sm">{getDriverName(prediction.fastest_lap_driver)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
            </div>
          )}
        </div>
          </div>
        )}
      </main>
    </div>
  )
}

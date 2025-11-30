'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile, Prediction, Race } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { Crown, Trophy, RefreshCw, Target, Zap, TrendingUp, Medal, Users } from 'lucide-react'

interface Driver {
  driver_number: number
  full_name: string
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [currentRace, setCurrentRace] = useState<Race | null>(null)
  const [allPredictions, setAllPredictions] = useState<{
    qualifying: { user: Profile, prediction: Prediction }[]
    sprint: { user: Profile, prediction: Prediction }[]
    race: { user: Profile, prediction: Prediction }[]
  }>({ qualifying: [], sprint: [], race: [] })

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
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const { data: races } = await supabase
        .from('races')
        .select('*')
        .eq('season', 2025)
        .gte('race_date', threeDaysAgo)
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

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
  const totalPoints = players.reduce((sum, p) => sum + (p.total_points || 0), 0)
  const totalPredictions = players.reduce((sum, p) => sum + (p.predictions_count || 0), 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Rangliste</h1>
            <p className="text-gray-500 text-sm">F1 Tippspiel 2025</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800 text-center">
            <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{players.length}</div>
            <div className="text-xs text-gray-500">Spieler</div>
          </div>
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800 text-center">
            <Target className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{totalPredictions}</div>
            <div className="text-xs text-gray-500">Tipps gesamt</div>
          </div>
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800 text-center">
            <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{totalPoints}</div>
            <div className="text-xs text-gray-500">Punkte gesamt</div>
          </div>
        </div>

        {/* Podium */}
        {players.length >= 2 && (
          <div className="flex items-end justify-center gap-6 mb-10 pt-8">
            {/* 2. Platz */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-3xl font-bold text-black mb-3 shadow-xl ring-4 ring-gray-500/30">
                {players[1]?.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-gray-300 font-bold text-lg truncate max-w-24">{players[1]?.username}</div>
              <div className="text-2xl font-bold text-white">{players[1]?.total_points}</div>
              <div className="text-gray-500 text-sm mb-2">{players[1]?.predictions_count || 0} Tipps</div>
              <div className="w-24 h-20 bg-gradient-to-t from-gray-700 to-gray-500 rounded-t-xl flex items-center justify-center shadow-xl">
                <Medal className="w-10 h-10 text-gray-300" />
              </div>
            </div>
            
            {/* 1. Platz */}
            <div className="flex flex-col items-center -mt-8">
              <Crown className="w-10 h-10 text-yellow-400 mb-2 drop-shadow-lg" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-4xl font-bold text-black mb-3 shadow-xl ring-4 ring-yellow-500/50">
                {players[0]?.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-yellow-400 font-bold text-xl truncate max-w-28">{players[0]?.username}</div>
              <div className="text-3xl font-bold text-white">{players[0]?.total_points}</div>
              <div className="text-gray-500 text-sm mb-2">{players[0]?.predictions_count || 0} Tipps</div>
              <div className="w-28 h-28 bg-gradient-to-t from-yellow-700 to-yellow-500 rounded-t-xl flex items-center justify-center shadow-xl">
                <Trophy className="w-12 h-12 text-yellow-300" />
              </div>
            </div>
            
            {/* 3. Platz */}
            {players[2] && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold text-black mb-3 shadow-xl ring-4 ring-orange-500/30">
                  {players[2].username.charAt(0).toUpperCase()}
                </div>
                <div className="text-orange-400 font-bold truncate max-w-20">{players[2].username}</div>
                <div className="text-xl font-bold text-white">{players[2].total_points}</div>
                <div className="text-gray-500 text-sm mb-2">{players[2].predictions_count || 0} Tipps</div>
                <div className="w-20 h-14 bg-gradient-to-t from-orange-800 to-orange-600 rounded-t-xl flex items-center justify-center shadow-xl">
                  <Medal className="w-8 h-8 text-orange-300" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alle Spieler */}
        <div className="bg-[#111] rounded-2xl overflow-hidden border border-gray-800 mb-8">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-bold text-white">Alle Spieler</h2>
          </div>
          
          <div className="divide-y divide-gray-800/50">
            {players.map((player, idx) => {
              const isMe = player.id === user?.id
              const avgPoints = player.predictions_count && player.predictions_count > 0
                ? (player.total_points / player.predictions_count).toFixed(1)
                : '0'
              
              return (
                <div key={player.id} className={`flex items-center justify-between px-4 py-4 ${isMe ? 'bg-red-950/20' : 'hover:bg-gray-900/50'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black text-lg' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-gray-800 text-gray-400 text-sm'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className={`font-bold ${isMe ? 'text-red-400' : 'text-white'}`}>
                        {player.username}
                        {isMe && <span className="text-gray-500 font-normal ml-2">(Du)</span>}
                      </div>
                      <div className="text-gray-500 text-sm">{player.predictions_count || 0} Tipps • Ø {avgPoints} Pkt</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{player.total_points}</div>
                    <div className="text-gray-500 text-xs">Punkte</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tipps für aktuelles Rennen */}
        {currentRace && (allPredictions.qualifying.length > 0 || allPredictions.sprint.length > 0 || allPredictions.race.length > 0) && (
          <div className="bg-[#111] rounded-2xl overflow-hidden border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-bold text-white flex items-center gap-2">
                {getCountryFlag(currentRace.race_name)} 
                <span className="ml-1">Tipps: {currentRace.race_name}</span>
              </h2>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Qualifying */}
              {allPredictions.qualifying.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    QUALIFYING - Pole Position
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allPredictions.qualifying.map(({ user: u, prediction }) => (
                      <div key={u.id} className={`px-4 py-2 rounded-xl ${u.id === user?.id ? 'bg-red-900/30 ring-1 ring-red-700' : 'bg-gray-800/50'}`}>
                        <span className="text-gray-400 text-sm">{u.username}:</span>
                        <span className="text-blue-400 font-bold ml-2">{getDriverName(prediction.pole_driver)}</span>
                        {prediction.points_earned > 0 && (
                          <span className="text-green-400 text-sm ml-2">+{prediction.points_earned}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sprint */}
              {allPredictions.sprint.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    SPRINT - Podium
                  </h3>
                  <div className="space-y-2">
                    {allPredictions.sprint.map(({ user: u, prediction }) => (
                      <div key={u.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${u.id === user?.id ? 'bg-red-900/30 ring-1 ring-red-700' : 'bg-gray-800/50'}`}>
                        <span className="text-gray-400">{u.username}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-yellow-400 font-bold">{getDriverName(prediction.p1_driver)}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-gray-300 font-bold">{getDriverName(prediction.p2_driver)}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-orange-400 font-bold">{getDriverName(prediction.p3_driver)}</span>
                          {prediction.points_earned > 0 && (
                            <span className="text-green-400 font-bold ml-2">+{prediction.points_earned}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Race */}
              {allPredictions.race.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    RENNEN - Podium & Fastest Lap
                  </h3>
                  <div className="space-y-2">
                    {allPredictions.race.map(({ user: u, prediction }) => (
                      <div key={u.id} className={`flex items-center justify-between px-4 py-3 rounded-xl ${u.id === user?.id ? 'bg-red-900/30 ring-1 ring-red-700' : 'bg-gray-800/50'}`}>
                        <span className="text-gray-400">{u.username}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-yellow-400 font-bold">{getDriverName(prediction.p1_driver)}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-gray-300 font-bold">{getDriverName(prediction.p2_driver)}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-orange-400 font-bold">{getDriverName(prediction.p3_driver)}</span>
                          {prediction.fastest_lap_driver && (
                            <>
                              <span className="text-gray-600 mx-1">|</span>
                              <Zap className="w-4 h-4 text-purple-400" />
                              <span className="text-purple-400">{getDriverName(prediction.fastest_lap_driver)}</span>
                            </>
                          )}
                          {prediction.points_earned > 0 && (
                            <span className="text-green-400 font-bold ml-2">+{prediction.points_earned}</span>
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

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile, Prediction, Race } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { Trophy, Crown, Loader2 } from 'lucide-react'

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
  const [predictions, setPredictions] = useState<{type: string, user: string, tip: string, points: number}[]>([])

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
        
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .eq('race_id', races[0].id)
        
        if (preds) {
          const formatted: {type: string, user: string, tip: string, points: number}[] = []
          
          preds.forEach(pred => {
            const profile = profilesData.find(p => p.id === pred.user_id)
            if (!profile) return
            
            if (pred.session_type === 'qualifying') {
              const driver = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.pole_driver)
              formatted.push({
                type: 'Quali',
                user: profile.username,
                tip: driver?.full_name?.split(' ').pop() || '-',
                points: pred.points_earned || 0
              })
            } else if (pred.session_type === 'sprint') {
              const d1 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p1_driver)
              const d2 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p2_driver)
              const d3 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p3_driver)
              formatted.push({
                type: 'Sprint',
                user: profile.username,
                tip: `${d1?.full_name?.split(' ').pop() || '-'} → ${d2?.full_name?.split(' ').pop() || '-'} → ${d3?.full_name?.split(' ').pop() || '-'}`,
                points: pred.points_earned || 0
              })
            } else if (pred.session_type === 'race') {
              const d1 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p1_driver)
              const d2 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p2_driver)
              const d3 = driversJson.drivers?.find((d: Driver) => d.driver_number === pred.p3_driver)
              formatted.push({
                type: 'Rennen',
                user: profile.username,
                tip: `${d1?.full_name?.split(' ').pop() || '-'} → ${d2?.full_name?.split(' ').pop() || '-'} → ${d3?.full_name?.split(' ').pop() || '-'}`,
                points: pred.points_earned || 0
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

        {/* Aktuelle Tipps */}
        {currentRace && predictions.length > 0 && (
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-3">
              {getCountryFlag(currentRace.race_name)} Tipps für {currentRace.race_name}
            </p>
            <div className="bg-zinc-900 rounded-2xl overflow-hidden">
              {predictions.map((pred, idx) => (
                <div key={idx} className="p-4 border-b border-zinc-800 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      pred.type === 'Quali' ? 'bg-blue-900 text-blue-300' :
                      pred.type === 'Sprint' ? 'bg-purple-900 text-purple-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {pred.type}
                    </span>
                    {pred.points > 0 && (
                      <span className="text-green-400 font-bold">+{pred.points}</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{pred.user}</p>
                  <p className="text-white font-medium">{pred.tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile } from '@/lib/supabase'
import { Crown, Trophy, RefreshCw, TrendingUp, Target, Flame, Award } from 'lucide-react'

export default function LeaderboardPage() {
  const { user, profile } = useAuth()
  const [players, setPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('total_points', { ascending: false })
          .limit(100)
        if (data) setPlayers(data)
      } catch (e) { console.error('Leaderboard error:', e) }
      finally { setLoadingData(false) }
    }
    fetchLeaderboard()
  }, [])

  if (loadingData) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
    </div>
  }

  const userRank = user ? players.findIndex(p => p.id === user?.id) + 1 : 0
  const totalPoints = players.reduce((sum, p) => sum + (p.total_points || 0), 0)
  const totalPredictions = players.reduce((sum, p) => sum + (p.predictions_count || 0), 0)
  const leader = players[0]
  const avgPointsPerPlayer = players.length > 0 ? Math.round(totalPoints / players.length) : 0

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-8 h-8 text-yellow-500" />
          <h1 className="text-2xl font-bold text-white">Rangliste</h1>
        </div>
        <p className="text-gray-500 text-sm mb-8">F1-Nasen Saison 2025</p>

        {/* Podium für Top 3 */}
        {players.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-8">
            {/* 2. Platz */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-2xl font-bold text-black mb-2">
                {players[1].username.charAt(0).toUpperCase()}
              </div>
              <div className="text-gray-300 font-medium text-sm truncate max-w-20">{players[1].username}</div>
              <div className="text-gray-400 text-xs">{players[1].total_points} Pkt</div>
              <div className="w-20 h-16 bg-gradient-to-t from-gray-600 to-gray-500 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
            </div>
            
            {/* 1. Platz */}
            <div className="flex flex-col items-center -mt-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-3xl font-bold text-black mb-2">
                  {players[0].username.charAt(0).toUpperCase()}
                </div>
                <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-yellow-400 font-bold truncate max-w-24">{players[0].username}</div>
              <div className="text-yellow-500 text-sm font-medium">{players[0].total_points} Pkt</div>
              <div className="w-24 h-24 bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-3xl font-bold text-black">1</span>
              </div>
            </div>
            
            {/* 3. Platz */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold text-black mb-2">
                {players[2].username.charAt(0).toUpperCase()}
              </div>
              <div className="text-orange-400 font-medium text-sm truncate max-w-20">{players[2].username}</div>
              <div className="text-orange-500 text-xs">{players[2].total_points} Pkt</div>
              <div className="w-20 h-12 bg-gradient-to-t from-orange-700 to-orange-600 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">Gesamtpunkte</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalPoints}</div>
          </div>
          
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Tipps gesamt</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalPredictions}</div>
          </div>
          
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Ø pro Spieler</span>
            </div>
            <div className="text-2xl font-bold text-white">{avgPointsPerPlayer}</div>
          </div>
          
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">Führender</span>
            </div>
            <div className="text-lg font-bold text-yellow-400 truncate">{leader?.username || '-'}</div>
          </div>
        </div>

        {/* User Position */}
        {profile && userRank > 0 && (
          <div className="bg-gradient-to-r from-red-950 to-red-900/30 border border-red-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-xl font-bold">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase">Deine Position</div>
                  <div className="text-white font-bold text-lg">{profile.username}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-red-500">#{userRank}</div>
                <div className="text-sm text-gray-400">{profile.total_points} Punkte</div>
              </div>
            </div>
            {userRank > 1 && (
              <div className="mt-3 pt-3 border-t border-red-800/30 text-sm text-gray-400">
                {players[userRank - 2].total_points - profile.total_points} Punkte Rückstand auf Platz {userRank - 1}
              </div>
            )}
          </div>
        )}

        {/* Not logged in hint */}
        {!user && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                <Link href="/login" className="text-red-500 hover:underline">Einloggen</Link> um mitzutippen!
              </div>
              <Link href="/register" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Registrieren
              </Link>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-[#111] rounded-xl overflow-hidden border border-gray-800">
          <div className="p-4 border-b border-gray-800 bg-[#0a0a0a]">
            <h2 className="font-bold text-white">Alle Spieler</h2>
          </div>
          
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 font-medium">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Spieler</div>
            <div className="col-span-2 text-center">Tipps</div>
            <div className="col-span-2 text-center">Ø/Tipp</div>
            <div className="col-span-2 text-right">Punkte</div>
          </div>
          
          <div className="divide-y divide-gray-800/50">
            {players.map((player, index) => {
              const position = index + 1
              const isCurrentUser = player.id === user?.id
              const avgPerTip = player.predictions_count && player.predictions_count > 0
                ? (player.total_points / player.predictions_count).toFixed(1)
                : '0'
              const pointsToNext = index > 0 
                ? players[index - 1].total_points - player.total_points 
                : 0

              return (
                <div
                  key={player.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                    isCurrentUser ? 'bg-red-950/30' : 'hover:bg-[#1a1a1a]'
                  } transition-colors`}
                >
                  {/* Position */}
                  <div className="col-span-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                      position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {position}
                    </div>
                  </div>

                  {/* Avatar + Name */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isCurrentUser ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-gray-700 to-gray-800'
                    }`}>
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className={`font-medium truncate ${isCurrentUser ? 'text-red-400' : 'text-white'}`}>
                        {player.username}
                        {isCurrentUser && <span className="text-xs text-gray-500 ml-1">(Du)</span>}
                      </div>
                      {pointsToNext > 0 && (
                        <div className="text-[10px] text-gray-600">-{pointsToNext} zu #{position - 1}</div>
                      )}
                    </div>
                  </div>

                  {/* Predictions Count */}
                  <div className="col-span-2 text-center text-gray-400">
                    {player.predictions_count || 0}
                  </div>

                  {/* Average */}
                  <div className="col-span-2 text-center">
                    <span className={`text-sm ${
                      parseFloat(avgPerTip) >= 10 ? 'text-green-400' :
                      parseFloat(avgPerTip) >= 5 ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {avgPerTip}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 text-right">
                    <span className={`text-lg font-bold ${
                      position === 1 ? 'text-yellow-400' :
                      position === 2 ? 'text-gray-300' :
                      position === 3 ? 'text-orange-400' :
                      'text-white'
                    }`}>
                      {player.total_points || 0}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {players.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Noch keine Spieler registriert</p>
              <Link href="/register" className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Erster sein!
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

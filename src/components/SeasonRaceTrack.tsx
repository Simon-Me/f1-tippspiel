'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CAR_ITEMS } from '@/lib/shopItems'
import { Trophy, Medal, Car } from 'lucide-react'
import Avatar from './Avatar'

interface PlayerWithCar {
  id: string
  username: string
  total_points: number
  avatar_url?: string
  equippedCarId?: string
  equippedCarName?: string
  equippedCarImage?: string
}

interface SeasonRaceTrackProps {
  currentUserId?: string
}

// Platzhalter TopView - Opel TopView
const DEFAULT_CAR_TOP = '/cars/top/opel.png'

export default function SeasonRaceTrack({ currentUserId }: SeasonRaceTrackProps) {
  const [players, setPlayers] = useState<PlayerWithCar[]>([])
  const [maxPoints, setMaxPoints] = useState(100)
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithCar | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })

      if (!profiles) {
        setLoading(false)
        return
      }

      // Lade equipped cars
      const { data: userItems } = await supabase
        .from('user_items')
        .select('user_id, item_id, equipped')
        .eq('equipped', true)

      const userCarMap: Record<string, { id: string, name: string, image: string }> = {}
      userItems?.forEach(item => {
        const car = CAR_ITEMS.find(c => c.id === item.item_id)
        if (car) {
          userCarMap[item.user_id] = { id: car.id, name: car.name, image: car.image }
        }
      })

      const topPoints = Math.max(profiles[0]?.total_points || 0, 30)
      setMaxPoints(topPoints)

      const playersWithCars: PlayerWithCar[] = profiles.map(p => ({
        id: p.id,
        username: p.username,
        total_points: p.total_points || 0,
        avatar_url: p.avatar_url,
        equippedCarId: userCarMap[p.id]?.id,
        equippedCarName: userCarMap[p.id]?.name,
        equippedCarImage: userCarMap[p.id]?.image
      }))

      setPlayers(playersWithCars)
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-4 animate-pulse">
        <div className="h-32 bg-zinc-800 rounded-xl" />
      </div>
    )
  }

  if (players.length === 0) return null

  const sortedPlayers = [...players].sort((a, b) => b.total_points - a.total_points)

  return (
    <div className="bg-gradient-to-r from-green-950/20 via-zinc-900 to-yellow-950/20 rounded-2xl overflow-hidden border border-zinc-800 w-full max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <Trophy className="w-5 h-5 text-yellow-400" />
          WM 2025
        </h3>
        <span className="text-sm text-gray-500">{maxPoints} Pkt</span>
      </div>

      {/* Strecke */}
      <div className="relative px-6 py-6" style={{ minHeight: `${sortedPlayers.length * 70 + 40}px` }}>
        {/* Start/Ziel Linien */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-green-500/50" />
        <div className="absolute right-8 top-0 bottom-0 w-2 bg-gradient-to-b from-white via-black to-white"
             style={{ backgroundSize: '100% 10px' }} />

        {/* Spieler */}
        {sortedPlayers.map((player) => {
          const position = maxPoints > 0 
            ? Math.min((player.total_points / maxPoints) * 75 + 10, 85)
            : 10
          
          return (
            <div
              key={player.id}
              className="relative flex items-center h-16 mb-2 group"
              style={{ paddingLeft: `${position}%` }}
              onMouseEnter={() => setSelectedPlayer(player)}
              onMouseLeave={() => setSelectedPlayer(null)}
            >
              {/* Auto */}
              <div className="relative flex items-center transition-all cursor-pointer group-hover:z-20 group-hover:scale-105">
                <img 
                  src={DEFAULT_CAR_TOP}
                  alt=""
                  className="h-14 md:h-16 w-auto object-contain"
                  style={{ transform: 'rotate(180deg)' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Skala */}
      <div className="flex justify-between px-8 pb-4 text-xs text-gray-600">
        <span>0</span>
        <span>{Math.round(maxPoints/4)}</span>
        <span>{Math.round(maxPoints/2)}</span>
        <span>{Math.round(maxPoints*3/4)}</span>
        <span>{maxPoints}</span>
      </div>

      {/* Spieler Detail Popup - zentriert */}
      {selectedPlayer && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900/95 backdrop-blur-sm rounded-3xl border border-zinc-700 w-96 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center gap-4">
                <Avatar url={selectedPlayer.avatar_url} username={selectedPlayer.username} size="xl" />
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedPlayer.username}</h3>
                  <div className="flex items-center gap-2 text-base mt-1">
                    <Medal className="w-5 h-5 text-yellow-400" />
                    <span className="text-gray-400">
                      Rang #{sortedPlayers.findIndex(p => p.id === selectedPlayer.id) + 1}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-6 space-y-4">
              {/* Punkte */}
              <div className="flex items-center justify-between bg-zinc-800/50 rounded-xl p-4">
                <span className="text-gray-400">Punkte</span>
                <span className="text-3xl font-bold text-yellow-400">{selectedPlayer.total_points}</span>
              </div>

              {/* Auto */}
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                  <Car className="w-4 h-4" />
                  <span>Fahrzeug</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <img 
                    src={selectedPlayer.equippedCarImage || '/cars/opelcorsa.webp'} 
                    alt={selectedPlayer.equippedCarName || 'Standard'}
                    className="h-40 w-auto object-contain"
                  />
                  <span className="font-semibold text-white text-lg">
                    {selectedPlayer.equippedCarName || <span className="text-gray-500 italic">Kein Auto</span>}
                  </span>
                </div>
              </div>

              {/* Fortschritt */}
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">WM-Fortschritt</span>
                  <span className="text-white font-medium">{Math.round((selectedPlayer.total_points / maxPoints) * 100)}%</span>
                </div>
                <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full"
                    style={{ width: `${Math.min((selectedPlayer.total_points / maxPoints) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

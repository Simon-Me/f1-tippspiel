'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CAR_ITEMS } from '@/lib/shopItems'
import { Trophy } from 'lucide-react'

interface PlayerWithCar {
  id: string
  username: string
  total_points: number
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

      const userCarMap: Record<string, string> = {}
      userItems?.forEach(item => {
        const car = CAR_ITEMS.find(c => c.id === item.item_id)
        if (car) {
          // Später: TopView Bilder pro Auto
          userCarMap[item.user_id] = car.image
        }
      })

      const topPoints = Math.max(profiles[0]?.total_points || 0, 30)
      setMaxPoints(topPoints)

      const playersWithCars: PlayerWithCar[] = profiles.map(p => ({
        id: p.id,
        username: p.username,
        total_points: p.total_points || 0,
        equippedCarImage: userCarMap[p.id]
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
    <div className="bg-gradient-to-r from-green-950/20 via-zinc-900 to-yellow-950/20 rounded-2xl overflow-hidden border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          WM 2025
        </h3>
        <span className="text-xs text-gray-500">{maxPoints} Pkt</span>
      </div>

      {/* Strecke */}
      <div className="relative p-4" style={{ minHeight: `${sortedPlayers.length * 50 + 20}px` }}>
        {/* Start/Ziel Linien */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-green-500/50" />
        <div className="absolute right-6 top-0 bottom-0 w-1 bg-gradient-to-b from-white via-black to-white"
             style={{ backgroundSize: '100% 8px' }} />

        {/* Spieler */}
        {sortedPlayers.map((player, index) => {
          const isMe = player.id === currentUserId
          const position = maxPoints > 0 
            ? Math.min((player.total_points / maxPoints) * 80 + 8, 88)
            : 8
          
          return (
            <div
              key={player.id}
              className="relative flex items-center h-12 mb-1"
              style={{ paddingLeft: `${position}%` }}
            >
              {/* Auto */}
              <div className={`relative flex items-center gap-1 transition-all ${isMe ? 'scale-110 z-10' : ''}`}>
                <img 
                  src={DEFAULT_CAR_TOP}
                  alt=""
                  className={`h-8 w-auto object-contain ${isMe ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''}`}
                  style={{ 
                    filter: isMe ? 'none' : 'grayscale(30%) brightness(0.8)',
                    transform: 'rotate(-90deg)'
                  }}
                />
                {/* Name + Punkte */}
                <span className={`text-[10px] font-medium whitespace-nowrap ${isMe ? 'text-red-400' : 'text-gray-400'}`}>
                  {player.username} <span className="text-gray-500">({player.total_points})</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Skala */}
      <div className="flex justify-between px-6 pb-2 text-[10px] text-gray-600">
        <span>0</span>
        <span>{Math.round(maxPoints/2)}</span>
        <span>{maxPoints}</span>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { CAR_ITEMS } from '@/lib/shopItems'
import { Flag, Trophy } from 'lucide-react'

interface PlayerWithCar {
  id: string
  username: string
  avatar_url?: string
  total_points: number
  equippedCar?: string
  carImage?: string
}

interface SeasonRaceTrackProps {
  currentUserId?: string
}

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

      const { data: userItems } = await supabase
        .from('user_items')
        .select('user_id, item_id, equipped')

      const userCarMap: Record<string, string> = {}
      userItems?.forEach(item => {
        if (item.item_id.startsWith('car_') || CAR_ITEMS.find(c => c.id === item.item_id)) {
          if (item.equipped || !userCarMap[item.user_id]) {
            userCarMap[item.user_id] = item.item_id
          }
        }
      })

      const topPoints = Math.max(profiles[0]?.total_points || 0, 50)
      setMaxPoints(topPoints)

      const playersWithCars: PlayerWithCar[] = profiles.map(p => {
        const carId = userCarMap[p.id]
        const car = CAR_ITEMS.find(c => c.id === carId)
        return {
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          total_points: p.total_points || 0,
          equippedCar: carId,
          carImage: car?.image
        }
      })

      setPlayers(playersWithCars)
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse">
        <div className="h-48 bg-zinc-800 rounded-xl" />
      </div>
    )
  }

  if (players.length === 0) return null

  // Sortiere nach Punkten für die Bahnen-Zuweisung
  const sortedPlayers = [...players].sort((a, b) => b.total_points - a.total_points)

  return (
    <div className="bg-gradient-to-b from-zinc-900 via-zinc-900 to-black rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          WM Rennen 2025
        </h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-green-400" />
            <span className="text-gray-400">Start</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400">{maxPoints} Pkt</span>
          </div>
        </div>
      </div>

      {/* Rennstrecke */}
      <div className="p-4">
        <div className="relative bg-gradient-to-r from-green-950/30 via-zinc-800 to-yellow-950/30 rounded-xl overflow-hidden"
             style={{ minHeight: `${Math.max(sortedPlayers.length * 70, 200)}px` }}>
          
          {/* Start Linie */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 via-green-500 to-green-400" />
          <div className="absolute left-4 top-4 text-green-400 font-bold text-xs">START</div>
          
          {/* Ziel Linie (Schachbrett) */}
          <div className="absolute right-8 top-0 bottom-0 w-3"
               style={{ 
                 background: 'repeating-linear-gradient(0deg, white 0px, white 10px, black 10px, black 20px)'
               }} />
          <div className="absolute right-4 top-4 text-yellow-400 font-bold text-xs flex items-center gap-1">
            <Trophy className="w-4 h-4" /> ZIEL
          </div>

          {/* Bahnen-Linien */}
          {sortedPlayers.map((_, i) => (
            <div 
              key={i}
              className="absolute left-12 right-12 border-b border-dashed border-zinc-700/50"
              style={{ top: `${(i + 1) * 70 - 10}px` }}
            />
          ))}

          {/* Spieler */}
          {sortedPlayers.map((player, index) => {
            const isMe = player.id === currentUserId
            const position = maxPoints > 0 
              ? Math.min((player.total_points / maxPoints) * 75 + 10, 85) // 10-85% der Breite
              : 10
            const topPosition = index * 70 + 20 // Jeder Spieler bekommt seine eigene Bahn
            
            return (
              <div
                key={player.id}
                className="absolute flex items-center transition-all duration-1000 ease-out"
                style={{
                  left: `${position}%`,
                  top: `${topPosition}px`,
                  transform: 'translateX(-50%)',
                  zIndex: isMe ? 20 : 10
                }}
              >
                {/* Rang */}
                <div className={`absolute -left-14 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${index === 0 ? 'bg-yellow-500 text-black' : 
                    index === 1 ? 'bg-gray-400 text-black' : 
                    index === 2 ? 'bg-orange-500 text-black' : 
                    'bg-zinc-700 text-gray-300'}`}>
                  {index + 1}
                </div>

                {/* Auto + Info */}
                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all
                  ${isMe 
                    ? 'bg-red-600/90 ring-2 ring-red-400 scale-110' 
                    : 'bg-zinc-800/90 hover:bg-zinc-700/90'}`}>
                  
                  {/* Auto */}
                  <div className="w-16 h-10 flex items-center justify-center">
                    {player.carImage ? (
                      <img 
                        src={player.carImage} 
                        alt=""
                        className="w-14 h-8 object-contain"
                      />
                    ) : (
                      <svg viewBox="0 0 48 24" className="w-14 h-8">
                        <rect x="4" y="6" width="40" height="12" rx="3" 
                              fill={isMe ? '#ef4444' : '#666'} />
                        <rect x="28" y="2" width="12" height="8" rx="2" 
                              fill={isMe ? '#dc2626' : '#555'} />
                        <circle cx="12" cy="18" r="4" fill="#222" stroke="#444" strokeWidth="1" />
                        <circle cx="36" cy="18" r="4" fill="#222" stroke="#444" strokeWidth="1" />
                        <rect x="8" y="8" width="6" height="4" rx="1" fill="#333" />
                      </svg>
                    )}
                  </div>

                  {/* Name */}
                  <div className="min-w-[80px]">
                    <p className={`font-bold text-sm truncate ${isMe ? 'text-white' : 'text-gray-200'}`}>
                      {player.username}
                    </p>
                    <p className={`text-xs ${isMe ? 'text-red-200' : 'text-gray-500'}`}>
                      {player.total_points} Pkt
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Punkteskala */}
        <div className="flex justify-between mt-3 px-8 text-xs text-gray-500">
          <span>0</span>
          <span>{Math.round(maxPoints * 0.25)}</span>
          <span>{Math.round(maxPoints * 0.5)}</span>
          <span>{Math.round(maxPoints * 0.75)}</span>
          <span>{maxPoints}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 bg-zinc-800/50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-red-600 rounded" />
              <span>Du</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-zinc-700 rounded" />
              <span>Andere</span>
            </div>
          </div>
          <span>🛒 Autos aus dem Shop werden hier angezeigt!</span>
        </div>
      </div>
    </div>
  )
}

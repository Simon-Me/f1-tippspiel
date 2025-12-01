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
      // Lade alle Spieler
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })

      if (!profiles) {
        setLoading(false)
        return
      }

      // Lade alle user_items um zu sehen wer welches Auto hat
      const { data: userItems } = await supabase
        .from('user_items')
        .select('user_id, item_id, equipped')

      // Erstelle Map von User zu ihrem ausgewählten Auto
      const userCarMap: Record<string, string> = {}
      userItems?.forEach(item => {
        // Nimm das erste Auto oder das equipped Auto
        if (item.item_id.startsWith('car_') || CAR_ITEMS.find(c => c.id === item.item_id)) {
          if (item.equipped || !userCarMap[item.user_id]) {
            userCarMap[item.user_id] = item.item_id
          }
        }
      })

      // Berechne max Punkte (mindestens 100 für bessere Darstellung)
      const topPoints = Math.max(profiles[0]?.total_points || 0, 100)
      setMaxPoints(topPoints)

      // Erstelle Spieler mit Auto-Info
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
        <div className="h-32 bg-zinc-800 rounded-xl" />
      </div>
    )
  }

  if (players.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          WM Stand 2025
        </h3>
        <span className="text-xs text-gray-500">
          {maxPoints} Punkte Führung
        </span>
      </div>

      {/* Strecke */}
      <div className="relative">
        {/* Track Background */}
        <div className="relative h-40 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 rounded-xl overflow-hidden">
          {/* Track Lines */}
          <div className="absolute inset-0">
            {/* Mittellinie */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 transform -translate-y-1/2" 
                 style={{ backgroundImage: 'repeating-linear-gradient(90deg, white 0, white 20px, transparent 20px, transparent 40px)' }} />
            
            {/* Start/Ziel Markierungen */}
            <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-white via-gray-400 to-white opacity-50" />
            <div className="absolute right-4 top-0 bottom-0 w-2 bg-gradient-to-b from-white via-black to-white" 
                 style={{ backgroundImage: 'repeating-linear-gradient(0deg, white 0, white 8px, black 8px, black 16px)' }} />
          </div>

          {/* Start Flag */}
          <div className="absolute left-2 top-2 text-gray-400">
            <Flag className="w-4 h-4" />
          </div>

          {/* Finish Flag */}
          <div className="absolute right-2 top-2 text-yellow-400">
            <Trophy className="w-5 h-5" />
          </div>

          {/* Spieler Autos */}
          {players.map((player, index) => {
            const isMe = player.id === currentUserId
            const position = maxPoints > 0 ? (player.total_points / maxPoints) * 85 + 5 : 5 // 5-90% der Strecke
            const lane = index % 4 // 4 Bahnen
            const topPosition = 15 + (lane * 28) // Verteile auf Bahnen
            
            return (
              <div
                key={player.id}
                className={`absolute transition-all duration-1000 ease-out ${isMe ? 'z-20' : 'z-10'}`}
                style={{
                  left: `${position}%`,
                  top: `${topPosition}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {/* Auto Container */}
                <div className={`relative group ${isMe ? 'scale-125' : ''}`}>
                  {/* Auto Icon/Bild */}
                  <div className={`w-12 h-8 flex items-center justify-center rounded-lg transition-transform
                    ${isMe ? 'bg-red-600 ring-2 ring-red-400 ring-offset-2 ring-offset-zinc-800' : 'bg-zinc-600'}`}>
                    {player.carImage ? (
                      <img 
                        src={player.carImage} 
                        alt={player.username}
                        className="w-10 h-6 object-contain"
                      />
                    ) : (
                      // Platzhalter Icon
                      <svg viewBox="0 0 24 16" className="w-10 h-6">
                        <rect x="2" y="4" width="20" height="8" rx="2" 
                              fill={isMe ? '#ef4444' : '#888'} />
                        <circle cx="6" cy="12" r="2" fill="#333" />
                        <circle cx="18" cy="12" r="2" fill="#333" />
                        <rect x="14" y="2" width="6" height="4" rx="1" 
                              fill={isMe ? '#dc2626' : '#666'} />
                      </svg>
                    )}
                  </div>

                  {/* Spielername Tooltip */}
                  <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap
                    text-xs font-medium px-2 py-0.5 rounded
                    ${isMe ? 'bg-red-600 text-white' : 'bg-zinc-700 text-gray-300'}`}>
                    {player.username}
                  </div>

                  {/* Punkte Badge */}
                  <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2
                    text-xs font-bold px-1.5 py-0.5 rounded
                    ${isMe ? 'bg-yellow-500 text-black' : 'bg-zinc-600 text-white'}`}>
                    {player.total_points}
                  </div>

                  {/* Platz Badge für Top 3 */}
                  {index < 3 && (
                    <div className={`absolute -top-4 -right-3 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? 'bg-yellow-500 text-black' : 
                        index === 1 ? 'bg-gray-400 text-black' : 
                        'bg-orange-500 text-black'}`}>
                      {index + 1}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Punkteskala */}
        <div className="flex justify-between mt-2 text-xs text-gray-500 px-4">
          <span>0 Pkt</span>
          <span>{Math.round(maxPoints / 2)} Pkt</span>
          <span>{maxPoints} Pkt</span>
        </div>
      </div>

      {/* Mini Legende */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-red-600 rounded" />
          <span>Du</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-zinc-600 rounded" />
          <span>Andere</span>
        </div>
        <span className="text-gray-600">•</span>
        <span>Gekaufte Autos werden angezeigt!</span>
      </div>
    </div>
  )
}


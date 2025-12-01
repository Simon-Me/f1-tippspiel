'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { supabase, Profile } from '@/lib/supabase'
import { CAR_ITEMS, RARITY_COLORS, CarItem } from '@/lib/shopItems'
import { 
  Trophy, 
  Target,
  ArrowLeft,
  ShoppingBag,
  Loader2,
  Coins,
  User
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function PlayerProfilePage() {
  const params = useParams()
  const playerId = params.id as string
  
  const [player, setPlayer] = useState<Profile | null>(null)
  const [ownedCars, setOwnedCars] = useState<CarItem[]>([])
  const [rank, setRank] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchPlayer() {
      if (!playerId) return
      
      try {
        // Spieler laden
        const { data: playerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', playerId)
          .single()
        
        if (!playerData) {
          setNotFound(true)
          setLoading(false)
          return
        }
        
        setPlayer(playerData)
        
        // Rang berechnen
        const { data: allPlayers } = await supabase
          .from('profiles')
          .select('id')
          .order('total_points', { ascending: false })
        
        if (allPlayers) {
          const playerRank = allPlayers.findIndex(p => p.id === playerId) + 1
          setRank(playerRank)
        }
        
        // Gekaufte Autos laden
        const { data: userItems } = await supabase
          .from('user_items')
          .select('item_id')
          .eq('user_id', playerId)
        
        if (userItems) {
          const owned = userItems
            .map(ui => CAR_ITEMS.find(item => item.id === ui.item_id))
            .filter((item): item is CarItem => item !== undefined)
          setOwnedCars(owned)
        }
      } catch (e) {
        console.error('Error loading player:', e)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPlayer()
  }, [playerId])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    )
  }

  if (notFound || !player) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Spieler nicht gefunden</h1>
          <p className="text-gray-500 mb-6">Dieser Spieler existiert nicht.</p>
          <Link href="/leaderboard" className="text-red-500 hover:underline">
            ← Zurück zur Rangliste
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/leaderboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Rangliste
        </Link>

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 rounded-2xl p-6 mb-6 border border-zinc-800">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {player.avatar_url ? (
              <img 
                src={player.avatar_url} 
                alt={player.username || 'Avatar'} 
                className="w-24 h-24 rounded-full object-cover border-4 border-red-600"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-4xl font-bold border-4 border-red-600">
                {player.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold text-white">{player.username}</h1>
              <p className="text-gray-500 mt-1">
                Dabei seit {player.created_at ? format(new Date(player.created_at), 'MMMM yyyy', { locale: de }) : 'N/A'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                <span className="text-sm text-gray-400">
                  Rang <span className="text-white font-bold">#{rank}</span>
                </span>
                <span className="text-sm text-gray-400">
                  <span className="text-blue-400 font-bold">{player.predictions_count || 0}</span> Tipps
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-3 justify-center">
                <div>
                  <div className="text-4xl font-bold text-red-500">{player.total_points || 0}</div>
                  <div className="text-gray-500 text-xs">Punkte</div>
                </div>
                <div className="w-px h-10 bg-zinc-700" />
                <div>
                  <div className="text-4xl font-bold text-yellow-400 flex items-center gap-1">
                    <Coins className="w-5 h-5" />
                    {player.coins || 0}
                  </div>
                  <div className="text-gray-500 text-xs">Coins</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <Trophy className="w-5 h-5 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-white">#{rank}</div>
            <div className="text-xs text-gray-500">Rang</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <Target className="w-5 h-5 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-white">{player.predictions_count || 0}</div>
            <div className="text-xs text-gray-500">Tipps</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <span className="text-xl block mb-2">🏎️</span>
            <div className="text-2xl font-bold text-white">{ownedCars.length}</div>
            <div className="text-xs text-gray-500">Autos</div>
          </div>
        </div>

        {/* Garage */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">🏎️</span>
              {player.username}&apos;s Garage
            </h2>
          </div>

          {ownedCars.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
              {ownedCars.map(car => {
                const rarityStyle = RARITY_COLORS[car.rarity]
                return (
                  <div 
                    key={car.id}
                    className={`relative rounded-xl border ${rarityStyle.border} bg-black/50 overflow-hidden`}
                    title={car.description}
                  >
                    <img 
                      src={car.image} 
                      alt={car.name}
                      className="w-full aspect-video object-contain bg-zinc-900"
                    />
                    <div className="p-2">
                      <div className="text-xs font-bold text-white truncate">{car.name}</div>
                      <div className={`text-[10px] ${rarityStyle.text} uppercase`}>{car.rarity}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <span className="text-5xl block mb-3">🏎️</span>
              <p className="text-gray-500">{player.username} hat noch keine Autos</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}



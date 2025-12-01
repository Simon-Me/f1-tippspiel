'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { CAR_ITEMS, RARITY_COLORS, RARITY_LABELS, CarItem } from '@/lib/shopItems'
import { Coins, Check, Loader2, Lock, Sparkles } from 'lucide-react'

type Rarity = 'all' | 'legendary' | 'epic' | 'rare' | 'common'

export default function ShopPage() {
  const { user, refreshProfile } = useAuth()
  const [coins, setCoins] = useState(0)
  const [ownedCars, setOwnedCars] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [filter, setFilter] = useState<Rarity>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedCar, setSelectedCar] = useState<CarItem | null>(null)

  useEffect(() => {
    if (!user) return
    
    const userId = user.id
    
    async function loadData() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single()
      
      if (profile) setCoins(profile.coins || 0)

      const { data: items } = await supabase
        .from('user_items')
        .select('item_id')
        .eq('user_id', userId)
      
      if (items) setOwnedCars(items.map(i => i.item_id))
      
      setLoading(false)
    }
    
    loadData()
  }, [user])

  const buyCar = async (car: CarItem) => {
    if (!user) return
    
    const userId = user.id
    
    if (coins < car.price) {
      setMessage({ type: 'error', text: 'Nicht genug Coins!' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    if (ownedCars.includes(car.id)) return

    setBuying(car.id)

    try {
      await supabase
        .from('profiles')
        .update({ coins: coins - car.price })
        .eq('id', userId)

      await supabase
        .from('user_items')
        .insert({
          user_id: userId,
          item_id: car.id,
          equipped: false
        })

      setCoins(coins - car.price)
      setOwnedCars([...ownedCars, car.id])
      setMessage({ type: 'success', text: `${car.name} gekauft! 🏎️` })
      setSelectedCar(null)
      await refreshProfile()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error buying car:', error)
      setMessage({ type: 'error', text: 'Fehler beim Kauf!' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setBuying(null)
    }
  }

  const filteredCars = filter === 'all' 
    ? CAR_ITEMS 
    : CAR_ITEMS.filter(car => car.rarity === filter)

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto text-center">
          <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Garage</h1>
          <p className="text-gray-500">Bitte melde dich an um Autos zu kaufen.</p>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Car Detail Modal */}
      {selectedCar && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCar(null)}
        >
          <div 
            className={`bg-zinc-900 rounded-3xl max-w-2xl w-full overflow-hidden border-2 ${RARITY_COLORS[selectedCar.rarity].border}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative aspect-video bg-gradient-to-b from-zinc-800 to-zinc-900">
              <img 
                src={selectedCar.image} 
                alt={selectedCar.name}
                className="w-full h-full object-contain"
              />
              <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase ${RARITY_COLORS[selectedCar.rarity].bg} ${RARITY_COLORS[selectedCar.rarity].text}`}>
                {RARITY_LABELS[selectedCar.rarity]}
              </div>
              {ownedCars.includes(selectedCar.id) && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white flex items-center gap-1">
                  <Check className="w-3 h-3" /> In deiner Garage
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="p-6">
              <h2 className="text-3xl font-bold mb-2">{selectedCar.name}</h2>
              <p className="text-gray-400 text-lg mb-6">{selectedCar.description}</p>
              
              {ownedCars.includes(selectedCar.id) ? (
                <button 
                  className="w-full py-4 rounded-2xl bg-green-900/50 text-green-400 font-bold text-lg flex items-center justify-center gap-2"
                  disabled
                >
                  <Check className="w-5 h-5" /> Bereits gekauft
                </button>
              ) : (
                <button
                  onClick={() => buyCar(selectedCar)}
                  disabled={coins < selectedCar.price || buying === selectedCar.id}
                  className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition ${
                    coins >= selectedCar.price 
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500' 
                      : 'bg-zinc-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {buying === selectedCar.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      {selectedCar.price.toLocaleString()} Coins
                      {coins < selectedCar.price && (
                        <span className="text-sm opacity-70">(dir fehlen {(selectedCar.price - coins).toLocaleString()})</span>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">Deine Sammlung</p>
            <h1 className="text-5xl font-bold flex items-center gap-4">
              <span className="text-4xl">🏎️</span>
              Garage
            </h1>
            <p className="text-gray-500 mt-2">{ownedCars.length} von {CAR_ITEMS.length} Autos</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-700/30 px-8 py-4 rounded-2xl border border-yellow-600/30">
            <div className="flex items-center gap-3">
              <Coins className="w-8 h-8 text-yellow-400" />
              <span className="text-4xl font-bold text-yellow-400">{coins.toLocaleString()}</span>
            </div>
            <p className="text-yellow-600 text-sm mt-1">Verfügbare Coins</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-center font-medium ${
            message.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-700' : 
            'bg-red-900/50 text-red-400 border border-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {(['all', 'legendary', 'epic', 'rare', 'common'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
                filter === r 
                  ? r === 'legendary' ? 'bg-yellow-500 text-black' :
                    r === 'epic' ? 'bg-purple-500 text-white' :
                    r === 'rare' ? 'bg-blue-500 text-white' :
                    'bg-white text-black'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {r === 'legendary' && <Sparkles className="w-4 h-4" />}
              {r === 'all' ? 'Alle' : RARITY_LABELS[r]}
              <span className="opacity-70">({r === 'all' ? CAR_ITEMS.length : CAR_ITEMS.filter(c => c.rarity === r).length})</span>
            </button>
          ))}
        </div>

        {/* Cars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map(car => {
            const owned = ownedCars.includes(car.id)
            const canAfford = coins >= car.price
            const rarity = RARITY_COLORS[car.rarity]
            
            return (
              <div 
                key={car.id}
                onClick={() => setSelectedCar(car)}
                className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  owned ? 'ring-2 ring-green-500/50' : ''
                } ${rarity.glow ? `shadow-lg ${rarity.glow}` : ''}`}
              >
                {/* Image Container */}
                <div className={`relative aspect-[4/3] bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 ${rarity.border} rounded-2xl overflow-hidden`}>
                  <img 
                    src={car.image} 
                    alt={car.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Rarity Badge */}
                  <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${rarity.bg} ${rarity.text}`}>
                    {RARITY_LABELS[car.rarity]}
                  </div>
                  
                  {/* Owned Badge */}
                  {owned && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl font-bold text-white mb-1">{car.name}</h3>
                    <p className="text-gray-400 text-sm line-clamp-1 mb-3">{car.description}</p>
                    
                    {owned ? (
                      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        <Check className="w-4 h-4" /> In deiner Garage
                      </div>
                    ) : (
                      <div className={`flex items-center gap-2 text-lg font-bold ${canAfford ? 'text-yellow-400' : 'text-gray-500'}`}>
                        <Coins className="w-5 h-5" />
                        {car.price.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info */}
        <div className="mt-12 p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            Wie bekomme ich Coins?
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-gray-400 text-sm">
            <div>
              <p className="text-white font-medium mb-1">🎁 Startguthaben</p>
              <p>Jeder bekommt 500 Coins zum Start!</p>
            </div>
            <div>
              <p className="text-white font-medium mb-1">🎯 Punkte sammeln</p>
              <p>10 Punkte = 100 Coins</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-3 text-xs">
            <span className="px-3 py-1 bg-zinc-800 rounded-full">Race P1 = +250 Coins</span>
            <span className="px-3 py-1 bg-zinc-800 rounded-full">Perfektes Podium = +780 Coins</span>
            <span className="px-3 py-1 bg-zinc-800 rounded-full">Quali Pole = +100 Coins</span>
          </div>
        </div>
      </main>
    </div>
  )
}

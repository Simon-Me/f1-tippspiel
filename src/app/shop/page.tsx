'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { CAR_ITEMS, RARITY_COLORS, RARITY_LABELS, CarItem } from '@/lib/shopItems'
import { Coins, Check, Loader2, Lock, Sparkles, Car } from 'lucide-react'

export default function ShopPage() {
  const { user, refreshProfile } = useAuth()
  const [coins, setCoins] = useState(0)
  const [ownedCars, setOwnedCars] = useState<string[]>([])
  const [equippedCar, setEquippedCar] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [equipping, setEquipping] = useState<string | null>(null)

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
        .select('item_id, equipped')
        .eq('user_id', userId)
      
      if (items) {
        setOwnedCars(items.map(i => i.item_id))
        const equipped = items.find(i => i.equipped)
        if (equipped) setEquippedCar(equipped.item_id)
      }
      
      setLoading(false)
    }
    
    loadData()
  }, [user])

  const buyCar = async (car: CarItem) => {
    if (!user) return
    
    const userId = user.id
    
    if (coins < car.price) return
    if (ownedCars.includes(car.id)) return

    setBuying(car.id)

    try {
      await supabase
        .from('profiles')
        .update({ coins: coins - car.price })
        .eq('id', userId)

      // Wenn erstes Auto, direkt equippen
      const isFirstCar = ownedCars.length === 0

      await supabase
        .from('user_items')
        .insert({
          user_id: userId,
          item_id: car.id,
          equipped: isFirstCar
        })

      setCoins(coins - car.price)
      setOwnedCars([...ownedCars, car.id])
      if (isFirstCar) setEquippedCar(car.id)
      await refreshProfile()
    } catch (error) {
      console.error('Error buying car:', error)
    } finally {
      setBuying(null)
    }
  }

  const equipCar = async (carId: string) => {
    if (!user || !ownedCars.includes(carId)) return
    
    setEquipping(carId)

    try {
      // Erst alle auf false setzen
      await supabase
        .from('user_items')
        .update({ equipped: false })
        .eq('user_id', user.id)

      // Dann das gewählte auf true
      await supabase
        .from('user_items')
        .update({ equipped: true })
        .eq('user_id', user.id)
        .eq('item_id', carId)

      setEquippedCar(carId)
    } catch (error) {
      console.error('Error equipping car:', error)
    } finally {
      setEquipping(null)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center">
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

  const equippedCarData = CAR_ITEMS.find(c => c.id === equippedCar)

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">🏎️ Garage</h1>
            <p className="text-gray-500 text-sm">{ownedCars.length}/{CAR_ITEMS.length} Autos</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-700/30 px-5 py-2.5 rounded-xl border border-yellow-600/30">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-xl font-bold text-yellow-400">{coins.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Aktuell ausgewähltes Auto */}
        {equippedCarData && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-950/50 to-zinc-900 rounded-2xl border border-red-800/50">
            <div className="flex items-center gap-4">
              <Car className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <p className="text-xs text-red-400 uppercase tracking-wider">Dein aktives Auto</p>
                <p className="font-bold text-white">{equippedCarData.name}</p>
              </div>
              <img src={equippedCarData.image} alt="" className="h-12 w-auto object-contain" />
            </div>
          </div>
        )}

        {/* Grid - 2 Spalten */}
        <div className="grid grid-cols-2 gap-4">
          {CAR_ITEMS.map((car) => {
            const owned = ownedCars.includes(car.id)
            const isEquipped = equippedCar === car.id
            const canAfford = coins >= car.price
            const rarity = RARITY_COLORS[car.rarity]
            
            return (
              <div 
                key={car.id}
                className={`rounded-2xl overflow-hidden border-2 transition-all ${
                  isEquipped
                    ? 'border-red-500 bg-red-950/20 ring-2 ring-red-500/30'
                    : owned 
                      ? 'border-green-500/50 bg-green-950/20' 
                      : `${rarity.border} bg-zinc-900 hover:scale-[1.02]`
                }`}
              >
                {/* Rarity Badge */}
                <div className={`${rarity.bg} px-3 py-1.5 flex items-center justify-center gap-1.5`}>
                  {car.rarity === 'legendary' && <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
                  <span className={`text-xs font-bold uppercase ${rarity.text}`}>
                    {RARITY_LABELS[car.rarity]}
                  </span>
                  {isEquipped && (
                    <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">AKTIV</span>
                  )}
                </div>
                
                {/* Image */}
                <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-950 p-4">
                  <img 
                    src={car.image} 
                    alt={car.name}
                    className="w-full aspect-[4/3] object-contain"
                  />
                  {owned && !isEquipped && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Dein
                    </div>
                  )}
                  {isEquipped && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1">
                      <Car className="w-3 h-3" /> Aktiv
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{car.name}</h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{car.description}</p>
                  
                  {/* Buttons */}
                  {owned ? (
                    isEquipped ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 bg-red-900/30 rounded-xl text-red-400 font-medium">
                        <Car className="w-4 h-4" /> Aktives Auto
                      </div>
                    ) : (
                      <button
                        onClick={() => equipCar(car.id)}
                        disabled={equipping === car.id}
                        className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition bg-green-600 text-white hover:bg-green-500"
                      >
                        {equipping === car.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Car className="w-4 h-4" /> Auswählen
                          </>
                        )}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => buyCar(car)}
                      disabled={!canAfford || buying === car.id}
                      className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                        canAfford 
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                          : 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {buying === car.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Coins className="w-4 h-4" />
                          {car.price.toLocaleString()}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

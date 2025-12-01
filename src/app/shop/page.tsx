'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { CAR_ITEMS, RARITY_COLORS, RARITY_LABELS, CarItem } from '@/lib/shopItems'
import { Coins, Check, Loader2, Lock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

export default function ShopPage() {
  const { user, refreshProfile } = useAuth()
  const [coins, setCoins] = useState(0)
  const [ownedCars, setOwnedCars] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const currentCar = CAR_ITEMS[currentIndex]

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

  const navigate = useCallback((dir: 'left' | 'right') => {
    if (isAnimating) return
    
    setDirection(dir)
    setIsAnimating(true)
    
    setTimeout(() => {
      if (dir === 'right') {
        setCurrentIndex((prev) => (prev + 1) % CAR_ITEMS.length)
      } else {
        setCurrentIndex((prev) => (prev - 1 + CAR_ITEMS.length) % CAR_ITEMS.length)
      }
      setDirection(null)
      setIsAnimating(false)
    }, 300)
  }, [isAnimating])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigate('left')
      if (e.key === 'ArrowRight') navigate('right')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate])

  const buyCar = async () => {
    if (!user || !currentCar) return
    
    const userId = user.id
    
    if (coins < currentCar.price) {
      setMessage({ type: 'error', text: 'Nicht genug Coins!' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    if (ownedCars.includes(currentCar.id)) return

    setBuying(currentCar.id)

    try {
      await supabase
        .from('profiles')
        .update({ coins: coins - currentCar.price })
        .eq('id', userId)

      await supabase
        .from('user_items')
        .insert({
          user_id: userId,
          item_id: currentCar.id,
          equipped: false
        })

      setCoins(coins - currentCar.price)
      setOwnedCars([...ownedCars, currentCar.id])
      setMessage({ type: 'success', text: `${currentCar.name} gekauft! 🏎️` })
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

  const owned = ownedCars.includes(currentCar.id)
  const canAfford = coins >= currentCar.price
  const rarity = RARITY_COLORS[currentCar.rarity]

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white overflow-hidden">
      <Navbar />
      
      <main className="pt-20 pb-8 px-4 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 max-w-6xl mx-auto w-full">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              🏎️ Garage
            </h1>
            <p className="text-gray-500 text-sm">{ownedCars.length}/{CAR_ITEMS.length} Autos</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-700/30 px-6 py-3 rounded-2xl border border-yellow-600/30">
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{coins.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-xl text-center font-medium max-w-md mx-auto ${
            message.type === 'success' ? 'bg-green-900/50 text-green-400 border border-green-700' : 
            'bg-red-900/50 text-red-400 border border-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Main Carousel */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Left Arrow */}
          <button
            onClick={() => navigate('left')}
            className="absolute left-4 md:left-8 z-20 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Car Display */}
          <div className="flex-1 max-w-4xl mx-auto px-16">
            {/* Rarity Badge */}
            <div className="flex justify-center mb-4">
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase flex items-center gap-2 ${rarity.bg} ${rarity.text}`}>
                {currentCar.rarity === 'legendary' && <Sparkles className="w-4 h-4" />}
                {RARITY_LABELS[currentCar.rarity]}
              </div>
            </div>

            {/* Car Image */}
            <div 
              className={`relative transition-all duration-300 ease-out ${
                direction === 'left' ? 'translate-x-12 opacity-0' :
                direction === 'right' ? '-translate-x-12 opacity-0' :
                'translate-x-0 opacity-100'
              }`}
            >
              <div className={`relative rounded-3xl overflow-hidden border-2 ${rarity.border} ${rarity.glow ? `shadow-2xl ${rarity.glow}` : ''}`}>
                {/* Glow Effect */}
                {currentCar.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/20 via-transparent to-transparent animate-pulse" />
                )}
                {currentCar.rarity === 'epic' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 via-transparent to-transparent" />
                )}
                
                <img 
                  src={currentCar.image} 
                  alt={currentCar.name}
                  className="w-full aspect-video object-contain bg-gradient-to-b from-zinc-800 to-zinc-950"
                />
                
                {/* Owned Badge */}
                {owned && (
                  <div className="absolute top-4 right-4 px-4 py-2 rounded-full bg-green-500 text-white font-bold flex items-center gap-2 shadow-lg">
                    <Check className="w-5 h-5" /> IN DEINER GARAGE
                  </div>
                )}
              </div>
            </div>

            {/* Car Info */}
            <div className="text-center mt-6">
              <h2 className="text-4xl font-bold mb-2">{currentCar.name}</h2>
              <p className="text-gray-400 text-lg mb-6 max-w-md mx-auto">{currentCar.description}</p>
              
              {/* Buy Button */}
              {owned ? (
                <button 
                  className="px-12 py-4 rounded-2xl bg-green-900/50 text-green-400 font-bold text-xl flex items-center justify-center gap-3 mx-auto cursor-default"
                  disabled
                >
                  <Check className="w-6 h-6" /> Bereits in deiner Garage
                </button>
              ) : (
                <button
                  onClick={buyCar}
                  disabled={!canAfford || buying === currentCar.id}
                  className={`px-12 py-4 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 mx-auto transition-all ${
                    canAfford 
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400 hover:to-yellow-500 hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/30' 
                      : 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {buying === currentCar.id ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Coins className="w-6 h-6" />
                      {currentCar.price.toLocaleString()} Coins
                    </>
                  )}
                </button>
              )}
              
              {!canAfford && !owned && (
                <p className="text-red-400 mt-3 text-sm">
                  Dir fehlen noch {(currentCar.price - coins).toLocaleString()} Coins
                </p>
              )}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => navigate('right')}
            className="absolute right-4 md:right-8 z-20 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {/* Dots / Progress */}
        <div className="flex justify-center gap-2 mt-6">
          {CAR_ITEMS.map((car, idx) => {
            const isOwned = ownedCars.includes(car.id)
            const isCurrent = idx === currentIndex
            return (
              <button
                key={car.id}
                onClick={() => {
                  if (!isAnimating) {
                    setDirection(idx > currentIndex ? 'right' : 'left')
                    setIsAnimating(true)
                    setTimeout(() => {
                      setCurrentIndex(idx)
                      setDirection(null)
                      setIsAnimating(false)
                    }, 300)
                  }
                }}
                className={`h-2 rounded-full transition-all ${
                  isCurrent 
                    ? 'w-8 bg-white' 
                    : isOwned 
                      ? 'w-2 bg-green-500 hover:bg-green-400' 
                      : 'w-2 bg-zinc-600 hover:bg-zinc-500'
                }`}
                title={car.name}
              />
            )
          })}
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center gap-6 mt-6 text-sm text-gray-500">
          <span>← → Pfeiltasten zum Navigieren</span>
          <span>•</span>
          <span className="text-green-400">{ownedCars.length} gekauft</span>
          <span>•</span>
          <span>{CAR_ITEMS.length - ownedCars.length} übrig</span>
        </div>
      </main>
    </div>
  )
}

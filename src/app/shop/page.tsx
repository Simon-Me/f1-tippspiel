'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { SHOP_ITEMS, RARITY_COLORS, CATEGORY_LABELS } from '@/lib/shopItems'
import { ShoppingBag, Coins, Check, Loader2, Lock } from 'lucide-react'

type Category = 'all' | 'helmet' | 'car' | 'trophy' | 'badge' | 'special'

export default function ShopPage() {
  const { user, refreshProfile } = useAuth()
  const [coins, setCoins] = useState(0)
  const [ownedItems, setOwnedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [category, setCategory] = useState<Category>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    
    const userId = user.id
    
    async function loadData() {
      // Lade Coins
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single()
      
      if (profile) setCoins(profile.coins || 0)

      // Lade gekaufte Items
      const { data: items } = await supabase
        .from('user_items')
        .select('item_id')
        .eq('user_id', userId)
      
      if (items) setOwnedItems(items.map(i => i.item_id))
      
      setLoading(false)
    }
    
    loadData()
  }, [user])

  const buyItem = async (itemId: string, price: number) => {
    if (!user) return
    
    const userId = user.id
    
    if (coins < price) {
      setMessage({ type: 'error', text: 'Nicht genug Coins!' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    if (ownedItems.includes(itemId)) return

    setBuying(itemId)

    try {
      // Coins abziehen
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: coins - price })
        .eq('id', userId)

      if (updateError) throw updateError

      // Item hinzufügen
      const { error: insertError } = await supabase
        .from('user_items')
        .insert({
          user_id: userId,
          item_id: itemId,
          equipped: false
        })

      if (insertError) throw insertError

      setCoins(coins - price)
      setOwnedItems([...ownedItems, itemId])
      setMessage({ type: 'success', text: 'Gekauft! 🎉' })
      
      // Update Navbar Coins
      await refreshProfile()
      
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error buying item:', error)
      setMessage({ type: 'error', text: 'Fehler beim Kauf!' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setBuying(null)
    }
  }

  const filteredItems = category === 'all' 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === category)

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center">
          <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Shop</h1>
          <p className="text-gray-500">Bitte melde dich an um den Shop zu nutzen.</p>
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
      
      <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">F1 Tippspiel</p>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <ShoppingBag className="w-10 h-10 text-green-500" />
              Shop
            </h1>
          </div>
          
          {/* Coins Anzeige */}
          <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-700/50 px-6 py-3 rounded-2xl border border-yellow-600/30">
            <div className="flex items-center gap-2">
              <Coins className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{coins}</span>
            </div>
            <p className="text-yellow-600 text-xs">Deine Coins</p>
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

        {/* Kategorien */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              category === 'all' ? 'bg-white text-black' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
            }`}
          >
            Alle
          </button>
          {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                category === cat ? 'bg-white text-black' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const owned = ownedItems.includes(item.id)
            const canAfford = coins >= item.price
            const rarityStyle = RARITY_COLORS[item.rarity]
            
            return (
              <div 
                key={item.id}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                  owned ? 'border-green-500/50 bg-green-950/20' : 
                  `${rarityStyle.border} bg-zinc-900 hover:scale-[1.02]`
                }`}
              >
                {/* Rarity Banner */}
                <div className={`${rarityStyle.bg} px-2 py-1 text-xs font-bold text-center uppercase`}>
                  {item.rarity}
                </div>
                
                {/* Content */}
                <div className="p-4">
                  {/* Icon */}
                  <div className="text-5xl text-center mb-3">{item.image_url}</div>
                  
                  {/* Name */}
                  <h3 className="font-bold text-white text-center mb-1 text-sm leading-tight">
                    {item.name}
                  </h3>
                  
                  {/* Team/Driver */}
                  {(item.team || item.driver) && (
                    <p className="text-gray-500 text-xs text-center mb-2">
                      {item.driver || item.team}
                    </p>
                  )}
                  
                  {/* Description */}
                  <p className="text-gray-400 text-xs text-center mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  {/* Price / Buy Button */}
                  {owned ? (
                    <div className="flex items-center justify-center gap-1 py-2 bg-green-900/30 rounded-xl text-green-400 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Gekauft
                    </div>
                  ) : (
                    <button
                      onClick={() => buyItem(item.id, item.price)}
                      disabled={!canAfford || buying === item.id}
                      className={`w-full py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                        canAfford 
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
                          : 'bg-zinc-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {buying === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Coins className="w-4 h-4" />
                          {item.price}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Box */}
        <div className="mt-12 p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            Wie bekomme ich Coins?
          </h3>
          <div className="space-y-3 text-gray-400 text-sm">
            <p>
              <span className="text-white font-medium">🎁 Startguthaben:</span> Jeder bekommt 500 Coins zum Start!
            </p>
            <p>
              <span className="text-white font-medium">🎯 Punkte = Coins:</span> Für 10 Punkte bekommst du 100 Coins.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <div className="bg-zinc-800 px-3 py-2 rounded-lg">
              <span className="text-gray-500">Race P1 (25 Pts) =</span>
              <span className="text-yellow-400 font-bold ml-1">+250 Coins</span>
            </div>
            <div className="bg-zinc-800 px-3 py-2 rounded-lg">
              <span className="text-gray-500">Perfektes Podium =</span>
              <span className="text-yellow-400 font-bold ml-1">+780 Coins</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


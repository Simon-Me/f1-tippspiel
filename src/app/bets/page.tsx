'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race } from '@/lib/supabase'
import { BET_TYPES, BET_CATEGORIES, BET_AMOUNTS, BetType } from '@/lib/moneyBets'
import { Coins, Loader2, Lock, TrendingUp, Check, AlertCircle } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { de } from 'date-fns/locale'

interface PlacedBet {
  id: string
  bet_type: string
  selection: string
  amount: number
  odds: number
  status: 'pending' | 'won' | 'lost'
  winnings: number
}

interface Driver {
  driver_number: number
  full_name: string
}

export default function BetsPage() {
  const { user } = useAuth()
  const [coins, setCoins] = useState(0)
  const [loading, setLoading] = useState(true)
  const [nextRace, setNextRace] = useState<Race | null>(null)
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [selectedAmount, setSelectedAmount] = useState(25)
  const [placing, setPlacing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [activeCategory, setActiveCategory] = useState<'prediction' | 'matchup' | 'special'>('prediction')

  useEffect(() => {
    if (!user) return
    
    const userId = user.id
    
    async function loadData() {
      // Coins
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single()
      
      if (profile) setCoins(profile.coins || 0)
      
      // Nächstes Rennen
      const { data: races } = await supabase
        .from('races')
        .select('*')
        .eq('season', 2025)
        .gte('race_date', new Date().toISOString())
        .order('race_date', { ascending: true })
        .limit(1)
      
      if (races?.[0]) setNextRace(races[0])
      
      // Bereits platzierte Bets
      const { data: bets } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (bets) setPlacedBets(bets)
      
      // Fahrer für DNF Pick
      const driversRes = await fetch('/api/drivers')
      const driversJson = await driversRes.json()
      if (driversJson.drivers) setDrivers(driversJson.drivers)
      
      setLoading(false)
    }
    
    loadData()
  }, [user])

  const placeBet = async () => {
    if (!user || !selectedBet || !selectedOption || !nextRace) return
    if (coins < selectedAmount) {
      setMessage({ type: 'error', text: 'Nicht genug Coins!' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    
    // Check ob Rennen schon gestartet
    if (nextRace.race_date && isPast(new Date(nextRace.race_date))) {
      setMessage({ type: 'error', text: 'Rennen hat bereits begonnen!' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    
    // Check ob bereits auf diesen Typ gewettet
    const existingBet = placedBets.find(
      b => b.bet_type === selectedBet.id && b.status === 'pending'
    )
    if (existingBet) {
      setMessage({ type: 'error', text: 'Du hast bereits auf diese Wette gesetzt!' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    
    setPlacing(true)
    
    try {
      const userId = user.id
      
      // Coins abziehen
      await supabase
        .from('profiles')
        .update({ coins: coins - selectedAmount })
        .eq('id', userId)
      
      // Bet speichern
      const { data: newBet, error } = await supabase
        .from('bets')
        .insert({
          user_id: userId,
          race_id: nextRace.id,
          bet_type: selectedBet.id,
          selection: selectedOption,
          amount: selectedAmount,
          odds: selectedBet.odds,
          status: 'pending',
          winnings: 0
        })
        .select()
        .single()
      
      if (error) throw error
      
      setCoins(coins - selectedAmount)
      setPlacedBets([newBet, ...placedBets])
      setSelectedBet(null)
      setSelectedOption('')
      setMessage({ type: 'success', text: `Wette platziert! Möglicher Gewinn: ${Math.floor(selectedAmount * selectedBet.odds)} Coins` })
      setTimeout(() => setMessage(null), 3000)
    } catch (e) {
      console.error(e)
      setMessage({ type: 'error', text: 'Fehler beim Platzieren!' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setPlacing(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto text-center">
          <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Money Bets</h1>
          <p className="text-gray-500">Melde dich an um Wetten zu platzieren.</p>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    )
  }

  const filteredBets = BET_TYPES.filter(b => b.category === activeCategory)
  const pendingBets = placedBets.filter(b => b.status === 'pending')
  const completedBets = placedBets.filter(b => b.status !== 'pending')

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">Extra Coins verdienen</p>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <TrendingUp className="w-10 h-10 text-green-500" />
              Money Bets
            </h1>
          </div>
          
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

        {/* Next Race Info */}
        {nextRace && (
          <div className="bg-zinc-900 rounded-2xl p-4 mb-6 border border-zinc-800">
            <p className="text-gray-500 text-sm">Wetten für:</p>
            <p className="text-xl font-bold">{nextRace.race_name}</p>
            <p className="text-gray-400 text-sm">
              {nextRace.race_date && format(new Date(nextRace.race_date), 'EEEE, d. MMMM yyyy', { locale: de })}
            </p>
          </div>
        )}

        {/* Bet Selection Modal */}
        {selectedBet && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-700">
              <div className="text-center mb-6">
                <span className="text-4xl">{selectedBet.icon}</span>
                <h3 className="text-xl font-bold mt-2">{selectedBet.name}</h3>
                <p className="text-gray-400 text-sm">{selectedBet.description}</p>
                <div className="mt-2 inline-block px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm font-bold">
                  Quote: {selectedBet.odds}x
                </div>
              </div>
              
              {/* Option Selection */}
              {selectedBet.options ? (
                <div className="space-y-2 mb-6">
                  <p className="text-gray-500 text-sm">Deine Auswahl:</p>
                  {selectedBet.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSelectedOption(opt)}
                      className={`w-full p-3 rounded-xl text-left font-medium transition ${
                        selectedOption === opt 
                          ? 'bg-green-600 text-white' 
                          : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : selectedBet.id === 'dnf_pick' ? (
                <div className="mb-6">
                  <p className="text-gray-500 text-sm mb-2">Wähle einen Fahrer:</p>
                  <select 
                    value={selectedOption}
                    onChange={e => setSelectedOption(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-800 text-white border border-zinc-700"
                  >
                    <option value="">Fahrer auswählen...</option>
                    {drivers.map(d => (
                      <option key={d.driver_number} value={d.full_name}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              
              {/* Amount Selection */}
              <div className="mb-6">
                <p className="text-gray-500 text-sm mb-2">Einsatz:</p>
                <div className="grid grid-cols-4 gap-2">
                  {BET_AMOUNTS.filter(a => a >= selectedBet.minBet && a <= selectedBet.maxBet).map(amount => (
                    <button
                      key={amount}
                      onClick={() => setSelectedAmount(amount)}
                      disabled={coins < amount}
                      className={`p-3 rounded-xl font-bold transition ${
                        selectedAmount === amount 
                          ? 'bg-yellow-500 text-black' 
                          : coins < amount
                            ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                            : 'bg-zinc-800 text-yellow-400 hover:bg-zinc-700'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Potential Win */}
              {selectedOption && (
                <div className="bg-zinc-800 rounded-xl p-4 mb-6 text-center">
                  <p className="text-gray-500 text-sm">Möglicher Gewinn:</p>
                  <p className="text-3xl font-bold text-green-400">
                    {Math.floor(selectedAmount * selectedBet.odds)} Coins
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedBet(null)
                    setSelectedOption('')
                  }}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-gray-400 font-medium hover:bg-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={placeBet}
                  disabled={!selectedOption || placing || coins < selectedAmount}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Wette platzieren'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(Object.keys(BET_CATEGORIES) as Array<keyof typeof BET_CATEGORIES>).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
                activeCategory === cat 
                  ? 'bg-green-600 text-white' 
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              <span>{BET_CATEGORIES[cat].icon}</span>
              {BET_CATEGORIES[cat].name}
            </button>
          ))}
        </div>

        {/* Available Bets */}
        <div className="grid gap-4 mb-12">
          {filteredBets.map(bet => {
            const alreadyPlaced = pendingBets.some(b => b.bet_type === bet.id)
            
            return (
              <div 
                key={bet.id}
                className={`bg-zinc-900 rounded-2xl p-4 border transition ${
                  alreadyPlaced 
                    ? 'border-green-700/50 opacity-60' 
                    : 'border-zinc-800 hover:border-zinc-600 cursor-pointer'
                }`}
                onClick={() => !alreadyPlaced && setSelectedBet(bet)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{bet.icon}</span>
                    <div>
                      <h3 className="font-bold text-white">{bet.name}</h3>
                      <p className="text-gray-500 text-sm">{bet.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {alreadyPlaced ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Platziert</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-green-400">{bet.odds}x</div>
                        <p className="text-gray-500 text-xs">{bet.minBet}-{bet.maxBet} Coins</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Placed Bets */}
        {pendingBets.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Laufende Wetten
            </h2>
            <div className="space-y-3">
              {pendingBets.map(bet => {
                const betType = BET_TYPES.find(b => b.id === bet.bet_type)
                return (
                  <div key={bet.id} className="bg-zinc-900 rounded-xl p-4 border border-yellow-900/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{betType?.icon}</span>
                        <div>
                          <p className="font-medium">{betType?.name}</p>
                          <p className="text-gray-400 text-sm">Auswahl: {bet.selection}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-bold">{bet.amount} Coins</p>
                        <p className="text-gray-500 text-xs">Gewinn: {Math.floor(bet.amount * bet.odds)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed Bets */}
        {completedBets.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Vergangene Wetten</h2>
            <div className="space-y-3">
              {completedBets.slice(0, 10).map(bet => {
                const betType = BET_TYPES.find(b => b.id === bet.bet_type)
                return (
                  <div 
                    key={bet.id} 
                    className={`bg-zinc-900 rounded-xl p-4 border ${
                      bet.status === 'won' ? 'border-green-700/50' : 'border-red-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{betType?.icon}</span>
                        <div>
                          <p className="font-medium">{betType?.name}</p>
                          <p className="text-gray-400 text-sm">{bet.selection}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {bet.status === 'won' ? (
                          <p className="text-green-400 font-bold">+{bet.winnings} Coins</p>
                        ) : (
                          <p className="text-red-400 font-bold">-{bet.amount} Coins</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-12 p-6 bg-zinc-900 rounded-2xl border border-zinc-800">
          <h3 className="font-bold text-lg mb-3">💡 So funktioniert&apos;s</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>• Wähle eine Wette und platziere deinen Einsatz (10-100 Coins)</li>
            <li>• Die Quote zeigt den Multiplikator bei Gewinn</li>
            <li>• Bei 50 Coins Einsatz und 2x Quote gewinnst du 100 Coins</li>
            <li>• Wetten werden nach dem Rennen automatisch ausgewertet</li>
            <li>• Pro Wettart kannst du nur einmal pro Rennen wetten</li>
          </ul>
        </div>
      </main>
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { getDriverHeadshot } from '@/lib/images'
import { Trophy, Crown, Check, X, Search, Lock } from 'lucide-react'

interface Driver {
  driver_number: number
  full_name: string
  team_name: string
  team_color: string
  code?: string
}

export default function SeasonTipsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null)
  const [existingPrediction, setExistingPrediction] = useState<{ id: string } | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      try {
        // Fahrer laden
        const driversResponse = await fetch('/api/drivers')
        const driversJson = await driversResponse.json()
        if (driversJson.drivers) setDrivers(driversJson.drivers)

        // Existierende Prediction laden
        const { data: predData } = await supabase
          .from('season_predictions')
          .select('id, wdc_p1_driver')
          .eq('user_id', user.id)
          .eq('season', 2025)
          .maybeSingle()

        if (predData) {
          setExistingPrediction({ id: predData.id })
          setSelectedDriver(predData.wdc_p1_driver)
        }

        // Prüfen ob Saison schon gestartet (erstes Rennen vorbei)
        const { data: firstRace } = await supabase
          .from('races')
          .select('race_date')
          .eq('season', 2025)
          .order('round', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (firstRace && new Date(firstRace.race_date) < new Date()) {
          setIsLocked(true)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [user])

  const handleSave = async () => {
    if (!user || isLocked || !selectedDriver) return

    setSaving(true)
    try {
      const data = {
        user_id: user.id,
        season: 2025,
        wdc_p1_driver: selectedDriver,
      }

      if (existingPrediction?.id) {
        await supabase.from('season_predictions').update(data).eq('id', existingPrediction.id)
      } else {
        await supabase.from('season_predictions').insert(data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const getDriver = (num: number | null) => drivers.find(d => d.driver_number === num)
  const driver = getDriver(selectedDriver)

  const filteredDrivers = drivers.filter(d =>
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <main className="pt-20 pb-12 px-4 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Weltmeister 2025</h1>
          <p className="text-gray-400">Wer holt den Titel?</p>
        </div>

        {isLocked && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">Tipp gesperrt</p>
              <p className="text-yellow-400/70 text-sm">Die Saison hat bereits begonnen.</p>
            </div>
          </div>
        )}

        {saved && (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500" />
            <p className="text-green-400">Tipp gespeichert!</p>
          </div>
        )}

        {/* Driver Selection */}
        <button
          onClick={() => !isLocked && setModalOpen(true)}
          disabled={isLocked}
          className={`w-full p-6 rounded-2xl border-2 text-left transition-all mb-6 ${
            driver
              ? 'border-yellow-600 bg-[#111]'
              : 'border-dashed border-gray-600 bg-[#0a0a0a] hover:border-yellow-600'
          } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {driver ? (
            <div className="flex items-center gap-5">
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden shrink-0"
                style={{ backgroundColor: driver.team_color }}
              >
                <img
                  src={getDriverHeadshot(driver.driver_number)}
                  alt={driver.full_name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="flex-1">
                <div className="text-sm text-yellow-500 font-medium mb-1">Dein Tipp</div>
                <div className="text-2xl font-bold text-white">{driver.full_name}</div>
                <div className="text-gray-400 flex items-center gap-2 mt-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: driver.team_color }}
                  />
                  {driver.team_name}
                </div>
              </div>
              <div
                className="text-5xl font-bold"
                style={{ color: driver.team_color }}
              >
                {driver.driver_number}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <div className="text-xl text-gray-400">Fahrer wählen</div>
              <div className="text-sm text-gray-600 mt-1">Klicke um deinen Weltmeister zu tippen</div>
            </div>
          )}
        </button>

        {/* Points Info */}
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl border border-yellow-800/50 p-5 mb-6 text-center">
          <div className="text-yellow-400 text-sm mb-1">Wenn du richtig tippst:</div>
          <div className="text-4xl font-bold text-yellow-400">+100 Punkte</div>
          <div className="text-yellow-400/60 text-sm mt-2">= 1.000 Coins!</div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isLocked || !selectedDriver}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            saving || isLocked || !selectedDriver
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {saving ? 'Speichern...' : existingPrediction ? 'Tipp ändern' : 'Tipp abgeben'}
        </button>
      </main>

      {/* Driver Selection Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center p-4">
          <div className="bg-[#111] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg">Weltmeister wählen</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Fahrer suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredDrivers.map((d) => (
                  <button
                    key={d.driver_number}
                    onClick={() => {
                      setSelectedDriver(d.driver_number)
                      setModalOpen(false)
                    }}
                    className={`p-3 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border transition-all text-left ${
                      selectedDriver === d.driver_number
                        ? 'border-yellow-500'
                        : 'border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="w-full aspect-square rounded-lg overflow-hidden mb-3"
                      style={{ backgroundColor: d.team_color }}
                    >
                      <img
                        src={getDriverHeadshot(d.driver_number)}
                        alt={d.full_name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback.png.transform/1col/image.png'
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-white text-sm truncate">{d.full_name}</div>
                      <div className="text-xs text-gray-500 truncate">{d.team_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

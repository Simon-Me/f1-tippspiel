'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race } from '@/lib/supabase'
import { getDriverHeadshot, getCountryFlag, getCircuitGradient } from '@/lib/images'
import { 
  ChevronLeft, Check, AlertCircle, X, Search, Lock,
  ShieldAlert, CloudRain, Flag, UserMinus, Star, ArrowUpDown, Clock
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import { de } from 'date-fns/locale'

interface Driver {
  driver_number: number
  full_name: string
  team_name: string
  team_color: string
  code?: string
}

interface BonusPrediction {
  id?: string
  safety_car: boolean | null
  red_flag: boolean | null
  rain_during_race: boolean | null
  first_dnf_driver: number | null
  driver_of_day: number | null
  most_overtakes_driver: number | null
  total_dnfs: number | null
}

export default function BonusTipsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  
  const raceId = params.id as string

  const [race, setRace] = useState<Race | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [prediction, setPrediction] = useState<BonusPrediction>({
    safety_car: null,
    red_flag: null,
    rain_during_race: null,
    first_dnf_driver: null,
    driver_of_day: null,
    most_overtakes_driver: null,
    total_dnfs: null,
  })
  const [existingPrediction, setExistingPrediction] = useState<BonusPrediction | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalTarget, setModalTarget] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    async function fetchData() {
      if (!user || !raceId) return
      try {
        const { data: raceData } = await supabase
          .from('races').select('*').eq('id', parseInt(raceId)).maybeSingle()
        if (raceData) setRace(raceData)

        const driversResponse = await fetch('/api/drivers')
        const driversJson = await driversResponse.json()
        if (driversJson.drivers) setDrivers(driversJson.drivers)

        // Existierende Prediction laden
        const { data: predData } = await supabase
          .from('bonus_predictions')
          .select('*')
          .eq('user_id', user.id)
          .eq('race_id', parseInt(raceId))
          .maybeSingle()

        if (predData) {
          setExistingPrediction(predData)
          setPrediction({
            safety_car: predData.safety_car,
            red_flag: predData.red_flag,
            rain_during_race: predData.rain_during_race,
            first_dnf_driver: predData.first_dnf_driver,
            driver_of_day: predData.driver_of_day,
            most_overtakes_driver: predData.most_overtakes_driver,
            total_dnfs: predData.total_dnfs,
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [user, raceId])

  const handleSave = async () => {
    if (!user || !race) return

    setSaving(true)
    try {
      const data = {
        user_id: user.id,
        race_id: race.id,
        ...prediction,
      }

      if (existingPrediction?.id) {
        await supabase.from('bonus_predictions').update(data).eq('id', existingPrediction.id)
      } else {
        await supabase.from('bonus_predictions').insert(data)
      }
      setSaved(true)
      setTimeout(() => router.push('/races'), 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const deadline = race ? new Date(race.race_date) : new Date()
  const isLocked = race ? isPast(deadline) : false
  const getDriver = (num: number | null) => drivers.find(d => d.driver_number === num)

  const openModal = (target: string) => {
    setModalTarget(target)
    setSearchTerm('')
    setModalOpen(true)
  }

  const selectDriver = (num: number) => {
    setPrediction(prev => ({ ...prev, [modalTarget]: num }))
    setModalOpen(false)
  }

  const filteredDrivers = drivers.filter(d =>
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Yes/No Button
  const YesNoButton = ({ 
    value, 
    label, 
    icon: Icon, 
    target, 
    points,
    color
  }: { 
    value: boolean | null
    label: string
    icon: React.ComponentType<{ className?: string }>
    target: string
    points: number
    color: string
  }) => (
    <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg bg-${color}-600/20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
        <div className="flex-1">
          <div className="font-medium text-white">{label}</div>
          <div className="text-xs text-gray-500">+{points} Punkte bei richtigem Tipp</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => !isLocked && setPrediction(prev => ({ ...prev, [target]: true }))}
          disabled={isLocked}
          className={`flex-1 py-3 rounded-lg font-bold transition-all ${
            value === true
              ? 'bg-green-600 text-white'
              : 'bg-[#111] text-gray-400 hover:bg-[#1a1a1a]'
          } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          Ja ✓
        </button>
        <button
          onClick={() => !isLocked && setPrediction(prev => ({ ...prev, [target]: false }))}
          disabled={isLocked}
          className={`flex-1 py-3 rounded-lg font-bold transition-all ${
            value === false
              ? 'bg-red-600 text-white'
              : 'bg-[#111] text-gray-400 hover:bg-[#1a1a1a]'
          } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          Nein ✗
        </button>
      </div>
    </div>
  )

  // Driver Card
  const DriverCard = ({ num, label, target, points, icon: Icon }: { 
    num: number | null
    label: string
    target: string
    points: number
    icon: React.ComponentType<{ className?: string }>
  }) => {
    const driver = getDriver(num)

    return (
      <button
        onClick={() => !isLocked && openModal(target)}
        disabled={isLocked}
        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
          driver
            ? 'border-gray-700 bg-[#111]'
            : 'border-dashed border-gray-600 bg-[#0a0a0a] hover:border-gray-500'
        } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-red-600'}`}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
            style={{ backgroundColor: driver?.team_color || '#222' }}
          >
            {driver ? (
              <img
                src={getDriverHeadshot(driver.driver_number)}
                alt={driver.full_name}
                className="w-full h-full object-cover object-top"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <Icon className="w-5 h-5 text-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
            {driver ? (
              <>
                <div className="text-base font-bold text-white truncate">{driver.full_name}</div>
                <div className="text-sm text-gray-400">{driver.team_name}</div>
              </>
            ) : (
              <div className="text-gray-400">Fahrer wählen →</div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">+{points} Pkt</div>
          </div>
        </div>
      </button>
    )
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-400">Rennen nicht gefunden</p>
          <Link href="/races" className="text-red-500 text-sm mt-2 inline-block">Zurück</Link>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-green-600 rounded-full flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <p className="text-white text-xl font-bold">Bonus-Tipps gespeichert!</p>
          <p className="text-gray-400 mt-2">{race.race_name}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <main className="pt-20 pb-12 px-4 max-w-2xl mx-auto">
        <Link href="/races" className="inline-flex items-center gap-2 text-gray-500 hover:text-white mb-6 text-sm">
          <ChevronLeft className="w-4 h-4" /> Zurück
        </Link>

        {/* Race Header */}
        <div className="bg-[#111] rounded-xl overflow-hidden mb-6 border border-gray-800">
          <div className={`h-20 bg-gradient-to-br ${getCircuitGradient(race.race_name)} flex items-center justify-center`}>
            <span className="text-5xl">{getCountryFlag(race.race_name)}</span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Runde {race.round} • Bonus-Tipps</div>
                <h1 className="text-xl font-bold text-white">{race.race_name}</h1>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Extra-Punkte für richtige Vorhersagen!</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              Tippschluss: {format(new Date(race.race_date), 'EEEE, d. MMMM yyyy • HH:mm', { locale: de })} Uhr
            </div>
            {isLocked && (
              <div className="mt-4 flex items-center gap-2 text-red-400 text-sm font-medium">
                <Lock className="w-4 h-4" />
                Tippschluss erreicht
              </div>
            )}
          </div>
        </div>

        {/* Ja/Nein Tipps */}
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Was passiert im Rennen?</h2>
        <div className="space-y-3 mb-8">
          <YesNoButton
            value={prediction.safety_car}
            label="Safety Car im Rennen?"
            icon={ShieldAlert}
            target="safety_car"
            points={5}
            color="yellow"
          />
          <YesNoButton
            value={prediction.red_flag}
            label="Rote Flagge?"
            icon={Flag}
            target="red_flag"
            points={10}
            color="red"
          />
          <YesNoButton
            value={prediction.rain_during_race}
            label="Regnet es während des Rennens?"
            icon={CloudRain}
            target="rain_during_race"
            points={8}
            color="blue"
          />
        </div>

        {/* Fahrer-Tipps */}
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Fahrer-Vorhersagen</h2>
        <div className="space-y-3 mb-8">
          <DriverCard num={prediction.first_dnf_driver} label="Erster Ausfall" target="first_dnf_driver" points={15} icon={UserMinus} />
          <DriverCard num={prediction.driver_of_day} label="Driver of the Day" target="driver_of_day" points={10} icon={Star} />
          <DriverCard num={prediction.most_overtakes_driver} label="Meiste Überholmanöver" target="most_overtakes_driver" points={10} icon={ArrowUpDown} />
        </div>

        {/* Anzahl DNFs */}
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Wie viele Ausfälle?</h2>
        <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-4 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
              <UserMinus className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Anzahl Ausfälle</div>
              <div className="text-xs text-gray-500">+5 Punkte bei ±1 richtig</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[0, 1, 2, 3, 4, '5+'].map((num, i) => (
              <button
                key={num}
                onClick={() => !isLocked && setPrediction(prev => ({ ...prev, total_dnfs: i }))}
                disabled={isLocked}
                className={`w-12 h-12 rounded-lg font-bold transition-all ${
                  prediction.total_dnfs === i
                    ? 'bg-red-600 text-white'
                    : 'bg-[#111] text-gray-400 hover:bg-[#1a1a1a]'
                } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Punkte Info */}
        <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Mögliche Bonus-Punkte</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Safety Car:</div><div className="text-white">5 Punkte</div>
            <div className="text-gray-500">Rote Flagge:</div><div className="text-white">10 Punkte</div>
            <div className="text-gray-500">Regen:</div><div className="text-white">8 Punkte</div>
            <div className="text-gray-500">Erster DNF:</div><div className="text-white">15 Punkte</div>
            <div className="text-gray-500">Driver of Day:</div><div className="text-white">10 Punkte</div>
            <div className="text-gray-500">Most Overtakes:</div><div className="text-white">10 Punkte</div>
            <div className="text-gray-500">DNF Anzahl:</div><div className="text-white">5 Punkte</div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800 text-right">
            <span className="text-gray-500">Maximal: </span>
            <span className="text-orange-400 font-bold">63 Punkte pro Rennen</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isLocked}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            saving || isLocked
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          {saving ? 'Speichern...' : existingPrediction?.id ? 'Bonus-Tipps aktualisieren' : 'Bonus-Tipps abgeben'}
        </button>
      </main>

      {/* Driver Selection Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center p-4">
          <div className="bg-[#111] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg">Fahrer wählen</h3>
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
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-600"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredDrivers.map((driver) => (
                  <button
                    key={driver.driver_number}
                    onClick={() => selectDriver(driver.driver_number)}
                    className="p-3 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-gray-800 hover:border-gray-600 transition-all text-left"
                  >
                    <div
                      className="w-full aspect-square rounded-lg overflow-hidden mb-3"
                      style={{ backgroundColor: driver.team_color }}
                    >
                      <img
                        src={getDriverHeadshot(driver.driver_number)}
                        alt={driver.full_name}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback.png.transform/1col/image.png'
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-white text-sm truncate">{driver.full_name}</div>
                      <div className="text-xs text-gray-500 truncate">{driver.team_name}</div>
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


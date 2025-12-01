'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race } from '@/lib/supabase'
import { getCountryFlag, getCircuitGradient } from '@/lib/images'
import { 
  ChevronLeft, Check, AlertCircle, Lock,
  ShieldAlert, CloudRain, Star, Clock
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import { de } from 'date-fns/locale'

interface BonusPrediction {
  id?: string
  safety_car: boolean | null
  rain_during_race: boolean | null
}

export default function BonusTipsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  
  const raceId = params.id as string

  const [race, setRace] = useState<Race | null>(null)
  const [prediction, setPrediction] = useState<BonusPrediction>({
    safety_car: null,
    rain_during_race: null,
  })
  const [existingPrediction, setExistingPrediction] = useState<BonusPrediction | null>(null)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

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
            rain_during_race: predData.rain_during_race,
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
    <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-xl bg-${color}-600/20 flex items-center justify-center`}>
          <Icon className={`w-7 h-7 text-${color}-400`} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-white text-lg">{label}</div>
          <div className="text-sm text-gray-500">+{points} Punkte bei richtigem Tipp</div>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => !isLocked && setPrediction(prev => ({ ...prev, [target]: true }))}
          disabled={isLocked}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
            value === true
              ? 'bg-green-600 text-white scale-105 shadow-lg shadow-green-600/30'
              : 'bg-[#111] text-gray-400 hover:bg-[#1a1a1a]'
          } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          Ja ✓
        </button>
        <button
          onClick={() => !isLocked && setPrediction(prev => ({ ...prev, [target]: false }))}
          disabled={isLocked}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
            value === false
              ? 'bg-red-600 text-white scale-105 shadow-lg shadow-red-600/30'
              : 'bg-[#111] text-gray-400 hover:bg-[#1a1a1a]'
          } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          Nein ✗
        </button>
      </div>
    </div>
  )

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
          <div className={`h-24 bg-gradient-to-br ${getCircuitGradient(race.race_name)} flex items-center justify-center`}>
            <span className="text-6xl">{getCountryFlag(race.race_name)}</span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-orange-600/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Runde {race.round} • Bonus-Tipps</div>
                <h1 className="text-xl font-bold text-white">{race.race_name}</h1>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Einfache Ja/Nein Vorhersagen für Extra-Punkte!</p>
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

        {/* Bonus Tipps */}
        <div className="space-y-4 mb-8">
          <YesNoButton
            value={prediction.safety_car}
            label="Safety Car im Rennen?"
            icon={ShieldAlert}
            target="safety_car"
            points={5}
            color="yellow"
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

        {/* Punkte Info */}
        <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Mögliche Bonus-Punkte:</span>
            <span className="text-orange-400 font-bold text-xl">+13 Punkte</span>
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
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race, Prediction } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { History, Check, X, Trophy, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Driver {
  driver_number: number
  full_name: string
  team_name: string
  team_color: string
}

interface PredictionWithRace extends Prediction {
  race: Race
}

interface RaceResult {
  race_id: number
  position: number
  driver_id: number
  fastest_lap: boolean
  pole_position: boolean
}

export default function HistoryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [predictions, setPredictions] = useState<PredictionWithRace[]>([])
  const [results, setResults] = useState<RaceResult[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [expandedRace, setExpandedRace] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      try {
        // Fetch predictions with race data
        const { data: predsData } = await supabase
          .from('predictions')
          .select('*, race:races(*)')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
        
        if (predsData) setPredictions(predsData as PredictionWithRace[])
        
        // Fetch race results
        const { data: resultsData } = await supabase
          .from('race_results')
          .select('*')
        
        if (resultsData) setResults(resultsData)
        
        // Fetch drivers
        const res = await fetch('/api/drivers')
        const json = await res.json()
        if (json.drivers) setDrivers(json.drivers)
        
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchData()
  }, [user])

  const getDriver = (num?: number | null) => drivers.find(d => d.driver_number === num)
  
  const getRaceResults = (raceId: number) => results.filter(r => r.race_id === raceId)
  
  const checkPrediction = (predicted: number | undefined | null, actual: number | undefined) => {
    if (!predicted || !actual) return null
    return predicted === actual
  }

  // Group predictions by race
  const predictionsByRace = predictions.reduce((acc, pred) => {
    const raceId = pred.race_id
    if (!acc[raceId]) {
      acc[raceId] = {
        race: pred.race,
        predictions: []
      }
    }
    acc[raceId].predictions.push(pred)
    return acc
  }, {} as Record<number, { race: Race, predictions: PredictionWithRace[] }>)

  // Sort by race date descending
  const sortedRaces = Object.values(predictionsByRace).sort(
    (a, b) => new Date(b.race.race_date).getTime() - new Date(a.race.race_date).getTime()
  )

  if (loading || loadingData) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <History className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-white">Verlauf</h1>
        </div>
        <p className="text-gray-500 text-sm mb-8">Deine Tipps und Ergebnisse</p>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-white">{predictions.length}</div>
            <div className="text-xs text-gray-500">Tipps</div>
          </div>
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-green-400">
              {predictions.filter(p => (p.points_earned || 0) > 0).length}
            </div>
            <div className="text-xs text-gray-500">Mit Punkten</div>
          </div>
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0)}
            </div>
            <div className="text-xs text-gray-500">Gesamtpunkte</div>
          </div>
        </div>

        {/* Predictions List */}
        <div className="space-y-4">
          {sortedRaces.map(({ race, predictions: racePreds }) => {
            const raceResults = getRaceResults(race.id)
            const isExpanded = expandedRace === race.id
            const totalPoints = racePreds.reduce((sum, p) => sum + (p.points_earned || 0), 0)
            const isPast = new Date(race.race_date) < new Date()
            
            return (
              <div key={race.id} className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
                {/* Race Header */}
                <button
                  onClick={() => setExpandedRace(isExpanded ? null : race.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <span className="text-2xl">{getCountryFlag(race.race_name)}</span>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-white">{race.race_name}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(race.race_date), 'd. MMMM yyyy', { locale: de })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isPast && (
                      <div className={`text-lg font-bold ${totalPoints > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        +{totalPoints}
                      </div>
                    )}
                    {!isPast && (
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">Ausstehend</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </div>
                </button>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-4 space-y-4">
                    {racePreds.map(pred => {
                      const sessionConfig = {
                        qualifying: { icon: Target, label: 'Qualifying', color: 'blue' },
                        sprint: { icon: Zap, label: 'Sprint', color: 'purple' },
                        race: { icon: Trophy, label: 'Rennen', color: 'red' }
                      }
                      const config = sessionConfig[pred.session_type as keyof typeof sessionConfig] || sessionConfig.race
                      const Icon = config.icon
                      
                      // Get actual results for comparison
                      const p1Result = raceResults.find(r => r.position === 1)
                      const p2Result = raceResults.find(r => r.position === 2)
                      const p3Result = raceResults.find(r => r.position === 3)
                      const flResult = raceResults.find(r => r.fastest_lap)
                      const poleResult = raceResults.find(r => r.pole_position)
                      
                      return (
                        <div key={pred.id} className="bg-[#0a0a0a] rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Icon className={`w-4 h-4 text-${config.color}-400`} />
                            <span className="text-sm font-medium text-gray-300">{config.label}</span>
                            {(pred.points_earned || 0) > 0 && (
                              <span className="ml-auto text-green-400 font-bold">+{pred.points_earned}</span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {pred.session_type === 'qualifying' ? (
                              <PredictionItem
                                label="Pole"
                                predicted={getDriver(pred.pole_driver)?.full_name?.split(' ').pop()}
                                actual={getDriver(poleResult?.driver_id)?.full_name?.split(' ').pop()}
                                isCorrect={isPast ? checkPrediction(pred.pole_driver, poleResult?.driver_id) : null}
                              />
                            ) : (
                              <>
                                <PredictionItem
                                  label="P1"
                                  predicted={getDriver(pred.p1_driver)?.full_name?.split(' ').pop()}
                                  actual={getDriver(p1Result?.driver_id)?.full_name?.split(' ').pop()}
                                  isCorrect={isPast ? checkPrediction(pred.p1_driver, p1Result?.driver_id) : null}
                                />
                                <PredictionItem
                                  label="P2"
                                  predicted={getDriver(pred.p2_driver)?.full_name?.split(' ').pop()}
                                  actual={getDriver(p2Result?.driver_id)?.full_name?.split(' ').pop()}
                                  isCorrect={isPast ? checkPrediction(pred.p2_driver, p2Result?.driver_id) : null}
                                />
                                <PredictionItem
                                  label="P3"
                                  predicted={getDriver(pred.p3_driver)?.full_name?.split(' ').pop()}
                                  actual={getDriver(p3Result?.driver_id)?.full_name?.split(' ').pop()}
                                  isCorrect={isPast ? checkPrediction(pred.p3_driver, p3Result?.driver_id) : null}
                                />
                                {pred.session_type === 'race' && (
                                  <PredictionItem
                                    label="FL"
                                    predicted={getDriver(pred.fastest_lap_driver)?.full_name?.split(' ').pop()}
                                    actual={getDriver(flResult?.driver_id)?.full_name?.split(' ').pop()}
                                    isCorrect={isPast ? checkPrediction(pred.fastest_lap_driver, flResult?.driver_id) : null}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {predictions.length === 0 && (
          <div className="bg-[#111] rounded-xl border border-gray-800 p-12 text-center">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-500 mb-4">Noch keine Tipps abgegeben</p>
            <Link href="/races" className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Jetzt tippen
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

function PredictionItem({ 
  label, 
  predicted, 
  actual, 
  isCorrect 
}: { 
  label: string
  predicted?: string
  actual?: string
  isCorrect: boolean | null
}) {
  return (
    <div className="bg-[#111] rounded-lg p-3">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className="flex items-center justify-between">
        <span className={`font-bold ${
          isCorrect === true ? 'text-green-400' :
          isCorrect === false ? 'text-red-400' :
          'text-white'
        }`}>
          {predicted || '-'}
        </span>
        {isCorrect !== null && (
          isCorrect ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <X className="w-4 h-4 text-red-400" />
          )
        )}
      </div>
      {actual && isCorrect === false && (
        <div className="text-[10px] text-gray-500 mt-1">
          Richtig: <span className="text-green-400">{actual}</span>
        </div>
      )}
    </div>
  )
}





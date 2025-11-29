'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race, Prediction } from '@/lib/supabase'
import { getDriverHeadshot, getCountryFlag, getCircuitGradient } from '@/lib/images'
import { ChevronLeft, Check, AlertCircle, X, Search, Target, Zap, Trophy, Clock } from 'lucide-react'
import { format, isPast, differenceInMinutes } from 'date-fns'
import { de } from 'date-fns/locale'

interface Driver {
  driver_number: number
  full_name: string
  team_name: string
  team_color: string
  code?: string
}

type SessionType = 'qualifying' | 'sprint' | 'race'

interface SessionTime {
  name: string
  date: Date
  type: string
}

const SESSION_CONFIG = {
  qualifying: {
    title: 'Qualifying',
    icon: Target,
    color: 'blue',
    description: 'Wer holt die Pole Position?',
    fields: ['pole'],
    points: { pole: 10 }
  },
  sprint: {
    title: 'Sprint',
    icon: Zap,
    color: 'purple',
    description: 'Top 3 im Sprint',
    fields: ['p1', 'p2', 'p3'],
    points: { p1: 15, p2: 10, p3: 5 }
  },
  race: {
    title: 'Rennen',
    icon: Trophy,
    color: 'red',
    description: 'Podium und schnellste Runde',
    fields: ['p1', 'p2', 'p3', 'fastestLap'],
    points: { p1: 25, p2: 18, p3: 15, fastestLap: 10 }
  }
}

export default function PredictPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  
  const raceId = params.id as string
  const session = (searchParams.get('session') || 'race') as SessionType

  const [race, setRace] = useState<Race | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [existingPrediction, setExistingPrediction] = useState<Prediction | null>(null)
  
  const [p1, setP1] = useState<number | null>(null)
  const [p2, setP2] = useState<number | null>(null)
  const [p3, setP3] = useState<number | null>(null)
  const [pole, setPole] = useState<number | null>(null)
  const [fastestLap, setFastestLap] = useState<number | null>(null)
  
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTarget, setModalTarget] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sessionTimes, setSessionTimes] = useState<SessionTime[]>([])

  const config = SESSION_CONFIG[session]

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    async function fetchData() {
      if (!user || !raceId) return
      try {
        const { data: raceData } = await supabase
          .from('races').select('*').eq('id', parseInt(raceId)).maybeSingle()
        if (raceData) {
          setRace(raceData)
          
          // Session-Zeiten von Jolpica holen
          try {
            const res = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceData.round}.json`)
            const data = await res.json()
            const raceInfo = data.MRData?.RaceTable?.Races?.[0]
            
            if (raceInfo) {
              const sessions: SessionTime[] = []
              
              if (raceInfo.SprintQualifying) {
                sessions.push({
                  name: 'Sprint-Quali',
                  date: new Date(`${raceInfo.SprintQualifying.date}T${raceInfo.SprintQualifying.time}`),
                  type: 'sprint_qualifying'
                })
              }
              
              if (raceInfo.Sprint) {
                sessions.push({
                  name: 'Sprint',
                  date: new Date(`${raceInfo.Sprint.date}T${raceInfo.Sprint.time}`),
                  type: 'sprint'
                })
              }
              
              if (raceInfo.Qualifying) {
                sessions.push({
                  name: 'Qualifying',
                  date: new Date(`${raceInfo.Qualifying.date}T${raceInfo.Qualifying.time}`),
                  type: 'qualifying'
                })
              }
              
              sessions.push({
                name: 'Rennen',
                date: new Date(`${raceInfo.date}T${raceInfo.time}`),
                type: 'race'
              })
              
              setSessionTimes(sessions)
            }
          } catch (e) {
            console.error('Error fetching session times:', e)
          }
        }

        const driversResponse = await fetch('/api/drivers')
        const driversJson = await driversResponse.json()
        if (driversJson.drivers) setDrivers(driversJson.drivers)

        // Prediction für diese Session laden
        const { data: predData } = await supabase
          .from('predictions').select('*')
          .eq('user_id', user.id)
          .eq('race_id', parseInt(raceId))
          .eq('session_type', session)
          .maybeSingle()
        
        if (predData) {
          setExistingPrediction(predData)
          setP1(predData.p1_driver)
          setP2(predData.p2_driver)
          setP3(predData.p3_driver)
          setPole(predData.pole_driver)
          setFastestLap(predData.fastest_lap_driver)
        }
      } catch (e) { console.error(e) }
      finally { setLoadingData(false) }
    }
    fetchData()
  }, [user, raceId, session])

  const handleSave = async () => {
    if (!user || !race) return
    
    // Validierung je nach Session
    if (session === 'qualifying' && !pole) {
      setError('Bitte wähle einen Fahrer für die Pole Position')
      return
    }
    if ((session === 'sprint' || session === 'race') && (!p1 || !p2 || !p3)) {
      setError('Bitte wähle alle Podiumsplätze aus')
      return
    }
    if ((session === 'sprint' || session === 'race') && new Set([p1, p2, p3]).size !== 3) {
      setError('Jeder Fahrer kann nur einen Platz belegen')
      return
    }

    setError('')
    setSaving(true)
    try {
      const data = {
        user_id: user.id,
        race_id: race.id,
        session_type: session,
        p1_driver: session !== 'qualifying' ? p1 : null,
        p2_driver: session !== 'qualifying' ? p2 : null,
        p3_driver: session !== 'qualifying' ? p3 : null,
        pole_driver: session === 'qualifying' ? pole : null,
        fastest_lap_driver: session === 'race' ? fastestLap : null
      }
      
      if (existingPrediction) {
        await supabase.from('predictions').update(data).eq('id', existingPrediction.id)
      } else {
        await supabase.from('predictions').insert(data)
      }
      setSaved(true)
      setTimeout(() => router.push('/races'), 1500)
    } catch (e) { 
      console.error(e)
      setError('Fehler beim Speichern') 
    }
    finally { setSaving(false) }
  }

  // Tippschluss: 5 Minuten vor Session-Start
  const getDeadline = () => {
    if (!race) return new Date()
    
    // Versuche echte Zeit von API zu nutzen
    if (sessionTimes.length > 0) {
      const sessionInfo = sessionTimes.find(s => s.type === session)
      if (sessionInfo) {
        return new Date(sessionInfo.date.getTime() - 5 * 60 * 1000)
      }
    }
    
    // Fallback: geschätzte Zeiten
    const raceDate = new Date(race.race_date)
    const qualiDate = race.quali_date ? new Date(race.quali_date) : new Date(raceDate.getTime() - 20 * 60 * 60 * 1000)
    
    if (session === 'qualifying') {
      return new Date(qualiDate.getTime() - 5 * 60 * 1000)
    } else if (session === 'sprint') {
      const sprintDate = new Date(raceDate.getTime() - 4 * 60 * 60 * 1000)
      return new Date(sprintDate.getTime() - 5 * 60 * 1000)
    } else {
      return new Date(raceDate.getTime() - 5 * 60 * 1000)
    }
  }
  
  // Echte Session-Zeit für Anzeige
  const getSessionTime = () => {
    if (sessionTimes.length > 0) {
      const sessionInfo = sessionTimes.find(s => s.type === session)
      if (sessionInfo) return sessionInfo.date
    }
    
    // Fallback
    if (!race) return new Date()
    const raceDate = new Date(race.race_date)
    if (session === 'qualifying') {
      return race.quali_date ? new Date(race.quali_date) : new Date(raceDate.getTime() - 20 * 60 * 60 * 1000)
    } else if (session === 'sprint') {
      return new Date(raceDate.getTime() - 4 * 60 * 60 * 1000)
    }
    return raceDate
  }
  
  const deadline = getDeadline()
  const isLocked = race ? isPast(deadline) : false
  const minutesUntilDeadline = race ? differenceInMinutes(deadline, new Date()) : 999
  const getDriver = (num: number | null) => drivers.find(d => d.driver_number === num)
  
  const openModal = (target: string) => { setModalTarget(target); setSearchTerm(''); setModalOpen(true) }
  const selectDriver = (num: number) => {
    if (modalTarget === 'p1') setP1(num)
    else if (modalTarget === 'p2') setP2(num)
    else if (modalTarget === 'p3') setP3(num)
    else if (modalTarget === 'pole') setPole(num)
    else if (modalTarget === 'fl') setFastestLap(num)
    setModalOpen(false)
  }

  // Gruppiere Fahrer nach Team
  const teamGroups = drivers.reduce((acc, driver) => {
    const team = driver.team_name || 'Other'
    if (!acc[team]) acc[team] = []
    acc[team].push(driver)
    return acc
  }, {} as Record<string, Driver[]>)

  const filteredDrivers = drivers.filter(d => 
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Große Fahrer-Auswahl-Karte
  const DriverCard = ({ num, label, target, points }: { num: number | null, label: string, target: string, points: number }) => {
    const driver = getDriver(num)
    
    return (
      <button
        onClick={() => !isLocked && openModal(target)}
        disabled={isLocked}
        className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
          driver 
            ? 'border-gray-700 bg-[#111]' 
            : 'border-dashed border-gray-600 bg-[#0a0a0a] hover:border-gray-500'
        } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-red-600'}`}
      >
        <div className="flex items-center gap-5">
          {/* GROSSE Driver Photo */}
          <div 
            className="w-24 h-24 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
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
              <span className="text-gray-500 text-4xl">?</span>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">{label}</div>
            {driver ? (
              <>
                <div className="text-xl font-bold text-white truncate">{driver.full_name}</div>
                <div className="text-gray-400 flex items-center gap-2 mt-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: driver.team_color }}
                  />
                  {driver.team_name}
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-lg">Fahrer wählen →</div>
            )}
          </div>
          
          {/* Points & Number */}
          <div className="text-right shrink-0">
            {driver && (
              <div 
                className="text-4xl font-bold mb-1"
                style={{ color: driver.team_color }}
              >
                {driver.driver_number}
              </div>
            )}
            <div className="text-sm text-gray-500">+{points} Pkt</div>
          </div>
        </div>
      </button>
    )
  }

  if (loading || loadingData) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  }

  if (!race) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-gray-400">Rennen nicht gefunden</p>
        <Link href="/races" className="text-red-500 text-sm mt-2 inline-block">Zurück</Link>
      </div>
    </div>
  }

  if (saved) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto bg-green-600 rounded-full flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-white" />
        </div>
        <p className="text-white text-xl font-bold">Tipp gespeichert!</p>
        <p className="text-gray-400 mt-2">{config.title} - {race.race_name}</p>
      </div>
    </div>
  }

  const Icon = config.icon

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
              <div className={`w-10 h-10 rounded-lg bg-${config.color}-600/20 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${config.color}-400`} />
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Runde {race.round} • {config.title}</div>
                <h1 className="text-xl font-bold text-white">{race.race_name}</h1>
              </div>
            </div>
            <p className="text-gray-400 text-sm">{config.description}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              {format(getSessionTime(), 'EEEE, d. MMMM yyyy • HH:mm', { locale: de })} Uhr
            </div>
            {isLocked ? (
              <div className="mt-4 text-red-400 text-sm font-medium">⚠️ Tippschluss erreicht (5 Min vor Start)</div>
            ) : minutesUntilDeadline < 60 ? (
              <div className="mt-4 text-yellow-400 text-sm font-medium animate-pulse">
                ⏱️ Noch {minutesUntilDeadline} Minuten bis Tippschluss!
              </div>
            ) : null}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Session-spezifische Felder */}
        <div className="space-y-4 mb-8">
          {session === 'qualifying' && (
            <>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Pole Position</h2>
              <DriverCard num={pole} label="Pole Position" target="pole" points={(config.points as { pole?: number }).pole || 10} />
            </>
          )}

          {(session === 'sprint' || session === 'race') && (
            <>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Podium</h2>
              <DriverCard num={p1} label="1. Platz" target="p1" points={(config.points as { p1?: number }).p1 || 25} />
              <DriverCard num={p2} label="2. Platz" target="p2" points={(config.points as { p2?: number }).p2 || 18} />
              <DriverCard num={p3} label="3. Platz" target="p3" points={(config.points as { p3?: number }).p3 || 15} />
            </>
          )}

          {session === 'race' && (
            <>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mt-8">Bonus</h2>
              <DriverCard num={fastestLap} label="Schnellste Runde" target="fl" points={(config.points as { fastestLap?: number }).fastestLap || 10} />
            </>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isLocked}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            saving || isLocked
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {saving ? 'Speichern...' : existingPrediction ? 'Tipp aktualisieren' : 'Tipp abgeben'}
        </button>
      </main>

      {/* Driver Selection Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center p-4">
          <div className="bg-[#111] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg">Fahrer wählen</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Fahrer oder Team suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Driver List - GROSSE BILDER */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {filteredDrivers.map((driver) => (
                  <button
                    key={driver.driver_number}
                    onClick={() => selectDriver(driver.driver_number)}
                    className="p-3 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-gray-800 hover:border-gray-600 transition-all text-left"
                  >
                    {/* GROSSES Bild */}
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
                      <div 
                        className="text-xl font-bold mt-1"
                        style={{ color: driver.team_color }}
                      >
                        #{driver.driver_number}
                      </div>
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

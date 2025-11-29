'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile, Prediction, Race } from '@/lib/supabase'
import { 
  Trophy, 
  RefreshCw,
  Flag,
  Clock,
  Award,
  Users,
  Zap,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface DriverStanding {
  position: string
  points: string
  wins: string
  Driver: {
    driverId: string
    permanentNumber: string
    code: string
    givenName: string
    familyName: string
  }
  Constructors: Array<{
    constructorId: string
    name: string
  }>
}

interface ConstructorStanding {
  position: string
  points: string
  wins: string
  Constructor: {
    constructorId: string
    name: string
    nationality: string
  }
}

interface RaceResult {
  position: string
  number: string
  Driver: {
    code: string
    givenName: string
    familyName: string
    permanentNumber: string
  }
  Constructor: {
    name: string
    constructorId: string
  }
  points: string
  status: string
  FastestLap?: {
    rank: string
  }
}

interface OpenF1Position {
  position: number
  driver_number: number
  full_name?: string
  name_acronym?: string
}

interface OpenF1Session {
  session_key: number
  session_name: string
  session_type: string
  meeting_name: string
  date_start: string
  date_end: string
}

interface LastRace {
  raceName: string
  date: string
  round: string
  Results: RaceResult[]
}

interface LivePlayer {
  profile: Profile
  prediction: Prediction | null
  livePoints: number
  basePoints: number
}

interface Driver {
  driver_number: number
  full_name: string
}

const TEAM_COLORS: Record<string, string> = {
  'red_bull': '#3671C6',
  'ferrari': '#E8002D',
  'mclaren': '#FF8000',
  'mercedes': '#27F4D2',
  'aston_martin': '#229971',
  'alpine': '#0093CC',
  'williams': '#64C4FF',
  'rb': '#6692FF',
  'sauber': '#52E252',
  'haas': '#B6BABD',
}

// Mapping von Fahrernummern zu permanentNumber
const DRIVER_NUMBERS: Record<string, number> = {
  'VER': 1, 'PER': 11, 'HAM': 44, 'RUS': 63, 'LEC': 16, 'SAI': 55,
  'NOR': 4, 'PIA': 81, 'ALO': 14, 'STR': 18, 'GAS': 10, 'OCO': 31,
  'ALB': 23, 'SAR': 2, 'TSU': 22, 'RIC': 3, 'BOT': 77, 'ZHO': 24,
  'MAG': 20, 'HUL': 27, 'LAW': 30, 'COL': 43, 'BEA': 87, 'DOO': 61,
  'ANT': 12, 'HAD': 98
}

export default function LivePage() {
  const { user } = useAuth()
  
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([])
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([])
  const [lastRace, setLastRace] = useState<LastRace | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<'live' | 'drivers' | 'constructors' | 'lastRace'>('live')
  
  // Live Tipp Tabelle
  const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([])
  const [currentRace, setCurrentRace] = useState<Race | null>(null)
  const [currentPositions, setCurrentPositions] = useState<RaceResult[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [sessionType, setSessionType] = useState<'qualifying' | 'sprint' | 'race'>('race')
  
  // OpenF1 Live Data
  const [livePositions, setLivePositions] = useState<OpenF1Position[]>([])
  const [liveSession, setLiveSession] = useState<OpenF1Session | null>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [liveDataAge, setLiveDataAge] = useState<number>(0)

  // OpenF1 Live-Positionen laden (mit Cache)
  const fetchLivePositions = useCallback(async () => {
    try {
      const res = await fetch('/api/live-positions')
      if (!res.ok) return
      
      const data = await res.json()
      
      setLivePositions(data.positions || [])
      setLiveSession(data.sessionInfo || null)
      setIsSessionActive(data.isActive || false)
      setLiveDataAge(data.cacheAge || 0)
      
      // Wenn Live-Session aktiv, Session-Typ automatisch setzen
      if (data.isActive && data.sessionInfo) {
        const sessionName = data.sessionInfo.session_name?.toLowerCase() || ''
        if (sessionName.includes('quali') || sessionName.includes('qualifying')) {
          setSessionType('qualifying')
        } else if (sessionName.includes('sprint') && !sessionName.includes('quali')) {
          setSessionType('sprint')
        } else if (sessionName.includes('race')) {
          setSessionType('race')
        }
      }
    } catch (err) {
      console.error('Error fetching live positions:', err)
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true)
      
      const [driversRes, constructorsRes, lastRaceRes] = await Promise.all([
        fetch('https://api.jolpi.ca/ergast/f1/current/driverStandings/'),
        fetch('https://api.jolpi.ca/ergast/f1/current/constructorStandings/'),
        fetch('https://api.jolpi.ca/ergast/f1/current/last/results/')
      ])
      
      if (driversRes.ok) {
        const data = await driversRes.json()
        setDriverStandings(data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [])
      }
      
      if (constructorsRes.ok) {
        const data = await constructorsRes.json()
        setConstructorStandings(data.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [])
      }
      
      if (lastRaceRes.ok) {
        const data = await lastRaceRes.json()
        const race = data.MRData?.RaceTable?.Races?.[0] || null
        setLastRace(race)
        if (race?.Results) {
          setCurrentPositions(race.Results)
        }
      }
      
      // Fahrer laden
      const driversResponse = await fetch('/api/drivers')
      const driversJson = await driversResponse.json()
      if (driversJson.drivers) setDrivers(driversJson.drivers)
      
      // Live-Positionen auch laden
      await fetchLivePositions()
      
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [fetchLivePositions])

  // Live Tipp-Daten laden
  const fetchLiveTipps = useCallback(async () => {
    try {
      // Aktuelles/nächstes Rennen holen
      const { data: races } = await supabase
        .from('races')
        .select('*')
        .eq('season', 2025)
        .order('race_date', { ascending: true })
      
      if (!races || races.length === 0) return
      
      const now = new Date()
      const current = races.find(r => {
        const raceDate = new Date(r.race_date)
        const dayBefore = new Date(raceDate.getTime() - 48 * 60 * 60 * 1000)
        return now >= dayBefore && now <= raceDate
      }) || races.find(r => new Date(r.race_date) > now)
      
      if (!current) return
      setCurrentRace(current)
      
      // Alle Spieler und deren Tipps für dieses Rennen
      const [profilesRes, predictionsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('total_points', { ascending: false }),
        supabase.from('predictions').select('*').eq('race_id', current.id).eq('session_type', sessionType)
      ])
      
      const profiles = profilesRes.data || []
      const predictions = predictionsRes.data || []
      
      // Live-Punkte berechnen - OpenF1 wenn aktiv, sonst Jolpica
      const playersWithLivePoints: LivePlayer[] = profiles.map(profile => {
        const prediction = predictions.find(p => p.user_id === profile.id) || null
        
        // Wenn OpenF1 Live-Session aktiv, nutze deren Positionen
        const livePoints = isSessionActive && livePositions.length > 0
          ? calculateOpenF1LivePoints(prediction, livePositions, sessionType)
          : calculateLivePoints(prediction, currentPositions, sessionType)
        
        return {
          profile,
          prediction,
          livePoints,
          basePoints: profile.total_points || 0
        }
      })
      
      // Sortieren nach Gesamt (Base + Live)
      playersWithLivePoints.sort((a, b) => 
        (b.basePoints + b.livePoints) - (a.basePoints + a.livePoints)
      )
      
      setLivePlayers(playersWithLivePoints)
      
    } catch (err) {
      console.error('Error fetching live tipps:', err)
    }
  }, [currentPositions, sessionType, isSessionActive, livePositions])

  // Punkte berechnen basierend auf aktuellen Positionen (Jolpica API)
  const calculateLivePoints = (
    prediction: Prediction | null, 
    positions: RaceResult[],
    session: 'qualifying' | 'sprint' | 'race'
  ): number => {
    if (!prediction || positions.length === 0) return 0
    
    let points = 0
    
    // Fahrernummer aus Code bekommen
    const getDriverNumber = (result: RaceResult): number => {
      return parseInt(result.Driver?.permanentNumber || result.number) || 
             DRIVER_NUMBERS[result.Driver?.code] || 0
    }
    
    const p1 = positions[0] ? getDriverNumber(positions[0]) : 0
    const p2 = positions[1] ? getDriverNumber(positions[1]) : 0
    const p3 = positions[2] ? getDriverNumber(positions[2]) : 0
    const fastestLap = positions.find(p => p.FastestLap?.rank === '1')
    const fl = fastestLap ? getDriverNumber(fastestLap) : 0
    
    if (session === 'qualifying') {
      // Pole richtig
      if (prediction.pole_driver === p1) points += 10
    } else if (session === 'sprint') {
      // Sprint: P1=15, P2=10, P3=5
      if (prediction.p1_driver === p1) points += 15
      if (prediction.p2_driver === p2) points += 10
      if (prediction.p3_driver === p3) points += 5
    } else {
      // Rennen: P1=25, P2=18, P3=15, FL=10
      if (prediction.p1_driver === p1) points += 25
      if (prediction.p2_driver === p2) points += 18
      if (prediction.p3_driver === p3) points += 15
      if (prediction.fastest_lap_driver === fl) points += 10
    }
    
    return points
  }
  
  // Punkte berechnen mit OpenF1 Live-Positionen
  const calculateOpenF1LivePoints = (
    prediction: Prediction | null, 
    positions: OpenF1Position[],
    session: 'qualifying' | 'sprint' | 'race'
  ): number => {
    if (!prediction || positions.length === 0) return 0
    
    let points = 0
    
    const p1 = positions[0]?.driver_number || 0
    const p2 = positions[1]?.driver_number || 0
    const p3 = positions[2]?.driver_number || 0
    
    if (session === 'qualifying') {
      if (prediction.pole_driver === p1) points += 10
    } else if (session === 'sprint') {
      if (prediction.p1_driver === p1) points += 15
      if (prediction.p2_driver === p2) points += 10
      if (prediction.p3_driver === p3) points += 5
    } else {
      if (prediction.p1_driver === p1) points += 25
      if (prediction.p2_driver === p2) points += 18
      if (prediction.p3_driver === p3) points += 15
      // Fastest Lap können wir live nicht tracken
    }
    
    return points
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchLiveTipps()
  }, [fetchLiveTipps])

  // Auto-refresh - Wenn Session aktiv: alle 2 Minuten für OpenF1
  useEffect(() => {
    // Standard refresh alle 60 Sekunden
    const standardInterval = setInterval(() => {
      fetchData()
      fetchLiveTipps()
    }, 60000)
    
    // OpenF1 Live-Positionen alle 2 Minuten (wenn Session aktiv)
    const liveInterval = setInterval(() => {
      if (isSessionActive) {
        fetchLivePositions()
        fetchLiveTipps()
      }
    }, 120000) // 2 Minuten
    
    return () => {
      clearInterval(standardInterval)
      clearInterval(liveInterval)
    }
  }, [fetchData, fetchLiveTipps, fetchLivePositions, isSessionActive])

  const getTeamColor = (constructorId: string): string => {
    return TEAM_COLORS[constructorId] || '#666666'
  }

  const getDriverName = (num: number | null | undefined): string => {
    if (!num) return '-'
    const driver = drivers.find(d => d.driver_number === num)
    return driver?.full_name?.split(' ').pop() || String(num)
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E10600] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Lade Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Trophy className="w-10 h-10 text-[#E10600]" />
              WM-Stand 2025
            </h1>
            <p className="text-gray-400 mt-2">
              Live-Tabelle & Fahrer-/Konstrukteurswertung
            </p>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="text-sm text-gray-500">
                <Clock className="w-4 h-4 inline mr-1" />
                {format(lastUpdate, 'HH:mm', { locale: de })} Uhr
              </div>
            )}
            <button
              onClick={() => { fetchData(); fetchLiveTipps(); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Aktualisieren
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-[#111] rounded-lg p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'live' 
                ? 'bg-[#E10600] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-5 h-5" />
            Live-Tabelle
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'drivers' 
                ? 'bg-[#E10600] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-5 h-5" />
            Fahrer-WM
          </button>
          <button
            onClick={() => setActiveTab('constructors')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'constructors' 
                ? 'bg-[#E10600] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            Team-WM
          </button>
          <button
            onClick={() => setActiveTab('lastRace')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'lastRace' 
                ? 'bg-[#E10600] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flag className="w-5 h-5" />
            Letztes Rennen
          </button>
        </div>

        {/* Live Tipp-Tabelle */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {/* Session Auswahl */}
            <div className="flex gap-2">
              {['qualifying', 'sprint', 'race'].map(s => (
                <button
                  key={s}
                  onClick={() => setSessionType(s as typeof sessionType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sessionType === s 
                      ? 'bg-[#E10600] text-white' 
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                  }`}
                >
                  {s === 'qualifying' ? 'Quali' : s === 'sprint' ? 'Sprint' : 'Rennen'}
                </button>
              ))}
            </div>
            
            {/* OpenF1 LIVE Positionen */}
            {isSessionActive && livePositions.length > 0 && (
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-xl p-4 border border-green-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    LIVE: {liveSession?.session_name || 'Session'} - {liveSession?.meeting_name}
                  </h3>
                  <span className="text-xs text-gray-500">
                    Aktualisiert vor {liveDataAge}s
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {livePositions.slice(0, 10).map((pos, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg px-3 py-2 shrink-0 border border-green-900/30">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-orange-500 text-black' :
                        'bg-gray-700 text-white'
                      }`}>
                        {pos.position}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">
                          {pos.name_acronym || '???'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          #{pos.driver_number}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Fallback: Letztes Rennergebnis wenn keine Live-Session */}
            {!isSessionActive && currentPositions.length > 0 && (
              <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-bold text-gray-400 mb-3">
                  LETZTES ERGEBNIS ({lastRace?.raceName || 'Letztes Rennen'})
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {currentPositions.slice(0, 5).map((pos, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg px-3 py-2 shrink-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-orange-500 text-black' :
                        'bg-gray-700 text-white'
                      }`}>
                        {pos.position}
                      </span>
                      <span className="font-medium text-white">
                        {pos.Driver?.code || pos.Driver?.familyName?.substring(0, 3).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Live Rangliste */}
            <div className={`bg-[#111] rounded-xl overflow-hidden border ${isSessionActive ? 'border-green-700/50' : 'border-gray-800'}`}>
              <div className={`p-4 border-b border-gray-800 ${isSessionActive ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/20' : 'bg-gradient-to-r from-red-900/20 to-orange-900/20'}`}>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  {isSessionActive ? (
                    <>
                      <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-green-400">LIVE</span>
                    </>
                  ) : (
                    <TrendingUp className="w-5 h-5 text-gray-500" />
                  )}
                  Tipp-Rangliste
                  {currentRace && (
                    <span className="text-sm font-normal text-gray-400 ml-2">
                      {currentRace.race_name}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {isSessionActive 
                    ? `Live-Punkte basierend auf aktuellen Positionen`
                    : `Punkte wenn das ${sessionType === 'qualifying' ? 'Qualifying' : sessionType === 'sprint' ? 'Sprint' : 'Rennen'} jetzt endet`
                  }
                </p>
              </div>
              
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 font-medium">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Spieler</div>
                <div className="col-span-4 text-center">Tipp</div>
                <div className="col-span-2 text-center">Live</div>
                <div className="col-span-2 text-right">Gesamt</div>
              </div>
              
              <div className="divide-y divide-gray-800/50">
                {livePlayers.map((player, idx) => {
                  const isMe = player.profile.id === user?.id
                  
                  return (
                    <div
                      key={player.profile.id}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                        isMe ? 'bg-red-950/30' : 'hover:bg-[#1a1a1a]'
                      } transition-colors`}
                    >
                      {/* Position */}
                      <div className="col-span-1">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500 text-black' :
                          idx === 1 ? 'bg-gray-400 text-black' :
                          idx === 2 ? 'bg-orange-500 text-black' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </div>
                      
                      {/* Name */}
                      <div className="col-span-3">
                        <span className={`font-medium ${isMe ? 'text-red-400' : 'text-white'}`}>
                          {player.profile.username}
                        </span>
                        {isMe && <span className="text-xs text-gray-500 ml-1">(Du)</span>}
                      </div>
                      
                      {/* Tipp */}
                      <div className="col-span-4 text-center">
                        {player.prediction ? (
                          <div className="flex items-center justify-center gap-1 text-xs">
                            {sessionType === 'qualifying' ? (
                              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                {getDriverName(player.prediction.pole_driver)}
                              </span>
                            ) : (
                              <>
                                <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                                  {getDriverName(player.prediction.p1_driver)}
                                </span>
                                <span className="bg-gray-500/20 text-gray-300 px-1.5 py-0.5 rounded">
                                  {getDriverName(player.prediction.p2_driver)}
                                </span>
                                <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                                  {getDriverName(player.prediction.p3_driver)}
                                </span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">Kein Tipp</span>
                        )}
                      </div>
                      
                      {/* Live Punkte */}
                      <div className="col-span-2 text-center">
                        <span className={`font-bold ${
                          player.livePoints > 0 ? 'text-green-400' : 'text-gray-500'
                        }`}>
                          +{player.livePoints}
                        </span>
                      </div>
                      
                      {/* Gesamt */}
                      <div className="col-span-2 text-right">
                        <span className="text-lg font-bold text-white">
                          {player.basePoints + player.livePoints}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {livePlayers.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  Noch keine Tipps für dieses Rennen
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drivers Standing */}
        {activeTab === 'drivers' && (
          <div className="bg-[#111] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="font-bold text-lg">Fahrerwertung 2025</h2>
              <span className="text-sm text-gray-500">{driverStandings.length} Fahrer</span>
            </div>
            <div className="divide-y divide-[#222]">
              {driverStandings.map((standing, index) => {
                const teamId = standing.Constructors?.[0]?.constructorId || ''
                const teamColor = getTeamColor(teamId)
                
                return (
                  <div
                    key={standing.Driver.driverId}
                    className="p-4 flex items-center gap-4 hover:bg-[#1a1a1a] transition-colors"
                    style={{ borderLeft: `4px solid ${teamColor}` }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-[#222] text-white'
                    }`}>
                      {standing.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">
                        {standing.Driver.givenName} {standing.Driver.familyName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {standing.Constructors?.[0]?.name || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold">{standing.points}</div>
                      <div className="text-xs text-gray-500">{standing.wins} Siege</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Constructors Standing */}
        {activeTab === 'constructors' && (
          <div className="bg-[#111] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="font-bold text-lg">Konstrukteurswertung 2025</h2>
              <span className="text-sm text-gray-500">{constructorStandings.length} Teams</span>
            </div>
            <div className="divide-y divide-[#222]">
              {constructorStandings.map((standing, index) => {
                const teamColor = getTeamColor(standing.Constructor.constructorId)
                
                return (
                  <div
                    key={standing.Constructor.constructorId}
                    className="p-4 flex items-center gap-4 hover:bg-[#1a1a1a] transition-colors"
                    style={{ borderLeft: `4px solid ${teamColor}` }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-[#222] text-white'
                    }`}>
                      {standing.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{standing.Constructor.name}</div>
                      <div className="text-sm text-gray-500">{standing.Constructor.nationality}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold">{standing.points}</div>
                      <div className="text-xs text-gray-500">{standing.wins} Siege</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Last Race Results */}
        {activeTab === 'lastRace' && lastRace && (
          <div className="bg-[#111] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#222]">
              <h2 className="font-bold text-lg">{lastRace.raceName}</h2>
              <p className="text-sm text-gray-500">
                Runde {lastRace.round} • {format(new Date(lastRace.date), 'd. MMMM yyyy', { locale: de })}
              </p>
            </div>
            <div className="divide-y divide-[#222]">
              {lastRace.Results?.map((result, index) => {
                const teamColor = getTeamColor(result.Constructor?.constructorId || '')
                
                return (
                  <div
                    key={index}
                    className="p-4 flex items-center gap-4 hover:bg-[#1a1a1a] transition-colors"
                    style={{ borderLeft: `4px solid ${teamColor}` }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-[#222] text-white'
                    }`}>
                      {result.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">
                        {result.Driver.givenName} {result.Driver.familyName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {result.Constructor?.name} • {result.status}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold">{result.points}</div>
                      <div className="text-xs text-gray-500">Punkte</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}









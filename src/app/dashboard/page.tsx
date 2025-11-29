'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race, Prediction, Profile } from '@/lib/supabase'
import { getCountryFlag, getCircuitGradient, getDriverHeadshot } from '@/lib/images'
import { 
  Trophy, 
  Target, 
  TrendingUp,
  Users,
  Calendar,
  Flame,
  Medal,
  BarChart3,
  RefreshCw,
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react'
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'
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

interface SessionTime {
  name: string
  date: Date
  type: 'fp1' | 'fp2' | 'fp3' | 'qualifying' | 'sprint' | 'sprint_qualifying' | 'race'
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [nextRace, setNextRace] = useState<Race | null>(null)
  const [upcomingRaces, setUpcomingRaces] = useState<Race[]>([])
  const [nextRacePredictions, setNextRacePredictions] = useState<{
    qualifying: boolean
    sprint: boolean
    race: boolean
  }>({ qualifying: false, sprint: false, race: false })
  const [recentPredictions, setRecentPredictions] = useState<PredictionWithRace[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [allPlayers, setAllPlayers] = useState<Profile[]>([])
  const [communityStats, setCommunityStats] = useState({
    totalPredictions: 0,
    totalPoints: 0
  })
  const [allRacePredictions, setAllRacePredictions] = useState<{
    qualifying: { user: Profile, prediction: Prediction }[]
    sprint: { user: Profile, prediction: Prediction }[]
    race: { user: Profile, prediction: Prediction }[]
  }>({ qualifying: [], sprint: [], race: [] })
  const [loadingData, setLoadingData] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [canTip, setCanTip] = useState(true)
  const [sessionTimes, setSessionTimes] = useState<SessionTime[]>([])
  
  // Live Simulation
  const [livePositions, setLivePositions] = useState<{position: number, driver_number: number, name_acronym?: string}[]>([])
  const [liveSessionActive, setLiveSessionActive] = useState(false)
  const [liveSessionName, setLiveSessionName] = useState<string>('')
  const [simulatedStandings, setSimulatedStandings] = useState<{
    profile: Profile
    prediction: Prediction | null
    currentPoints: number
    simulatedPoints: number
    totalSimulated: number
  }[]>([])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Fetch session times from Jolpica API
  useEffect(() => {
    if (!nextRace) return
    
    const fetchSessionTimes = async () => {
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${nextRace.round}.json`)
        const data = await res.json()
        const race = data.MRData?.RaceTable?.Races?.[0]
        
        if (!race) return
        
        const sessions: SessionTime[] = []
        
        // FP1
        if (race.FirstPractice) {
          sessions.push({
            name: 'FP1',
            date: new Date(`${race.FirstPractice.date}T${race.FirstPractice.time}`),
            type: 'fp1'
          })
        }
        
        // FP2 (oder Sprint Qualifying bei Sprint-Wochenenden)
        if (race.SecondPractice) {
          sessions.push({
            name: 'FP2',
            date: new Date(`${race.SecondPractice.date}T${race.SecondPractice.time}`),
            type: 'fp2'
          })
        }
        
        // Sprint Qualifying (nur bei Sprint-Wochenenden)
        if (race.SprintQualifying) {
          sessions.push({
            name: 'Sprint-Quali',
            date: new Date(`${race.SprintQualifying.date}T${race.SprintQualifying.time}`),
            type: 'sprint_qualifying'
          })
        }
        
        // FP3 (nur bei normalen Wochenenden)
        if (race.ThirdPractice) {
          sessions.push({
            name: 'FP3',
            date: new Date(`${race.ThirdPractice.date}T${race.ThirdPractice.time}`),
            type: 'fp3'
          })
        }
        
        // Sprint (nur bei Sprint-Wochenenden)
        if (race.Sprint) {
          sessions.push({
            name: 'Sprint',
            date: new Date(`${race.Sprint.date}T${race.Sprint.time}`),
            type: 'sprint'
          })
        }
        
        // Qualifying
        if (race.Qualifying) {
          sessions.push({
            name: 'Qualifying',
            date: new Date(`${race.Qualifying.date}T${race.Qualifying.time}`),
            type: 'qualifying'
          })
        }
        
        // Rennen
        sessions.push({
          name: 'Rennen',
          date: new Date(`${race.date}T${race.time}`),
          type: 'race'
        })
        
        // Sortiere nach Datum
        sessions.sort((a, b) => a.date.getTime() - b.date.getTime())
        setSessionTimes(sessions)
        
      } catch (e) {
        console.error('Error fetching session times:', e)
      }
    }
    
    fetchSessionTimes()
  }, [nextRace])

  // Countdown timer - update every second
  useEffect(() => {
    if (!nextRace || sessionTimes.length === 0) return
    
    const updateCountdown = () => {
      const now = new Date()
      
      // Finde die nächste Session (nur tippbare: Quali, Sprint, Rennen)
      const tippableSessions = sessionTimes.filter(s => 
        ['qualifying', 'sprint', 'sprint_qualifying', 'race'].includes(s.type)
      )
      
      let nextSession = tippableSessions[tippableSessions.length - 1] // Default: letzte Session
      for (const s of tippableSessions) {
        if (now < s.date) {
          nextSession = s
          break
        }
      }
      
      const sessionStart = nextSession.date
      const minutesLeft = differenceInMinutes(sessionStart, now)
      const hoursLeft = differenceInHours(sessionStart, now)
      const daysLeft = differenceInDays(sessionStart, now)
      
      if (minutesLeft <= 0) {
        setTimeLeft('Tippschluss!')
        setCanTip(false)
      } else if (minutesLeft < 60) {
        setTimeLeft(`${minutesLeft} Min bis ${nextSession.name}`)
        setCanTip(true)
      } else if (hoursLeft < 24) {
        setTimeLeft(`${hoursLeft}h ${minutesLeft % 60}m bis ${nextSession.name}`)
        setCanTip(true)
      } else {
        setTimeLeft(`${daysLeft}T ${hoursLeft % 24}h bis ${nextSession.name}`)
        setCanTip(true)
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [nextRace, sessionTimes])

  const fetchData = async () => {
    if (!user) return
    
    try {
      const [racesResult, predictionsResult, profilesResult] = await Promise.all([
        supabase.from('races').select('*').eq('season', 2025).order('race_date', { ascending: true }),
        supabase.from('predictions').select(`*, race:races(*)`).eq('user_id', user.id).order('submitted_at', { ascending: false }),
        supabase.from('profiles').select('*').order('total_points', { ascending: false })
      ])

      const allRaces = racesResult.data || []
      const allPreds = predictionsResult.data || []
      const profiles = profilesResult.data || []

      const now = new Date()
      const upcoming = allRaces.filter(r => new Date(r.race_date) > now)
      
      setUpcomingRaces(upcoming.slice(0, 3))
      
      if (upcoming.length > 0) {
        const next = upcoming[0]
        setNextRace(next)
        
        const nextRacePreds = allPreds.filter(p => p.race_id === next.id)
        setNextRacePredictions({
          qualifying: nextRacePreds.some(p => p.session_type === 'qualifying'),
          sprint: nextRacePreds.some(p => p.session_type === 'sprint'),
          race: nextRacePreds.some(p => p.session_type === 'race')
        })
        
        // Alle Tipps für dieses Rennen holen (für die Community-Ansicht)
        const { data: allRacePredsData } = await supabase
          .from('predictions')
          .select('*')
          .eq('race_id', next.id)
        
        if (allRacePredsData && profiles.length > 0) {
          const groupedPreds = {
            qualifying: [] as { user: Profile, prediction: Prediction }[],
            sprint: [] as { user: Profile, prediction: Prediction }[],
            race: [] as { user: Profile, prediction: Prediction }[]
          }
          
          allRacePredsData.forEach(pred => {
            const userProfile = profiles.find(p => p.id === pred.user_id)
            if (userProfile) {
              const sessionType = pred.session_type as 'qualifying' | 'sprint' | 'race'
              if (groupedPreds[sessionType]) {
                groupedPreds[sessionType].push({ user: userProfile, prediction: pred })
              }
            }
          })
          
          setAllRacePredictions(groupedPreds)
        }
      }

      setRecentPredictions((allPreds as PredictionWithRace[]).slice(0, 3))

      if (profiles.length > 0) {
        setAllPlayers(profiles)
        
        const totalPts = profiles.reduce((sum, p) => sum + (p.total_points || 0), 0)
        const totalPreds = profiles.reduce((sum, p) => sum + (p.predictions_count || 0), 0)
        setCommunityStats({
          totalPredictions: totalPreds,
          totalPoints: totalPts
        })
      }

      fetch('/api/drivers').then(res => res.json()).then(json => {
        if (json.drivers) setDrivers(json.drivers)
      }).catch(() => {})

    } catch (e) { 
      console.error(e) 
    } finally { 
      setLoadingData(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user, profile])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Live-Simulation: Holt OpenF1 Positionen und berechnet simulierte Punktestände
  useEffect(() => {
    const fetchLiveSimulation = async () => {
      if (!nextRace || allPlayers.length === 0) return
      
      try {
        const res = await fetch('/api/live-positions')
        if (!res.ok) return
        
        const data = await res.json()
        
        setLivePositions(data.positions || [])
        setLiveSessionActive(data.isActive || false)
        setLiveSessionName(data.sessionInfo?.session_name || '')
        
        // Wenn Live-Session aktiv, berechne simulierte Punkte
        if (data.isActive && data.positions?.length > 0) {
          const positions = data.positions as {position: number, driver_number: number}[]
          const p1 = positions[0]?.driver_number || 0
          const p2 = positions[1]?.driver_number || 0
          const p3 = positions[2]?.driver_number || 0
          
          // Bestimme Session-Typ aus dem Namen
          const sessionName = (data.sessionInfo?.session_name || '').toLowerCase()
          let sessionType: 'qualifying' | 'sprint' | 'race' = 'race'
          if (sessionName.includes('quali')) sessionType = 'qualifying'
          else if (sessionName.includes('sprint') && !sessionName.includes('quali')) sessionType = 'sprint'
          
          // Hole Tipps für diese Session
          const predictions = allRacePredictions[sessionType] || []
          
          // Berechne simulierte Punkte für jeden Spieler
          const standings = allPlayers.map(player => {
            const playerPred = predictions.find(p => p.user.id === player.id)
            const prediction = playerPred?.prediction || null
            
            let simPoints = 0
            if (prediction) {
              if (sessionType === 'qualifying') {
                if (prediction.pole_driver === p1) simPoints += 10
              } else if (sessionType === 'sprint') {
                if (prediction.p1_driver === p1) simPoints += 15
                if (prediction.p2_driver === p2) simPoints += 10
                if (prediction.p3_driver === p3) simPoints += 5
              } else {
                if (prediction.p1_driver === p1) simPoints += 25
                if (prediction.p2_driver === p2) simPoints += 18
                if (prediction.p3_driver === p3) simPoints += 15
                // Fastest Lap nicht live trackbar
              }
            }
            
            return {
              profile: player,
              prediction,
              currentPoints: player.total_points || 0,
              simulatedPoints: simPoints,
              totalSimulated: (player.total_points || 0) + simPoints
            }
          })
          
          // Sortieren nach simuliertem Gesamtstand
          standings.sort((a, b) => b.totalSimulated - a.totalSimulated)
          setSimulatedStandings(standings)
        } else {
          setSimulatedStandings([])
        }
        
      } catch (err) {
        console.error('Error fetching live simulation:', err)
      }
    }
    
    fetchLiveSimulation()
    
    // Refresh alle 2 Minuten
    const interval = setInterval(fetchLiveSimulation, 120000)
    return () => clearInterval(interval)
  }, [nextRace, allPlayers, allRacePredictions])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  if (loading || loadingData) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
  }

  const getDriver = (num?: number) => drivers.find(d => d.driver_number === num)
  const hasRacePrediction = nextRacePredictions.race
  const userRank = allPlayers.findIndex(p => p.id === user?.id) + 1

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-6xl mx-auto">
        {/* Countdown Banner */}
        {nextRace && (
          <div 
            className={`mb-6 rounded-xl overflow-hidden ${
              !canTip ? 'bg-gray-800 border border-gray-700' :
              timeLeft.includes('Min') ? 'bg-gradient-to-r from-red-900/50 to-orange-900/30 border border-red-600' :
              'bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-gray-800'
            }`}
          >
            <div className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                !canTip ? 'bg-gray-700' :
                timeLeft.includes('Min') ? 'bg-red-600 animate-pulse' :
                'bg-[#222]'
              }`}>
                {!canTip ? (
                  <AlertTriangle className="w-6 h-6 text-gray-400" />
                ) : (
                  <Clock className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCountryFlag(nextRace.race_name)}</span>
                  <span className="font-bold text-white">{nextRace.race_name}</span>
                </div>
                <div className={`text-sm ${
                  !canTip ? 'text-gray-500' :
                  timeLeft.includes('Min') ? 'text-red-400 font-bold' :
                  'text-gray-400'
                }`}>
                  {!canTip ? 'Tippschluss erreicht' : `⏱️ ${timeLeft}`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-xl font-bold">
              {profile?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Willkommen, {profile?.username}!
              </h1>
              <p className="text-gray-400 text-sm">🏎️ Saison 2025</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-xl p-4 border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-yellow-600/20 flex items-center justify-center mb-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-white">{profile?.total_points || 0}</div>
            <div className="text-xs text-gray-500">Punkte</div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-xl p-4 border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center mb-2">
              <Medal className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">#{userRank || '-'}</div>
            <div className="text-xs text-gray-500">von {allPlayers.length}</div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-xl p-4 border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">{profile?.predictions_count || recentPredictions.length}</div>
            <div className="text-xs text-gray-500">Tipps</div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-xl p-4 border border-gray-800">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center mb-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {(profile?.predictions_count || 0) > 0 
                ? Math.round((profile?.total_points || 0) / (profile?.predictions_count || 1) * 10) / 10 
                : 0}
            </div>
            <div className="text-xs text-gray-500">Ø/Tipp</div>
          </div>
        </div>

        {/* LIVE SIMULATION - Nur wenn Session aktiv */}
        {liveSessionActive && simulatedStandings.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-xl border border-green-700/50 overflow-hidden">
            <div className="p-4 border-b border-green-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <h2 className="font-bold text-green-400 text-lg">
                  🏎️ LIVE: {liveSessionName}
                </h2>
              </div>
              <span className="text-xs text-gray-500">
                Simulierte Punkte wenn jetzt Schluss wäre
              </span>
            </div>
            
            {/* Live Positionen */}
            {livePositions.length > 0 && (
              <div className="px-4 py-3 border-b border-green-800/30 bg-black/20">
                <div className="text-xs text-gray-500 mb-2">AKTUELLE POSITIONEN</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {livePositions.slice(0, 6).map((pos, idx) => (
                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                      idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      idx === 1 ? 'bg-gray-500/20 text-gray-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-800/50 text-gray-400'
                    }`}>
                      <span className="font-bold text-xs">P{pos.position}</span>
                      <span className="font-medium">{pos.name_acronym || `#${pos.driver_number}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Simulierte Rangliste */}
            <div className="divide-y divide-green-900/30">
              {simulatedStandings.map((standing, idx) => {
                const isMe = standing.profile.id === user?.id
                return (
                  <div 
                    key={standing.profile.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center ${
                      isMe ? 'bg-red-950/30' : 'hover:bg-green-900/10'
                    } transition-colors`}
                  >
                    {/* Rank */}
                    <div className="col-span-1">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500 text-black' :
                        idx === 1 ? 'bg-gray-400 text-black' :
                        idx === 2 ? 'bg-orange-500 text-black' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                    </div>
                    
                    {/* Name */}
                    <div className="col-span-4">
                      <span className={`font-medium ${isMe ? 'text-red-400' : 'text-white'}`}>
                        {standing.profile.username}
                      </span>
                      {isMe && <span className="text-xs text-gray-500 ml-1">(Du)</span>}
                    </div>
                    
                    {/* Tipp */}
                    <div className="col-span-3 text-center">
                      {standing.prediction ? (
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                            {getDriver(standing.prediction.p1_driver || standing.prediction.pole_driver)?.full_name?.split(' ').pop() || '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">Kein Tipp</span>
                      )}
                    </div>
                    
                    {/* Sim Punkte */}
                    <div className="col-span-2 text-center">
                      <span className={`font-bold ${
                        standing.simulatedPoints > 0 ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {standing.simulatedPoints > 0 ? `+${standing.simulatedPoints}` : '0'}
                      </span>
                    </div>
                    
                    {/* Total */}
                    <div className="col-span-2 text-right">
                      <span className="text-lg font-bold text-white">
                        {standing.totalSimulated}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Alle Tipps */}
          <div className="md:col-span-2 space-y-6">
            {/* Community Tips für aktuelles Rennen */}
            {nextRace && (
              <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <h2 className="font-bold text-white text-lg">
                    {getCountryFlag(nextRace.race_name)} Alle Tipps
                  </h2>
                  <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-white"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {(allRacePredictions.qualifying.length > 0 || allRacePredictions.sprint.length > 0 || allRacePredictions.race.length > 0) ? (
                  <div className="divide-y divide-gray-800">
                    {allPlayers.map(player => {
                      const racePred = allRacePredictions.race.find(p => p.user.id === player.id)
                      const sprintPred = allRacePredictions.sprint.find(p => p.user.id === player.id)
                      const qualiPred = allRacePredictions.qualifying.find(p => p.user.id === player.id)
                      
                      if (!racePred && !sprintPred && !qualiPred) return null
                      
                      const isMe = player.id === user?.id
                      
                      return (
                        <div 
                          key={player.id}
                          className={`p-4 ${isMe ? 'bg-red-950/30' : ''}`}
                        >
                          {/* Spieler Name */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              isMe ? 'bg-red-600' : 'bg-gray-700'
                            }`}>
                              {player.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className={`font-bold text-lg ${isMe ? 'text-red-400' : 'text-white'}`}>
                                {player.username}
                              </span>
                              {isMe && <span className="text-red-500 text-sm ml-2">(Du)</span>}
                            </div>
                          </div>
                          
                          {/* Tipps in Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Qualifying */}
                            {qualiPred && (
                              <div className="bg-[#0a0a0a] rounded-xl p-4">
                                <div className="text-xs text-gray-500 mb-3 font-medium">QUALIFYING</div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">Pole</span>
                                    <span className="text-blue-400 font-bold">
                                      {getDriver(qualiPred.prediction.pole_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Sprint */}
                            {sprintPred && (
                              <div className="bg-[#0a0a0a] rounded-xl p-4">
                                <div className="text-xs text-gray-500 mb-3 font-medium">SPRINT</div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">P1</span>
                                    <span className="text-yellow-400 font-bold">
                                      {getDriver(sprintPred.prediction.p1_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">P2</span>
                                    <span className="text-gray-200 font-medium">
                                      {getDriver(sprintPred.prediction.p2_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">P3</span>
                                    <span className="text-orange-400 font-medium">
                                      {getDriver(sprintPred.prediction.p3_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Rennen */}
                            {racePred && (
                              <div className="bg-[#0a0a0a] rounded-xl p-4">
                                <div className="text-xs text-gray-500 mb-3 font-medium">RENNEN</div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">P1</span>
                                    <span className="text-yellow-400 font-bold">
                                      {getDriver(racePred.prediction.p1_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">P2</span>
                                    <span className="text-gray-200 font-medium">
                                      {getDriver(racePred.prediction.p2_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm">P3</span>
                                    <span className="text-orange-400 font-medium">
                                      {getDriver(racePred.prediction.p3_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                                    <span className="text-gray-400 text-sm">FL</span>
                                    <span className="text-purple-400 font-medium">
                                      {getDriver(racePred.prediction.fastest_lap_driver)?.full_name?.split(' ').pop() || '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    Noch keine Tipps abgegeben
                  </div>
                )}
              </div>
            )}

            {/* Recent Predictions */}
            {recentPredictions.length > 0 && (
              <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800">
                  <h2 className="font-bold text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Deine letzten Tipps
                  </h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {recentPredictions.map(pred => (
                    <div key={pred.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCountryFlag(pred.race?.race_name || '')}</span>
                          <span className="font-medium text-white text-sm">{pred.race?.race_name}</span>
                        </div>
                        <span className={`text-sm font-bold ${(pred.points_earned || 0) > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                          +{pred.points_earned || 0}
                        </span>
                      </div>
                      {pred.p1_driver && (
                        <div className="flex items-center gap-2 bg-[#1a1a1a] rounded px-2 py-1 w-fit">
                          <span className="text-xs text-gray-500">P1:</span>
                          <span className="text-xs text-white">
                            {getDriver(pred.p1_driver)?.full_name?.split(' ').pop() || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Upcoming Races */}
            <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-500" />
                  Nächste Rennen
                </h2>
                <Link href="/races" className="text-sm text-red-500 hover:underline">
                  Alle →
                </Link>
              </div>
              <div className="divide-y divide-gray-800">
                {upcomingRaces.map((race, idx) => (
                  <Link 
                    key={race.id} 
                    href="/races"
                    className="block p-4 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getCircuitGradient(race.race_name)} flex items-center justify-center text-lg`}>
                        {getCountryFlag(race.race_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">R{race.round}</span>
                          {idx === 0 && hasRacePrediction && (
                            <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 text-xs rounded">✓</span>
                          )}
                        </div>
                        <div className="font-medium text-white truncate text-sm">{race.race_name}</div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(race.race_date), 'd. MMM', { locale: de })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Community Stats */}
            <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-500" />
                  Community
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Spieler</span>
                  <span className="font-bold text-white">{allPlayers.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Tipps</span>
                  <span className="font-bold text-white">{communityStats.totalPredictions}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Punkte</span>
                  <span className="font-bold text-white">{communityStats.totalPoints}</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link 
                href="/races" 
                className="bg-[#111] rounded-xl p-4 border border-gray-800 hover:border-red-600 transition-colors text-center"
              >
                <Calendar className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <div className="text-sm font-medium text-white">Rennen</div>
              </Link>
              <Link 
                href="/live" 
                className="bg-[#111] rounded-xl p-4 border border-gray-800 hover:border-red-600 transition-colors text-center"
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <div className="text-sm font-medium text-white">WM-Stand</div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


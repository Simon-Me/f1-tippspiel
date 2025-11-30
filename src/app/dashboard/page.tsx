'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race, Profile, Prediction } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { 
  Trophy, 
  Target, 
  Medal,
  Clock,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Users,
  TrendingUp,
  Zap,
  CheckCircle,
  Loader2,
  Flag
} from 'lucide-react'
import { differenceInMinutes, differenceInHours, differenceInDays, format } from 'date-fns'
import { de } from 'date-fns/locale'

interface SessionTime {
  name: string
  date: Date
  type: 'qualifying' | 'sprint' | 'race'
}

interface CalculationStatus {
  qualifying: 'pending' | 'waiting' | 'done' | 'none'
  sprint: 'pending' | 'waiting' | 'done' | 'none'
  race: 'pending' | 'waiting' | 'done' | 'none'
}

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  
  const [nextRace, setNextRace] = useState<Race | null>(null)
  const [allPlayers, setAllPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [nextSession, setNextSession] = useState<SessionTime | null>(null)
  const [sessionTimes, setSessionTimes] = useState<SessionTime[]>([])
  const [userPredictions, setUserPredictions] = useState<Prediction[]>([])
  const [calcStatus, setCalcStatus] = useState<CalculationStatus>({
    qualifying: 'none', sprint: 'none', race: 'none'
  })
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Haupt-Daten laden
  const fetchData = useCallback(async () => {
    if (!user) return
    
    try {
      // Nächstes Rennen (oder aktuelles - 3 Tage zurück)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const { data: races } = await supabase
        .from('races')
        .select('*')
        .eq('season', 2025)
        .gte('race_date', threeDaysAgo)
        .order('race_date', { ascending: true })
        .limit(1)
      
      if (races && races.length > 0) {
        setNextRace(races[0])
        
        // User Predictions für dieses Rennen
        const { data: preds } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', user.id)
          .eq('race_id', races[0].id)
        
        if (preds) setUserPredictions(preds)
      }
      
      // Alle Spieler für Ranking
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
      
      if (profiles) setAllPlayers(profiles)
      
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Session-Zeiten von Jolpica API
  useEffect(() => {
    if (!nextRace) return
    
    const raceRound = nextRace.round
    
    async function fetchSessionTimes() {
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}.json`)
        const data = await res.json()
        const race = data.MRData?.RaceTable?.Races?.[0]
        if (!race) return
        
        const sessions: SessionTime[] = []
        
        if (race.Qualifying) {
          sessions.push({
            name: 'Qualifying',
            date: new Date(`${race.Qualifying.date}T${race.Qualifying.time}`),
            type: 'qualifying'
          })
        }
        
        if (race.Sprint) {
          sessions.push({
            name: 'Sprint',
            date: new Date(`${race.Sprint.date}T${race.Sprint.time}`),
            type: 'sprint'
          })
        }
        
        sessions.push({
          name: 'Rennen',
          date: new Date(`${race.date}T${race.time}`),
          type: 'race'
        })
        
        setSessionTimes(sessions)
        
        // Nächste Session finden
        const now = new Date()
        const upcoming = sessions
          .filter(s => s.date > now)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
        
        if (upcoming.length > 0) {
          setNextSession(upcoming[0])
        }
      } catch (e) {
        console.error(e)
      }
    }
    
    fetchSessionTimes()
  }, [nextRace])

  // Hintergrund Punkte-Berechnung
  useEffect(() => {
    if (!nextRace) return
    
    const raceRound = nextRace.round
    
    async function checkAndCalculate() {
      const now = new Date()
      const newStatus: CalculationStatus = { qualifying: 'none', sprint: 'none', race: 'none' }
      let needsCalculation = false
      
      // Für jede Session checken
      for (const session of sessionTimes) {
        const sessionPassed = session.date < now
        const sessionType = session.type
        
        if (!sessionPassed) {
          newStatus[sessionType] = 'none'
          continue
        }
        
        // Session ist vorbei - check ob Ergebnisse da sind
        let apiUrl = ''
        let resultsKey = ''
        
        if (sessionType === 'qualifying') {
          apiUrl = `https://api.jolpi.ca/ergast/f1/2025/${raceRound}/qualifying/`
          resultsKey = 'QualifyingResults'
        } else if (sessionType === 'sprint') {
          apiUrl = `https://api.jolpi.ca/ergast/f1/2025/${raceRound}/sprint/`
          resultsKey = 'SprintResults'
        } else {
          apiUrl = `https://api.jolpi.ca/ergast/f1/2025/${raceRound}/results/`
          resultsKey = 'Results'
        }
        
        try {
          const res = await fetch(apiUrl)
          const data = await res.json()
          const results = data.MRData?.RaceTable?.Races?.[0]?.[resultsKey]
          
          if (results && results.length > 0) {
            // Ergebnisse da - check ob schon berechnet
            const userPred = userPredictions.find(p => p.session_type === sessionType)
            if (userPred && userPred.points_earned > 0) {
              newStatus[sessionType] = 'done'
            } else if (userPred) {
              // Hat getippt aber noch keine Punkte
              newStatus[sessionType] = 'pending'
              needsCalculation = true
            } else {
              newStatus[sessionType] = 'done' // Nicht getippt
            }
          } else {
            // Keine Ergebnisse noch
            newStatus[sessionType] = 'waiting'
          }
        } catch (e) {
          newStatus[sessionType] = 'waiting'
        }
      }
      
      setCalcStatus(newStatus)
      
      // Berechnen wenn nötig (und nicht schon am berechnen)
      if (needsCalculation && !isCalculating) {
        // Check localStorage cache
        const lastCalc = localStorage.getItem(`calc_${raceRound}`)
        const lastCalcTime = lastCalc ? parseInt(lastCalc) : 0
        const fiveMin = 5 * 60 * 1000
        
        if (Date.now() - lastCalcTime > fiveMin) {
          setIsCalculating(true)
          try {
            const calcRes = await fetch('/api/calculate-points', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionType: 'all' })
            })
            const calcData = await calcRes.json()
            
            if (calcData.success) {
              localStorage.setItem(`calc_${raceRound}`, Date.now().toString())
              // Profile und Predictions neu laden
              await fetchData()
              await refreshProfile()
            }
          } catch (e) {
            console.error('Calc error:', e)
          } finally {
            setIsCalculating(false)
          }
        }
      }
    }
    
    if (sessionTimes.length > 0) {
      checkAndCalculate()
    }
  }, [nextRace, sessionTimes, userPredictions, isCalculating, fetchData, refreshProfile])

  // Countdown aktualisieren
  useEffect(() => {
    if (!nextSession) return
    
    const updateCountdown = () => {
      const now = new Date()
      const diff = nextSession.date.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeLeft('Läuft jetzt!')
        return
      }
      
      const days = differenceInDays(nextSession.date, now)
      const hours = differenceInHours(nextSession.date, now) % 24
      const mins = differenceInMinutes(nextSession.date, now) % 60
      
      if (days > 0) {
        setTimeLeft(`${days}T ${hours}h ${mins}m`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`)
      } else {
        setTimeLeft(`${mins} Min`)
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 30000)
    return () => clearInterval(interval)
  }, [nextSession])

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    )
  }

  const userRank = allPlayers.findIndex(p => p.id === user?.id) + 1
  const hasQualiTip = userPredictions.some(p => p.session_type === 'qualifying')
  const hasSprintTip = nextRace?.is_sprint ? userPredictions.some(p => p.session_type === 'sprint') : true
  const hasRaceTip = userPredictions.some(p => p.session_type === 'race')
  const allTipped = hasQualiTip && hasSprintTip && hasRaceTip

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> Berechnet</span>
      case 'pending':
        return <span className="flex items-center gap-1 text-blue-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Wird berechnet...</span>
      case 'waiting':
        return <span className="flex items-center gap-1 text-yellow-400 text-xs"><Clock className="w-3 h-3" /> Warte auf Daten</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-5xl mx-auto">
        {/* Header mit Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 rounded-2xl p-5 border border-yellow-700/30">
            <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
            <div className="text-3xl font-bold text-white">{profile?.total_points || 0}</div>
            <div className="text-yellow-500/70 text-sm">Punkte</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-2xl p-5 border border-blue-700/30">
            <Medal className="w-6 h-6 text-blue-400 mb-2" />
            <div className="text-3xl font-bold text-white">#{userRank || '-'}</div>
            <div className="text-blue-400/70 text-sm">Platz von {allPlayers.length}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-2xl p-5 border border-green-700/30">
            <Target className="w-6 h-6 text-green-400 mb-2" />
            <div className="text-3xl font-bold text-white">{profile?.predictions_count || 0}</div>
            <div className="text-green-400/70 text-sm">Tipps</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-2xl p-5 border border-purple-700/30">
            <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
            <div className="text-3xl font-bold text-white">
              {profile?.predictions_count && profile.predictions_count > 0 
                ? (profile.total_points / profile.predictions_count).toFixed(1) 
                : '0'}
            </div>
            <div className="text-purple-400/70 text-sm">Ø pro Tipp</div>
          </div>
        </div>

        {/* Nächstes Rennen */}
        {nextRace && (
          <div className="bg-[#111] rounded-2xl overflow-hidden border border-gray-800 mb-6">
            <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{getCountryFlag(nextRace.race_name)}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">{nextRace.race_name}</h2>
                    <p className="text-gray-400 text-sm">{nextRace.circuit_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  {nextRace.is_sprint && (
                    <span className="px-3 py-1 bg-purple-600 rounded-full text-xs font-bold mb-1 inline-block">SPRINT</span>
                  )}
                  <div className="text-gray-400 text-sm">Runde {nextRace.round}</div>
                </div>
              </div>
            </div>
            
            {/* Countdown & Status */}
            <div className="p-4">
              {nextSession && (
                <div className={`flex items-center justify-between p-4 rounded-xl mb-4 ${
                  timeLeft.includes('Min') && !timeLeft.includes('Läuft')
                    ? 'bg-red-900/30 border border-red-700/50'
                    : 'bg-gray-800/50'
                }`}>
                  <div className="flex items-center gap-3">
                    {timeLeft.includes('Min') ? (
                      <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                    ) : (
                      <Clock className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      <div className="text-white font-medium">{nextSession.name}</div>
                      <div className="text-gray-400 text-sm">
                        {format(nextSession.date, "EEEE, dd. MMM 'um' HH:mm", { locale: de })}
                      </div>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${timeLeft.includes('Min') ? 'text-red-400' : 'text-white'}`}>
                    {timeLeft}
                  </div>
                </div>
              )}
              
              {/* Session Status Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Qualifying */}
                <div className={`p-3 rounded-xl ${hasQualiTip ? 'bg-green-900/20 border border-green-800/50' : 'bg-gray-800/30 border border-gray-700/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Qualifying</span>
                    {hasQualiTip ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                    )}
                  </div>
                  {getStatusBadge(calcStatus.qualifying)}
                  {!hasQualiTip && calcStatus.qualifying === 'none' && (
                    <span className="text-xs text-gray-500">Noch kein Tipp</span>
                  )}
                </div>
                
                {/* Sprint */}
                {nextRace.is_sprint && (
                  <div className={`p-3 rounded-xl ${hasSprintTip ? 'bg-green-900/20 border border-green-800/50' : 'bg-gray-800/30 border border-gray-700/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">Sprint</span>
                      {hasSprintTip ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                      )}
                    </div>
                    {getStatusBadge(calcStatus.sprint)}
                    {!hasSprintTip && calcStatus.sprint === 'none' && (
                      <span className="text-xs text-gray-500">Noch kein Tipp</span>
                    )}
                  </div>
                )}
                
                {/* Race */}
                <div className={`p-3 rounded-xl ${hasRaceTip ? 'bg-green-900/20 border border-green-800/50' : 'bg-gray-800/30 border border-gray-700/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">Rennen</span>
                    {hasRaceTip ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
                    )}
                  </div>
                  {getStatusBadge(calcStatus.race)}
                  {!hasRaceTip && calcStatus.race === 'none' && (
                    <span className="text-xs text-gray-500">Noch kein Tipp</span>
                  )}
                </div>
              </div>
              
              {/* Tipp Button */}
              {!allTipped && (
                <Link 
                  href={`/races/${nextRace.id}/predict`}
                  className="flex items-center justify-center gap-2 w-full mt-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Jetzt tippen
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Link 
            href="/leaderboard"
            className="flex items-center justify-between p-5 bg-[#111] border border-gray-800 rounded-2xl hover:border-yellow-700/50 hover:bg-yellow-900/10 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-900/30 flex items-center justify-center group-hover:bg-yellow-800/40 transition-colors">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <div className="font-bold text-white text-lg">Rangliste</div>
                <div className="text-gray-400 text-sm">Alle Spieler & Live-Tabelle</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-yellow-500 transition-colors" />
          </Link>
          
          <Link 
            href="/races"
            className="flex items-center justify-between p-5 bg-[#111] border border-gray-800 rounded-2xl hover:border-blue-700/50 hover:bg-blue-900/10 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-800/40 transition-colors">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="font-bold text-white text-lg">Rennkalender</div>
                <div className="text-gray-400 text-sm">Alle Rennen 2025</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
          </Link>
        </div>

        {/* Top 5 Spieler */}
        <div className="bg-[#111] rounded-2xl overflow-hidden border border-gray-800">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Top 5 Spieler
            </h3>
            <Link href="/leaderboard" className="text-sm text-red-500 hover:text-red-400">
              Alle anzeigen →
            </Link>
          </div>
          
          <div className="divide-y divide-gray-800/50">
            {allPlayers.slice(0, 5).map((player, idx) => {
              const isMe = player.id === user?.id
              return (
                <div key={player.id} className={`flex items-center justify-between px-4 py-3 ${isMe ? 'bg-red-950/30' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`font-medium ${isMe ? 'text-red-400' : 'text-white'}`}>
                      {player.username}
                      {isMe && <span className="text-gray-500 text-sm ml-1">(Du)</span>}
                    </span>
                  </div>
                  <span className="font-bold text-white">{player.total_points} Pkt</span>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

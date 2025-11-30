'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race, Profile } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { 
  Trophy, 
  Target, 
  Medal,
  Clock,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Users
} from 'lucide-react'
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'

interface SessionTime {
  name: string
  date: Date
  type: 'qualifying' | 'sprint' | 'race'
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  
  const [nextRace, setNextRace] = useState<Race | null>(null)
  const [allPlayers, setAllPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [nextSession, setNextSession] = useState<SessionTime | null>(null)
  const [hasAllTips, setHasAllTips] = useState(false)
  
  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Daten laden
  useEffect(() => {
    async function fetchData() {
      if (!user) return
      
      try {
        // Nächstes Rennen
        const { data: races } = await supabase
          .from('races')
          .select('*')
          .eq('season', 2025)
          .gte('race_date', new Date().toISOString())
          .order('race_date', { ascending: true })
          .limit(1)
        
        if (races && races.length > 0) {
          setNextRace(races[0])
          
          // Check ob User schon getippt hat
          const { data: preds } = await supabase
            .from('predictions')
            .select('session_type')
            .eq('user_id', user.id)
            .eq('race_id', races[0].id)
          
          const hasQuali = preds?.some(p => p.session_type === 'qualifying') ?? false
          const hasSprint = races[0].is_sprint ? (preds?.some(p => p.session_type === 'sprint') ?? false) : true
          const hasRace = preds?.some(p => p.session_type === 'race') ?? false
          setHasAllTips(hasQuali && hasSprint && hasRace)
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
    }
    
    fetchData()
  }, [user])

  // Session-Zeiten von Jolpica API holen
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

  // Countdown aktualisieren
  useEffect(() => {
    if (!nextSession) return
    
    const updateCountdown = () => {
      const now = new Date()
      const diff = nextSession.date.getTime() - now.getTime()
      
      if (diff <= 0) {
        setTimeLeft('Läuft!')
        return
      }
      
      const days = differenceInDays(nextSession.date, now)
      const hours = differenceInHours(nextSession.date, now) % 24
      const mins = differenceInMinutes(nextSession.date, now) % 60
      
      if (days > 0) {
        setTimeLeft(`${days}T ${hours}h bis ${nextSession.name}`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}min bis ${nextSession.name}`)
      } else {
        setTimeLeft(`${mins} Min bis ${nextSession.name}`)
      }
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 30000)
    return () => clearInterval(interval)
  }, [nextSession])

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
    </div>
    )
  }

  const userRank = allPlayers.findIndex(p => p.id === user?.id) + 1
  const leader = allPlayers[0]

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Hallo, {profile?.username}! 👋
              </h1>
          <p className="text-gray-400">F1 Tippspiel Saison 2025</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <Trophy className="w-5 h-5 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-white">{profile?.total_points || 0}</div>
            <div className="text-xs text-gray-500">Punkte</div>
          </div>
          
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <Medal className="w-5 h-5 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-white">#{userRank || '-'}</div>
            <div className="text-xs text-gray-500">von {allPlayers.length}</div>
          </div>
          
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <Target className="w-5 h-5 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-white">{profile?.predictions_count || 0}</div>
            <div className="text-xs text-gray-500">Tipps</div>
          </div>
          
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <Users className="w-5 h-5 text-purple-500 mb-2" />
            <div className="text-lg font-bold text-yellow-400 truncate">{leader?.username || '-'}</div>
            <div className="text-xs text-gray-500">Führt mit {leader?.total_points || 0}</div>
          </div>
        </div>

        {/* Next Race Countdown */}
        {nextRace && (
          <div className={`mb-8 rounded-xl overflow-hidden ${
            timeLeft.includes('Min') 
              ? 'bg-gradient-to-r from-red-900/50 to-orange-900/30 border border-red-600' 
              : 'bg-[#111] border border-gray-800'
          }`}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getCountryFlag(nextRace.race_name)}</span>
                  <div>
                    <h2 className="font-bold text-white text-lg">{nextRace.race_name}</h2>
                    <p className="text-gray-400 text-sm">{nextRace.circuit_name}</p>
                  </div>
                </div>
                {nextRace.is_sprint && (
                  <span className="px-3 py-1 bg-purple-600 rounded-full text-xs font-bold">SPRINT</span>
                )}
              </div>
              
              <div className={`flex items-center gap-2 mb-4 ${
                timeLeft.includes('Min') ? 'text-red-400' : 'text-gray-300'
              }`}>
                {timeLeft.includes('Min') ? (
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <span className="font-medium">{timeLeft || 'Lädt...'}</span>
                      </div>
              
              {/* Tipp Status */}
              <div className={`p-3 rounded-lg ${hasAllTips ? 'bg-green-900/30' : 'bg-yellow-900/30'}`}>
                {hasAllTips ? (
                  <p className="text-green-400 text-sm">✓ Du hast alle Tipps abgegeben!</p>
                ) : (
                  <p className="text-yellow-400 text-sm">⚠ Du hast noch nicht alle Tipps abgegeben</p>
                          )}
                        </div>
                        </div>
                      </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link 
            href={nextRace ? `/races/${nextRace.id}/predict` : '/races'}
            className="flex items-center justify-between p-5 bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-500 hover:to-red-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <div>
                <div className="font-bold">Jetzt Tippen</div>
                <div className="text-sm text-red-200">Tipp für {nextRace?.race_name || 'nächstes Rennen'}</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </Link>
          
          <Link 
            href="/leaderboard"
            className="flex items-center justify-between p-5 bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <div>
                <div className="font-bold text-white">Rangliste</div>
                <div className="text-sm text-gray-400">Alle Spieler & Live-Tabelle</div>
              </div>
          </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
                </Link>
              </div>

        {/* Top 3 Mini */}
        {allPlayers.length >= 3 && (
          <div className="mt-8 p-4 bg-[#111] rounded-xl border border-gray-800">
            <h3 className="text-sm font-bold text-gray-400 mb-3">TOP 3</h3>
            <div className="space-y-2">
              {allPlayers.slice(0, 3).map((player, idx) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      'bg-orange-500 text-black'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`font-medium ${player.id === user?.id ? 'text-red-400' : 'text-white'}`}>
                        {player.username}
                      {player.id === user?.id && <span className="text-gray-500 ml-1">(Du)</span>}
                    </span>
                  </div>
                  <span className="font-bold text-white">{player.total_points} Pkt</span>
                </div>
              ))}
            </div>
            <Link href="/leaderboard" className="block mt-3 text-center text-sm text-red-500 hover:text-red-400">
              Alle Spieler anzeigen →
              </Link>
          </div>
        )}
      </main>
    </div>
  )
}

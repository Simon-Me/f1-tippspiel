'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race, Profile, Prediction } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { ChevronRight, Clock, CheckCircle2, Loader2, AlertCircle, Coins, Trophy, PartyPopper, RotateCcw } from 'lucide-react'
import Avatar from '@/components/Avatar'
import SeasonRaceTrack from '@/components/SeasonRaceTrack'
import OnboardingModal from '@/components/OnboardingModal'
import Fireworks from '@/components/Fireworks'
import { differenceInHours, differenceInMinutes, format } from 'date-fns'
import { de } from 'date-fns/locale'

// Letzte Runde der Saison (Abu Dhabi)
const LAST_ROUND_OF_SEASON = 24

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  
  const [nextRace, setNextRace] = useState<Race | null>(null)
  const [allPlayers, setAllPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [userPredictions, setUserPredictions] = useState<Prediction[]>([])
  const [nextSessionTime, setNextSessionTime] = useState<Date | null>(null)
  const [nextSessionName, setNextSessionName] = useState('')
  const [countdown, setCountdown] = useState('')
  
  // Status für Punkte-Berechnung
  const [calcStatus, setCalcStatus] = useState<'idle' | 'checking' | 'calculating' | 'done'>('idle')
  
  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Season Finale Celebration
  const [seasonEnded, setSeasonEnded] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [winner, setWinner] = useState<Profile | null>(null)
  
  // Refs um doppelte Aufrufe zu verhindern
  const hasLoadedData = useRef(false)
  const hasCalcedPoints = useRef(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Onboarding Check - nur wenn gerade registriert (Flag in sessionStorage)
  useEffect(() => {
    const justRegistered = sessionStorage.getItem('just_registered')
    if (justRegistered && profile && !profile.onboarding_completed) {
      setShowOnboarding(true)
      sessionStorage.removeItem('just_registered')
    }
  }, [profile])

  // Daten laden - NUR EINMAL
  useEffect(() => {
    if (!user || hasLoadedData.current) return
    hasLoadedData.current = true
    
    const userId = user.id // Speichern für async Closure
    
    async function fetchData() {
      try {
        // Nächstes Rennen aus PROXY API laden (vermeidet CORS)
        const apiRes = await fetch('/api/races-calendar')
        const apiData = await apiRes.json()
        const allRaces = apiData.MRData?.RaceTable?.Races || []
        
        console.log('[Dashboard] Alle Rennen aus API:', allRaces.length)
        
        // Finde das nächste Rennen (erstes in der Zukunft)
        const now = new Date()
        let upcomingRace = null
        let seasonIsOver = true
        
        for (const race of allRaces) {
          const raceDate = new Date(`${race.date}T${race.time || '14:00:00Z'}`)
          if (raceDate > now) {
            upcomingRace = race
            seasonIsOver = false
            console.log('[Dashboard] Nächstes Rennen gefunden:', race.raceName, 'Round:', race.round)
            break
          }
        }
        
        // Prüfe ob Celebration Mode aktiv ist (localStorage)
        const celebrationReset = localStorage.getItem('celebration_reset_2025')
        const shouldCelebrate = seasonIsOver && !celebrationReset
        
        if (shouldCelebrate) {
          // Prüfe ob das letzte Rennen beendet ist
          const { data: lastRace } = await supabase
            .from('races')
            .select('status')
            .eq('season', 2025)
            .eq('round', LAST_ROUND_OF_SEASON)
            .single()
          
          if (lastRace?.status === 'finished') {
            setSeasonEnded(true)
            setShowCelebration(true)
            console.log('[Dashboard] 🎆 SAISON BEENDET - FEUERWERK!')
          }
        }
        
        if (upcomingRace) {
          const { data: races } = await supabase
            .from('races')
            .select('*')
            .eq('season', 2025)
            .eq('round', parseInt(upcomingRace.round))
            .limit(1)
          
          if (races?.[0]) {
            setNextRace(races[0])
            
            const { data: preds } = await supabase
              .from('predictions')
              .select('*')
              .eq('user_id', userId)
              .eq('race_id', races[0].id)
            
            if (preds) setUserPredictions(preds)
          }
        }
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('total_points', { ascending: false })
        
        if (profiles) {
          setAllPlayers(profiles)
          // Setze den Gewinner (erster in der Liste)
          if (profiles.length > 0) {
            setWinner(profiles[0])
          }
        }
      } catch (e) {
        console.error('[Dashboard] Fehler:', e)
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchData()
  }, [user])
          
  // Session-Zeiten holen - via Proxy
  useEffect(() => {
    if (!nextRace) return
    
    const raceRound = nextRace.round
    
    async function getSessionTimes() {
      try {
        const res = await fetch(`/api/race-details/${raceRound}`)
        const data = await res.json()
        const race = data.MRData?.RaceTable?.Races?.[0]
        if (!race) return
        
        const now = new Date()
        const sessions: { name: string; date: Date }[] = []
        
        if (race.Qualifying) sessions.push({ name: 'Qualifying', date: new Date(`${race.Qualifying.date}T${race.Qualifying.time}`) })
        if (race.Sprint) sessions.push({ name: 'Sprint', date: new Date(`${race.Sprint.date}T${race.Sprint.time}`) })
        sessions.push({ name: 'Rennen', date: new Date(`${race.date}T${race.time}`) })
        
        const next = sessions.find(s => s.date > now)
        if (next) {
          setNextSessionTime(next.date)
          setNextSessionName(next.name)
        }
      } catch (e) { console.error(e) }
    }
    getSessionTimes()
  }, [nextRace])

  // Countdown
  useEffect(() => {
    if (!nextSessionTime) return
    
    const update = () => {
      const now = new Date()
      const diff = nextSessionTime.getTime() - now.getTime()
      if (diff <= 0) { setCountdown('Jetzt live!'); return }
      
      const h = differenceInHours(nextSessionTime, now)
      const m = differenceInMinutes(nextSessionTime, now) % 60
      
      // Mehr als 48 Stunden → Tage anzeigen
      if (h >= 48) {
        const days = Math.floor(h / 24)
        const remainingHours = h % 24
        setCountdown(`${days}d ${remainingHours}h`)
      } else if (h > 0) {
        setCountdown(`${h}h ${m}m`)
      } else {
        setCountdown(`${m} min`)
      }
    }
    
    update()
    const i = setInterval(update, 30000)
    return () => clearInterval(i)
  }, [nextSessionTime])

  // Auto-Berechnung bei JEDEM Seitenbesuch - NUR EINMAL
  useEffect(() => {
    if (!user || hasCalcedPoints.current) return
    hasCalcedPoints.current = true
    
    async function autoCalc() {
      setCalcStatus('calculating')
      
      try {
        // Hole das letzte Rennen in der Vergangenheit und berechne dessen Punkte
        const today = new Date().toISOString().split('T')[0]
        const { data: lastRace } = await supabase
          .from('races')
          .select('round')
          .eq('season', 2025)
          .lte('race_date', today)
          .order('race_date', { ascending: false })
          .limit(1)
          .single()
        
        if (lastRace) {
          console.log('[Auto-Calc] Berechne Runde', lastRace.round)
          const calcRes = await fetch(`/api/calculate-points?round=${lastRace.round}`)
          const calcData = await calcRes.json()
          console.log('[Auto-Calc] Ergebnis:', calcData)
          
          if (calcData.success) {
            await refreshProfile()
            
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .order('total_points', { ascending: false })
            
            if (profiles) setAllPlayers(profiles)
          }
        }
      } catch (e) { 
        console.error('[Auto-Calc] Error:', e) 
      }
      
      setCalcStatus('done')
    }
    
    autoCalc()
  }, [user, refreshProfile])

  // Reset Celebration (manuell)
  const resetCelebration = () => {
    localStorage.setItem('celebration_reset_2025', 'true')
    setShowCelebration(false)
    setSeasonEnded(false)
  }
  
  // Trigger Celebration (für Testing - ?celebrate=1 in URL)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('celebrate') === '1') {
        localStorage.removeItem('celebration_reset_2025')
        setSeasonEnded(true)
        setShowCelebration(true)
      }
    }
  }, [])

  if (loading || loadingData) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  }

  const userRank = allPlayers.findIndex(p => p.id === user?.id) + 1
  const hasTipped = userPredictions.length > 0

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* 🎆 FEUERWERK bei Saisonende */}
      {showCelebration && <Fireworks intensity="high" />}
      
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-12 xl:px-24 max-w-7xl mx-auto">
        
        {/* 🏆 SAISONENDE BANNER */}
        {showCelebration && winner && (
          <div className="mb-8 relative">
            <div className="bg-gradient-to-r from-yellow-600/20 via-amber-500/30 to-yellow-600/20 border-2 border-yellow-500/50 rounded-3xl p-6 md:p-8 text-center relative overflow-hidden">
              {/* Glitter Background */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random()}s`
                    }}
                  />
                ))}
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <PartyPopper className="w-12 h-12 md:w-16 md:h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 mb-2">
                  🏆 SAISON 2025 BEENDET! 🏆
                </h2>
                <p className="text-xl md:text-2xl text-yellow-200 mb-4">
                  Herzlichen Glückwunsch an unseren Weltmeister:
                </p>
                <div className="flex items-center justify-center gap-4 mb-6">
                  <Avatar url={winner.avatar_url} username={winner.username} size="xl" />
                  <div className="text-left">
                    <p className="text-3xl md:text-4xl font-black text-yellow-400 animate-pulse">
                      {winner.username}
                    </p>
                    <p className="text-xl text-yellow-200/80">
                      {winner.total_points} Punkte
                    </p>
                  </div>
                  <Trophy className="w-16 h-16 md:w-20 md:h-20 text-yellow-400 animate-bounce" fill="currentColor" />
                </div>
                
                {/* Reset Button - nur für Admins sichtbar (oder jeden für Testing) */}
                <button
                  onClick={resetCelebration}
                  className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-full text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Feier beenden
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Begrüßung */}
        <div className="mb-12 flex items-center gap-4">
          <Avatar url={profile?.avatar_url} username={profile?.username} size="xl" />
            <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">F1 Tippnasen 2025</p>
            <h1 className="text-4xl font-bold">Hey, {profile?.username} 👋</h1>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="text-gray-400">{profile?.total_points || 0} Punkte</span>
              <span className="text-yellow-400 flex items-center gap-1">
                <Coins className="w-4 h-4" /> {profile?.coins || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Punkte & Rang */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-2xl p-6">
            <p className="text-gray-500 text-sm mb-1">Deine Punkte</p>
            <p className="text-5xl font-bold text-white">{profile?.total_points || 0}</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-6">
            <p className="text-gray-500 text-sm mb-1">Dein Rang</p>
            <p className="text-5xl font-bold text-white">#{userRank || '-'}</p>
            <p className="text-gray-600 text-sm">von {allPlayers.length}</p>
          </div>
        </div>

        {/* WM Rennstrecke Visualisierung */}
        <div className="mb-12">
          <SeasonRaceTrack currentUserId={user?.id} seasonEnded={seasonEnded} />
        </div>

        {/* Status */}
        {calcStatus === 'calculating' && (
          <div className="flex items-center gap-3 bg-blue-950/50 border border-blue-800 rounded-xl p-4 mb-6">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-blue-400">Punkte werden aktualisiert...</span>
          </div>
        )}

        {/* Nächstes Rennen */}
        {nextRace && (
          <div className="mb-12">
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-3">Nächstes Event</p>
            
            <div className="bg-zinc-900 rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-4xl mb-2 block">{getCountryFlag(nextRace.race_name)}</span>
                    <h2 className="text-2xl font-bold">{nextRace.race_name}</h2>
                    <p className="text-gray-500">{nextRace.circuit_name}</p>
              </div>
                  {nextSessionName && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      nextSessionName === 'Sprint' ? 'bg-purple-600' :
                      nextSessionName === 'Qualifying' ? 'bg-blue-600' :
                      'bg-red-600'
                    }`}>
                      {nextSessionName.toUpperCase()}
                    </span>
                  )}
                    </div>
                
                {nextSessionTime && (
                  <div className="flex items-center gap-3 bg-black/30 rounded-xl p-4 mb-4">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-white font-medium">{nextSessionName}</p>
                      <p className="text-gray-500 text-sm">
                        {format(nextSessionTime, "EEEE, dd. MMM • HH:mm 'Uhr'", { locale: de })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-500">{countdown}</p>
                    </div>
                  </div>
                )}

                {/* Tipp Status */}
                <div className="flex items-center gap-3">
                  {hasTipped ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-green-500">Tipp abgegeben</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <span className="text-yellow-500">Noch nicht getippt</span>
                    </>
                  )}
              </div>
            </div>

              <Link 
                href={`/races/${nextRace.id}/predict`}
                className="flex items-center justify-between bg-red-600 hover:bg-red-500 p-4 transition-colors"
              >
                <span className="font-bold">{hasTipped ? 'Tipp anpassen' : 'Jetzt tippen'}</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Rangliste Quick View */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-sm uppercase tracking-wider">Rangliste</p>
            <Link href="/leaderboard" className="text-red-500 text-sm hover:text-red-400">
              Alle anzeigen →
            </Link>
          </div>
          
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            {allPlayers.slice(0, 5).map((player, idx) => {
              const isMe = player.id === user?.id
              return (
                <Link 
                  href={isMe ? '/profile' : `/player/${player.id}`}
                  key={player.id} 
                  className={`flex items-center justify-between p-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors ${isMe ? 'bg-red-950/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-zinc-800 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <Avatar url={player.avatar_url} username={player.username} size="sm" />
                    <span className={isMe ? 'text-red-400 font-medium' : 'text-white'}>
                      {player.username}
                    </span>
                  </div>
                  <span className="font-bold">{player.total_points}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </main>

      {/* Onboarding Modal */}
      {showOnboarding && user && profile && (
        <OnboardingModal 
          userId={user.id} 
          username={profile.username}
          onComplete={() => {
            setShowOnboarding(false)
            refreshProfile()
          }}
        />
      )}
    </div>
  )
}

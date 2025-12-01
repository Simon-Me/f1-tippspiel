'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race, Profile, Prediction } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { Trophy, ChevronRight, Clock, CheckCircle2, Loader2, AlertCircle, Coins } from 'lucide-react'
import Avatar from '@/components/Avatar'
import SeasonRaceTrack from '@/components/SeasonRaceTrack'
import { differenceInHours, differenceInMinutes, format } from 'date-fns'
import { de } from 'date-fns/locale'

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

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Daten laden
  const fetchData = useCallback(async () => {
    if (!user) return
    
    try {
      // Nächstes Rennen aus API laden
      const apiRes = await fetch('https://api.jolpi.ca/ergast/f1/2025.json', { cache: 'no-store' })
      const apiData = await apiRes.json()
      const allRaces = apiData.MRData?.RaceTable?.Races || []
      
      console.log('[Dashboard] Alle Rennen aus API:', allRaces.length)
      
      // Finde das nächste Rennen (erstes in der Zukunft)
      const now = new Date()
      let upcomingRace = null
      
      for (const race of allRaces) {
        const raceDate = new Date(`${race.date}T${race.time || '14:00:00Z'}`)
        
        // Rennen ist kommend wenn es in der Zukunft liegt
        if (raceDate > now) {
          upcomingRace = race
          console.log('[Dashboard] Nächstes Rennen gefunden:', race.raceName, 'Round:', race.round, 'Date:', race.date)
          break
        }
      }
      
      if (upcomingRace) {
        // Finde das Rennen in der Datenbank
        const { data: races } = await supabase
          .from('races')
          .select('*')
          .eq('season', 2025)
          .eq('round', parseInt(upcomingRace.round))
          .limit(1)
        
        console.log('[Dashboard] Rennen aus DB:', races?.[0]?.race_name || 'nicht gefunden')
        
        if (races?.[0]) {
          setNextRace(races[0])
          
          const { data: preds } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', user.id)
            .eq('race_id', races[0].id)
          
          if (preds) setUserPredictions(preds)
        } else {
          console.log('[Dashboard] Rennen nicht in DB gefunden, Round:', upcomingRace.round)
        }
      } else {
        console.log('[Dashboard] Kein kommendes Rennen gefunden')
      }
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('total_points', { ascending: false })
      
      if (profiles) setAllPlayers(profiles)
    } catch (e) {
      console.error('[Dashboard] Fehler:', e)
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // Session-Zeiten holen
  useEffect(() => {
    if (!nextRace) return
    
    const raceRound = nextRace.round
    
    async function getSessionTimes() {
      try {
        const res = await fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}.json`)
        const data = await res.json()
        const race = data.MRData?.RaceTable?.Races?.[0]
        if (!race) return
        
        const now = new Date()
        const sessions = []
        
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
      setCountdown(h > 0 ? `${h}h ${m}m` : `${m} min`)
    }
    
    update()
    const i = setInterval(update, 30000)
    return () => clearInterval(i)
  }, [nextSessionTime])

  // Auto-Berechnung
  useEffect(() => {
    if (!nextRace) return
    
    const raceRound = nextRace.round
    
    async function autoCalc() {
      const lastCalc = localStorage.getItem(`calc_${raceRound}`)
      if (lastCalc && Date.now() - parseInt(lastCalc) < 300000) return // 5 min cache
      
      setCalcStatus('checking')
      
      try {
        // Check ob Ergebnisse da sind
        const [qualiRes, sprintRes, raceRes] = await Promise.all([
          fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/qualifying/`),
          fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/sprint/`),
          fetch(`https://api.jolpi.ca/ergast/f1/2025/${raceRound}/results/`)
        ])
        
        const [qualiData, sprintData, raceData] = await Promise.all([
          qualiRes.json(), sprintRes.json(), raceRes.json()
        ])
        
        const hasResults = 
          qualiData.MRData?.RaceTable?.Races?.[0]?.QualifyingResults?.length > 0 ||
          sprintData.MRData?.RaceTable?.Races?.[0]?.SprintResults?.length > 0 ||
          raceData.MRData?.RaceTable?.Races?.[0]?.Results?.length > 0
        
        if (hasResults) {
          setCalcStatus('calculating')
          const calcRes = await fetch('/api/calculate-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionType: 'all' })
          })
          const calcData = await calcRes.json()
          
          if (calcData.success) {
            localStorage.setItem(`calc_${raceRound}`, Date.now().toString())
            await fetchData()
            await refreshProfile()
          }
        }
      } catch (e) { console.error(e) }
      
      setCalcStatus('done')
    }
    
    autoCalc()
  }, [nextRace, fetchData, refreshProfile])

  if (loading || loadingData) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  }

  const userRank = allPlayers.findIndex(p => p.id === user?.id) + 1
  const hasTipped = userPredictions.length > 0

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-12 xl:px-24 max-w-7xl mx-auto">
        {/* Begrüßung */}
        <div className="mb-12 flex items-center gap-4">
          <Avatar url={profile?.avatar_url} username={profile?.username} size="xl" />
          <div>
            <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">F1 Tippspiel 2025</p>
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
          <SeasonRaceTrack currentUserId={user?.id} />
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
    </div>
  )
}

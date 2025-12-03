'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Profile, Race } from '@/lib/supabase'
import { getCountryFlag } from '@/lib/images'
import { Trophy, Crown, Loader2, Check, X, ExternalLink, ChevronLeft, ChevronRight, Calendar, Flag, Zap } from 'lucide-react'
import Avatar from '@/components/Avatar'

interface Driver {
  driver_number: number
  full_name: string
}

interface TipDetail {
  session: 'qualifying' | 'sprint' | 'race'
  tipP1?: string
  tipP2?: string
  tipP3?: string
  tipFL?: string
  tipPole?: string
  tipP1Num?: number
  tipP2Num?: number
  tipP3Num?: number
  tipFLNum?: number
  tipPoleNum?: number
  points: number
}

interface PlayerTips {
  username: string
  oderId: string
  avatarUrl?: string
  tips: TipDetail[]
  totalEventPoints: number
}

interface SessionResult {
  qualifying?: { pole: number, poleName: string }
  sprint?: { p1: number, p2: number, p3: number, p1Name: string, p2Name: string, p3Name: string }
  race?: { p1: number, p2: number, p3: number, fl: number, p1Name: string, p2Name: string, p3Name: string, flName: string }
}

const DRIVER_NAMES: Record<number, string> = {
  1: 'Verstappen', 4: 'Norris', 16: 'Leclerc', 81: 'Piastri', 55: 'Sainz',
  63: 'Russell', 44: 'Hamilton', 14: 'Alonso', 18: 'Stroll', 27: 'Hülkenberg',
  12: 'Antonelli', 10: 'Gasly', 22: 'Tsunoda', 31: 'Ocon', 23: 'Albon',
  77: 'Bottas', 24: 'Zhou', 20: 'Magnussen', 30: 'Lawson', 6: 'Hadjar',
  87: 'Bearman', 7: 'Doohan', 43: 'Colapinto', 5: 'Bortoleto'
}

const DRIVER_MAP: Record<string, number> = {
  'VER': 1, 'NOR': 4, 'LEC': 16, 'PIA': 81, 'SAI': 55,
  'RUS': 63, 'HAM': 44, 'ALO': 14, 'STR': 18, 'HUL': 27,
  'ANT': 12, 'GAS': 10, 'TSU': 22, 'OCO': 31, 'ALB': 23,
  'BOT': 77, 'ZHO': 24, 'MAG': 20, 'LAW': 30, 'HAD': 6,
  'BEA': 87, 'DOO': 7, 'COL': 43, 'BOR': 5
}

// Helper outside component to avoid recreation
const getDriverNameFromList = (num: number | null | undefined, driversList: Driver[]): string => {
  if (!num) return '-'
  const d = driversList.find(d => d.driver_number === num)
  return d?.full_name?.split(' ').pop() || DRIVER_NAMES[num] || '-'
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Profile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [allRaces, setAllRaces] = useState<Race[]>([])
  const [selectedRaceIndex, setSelectedRaceIndex] = useState(0)
  const [playerTips, setPlayerTips] = useState<PlayerTips[]>([])
  const [sessionResults, setSessionResults] = useState<SessionResult>({})
  const [loadingRace, setLoadingRace] = useState(false)
  
  // Use refs to avoid dependency issues
  const driversRef = useRef<Driver[]>([])
  const playersRef = useRef<Profile[]>([])
  const hasLoadedRef = useRef(false)

  // Lade Daten für ein bestimmtes Rennen
  const loadRaceData = async (race: Race) => {
    if (!race) return
    setLoadingRace(true)
    
    const results: SessionResult = {}
    const getNum = (code: string) => DRIVER_MAP[code] || 0
    const getDriverName = (num: number | null | undefined) => getDriverNameFromList(num, driversRef.current)

    try {
      const resultsRes = await fetch(`/api/race-results/${race.round}`)
      const resultsData = await resultsRes.json()
      
      const qualiResults = resultsData.qualifying
      if (qualiResults?.[0]) {
        const poleNum = getNum(qualiResults[0].Driver.code)
        results.qualifying = { pole: poleNum, poleName: getDriverName(poleNum) }
      }

      const sprintResults = resultsData.sprint
      if (sprintResults?.length > 0) {
        const sp1 = sprintResults.find((r: { position: string }) => r.position === '1')
        const sp2 = sprintResults.find((r: { position: string }) => r.position === '2')
        const sp3 = sprintResults.find((r: { position: string }) => r.position === '3')
        const p1Num = sp1 ? getNum(sp1.Driver.code) : 0
        const p2Num = sp2 ? getNum(sp2.Driver.code) : 0
        const p3Num = sp3 ? getNum(sp3.Driver.code) : 0
        results.sprint = {
          p1: p1Num, p2: p2Num, p3: p3Num,
          p1Name: getDriverName(p1Num), p2Name: getDriverName(p2Num), p3Name: getDriverName(p3Num)
        }
      }

      const raceResults = resultsData.race
      if (raceResults?.length > 0) {
        const rp1 = raceResults.find((r: { position: string }) => r.position === '1')
        const rp2 = raceResults.find((r: { position: string }) => r.position === '2')
        const rp3 = raceResults.find((r: { position: string }) => r.position === '3')
        const fl = raceResults.find((r: { FastestLap?: { rank: string } }) => r.FastestLap?.rank === '1')
        const p1Num = rp1 ? getNum(rp1.Driver.code) : 0
        const p2Num = rp2 ? getNum(rp2.Driver.code) : 0
        const p3Num = rp3 ? getNum(rp3.Driver.code) : 0
        const flNum = fl ? getNum(fl.Driver.code) : 0
        results.race = {
          p1: p1Num, p2: p2Num, p3: p3Num, fl: flNum,
          p1Name: getDriverName(p1Num), p2Name: getDriverName(p2Num), 
          p3Name: getDriverName(p3Num), flName: getDriverName(flNum)
        }
      }
    } catch (e) {
      console.error('Error loading results:', e)
    }

    setSessionResults(results)
    
    // Lade Predictions
    const { data: preds } = await supabase
      .from('predictions')
      .select('*')
      .eq('race_id', race.id)
    
    if (preds && playersRef.current.length > 0) {
      const byPlayer: Record<string, PlayerTips> = {}
      
      playersRef.current.forEach(profile => {
        byPlayer[profile.id] = {
          username: profile.username,
          oderId: profile.id,
          avatarUrl: profile.avatar_url,
          tips: [],
          totalEventPoints: 0
        }
      })
      
      preds.forEach(pred => {
        const player = byPlayer[pred.user_id]
        if (!player) return
        
        if (pred.session_type === 'qualifying') {
          player.tips.push({
            session: 'qualifying',
            tipPole: getDriverName(pred.pole_driver),
            tipPoleNum: pred.pole_driver,
            points: pred.points_earned || 0
          })
          player.totalEventPoints += pred.points_earned || 0
        } else if (pred.session_type === 'sprint') {
          player.tips.push({
            session: 'sprint',
            tipP1: getDriverName(pred.p1_driver),
            tipP2: getDriverName(pred.p2_driver),
            tipP3: getDriverName(pred.p3_driver),
            tipP1Num: pred.p1_driver,
            tipP2Num: pred.p2_driver,
            tipP3Num: pred.p3_driver,
            points: pred.points_earned || 0
          })
          player.totalEventPoints += pred.points_earned || 0
        } else if (pred.session_type === 'race') {
          player.tips.push({
            session: 'race',
            tipP1: getDriverName(pred.p1_driver),
            tipP2: getDriverName(pred.p2_driver),
            tipP3: getDriverName(pred.p3_driver),
            tipFL: getDriverName(pred.fastest_lap_driver),
            tipP1Num: pred.p1_driver,
            tipP2Num: pred.p2_driver,
            tipP3Num: pred.p3_driver,
            tipFLNum: pred.fastest_lap_driver,
            points: pred.points_earned || 0
          })
          player.totalEventPoints += pred.points_earned || 0
        }
      })
      
      const sorted = Object.values(byPlayer)
        .filter(p => p.tips.length > 0)
        .sort((a, b) => b.totalEventPoints - a.totalEventPoints)
      
      setPlayerTips(sorted)
    }
    
    setLoadingRace(false)
  }

  // Initial data fetch - runs only once
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    const fetchData = async () => {
      try {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .order('total_points', { ascending: false })
        
        if (profilesData) {
          setPlayers(profilesData)
          playersRef.current = profilesData
        }
        
        const driversRes = await fetch('/api/drivers')
        const driversJson = await driversRes.json()
        const drivers: Driver[] = driversJson.drivers || []
        driversRef.current = drivers
        
        // Alle Rennen laden
        const { data: races } = await supabase
          .from('races')
          .select('*')
          .eq('season', 2025)
          .order('round', { ascending: true })
        
        if (races) {
          setAllRaces(races)
          
          // Finde das letzte abgeschlossene Rennen
          const finishedRaces = races.filter(r => r.status === 'finished')
          if (finishedRaces.length > 0) {
            const lastFinished = finishedRaces[finishedRaces.length - 1]
            const idx = races.findIndex(r => r.id === lastFinished.id)
            setSelectedRaceIndex(idx)
            
            await loadRaceData(lastFinished)
          }
        }
      } catch (e) { console.error(e) }
      finally { setLoadingData(false) }
    }
    
    fetchData()
  }, [])

  // Rennen wechseln
  const changeRace = async (newIndex: number) => {
    if (newIndex < 0 || newIndex >= allRaces.length || loadingRace) return
    setSelectedRaceIndex(newIndex)
    await loadRaceData(allRaces[newIndex])
  }

  const selectedRace = allRaces[selectedRaceIndex]

  if (loadingData) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
    </div>
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <main className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">F1 Tippnasen 2025</p>
          <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            Rangliste & Auswertungen
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LINKE SEITE: Rangliste */}
          <div className="lg:col-span-1">
            {/* Mini Podium */}
            {players.length >= 2 && (
              <div className="bg-gradient-to-br from-zinc-900 to-black rounded-2xl p-4 mb-4 border border-zinc-800">
                <div className="flex items-end justify-center gap-2 h-40">
                  {/* 2. Platz */}
                  <div className="flex flex-col items-center">
                    <Avatar url={players[1]?.avatar_url} username={players[1]?.username || ''} size="sm" />
                    <p className="text-xs font-bold text-gray-300 mt-1 truncate max-w-[60px]">{players[1]?.username}</p>
                    <p className="text-sm font-bold">{players[1]?.total_points}</p>
                    <div className="w-14 h-16 bg-gradient-to-t from-gray-700 to-gray-500 rounded-t-lg flex items-end justify-center pb-2">
                      <span className="text-xl font-bold text-gray-300">2</span>
                    </div>
                  </div>
                  
                  {/* 1. Platz */}
                  <div className="flex flex-col items-center -mt-4">
                    <Crown className="w-5 h-5 text-yellow-400 mb-1" />
                    <Avatar url={players[0]?.avatar_url} username={players[0]?.username || ''} size="md" className="ring-2 ring-yellow-400" />
                    <p className="text-xs font-bold text-yellow-400 mt-1 truncate max-w-[70px]">{players[0]?.username}</p>
                    <p className="text-lg font-bold">{players[0]?.total_points}</p>
                    <div className="w-16 h-20 bg-gradient-to-t from-yellow-700 to-yellow-500 rounded-t-lg flex items-end justify-center pb-2">
                      <span className="text-2xl font-bold text-yellow-300">1</span>
                    </div>
                  </div>
                  
                  {/* 3. Platz */}
                  {players[2] && (
                    <div className="flex flex-col items-center">
                      <Avatar url={players[2]?.avatar_url} username={players[2]?.username || ''} size="sm" />
                      <p className="text-xs font-bold text-orange-400 mt-1 truncate max-w-[60px]">{players[2]?.username}</p>
                      <p className="text-sm font-bold">{players[2]?.total_points}</p>
                      <div className="w-12 h-12 bg-gradient-to-t from-orange-800 to-orange-600 rounded-t-lg flex items-end justify-center pb-1">
                        <span className="text-lg font-bold text-orange-300">3</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alle Spieler Liste */}
            <div className="bg-zinc-900 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-zinc-800">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Alle Spieler</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {players.map((player, idx) => {
                  const isMe = player.id === user?.id
                  return (
                    <Link
                      href={isMe ? '/profile' : `/player/${player.id}`}
                      key={player.id} 
                      className={`flex items-center justify-between p-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors ${isMe ? 'bg-red-950/30' : ''}`}
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
                        <div>
                          <p className={`text-sm flex items-center gap-1 ${isMe ? 'text-red-400 font-medium' : 'text-white font-medium'}`}>
                            {player.username}
                            <ExternalLink className="w-3 h-3 text-gray-500" />
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-bold">{player.total_points}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RECHTE SEITE: Auswertungen */}
          <div className="lg:col-span-2">
            {/* Rennen Navigation */}
            <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900 rounded-2xl p-4 mb-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => changeRace(selectedRaceIndex - 1)}
                  disabled={selectedRaceIndex === 0 || loadingRace}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="text-center flex-1">
                  {selectedRace && (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-2xl">{getCountryFlag(selectedRace.race_name)}</span>
                        <h2 className="text-xl font-bold">{selectedRace.race_name}</h2>
                        {selectedRace.status === 'finished' && (
                          <span className="text-xs px-2 py-0.5 bg-green-600/30 text-green-400 rounded-full">Beendet</span>
                        )}
                        {selectedRace.status !== 'finished' && new Date(selectedRace.race_date) > new Date() && (
                          <span className="text-xs px-2 py-0.5 bg-blue-600/30 text-blue-400 rounded-full">Kommend</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">
                        Runde {selectedRace.round} • {new Date(selectedRace.race_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </>
                  )}
                </div>
                
                <button 
                  onClick={() => changeRace(selectedRaceIndex + 1)}
                  disabled={selectedRaceIndex === allRaces.length - 1 || loadingRace}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Rennen Quick-Navigation */}
              <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
                {allRaces.map((race, idx) => {
                  const isFinished = race.status === 'finished'
                  const isSelected = idx === selectedRaceIndex
                  return (
                    <button
                      key={race.id}
                      onClick={() => changeRace(idx)}
                      disabled={loadingRace}
                      className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected 
                          ? 'bg-red-600 text-white' 
                          : isFinished 
                            ? 'bg-zinc-700 text-gray-300 hover:bg-zinc-600' 
                            : 'bg-zinc-800/50 text-gray-500 hover:bg-zinc-700'
                      }`}
                      title={race.race_name}
                    >
                      {getCountryFlag(race.race_name)} R{race.round}
                    </button>
                  )
                })}
              </div>
            </div>

            {loadingRace ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Offizielle Ergebnisse */}
                {selectedRace?.status === 'finished' && (sessionResults.qualifying || sessionResults.sprint || sessionResults.race) && (
                  <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl p-4 mb-4 border border-zinc-800">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Flag className="w-4 h-4" />
                      Offizielle Ergebnisse
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-3">
                      {/* Qualifying */}
                      {sessionResults.qualifying && (
                        <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-900/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 bg-blue-600 text-white rounded">QUALI</span>
                          </div>
                          <div className="text-center">
                            <span className="text-gray-400 text-xs">Pole Position</span>
                            <p className="text-white font-bold text-lg">{sessionResults.qualifying.poleName}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Sprint */}
                      {sessionResults.sprint && (
                        <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-900/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 bg-purple-600 text-white rounded">SPRINT</span>
                          </div>
                          <div className="flex justify-around text-center">
                            <div>
                              <span className="text-yellow-400 text-xs">P1</span>
                              <p className="text-white font-bold text-sm">{sessionResults.sprint.p1Name}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">P2</span>
                              <p className="text-white font-bold text-sm">{sessionResults.sprint.p2Name}</p>
                            </div>
                            <div>
                              <span className="text-orange-400 text-xs">P3</span>
                              <p className="text-white font-bold text-sm">{sessionResults.sprint.p3Name}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Race */}
                      {sessionResults.race && (
                        <div className="p-3 bg-red-950/30 rounded-xl border border-red-900/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 bg-red-600 text-white rounded">RENNEN</span>
                          </div>
                          <div className="flex justify-around text-center">
                            <div>
                              <span className="text-yellow-400 text-xs">P1</span>
                              <p className="text-white font-bold text-sm">{sessionResults.race.p1Name}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">P2</span>
                              <p className="text-white font-bold text-sm">{sessionResults.race.p2Name}</p>
                            </div>
                            <div>
                              <span className="text-orange-400 text-xs">P3</span>
                              <p className="text-white font-bold text-sm">{sessionResults.race.p3Name}</p>
                            </div>
                            <div>
                              <span className="text-purple-400 text-xs">FL</span>
                              <p className="text-white font-bold text-sm">{sessionResults.race.flName}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hinweis für kommende Rennen */}
                {selectedRace?.status !== 'finished' && playerTips.length > 0 && (
                  <div className="bg-blue-950/30 rounded-2xl p-4 mb-4 border border-blue-800/50 text-center">
                    <p className="text-blue-400 text-sm">
                      🏁 Dieses Rennen steht noch aus – hier siehst du die bisherigen Tipps!
                    </p>
                  </div>
                )}

                {/* Keine Tipps Message */}
                {selectedRace?.status !== 'finished' && playerTips.length === 0 && (
                  <div className="bg-zinc-900/50 rounded-2xl p-8 mb-4 border border-zinc-800 text-center">
                    <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">Noch keine Tipps für dieses Rennen.</p>
                    <p className="text-gray-600 text-sm mt-1">Tipps werden hier angezeigt sobald jemand getippt hat.</p>
                  </div>
                )}

                {/* Spieler Tipps als Tabelle */}
                {playerTips.length > 0 && (
                  <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                      <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        {selectedRace?.status === 'finished' ? 'Spieler-Tipps für dieses Event' : 'Abgegebene Tipps'}
                      </p>
                      <p className="text-xs text-gray-500">{playerTips.length} Spieler haben getippt</p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-zinc-800/50">
                            <th className="text-left p-3 text-gray-400 font-medium">#</th>
                            <th className="text-left p-3 text-gray-400 font-medium">Spieler</th>
                            {/* Bei beendeten Rennen: Spalten basierend auf Ergebnissen */}
                            {selectedRace?.status === 'finished' ? (
                              <>
                                {sessionResults.qualifying && (
                                  <th className="text-center p-3 text-blue-400 font-medium">Q Pole</th>
                                )}
                                {sessionResults.sprint && (
                                  <>
                                    <th className="text-center p-3 text-purple-400 font-medium">S P1</th>
                                    <th className="text-center p-3 text-purple-400 font-medium">S P2</th>
                                    <th className="text-center p-3 text-purple-400 font-medium">S P3</th>
                                  </>
                                )}
                                {sessionResults.race && (
                                  <>
                                    <th className="text-center p-3 text-red-400 font-medium">R P1</th>
                                    <th className="text-center p-3 text-red-400 font-medium">R P2</th>
                                    <th className="text-center p-3 text-red-400 font-medium">R P3</th>
                                    <th className="text-center p-3 text-red-400 font-medium">R FL</th>
                                  </>
                                )}
                              </>
                            ) : (
                              /* Bei kommenden Rennen: Alle Tipp-Spalten anzeigen */
                              <>
                                <th className="text-center p-3 text-blue-400 font-medium">Q Pole</th>
                                <th className="text-center p-3 text-red-400 font-medium">R P1</th>
                                <th className="text-center p-3 text-red-400 font-medium">R P2</th>
                                <th className="text-center p-3 text-red-400 font-medium">R P3</th>
                                <th className="text-center p-3 text-red-400 font-medium">R FL</th>
                              </>
                            )}
                            {selectedRace?.status === 'finished' && (
                              <th className="text-right p-3 text-green-400 font-medium">Punkte</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {playerTips.map((player, idx) => {
                            const isMe = player.oderId === user?.id
                            const qualiTip = player.tips.find(t => t.session === 'qualifying')
                            const sprintTip = player.tips.find(t => t.session === 'sprint')
                            const raceTip = player.tips.find(t => t.session === 'race')
                            const isFinished = selectedRace?.status === 'finished'
                            
                            const getPodiumClass = (tipNum: number | undefined, correctNum: number, podiumNums: number[]) => {
                              if (!isFinished) return 'text-white' // Neutral für kommende Rennen
                              if (tipNum === correctNum) return 'text-green-400 font-bold'
                              if (tipNum && podiumNums.includes(tipNum)) return 'text-yellow-400'
                              return 'text-red-400'
                            }
                            
                            const sprintPodium = sessionResults.sprint ? [sessionResults.sprint.p1, sessionResults.sprint.p2, sessionResults.sprint.p3] : []
                            const racePodium = sessionResults.race ? [sessionResults.race.p1, sessionResults.race.p2, sessionResults.race.p3] : []
                            
                            return (
                              <tr 
                                key={player.oderId} 
                                className={`border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30 ${isMe ? 'bg-red-950/20' : ''}`}
                              >
                                <td className="p-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    idx === 0 ? 'bg-yellow-500 text-black' :
                                    idx === 1 ? 'bg-gray-400 text-black' :
                                    idx === 2 ? 'bg-orange-500 text-black' :
                                    'bg-zinc-700 text-gray-400'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Avatar url={player.avatarUrl} username={player.username} size="sm" />
                                    <span className={`font-medium ${isMe ? 'text-red-400' : 'text-white'}`}>
                                      {player.username}
                                    </span>
                                  </div>
                                </td>
                                
                                {isFinished ? (
                                  /* Bei beendeten Rennen: Mit Vergleich zu Ergebnissen */
                                  <>
                                    {/* Quali */}
                                    {sessionResults.qualifying && (
                                      <td className="p-3 text-center">
                                        {qualiTip ? (
                                          <span className={qualiTip.tipPoleNum === sessionResults.qualifying.pole ? 'text-green-400 font-bold' : 'text-red-400'}>
                                            {qualiTip.tipPole}
                                            {qualiTip.tipPoleNum === sessionResults.qualifying.pole ? 
                                              <Check className="w-3 h-3 inline ml-1" /> : 
                                              <X className="w-3 h-3 inline ml-1" />
                                            }
                                          </span>
                                        ) : <span className="text-gray-600">-</span>}
                                      </td>
                                    )}
                                    
                                    {/* Sprint */}
                                    {sessionResults.sprint && (
                                      <>
                                        <td className="p-3 text-center">
                                          {sprintTip ? (
                                            <span className={getPodiumClass(sprintTip.tipP1Num, sessionResults.sprint.p1, sprintPodium)}>
                                              {sprintTip.tipP1}
                                            </span>
                                          ) : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                          {sprintTip ? (
                                            <span className={getPodiumClass(sprintTip.tipP2Num, sessionResults.sprint.p2, sprintPodium)}>
                                              {sprintTip.tipP2}
                                            </span>
                                          ) : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                          {sprintTip ? (
                                            <span className={getPodiumClass(sprintTip.tipP3Num, sessionResults.sprint.p3, sprintPodium)}>
                                              {sprintTip.tipP3}
                                            </span>
                                          ) : <span className="text-gray-600">-</span>}
                                        </td>
                                      </>
                                    )}
                                    
                                    {/* Race */}
                                    {sessionResults.race && (
                                      <>
                                        <td className="p-3 text-center">
                                          {raceTip ? (
                                            <span className={getPodiumClass(raceTip.tipP1Num, sessionResults.race.p1, racePodium)}>
                                              {raceTip.tipP1}
                                            </span>
                                          ) : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                          {raceTip ? (
                                            <span className={getPodiumClass(raceTip.tipP2Num, sessionResults.race.p2, racePodium)}>
                                              {raceTip.tipP2}
                                            </span>
                                          ) : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                          {raceTip ? (
                                            <span className={getPodiumClass(raceTip.tipP3Num, sessionResults.race.p3, racePodium)}>
                                              {raceTip.tipP3}
                                            </span>
                                          ) : <span className="text-gray-600">-</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                          {raceTip?.tipFL ? (
                                            <span className={raceTip.tipFLNum === sessionResults.race.fl ? 'text-green-400 font-bold' : 'text-red-400'}>
                                              {raceTip.tipFL}
                                            </span>
                                          ) : <span className="text-gray-600">-</span>}
                                        </td>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  /* Bei kommenden Rennen: Einfache Anzeige ohne Bewertung */
                                  <>
                                    <td className="p-3 text-center">
                                      <span className="text-white">{qualiTip?.tipPole || '-'}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="text-white">{raceTip?.tipP1 || '-'}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="text-white">{raceTip?.tipP2 || '-'}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="text-white">{raceTip?.tipP3 || '-'}</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="text-white">{raceTip?.tipFL || '-'}</span>
                                    </td>
                                  </>
                                )}
                                
                                {isFinished && (
                                  <td className="p-3 text-right">
                                    <span className="text-green-400 font-bold text-lg">+{player.totalEventPoints}</span>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {playerTips.length === 0 && selectedRace?.status === 'finished' && (
                  <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800 text-center">
                    <p className="text-gray-400">Keine Tipps für dieses Rennen vorhanden.</p>
                  </div>
                )}

                {/* Legende */}
                <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Legende</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold">Grün</span>
                      <span className="text-gray-400">= Exakt richtig</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 font-bold">Gelb</span>
                      <span className="text-gray-400">= Auf Podium, falsche Pos.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold">Rot</span>
                      <span className="text-gray-400">= Falsch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 font-bold">-</span>
                      <span className="text-gray-400">= Kein Tipp</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Punktesystem</p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <p className="text-blue-400 font-bold mb-1">Quali</p>
                        <div className="text-gray-400">Pole: <span className="text-white">3</span></div>
                        <div className="text-gray-400">Pole auf P2: <span className="text-white">1</span></div>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <p className="text-purple-400 font-bold mb-1">Sprint</p>
                        <div className="text-gray-400">P1/P2/P3: <span className="text-white">3/2/1</span></div>
                        <div className="text-gray-400">Podium~: <span className="text-yellow-400">+1</span></div>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <p className="text-red-400 font-bold mb-1">Rennen</p>
                        <div className="text-gray-400">P1/P2/P3: <span className="text-white">5/4/3</span></div>
                        <div className="text-gray-400">Podium~: <span className="text-yellow-400">+1</span></div>
                        <div className="text-gray-400">FL: <span className="text-white">+1</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

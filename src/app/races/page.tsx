'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Race } from '@/lib/supabase'
import { getCountryFlag, getCircuitGradient } from '@/lib/images'
import { 
  Calendar, 
  ChevronRight,
  ChevronDown,
  Zap,
  Trophy,
  Target,
  Check,
  Star
} from 'lucide-react'
import { format, isPast, isFuture, isToday } from 'date-fns'
import { de } from 'date-fns/locale'

// F1 2025 Rennkalender
const F1_2025_CALENDAR = [
  { round: 1, race_name: 'Bahrain Grand Prix', circuit_name: 'Bahrain International Circuit', country: 'Bahrain', race_date: '2025-03-02T15:00:00Z', is_sprint: false },
  { round: 2, race_name: 'Saudi Arabian Grand Prix', circuit_name: 'Jeddah Corniche Circuit', country: 'Saudi-Arabien', race_date: '2025-03-09T17:00:00Z', is_sprint: false },
  { round: 3, race_name: 'Australian Grand Prix', circuit_name: 'Albert Park Circuit', country: 'Australien', race_date: '2025-03-16T04:00:00Z', is_sprint: false },
  { round: 4, race_name: 'Japanese Grand Prix', circuit_name: 'Suzuka Circuit', country: 'Japan', race_date: '2025-04-06T05:00:00Z', is_sprint: false },
  { round: 5, race_name: 'Chinese Grand Prix', circuit_name: 'Shanghai International Circuit', country: 'China', race_date: '2025-04-20T07:00:00Z', is_sprint: true },
  { round: 6, race_name: 'Miami Grand Prix', circuit_name: 'Miami International Autodrome', country: 'USA', race_date: '2025-05-04T20:00:00Z', is_sprint: true },
  { round: 7, race_name: 'Emilia Romagna Grand Prix', circuit_name: 'Autodromo Enzo e Dino Ferrari', country: 'Italien', race_date: '2025-05-18T13:00:00Z', is_sprint: false },
  { round: 8, race_name: 'Monaco Grand Prix', circuit_name: 'Circuit de Monaco', country: 'Monaco', race_date: '2025-05-25T13:00:00Z', is_sprint: false },
  { round: 9, race_name: 'Spanish Grand Prix', circuit_name: 'Circuit de Barcelona-Catalunya', country: 'Spanien', race_date: '2025-06-01T13:00:00Z', is_sprint: false },
  { round: 10, race_name: 'Canadian Grand Prix', circuit_name: 'Circuit Gilles Villeneuve', country: 'Kanada', race_date: '2025-06-15T18:00:00Z', is_sprint: false },
  { round: 11, race_name: 'Austrian Grand Prix', circuit_name: 'Red Bull Ring', country: 'Österreich', race_date: '2025-06-29T13:00:00Z', is_sprint: true },
  { round: 12, race_name: 'British Grand Prix', circuit_name: 'Silverstone Circuit', country: 'Großbritannien', race_date: '2025-07-06T14:00:00Z', is_sprint: false },
  { round: 13, race_name: 'Belgian Grand Prix', circuit_name: 'Circuit de Spa-Francorchamps', country: 'Belgien', race_date: '2025-07-27T13:00:00Z', is_sprint: true },
  { round: 14, race_name: 'Hungarian Grand Prix', circuit_name: 'Hungaroring', country: 'Ungarn', race_date: '2025-08-03T13:00:00Z', is_sprint: false },
  { round: 15, race_name: 'Dutch Grand Prix', circuit_name: 'Circuit Zandvoort', country: 'Niederlande', race_date: '2025-08-31T13:00:00Z', is_sprint: false },
  { round: 16, race_name: 'Italian Grand Prix', circuit_name: 'Autodromo Nazionale Monza', country: 'Italien', race_date: '2025-09-07T13:00:00Z', is_sprint: false },
  { round: 17, race_name: 'Azerbaijan Grand Prix', circuit_name: 'Baku City Circuit', country: 'Aserbaidschan', race_date: '2025-09-21T11:00:00Z', is_sprint: false },
  { round: 18, race_name: 'Singapore Grand Prix', circuit_name: 'Marina Bay Street Circuit', country: 'Singapur', race_date: '2025-10-05T12:00:00Z', is_sprint: false },
  { round: 19, race_name: 'United States Grand Prix', circuit_name: 'Circuit of the Americas', country: 'USA', race_date: '2025-10-19T19:00:00Z', is_sprint: true },
  { round: 20, race_name: 'Mexico City Grand Prix', circuit_name: 'Autódromo Hermanos Rodríguez', country: 'Mexiko', race_date: '2025-10-26T20:00:00Z', is_sprint: false },
  { round: 21, race_name: 'São Paulo Grand Prix', circuit_name: 'Autódromo José Carlos Pace', country: 'Brasilien', race_date: '2025-11-09T17:00:00Z', is_sprint: true },
  { round: 22, race_name: 'Las Vegas Grand Prix', circuit_name: 'Las Vegas Strip Circuit', country: 'USA', race_date: '2025-11-22T06:00:00Z', is_sprint: false },
  { round: 23, race_name: 'Qatar Grand Prix', circuit_name: 'Lusail International Circuit', country: 'Katar', race_date: '2025-11-30T16:00:00Z', is_sprint: true },
  { round: 24, race_name: 'Abu Dhabi Grand Prix', circuit_name: 'Yas Marina Circuit', country: 'Abu Dhabi', race_date: '2025-12-07T13:00:00Z', is_sprint: false },
]

interface UserPredictions {
  [raceId: number]: {
    qualifying?: boolean
    sprint?: boolean
    race?: boolean
  }
}

export default function RacesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [races, setRaces] = useState<Race[]>([])
  const [userPredictions, setUserPredictions] = useState<UserPredictions>({})
  const [loadingRaces, setLoadingRaces] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'finished'>('upcoming')
  const [expandedRace, setExpandedRace] = useState<number | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchData() {
      try {
        // Rennen laden
        const { data: existingRaces } = await supabase
          .from('races')
          .select('*')
          .eq('season', 2025)
          .order('round', { ascending: true })

        const racesToUse = existingRaces && existingRaces.length > 0 
          ? existingRaces 
          : F1_2025_CALENDAR.map((race, i) => ({
              ...race,
              id: i + 1,
              season: 2025,
              status: isPast(new Date(race.race_date)) ? 'finished' as const : 'upcoming' as const,
              created_at: new Date().toISOString()
            }))
        
        setRaces(racesToUse)

        // User Predictions laden (nur wenn eingeloggt)
        if (user) {
          const { data: predictions } = await supabase
            .from('predictions')
            .select('race_id, session_type')
            .eq('user_id', user.id)
          
          if (predictions) {
            const predMap: UserPredictions = {}
            predictions.forEach(p => {
              if (!predMap[p.race_id]) predMap[p.race_id] = {}
              if (p.session_type === 'qualifying') predMap[p.race_id].qualifying = true
              if (p.session_type === 'sprint') predMap[p.race_id].sprint = true
              if (p.session_type === 'race') predMap[p.race_id].race = true
            })
            setUserPredictions(predMap)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setRaces(F1_2025_CALENDAR.map((race, i) => ({
          ...race,
          id: i + 1,
          season: 2025,
          status: isPast(new Date(race.race_date)) ? 'finished' as const : 'upcoming' as const,
          created_at: new Date().toISOString()
        })))
      } finally {
        setLoadingRaces(false)
      }
    }

    if (!loading) {
      fetchData()
    }
  }, [user, loading])

  const filteredRaces = races.filter(race => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return isFuture(new Date(race.race_date)) || isToday(new Date(race.race_date))
    if (filter === 'finished') return isPast(new Date(race.race_date)) && !isToday(new Date(race.race_date))
    return true
  })

  // Zähle Tips für ein Rennen
  const getTipCount = (raceId: number, isSprint: boolean) => {
    const preds = userPredictions[raceId] || {}
    let count = 0
    let total = isSprint ? 3 : 2 // Sprint: Quali+Sprint+Race, Normal: Quali+Race
    if (preds.qualifying) count++
    if (isSprint && preds.sprint) count++
    if (preds.race) count++
    return { count, total }
  }

  if (loading || loadingRaces) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Lade Rennkalender...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              <span className="text-red-500">2025</span> Rennkalender
            </h1>
            <p className="text-gray-500 text-sm mt-1">24 Rennen • Tippe auf Quali, Sprint & Rennen</p>
          </div>

          {/* Filter */}
          <div className="flex gap-2 bg-[#111] p-1 rounded-lg">
            {(['upcoming', 'all', 'finished'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Alle' : f === 'upcoming' ? 'Kommend' : 'Beendet'}
              </button>
            ))}
          </div>
        </div>

        {/* Races List */}
        <div className="space-y-3">
          {filteredRaces.map((race) => {
            const raceDate = new Date(race.race_date)
            const isFinished = isPast(raceDate) && !isToday(raceDate)
            const isExpanded = expandedRace === race.id
            const { count: tipCount, total: tipTotal } = getTipCount(race.id, race.is_sprint)
            const preds = userPredictions[race.id] || {}

            return (
              <div
                key={race.id}
                className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden"
              >
                {/* Race Header */}
                <button
                  onClick={() => setExpandedRace(isExpanded ? null : race.id)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left"
                >
                  {/* Flag */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getCircuitGradient(race.race_name)} flex items-center justify-center text-xl shrink-0`}>
                    {getCountryFlag(race.race_name)}
                  </div>

                  {/* Race Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">R{race.round}</span>
                      {race.is_sprint && (
                        <span className="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 text-[10px] rounded">
                          +Sprint
                        </span>
                      )}
                      {isFinished && (
                        <span className="px-1.5 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded">
                          ✓
                        </span>
                      )}
                    </div>
                    <h2 className="font-bold text-white text-sm truncate">{race.race_name}</h2>
                  </div>

                  {/* Tip Status */}
                  {!isFinished && (
                    <div className="flex items-center gap-2 shrink-0">
                      {tipCount === tipTotal ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-600/10 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" />
                          Komplett
                        </span>
                      ) : tipCount > 0 ? (
                        <span className="text-xs text-yellow-400 bg-yellow-600/10 px-2 py-1 rounded-full">
                          {tipCount}/{tipTotal}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">
                          0/{tipTotal}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Date */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-sm font-medium text-white">
                      {format(raceDate, 'd. MMM', { locale: de })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(raceDate, 'HH:mm')}
                    </div>
                  </div>

                  {/* Expand Arrow */}
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Sessions (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-3 space-y-2 bg-[#0a0a0a]">
                    {/* Qualifying */}
                    <Link
                      href={`/races/${race.id}/predict?session=qualifying`}
                      className="flex items-center gap-3 p-3 bg-[#111] rounded-lg hover:bg-[#1a1a1a] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                        <Target className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm">Qualifying</div>
                        <div className="text-xs text-gray-500">Pole Position</div>
                      </div>
                      {preds.qualifying ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-600/10 px-2 py-1 rounded">
                          <Check className="w-3 h-3" /> Getippt
                        </span>
                      ) : (
                        <span className="text-xs text-blue-400">+10 Pkt</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                    </Link>

                    {/* Sprint (nur wenn is_sprint) */}
                    {race.is_sprint && (
                      <Link
                        href={`/races/${race.id}/predict?session=sprint`}
                        className="flex items-center gap-3 p-3 bg-[#111] rounded-lg hover:bg-[#1a1a1a] transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm">Sprint</div>
                          <div className="text-xs text-gray-500">Top 3</div>
                        </div>
                        {preds.sprint ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-600/10 px-2 py-1 rounded">
                            <Check className="w-3 h-3" /> Getippt
                          </span>
                        ) : (
                          <span className="text-xs text-purple-400">+30 Pkt</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                      </Link>
                    )}

                    {/* Race */}
                    <Link
                      href={`/races/${race.id}/predict?session=race`}
                      className="flex items-center gap-3 p-3 bg-[#111] rounded-lg hover:bg-[#1a1a1a] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-600/20 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm">Rennen</div>
                        <div className="text-xs text-gray-500">Podium + FL</div>
                      </div>
                      {preds.race ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-600/10 px-2 py-1 rounded">
                          <Check className="w-3 h-3" /> Getippt
                        </span>
                      ) : (
                        <span className="text-xs text-red-400">+68 Pkt</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                    </Link>

                    {/* Bonus */}
                    <Link
                      href={`/races/${race.id}/bonus`}
                      className="flex items-center gap-3 p-3 bg-[#111] rounded-lg hover:bg-[#1a1a1a] transition-colors group border border-dashed border-orange-900/50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-orange-600/20 flex items-center justify-center">
                        <Star className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-orange-400 text-sm">Bonus-Tipps</div>
                        <div className="text-xs text-gray-500">Safety Car, Regen, DNF...</div>
                      </div>
                      <span className="text-xs text-orange-400">+63 Pkt</span>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredRaces.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">Keine Rennen gefunden</h3>
            <p className="text-gray-500 text-sm">Passe den Filter an, um Rennen zu sehen.</p>
          </div>
        )}
      </main>
    </div>
  )
}

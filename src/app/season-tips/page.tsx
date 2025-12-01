'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { getDriverHeadshot } from '@/lib/images'
import { Trophy, Users, Crown, Target, Check, X, Search, Lock, Zap, Medal, AlertCircle } from 'lucide-react'

interface Driver {
  driver_number: number
  full_name: string
  team_name: string
  team_color: string
  code?: string
}

interface Team {
  name: string
  color: string
}

interface SeasonPrediction {
  id?: string
  wdc_p1_driver: number | null
  wdc_p2_driver: number | null
  wdc_p3_driver: number | null
  wcc_p1_team: string | null
  wcc_p2_team: string | null
  wcc_p3_team: string | null
  most_wins_driver: number | null
  most_poles_driver: number | null
  most_dnfs_driver: number | null
  locked?: boolean
}

const TEAMS: Team[] = [
  { name: 'Red Bull Racing', color: '#3671C6' },
  { name: 'Ferrari', color: '#E8002D' },
  { name: 'McLaren', color: '#FF8000' },
  { name: 'Mercedes', color: '#27F4D2' },
  { name: 'Aston Martin', color: '#229971' },
  { name: 'Alpine', color: '#FF87BC' },
  { name: 'Williams', color: '#64C4FF' },
  { name: 'RB', color: '#6692FF' },
  { name: 'Kick Sauber', color: '#52E252' },
  { name: 'Haas F1 Team', color: '#B6BABD' },
]

export default function SeasonTipsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [prediction, setPrediction] = useState<SeasonPrediction>({
    wdc_p1_driver: null,
    wdc_p2_driver: null,
    wdc_p3_driver: null,
    wcc_p1_team: null,
    wcc_p2_team: null,
    wcc_p3_team: null,
    most_wins_driver: null,
    most_poles_driver: null,
    most_dnfs_driver: null,
  })
  const [existingPrediction, setExistingPrediction] = useState<SeasonPrediction | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'driver' | 'team'>('driver')
  const [modalTarget, setModalTarget] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    async function fetchData() {
      if (!user) return
      try {
        // Fahrer laden
        const driversResponse = await fetch('/api/drivers')
        const driversJson = await driversResponse.json()
        if (driversJson.drivers) setDrivers(driversJson.drivers)

        // Existierende Prediction laden
        const { data: predData } = await supabase
          .from('season_predictions')
          .select('*')
          .eq('user_id', user.id)
          .eq('season', 2025)
          .maybeSingle()

        if (predData) {
          setExistingPrediction(predData)
          setPrediction({
            wdc_p1_driver: predData.wdc_p1_driver,
            wdc_p2_driver: predData.wdc_p2_driver,
            wdc_p3_driver: predData.wdc_p3_driver,
            wcc_p1_team: predData.wcc_p1_team,
            wcc_p2_team: predData.wcc_p2_team,
            wcc_p3_team: predData.wcc_p3_team,
            most_wins_driver: predData.most_wins_driver,
            most_poles_driver: predData.most_poles_driver,
            most_dnfs_driver: predData.most_dnfs_driver,
            locked: predData.locked,
          })
          setIsLocked(predData.locked || false)
        }

        // Prüfen ob Saison schon gestartet (erstes Rennen vorbei)
        const { data: firstRace } = await supabase
          .from('races')
          .select('race_date')
          .eq('season', 2025)
          .order('round', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (firstRace && new Date(firstRace.race_date) < new Date()) {
          setIsLocked(true)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [user])

  const handleSave = async () => {
    if (!user || isLocked) return

    setSaving(true)
    try {
      const data = {
        user_id: user.id,
        season: 2025,
        ...prediction,
      }

      if (existingPrediction?.id) {
        await supabase.from('season_predictions').update(data).eq('id', existingPrediction.id)
      } else {
        await supabase.from('season_predictions').insert(data)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const openDriverModal = (target: string) => {
    setModalType('driver')
    setModalTarget(target)
    setSearchTerm('')
    setModalOpen(true)
  }

  const openTeamModal = (target: string) => {
    setModalType('team')
    setModalTarget(target)
    setSearchTerm('')
    setModalOpen(true)
  }

  const selectDriver = (num: number) => {
    setPrediction(prev => ({ ...prev, [modalTarget]: num }))
    setModalOpen(false)
  }

  const selectTeam = (name: string) => {
    setPrediction(prev => ({ ...prev, [modalTarget]: name }))
    setModalOpen(false)
  }

  const getDriver = (num: number | null) => drivers.find(d => d.driver_number === num)
  const getTeam = (name: string | null) => TEAMS.find(t => t.name === name)

  const filteredDrivers = drivers.filter(d =>
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.team_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTeams = TEAMS.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Driver Selection Card
  const DriverCard = ({ num, label, target, points, icon: Icon }: { 
    num: number | null, 
    label: string, 
    target: string, 
    points: number,
    icon: React.ComponentType<{ className?: string }>
  }) => {
    const driver = getDriver(num)

    return (
      <button
        onClick={() => !isLocked && openDriverModal(target)}
        disabled={isLocked}
        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
          driver
            ? 'border-gray-700 bg-[#111]'
            : 'border-dashed border-gray-600 bg-[#0a0a0a] hover:border-gray-500'
        } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-red-600'}`}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
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
              <Icon className="w-6 h-6 text-gray-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
            {driver ? (
              <>
                <div className="text-base font-bold text-white truncate">{driver.full_name}</div>
                <div className="text-sm text-gray-400">{driver.team_name}</div>
              </>
            ) : (
              <div className="text-gray-400">Fahrer wählen →</div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">+{points} Pkt</div>
          </div>
        </div>
      </button>
    )
  }

  // Team Selection Card
  const TeamCard = ({ teamName, label, target, points }: { 
    teamName: string | null, 
    label: string, 
    target: string, 
    points: number 
  }) => {
    const team = getTeam(teamName)

    return (
      <button
        onClick={() => !isLocked && openTeamModal(target)}
        disabled={isLocked}
        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
          team
            ? 'border-gray-700 bg-[#111]'
            : 'border-dashed border-gray-600 bg-[#0a0a0a] hover:border-gray-500'
        } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-red-600'}`}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center"
            style={{ backgroundColor: team?.color || '#222' }}
          >
            <Users className="w-6 h-6 text-white/80" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
            {team ? (
              <div className="text-base font-bold text-white">{team.name}</div>
            ) : (
              <div className="text-gray-400">Team wählen →</div>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">+{points} Pkt</div>
          </div>
        </div>
      </button>
    )
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <main className="pt-20 pb-12 px-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Saison-Tipps 2025</h1>
          <p className="text-gray-400">Tippe wer Weltmeister wird – vor dem ersten Rennen!</p>
        </div>

        {isLocked && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium">Saison-Tipps gesperrt</p>
              <p className="text-yellow-400/70 text-sm">Nach dem ersten Rennen können keine Änderungen mehr vorgenommen werden.</p>
            </div>
          </div>
        )}

        {saved && (
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500" />
            <p className="text-green-400">Tipps gespeichert!</p>
          </div>
        )}

        {/* WM-Sieger */}
        <div className="bg-[#111] rounded-xl border border-gray-800 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Fahrer-WM 2025</h2>
              <p className="text-sm text-gray-500">Wer holt den Titel?</p>
            </div>
          </div>

          <div className="space-y-3">
            <DriverCard num={prediction.wdc_p1_driver} label="Weltmeister" target="wdc_p1_driver" points={100} icon={Trophy} />
            <DriverCard num={prediction.wdc_p2_driver} label="Vize-Weltmeister" target="wdc_p2_driver" points={50} icon={Medal} />
            <DriverCard num={prediction.wdc_p3_driver} label="3. Platz" target="wdc_p3_driver" points={30} icon={Medal} />
          </div>
        </div>

        {/* Konstrukteurs-WM */}
        <div className="bg-[#111] rounded-xl border border-gray-800 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Konstrukteurs-WM 2025</h2>
              <p className="text-sm text-gray-500">Welches Team gewinnt?</p>
            </div>
          </div>

          <div className="space-y-3">
            <TeamCard teamName={prediction.wcc_p1_team} label="Konstrukteurs-Champion" target="wcc_p1_team" points={75} />
            <TeamCard teamName={prediction.wcc_p2_team} label="2. Platz" target="wcc_p2_team" points={40} />
            <TeamCard teamName={prediction.wcc_p3_team} label="3. Platz" target="wcc_p3_team" points={25} />
          </div>
        </div>

        {/* Bonus-Tipps */}
        <div className="bg-[#111] rounded-xl border border-gray-800 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-white">Saison-Bonus</h2>
              <p className="text-sm text-gray-500">Wer dominiert die Statistiken?</p>
            </div>
          </div>

          <div className="space-y-3">
            <DriverCard num={prediction.most_wins_driver} label="Meiste Siege" target="most_wins_driver" points={40} icon={Trophy} />
            <DriverCard num={prediction.most_poles_driver} label="Meiste Pole Positions" target="most_poles_driver" points={40} icon={Target} />
            <DriverCard num={prediction.most_dnfs_driver} label="Meiste Ausfälle" target="most_dnfs_driver" points={30} icon={AlertCircle} />
          </div>
        </div>

        {/* Punkte Info */}
        <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Mögliche Punkte</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">WM P1:</div><div className="text-white">100 Punkte</div>
            <div className="text-gray-500">WM P2:</div><div className="text-white">50 Punkte</div>
            <div className="text-gray-500">WM P3:</div><div className="text-white">30 Punkte</div>
            <div className="text-gray-500">Team P1:</div><div className="text-white">75 Punkte</div>
            <div className="text-gray-500">Team P2:</div><div className="text-white">40 Punkte</div>
            <div className="text-gray-500">Team P3:</div><div className="text-white">25 Punkte</div>
            <div className="text-gray-500">Bonus:</div><div className="text-white">je 30-40 Punkte</div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800 text-right">
            <span className="text-gray-500">Maximal: </span>
            <span className="text-yellow-400 font-bold">430 Punkte</span>
          </div>
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
          {saving ? 'Speichern...' : existingPrediction?.id ? 'Tipps aktualisieren' : 'Tipps speichern'}
        </button>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center p-4">
          <div className="bg-[#111] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg">{modalType === 'driver' ? 'Fahrer' : 'Team'} wählen</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-red-600"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {modalType === 'driver' ? (
                <div className="grid grid-cols-2 gap-3">
                  {filteredDrivers.map((driver) => (
                    <button
                      key={driver.driver_number}
                      onClick={() => selectDriver(driver.driver_number)}
                      className="p-3 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-gray-800 hover:border-gray-600 transition-all text-left"
                    >
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
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTeams.map((team) => (
                    <button
                      key={team.name}
                      onClick={() => selectTeam(team.name)}
                      className="w-full p-4 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-gray-800 hover:border-gray-600 transition-all text-left flex items-center gap-4"
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: team.color }}
                      >
                        <Users className="w-5 h-5 text-white/80" />
                      </div>
                      <span className="font-bold text-white">{team.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


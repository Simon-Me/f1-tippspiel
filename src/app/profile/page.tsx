'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase, Prediction, Race, Driver, Profile } from '@/lib/supabase'
import { 
  User, 
  Trophy, 
  Target,
  TrendingUp,
  Award,
  Star,
  Zap,
  Flame,
  Crown,
  Medal,
  Rocket,
  Eye,
  Lock
} from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface PredictionWithRace extends Prediction {
  race: Race
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  progress?: number
  maxProgress?: number
  color: string
}

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [predictions, setPredictions] = useState<PredictionWithRace[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [allPlayers, setAllPlayers] = useState<Profile[]>([])
  const [stats, setStats] = useState({
    totalPredictions: 0,
    totalPoints: 0,
    correctP1: 0,
    tipsWithPoints: 0,
    averagePoints: 0,
    bestRace: 0,
    favDriver: '',
    favDriverCount: 0
  })
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return

      try {
        // Fahrer laden
        try {
          const driversResponse = await fetch('/api/drivers')
          const driversJson = await driversResponse.json()
          if (driversJson.drivers) {
            setDrivers(driversJson.drivers)
          }
        } catch (e) {
          console.error('Error loading drivers from API:', e)
        }

        // Alle Spieler für Ranking
        const { data: playersData } = await supabase
          .from('profiles')
          .select('*')
          .order('total_points', { ascending: false })
        
        if (playersData) setAllPlayers(playersData)

        // Alle Tipps laden
        const { data: predictionsData } = await supabase
          .from('predictions')
          .select(`*, race:races(*)`)
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })

        if (predictionsData) {
          setPredictions(predictionsData as PredictionWithRace[])
          
          // Stats berechnen
          const totalPredictions = predictionsData.length
          const tipsWithPoints = predictionsData.filter(p => (p.points_earned || 0) > 0).length
          const totalPoints = predictionsData.reduce((sum, p) => sum + (p.points_earned || 0), 0)
          const bestRace = predictionsData.reduce((max, p) => Math.max(max, p.points_earned || 0), 0)
          
          // Lieblings-Fahrer (meistgetippt als P1)
          const p1Counts: Record<number, number> = {}
          predictionsData.forEach(p => {
            if (p.p1_driver) {
              p1Counts[p.p1_driver] = (p1Counts[p.p1_driver] || 0) + 1
            }
          })
          const favDriverNum = Object.entries(p1Counts).sort((a, b) => b[1] - a[1])[0]
          
          setStats({
            totalPredictions,
            totalPoints,
            correctP1: predictionsData.filter(p => (p.points_earned || 0) >= 25).length,
            tipsWithPoints,
            averagePoints: totalPredictions > 0 ? Math.round(totalPoints / totalPredictions * 10) / 10 : 0,
            bestRace,
            favDriver: favDriverNum ? String(favDriverNum[0]) : '',
            favDriverCount: favDriverNum ? favDriverNum[1] : 0
          })

          // Achievements berechnen
          calculateAchievements(predictionsData, totalPoints, tipsWithPoints, bestRace, playersData || [])
        }

        await refreshProfile()
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchProfileData()
  }, [user, refreshProfile])

  const calculateAchievements = (
    preds: PredictionWithRace[], 
    totalPoints: number,
    tipsWithPoints: number,
    bestRace: number,
    players: Profile[]
  ) => {
    const userRank = players.findIndex(p => p.id === user?.id) + 1
    
    const achievementsList: Achievement[] = [
      {
        id: 'first_tip',
        name: 'Erster Tipp',
        description: 'Gib deinen ersten Tipp ab',
        icon: <Rocket className="w-6 h-6" />,
        unlocked: preds.length >= 1,
        color: 'green'
      },
      {
        id: 'tipster',
        name: 'Fleißiger Tipper',
        description: '10 Tipps abgegeben',
        icon: <Target className="w-6 h-6" />,
        unlocked: preds.length >= 10,
        progress: Math.min(preds.length, 10),
        maxProgress: 10,
        color: 'blue'
      },
      {
        id: 'veteran',
        name: 'Veteran',
        description: '25 Tipps abgegeben',
        icon: <Medal className="w-6 h-6" />,
        unlocked: preds.length >= 25,
        progress: Math.min(preds.length, 25),
        maxProgress: 25,
        color: 'purple'
      },
      {
        id: 'points_100',
        name: 'Punktesammler',
        description: '100 Punkte erreichen',
        icon: <Trophy className="w-6 h-6" />,
        unlocked: totalPoints >= 100,
        progress: Math.min(totalPoints, 100),
        maxProgress: 100,
        color: 'yellow'
      },
      {
        id: 'points_250',
        name: 'Punktekönig',
        description: '250 Punkte erreichen',
        icon: <Crown className="w-6 h-6" />,
        unlocked: totalPoints >= 250,
        progress: Math.min(totalPoints, 250),
        maxProgress: 250,
        color: 'yellow'
      },
      {
        id: 'hot_streak',
        name: 'Hot Streak',
        description: '5 Tipps hintereinander mit Punkten',
        icon: <Flame className="w-6 h-6" />,
        unlocked: checkStreak(preds, 5),
        color: 'orange'
      },
      {
        id: 'perfect_race',
        name: 'Perfektes Rennen',
        description: '40+ Punkte in einem Rennen',
        icon: <Star className="w-6 h-6" />,
        unlocked: bestRace >= 40,
        color: 'yellow'
      },
      {
        id: 'podium_master',
        name: 'Podium-Meister',
        description: '10 Tipps mit Punkten',
        icon: <Award className="w-6 h-6" />,
        unlocked: tipsWithPoints >= 10,
        progress: Math.min(tipsWithPoints, 10),
        maxProgress: 10,
        color: 'green'
      },
      {
        id: 'top3',
        name: 'Top 3',
        description: 'Platz 1-3 in der Rangliste',
        icon: <Crown className="w-6 h-6" />,
        unlocked: userRank > 0 && userRank <= 3,
        color: 'yellow'
      },
      {
        id: 'eagle_eye',
        name: 'Adlerauge',
        description: '5x P1 richtig getippt',
        icon: <Eye className="w-6 h-6" />,
        unlocked: preds.filter(p => (p.points_earned || 0) >= 25).length >= 5,
        progress: preds.filter(p => (p.points_earned || 0) >= 25).length,
        maxProgress: 5,
        color: 'cyan'
      },
    ]
    
    setAchievements(achievementsList)
  }

  const checkStreak = (preds: PredictionWithRace[], target: number): boolean => {
    let streak = 0
    let maxStreak = 0
    // Sort by date
    const sorted = [...preds].sort((a, b) => 
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    )
    for (const p of sorted) {
      if ((p.points_earned || 0) > 0) {
        streak++
        maxStreak = Math.max(maxStreak, streak)
      } else {
        streak = 0
      }
    }
    return maxStreak >= target
  }

  const getDriverName = (driverNumber?: number | string) => {
    const num = typeof driverNumber === 'string' ? parseInt(driverNumber) : driverNumber
    const driver = drivers.find(d => d.driver_number === num)
    return driver?.full_name || '-'
  }

  const userRank = allPlayers.findIndex(p => p.id === user?.id) + 1
  const unlockedCount = achievements.filter(a => a.unlocked).length

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
      
      <main className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#111] to-[#1a1a1a] rounded-2xl p-6 mb-6 border border-gray-800">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-4xl font-bold">
              {profile?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-3xl font-bold text-white">{profile?.username}</h1>
              <p className="text-gray-500 mt-1">
                Dabei seit {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: de }) : 'N/A'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                <span className="text-sm text-gray-400">
                  Rang <span className="text-white font-bold">#{userRank}</span>
                </span>
                <span className="text-sm text-gray-400">
                  <span className="text-yellow-400 font-bold">{unlockedCount}</span>/{achievements.length} Achievements
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-red-500">{profile?.total_points || 0}</div>
              <div className="text-gray-500 text-sm">Gesamtpunkte</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <Target className="w-5 h-5 text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-white">{stats.totalPredictions}</div>
            <div className="text-xs text-gray-500">Tipps</div>
          </div>
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
            <div className="text-2xl font-bold text-white">{stats.averagePoints}</div>
            <div className="text-xs text-gray-500">Ø pro Tipp</div>
          </div>
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <Zap className="w-5 h-5 text-yellow-500 mb-2" />
            <div className="text-2xl font-bold text-white">{stats.bestRace}</div>
            <div className="text-xs text-gray-500">Bestes Rennen</div>
          </div>
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800">
            <Star className="w-5 h-5 text-purple-500 mb-2" />
            <div className="text-2xl font-bold text-white">{stats.tipsWithPoints}</div>
            <div className="text-xs text-gray-500">Treffer</div>
          </div>
        </div>

        {/* Favorite Driver */}
        {stats.favDriver && (
          <div className="bg-[#111] rounded-xl p-4 border border-gray-800 mb-6">
            <div className="text-xs text-gray-500 mb-2">DEIN FAVORIT</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-white">{getDriverName(stats.favDriver)}</div>
                <div className="text-sm text-gray-400">{stats.favDriverCount}x als P1 getippt</div>
              </div>
              <div className="text-4xl">🏎️</div>
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Achievements
            </h2>
            <span className="text-sm text-gray-500">{unlockedCount}/{achievements.length}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-4">
            {achievements.map(achievement => (
              <div 
                key={achievement.id}
                className={`relative rounded-xl p-4 text-center transition-all ${
                  achievement.unlocked 
                    ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700' 
                    : 'bg-[#0a0a0a] border border-gray-800/50 opacity-50'
                }`}
              >
                {!achievement.unlocked && (
                  <Lock className="absolute top-2 right-2 w-3 h-3 text-gray-600" />
                )}
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                  achievement.unlocked 
                    ? achievement.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                      achievement.color === 'green' ? 'bg-green-500/20 text-green-400' :
                      achievement.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                      achievement.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                      achievement.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                      achievement.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-gray-500/20 text-gray-400'
                    : 'bg-gray-800 text-gray-600'
                }`}>
                  {achievement.icon}
                  </div>
                <div className={`text-xs font-bold mb-1 ${achievement.unlocked ? 'text-white' : 'text-gray-600'}`}>
                  {achievement.name}
                  </div>
                <div className="text-[10px] text-gray-500 leading-tight">
                  {achievement.description}
                </div>
                {achievement.maxProgress && !achievement.unlocked && (
                  <div className="mt-2">
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gray-600 rounded-full"
                        style={{ width: `${((achievement.progress || 0) / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      {achievement.progress}/{achievement.maxProgress}
                </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Predictions */}
        <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-white">Letzte Tipps</h2>
            <Link href="/history" className="text-sm text-red-500 hover:underline">
              Alle ansehen →
            </Link>
          </div>
          
          <div className="divide-y divide-gray-800/50">
            {predictions.slice(0, 5).map(pred => (
              <div key={pred.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{pred.race?.race_name}</div>
                  <div className="text-xs text-gray-500">
                    {pred.session_type === 'qualifying' ? 'Quali' : pred.session_type === 'sprint' ? 'Sprint' : 'Rennen'}
                  </div>
                </div>
                <div className={`text-lg font-bold ${(pred.points_earned || 0) > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  +{pred.points_earned || 0}
                </div>
              </div>
            ))}
          </div>

          {predictions.length === 0 && (
            <div className="p-12 text-center">
              <Target className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-500">Noch keine Tipps abgegeben</p>
              <Link href="/races" className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Jetzt tippen
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

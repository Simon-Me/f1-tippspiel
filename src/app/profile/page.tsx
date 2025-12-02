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
  Lock,
  Coins,
  ShoppingBag,
  Camera,
  Loader2,
  Check,
  X,
  Search
} from 'lucide-react'
import { CAR_ITEMS, RARITY_COLORS, CarItem } from '@/lib/shopItems'
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
  const [coins, setCoins] = useState(0)
  const [ownedCars, setOwnedCars] = useState<CarItem[]>([])
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
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [championTip, setChampionTip] = useState<number | null>(null)
  const [championTipId, setChampionTipId] = useState<string | null>(null)
  const [championLocked, setChampionLocked] = useState(false)
  const [championModalOpen, setChampionModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [equippedCarId, setEquippedCarId] = useState<string>('default')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile])

  const compressImage = (file: File, maxSize = 200): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Quadratisch zuschneiden (kleinere Seite)
        const size = Math.min(width, height)
        const sx = (width - size) / 2
        const sy = (height - size) / 2
        
        canvas.width = maxSize
        canvas.height = maxSize
        
        const ctx = canvas.getContext('2d')
        // Zeichne quadratischen Ausschnitt
        ctx?.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize)
        
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject('Failed to compress'),
          'image/jpeg',
          0.7 // 70% Qualität für kleinere Dateien
        )
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    
    setUploading(true)
    
    try {
      // Komprimiere auf 200x200px quadratisch, 70% Qualität
      const compressedBlob = await compressImage(file, 200)
      
      console.log('Compressed size:', compressedBlob.size, 'bytes') // Debug
      
      const formData = new FormData()
      formData.append('file', new File([compressedBlob], 'avatar.jpg', { type: 'image/jpeg' }))
      formData.append('userId', user.id)
      
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      })
      
      const data = await res.json()
      
      // Debug: Zeige alle Logs
      console.log('=== UPLOAD RESPONSE ===')
      console.log('Status:', res.status)
      console.log('Data:', JSON.stringify(data, null, 2))
      if (data.logs) {
        console.log('Server Logs:')
        data.logs.forEach((log: string) => console.log('  ', log))
      }
      
      if (!res.ok) {
        const errorMsg = data.logs ? data.logs.join('\n') : (data.details || data.error)
        throw new Error(errorMsg)
      }
      
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url)
        await refreshProfile()
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    
    const userId = user.id
    
    async function fetchProfileData() {
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

        // Coins und equipped car laden
        const { data: profileData } = await supabase
          .from('profiles')
          .select('coins, equipped_car_id')
          .eq('id', userId)
          .single()
        
        if (profileData) {
          setCoins(profileData.coins || 0)
          setEquippedCarId(profileData.equipped_car_id || 'default')
        }

        // Gekaufte Autos laden
        const { data: userItems } = await supabase
          .from('user_items')
          .select('item_id')
          .eq('user_id', userId)
        
        if (userItems) {
          const owned = userItems
            .map(ui => CAR_ITEMS.find(item => item.id === ui.item_id))
            .filter((item): item is CarItem => item !== undefined)
          setOwnedCars(owned)
        }

        // Weltmeister-Tipp laden (falls Tabelle existiert)
        try {
          const { data: seasonTip, error: seasonError } = await supabase
            .from('season_predictions')
            .select('id, wdc_p1_driver')
            .eq('user_id', userId)
            .eq('season', 2025)
            .maybeSingle()
          
          if (!seasonError && seasonTip) {
            setChampionTipId(seasonTip.id)
            setChampionTip(seasonTip.wdc_p1_driver)
          }
        } catch {
          // Tabelle existiert nicht - ignorieren
        }

        // Prüfen ob Saison gestartet
        const { data: firstRace } = await supabase
          .from('races')
          .select('race_date')
          .eq('season', 2025)
          .order('round', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (firstRace && new Date(firstRace.race_date) < new Date()) {
          setChampionLocked(true)
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
          .eq('user_id', userId)
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
            {/* Avatar with Upload */}
            <div className="relative group">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={profile?.username || 'Avatar'} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-red-600"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-4xl font-bold border-4 border-red-600">
                  {profile?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Upload Overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-white" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
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
              <div className="flex items-center gap-4 justify-center">
                <div>
                  <div className="text-4xl font-bold text-red-500">{profile?.total_points || 0}</div>
                  <div className="text-gray-500 text-xs">Punkte</div>
                </div>
                <div className="w-px h-12 bg-gray-700" />
                <div>
                  <div className="text-4xl font-bold text-yellow-400 flex items-center gap-1">
                    <Coins className="w-6 h-6" />
                    {coins}
                  </div>
                  <div className="text-gray-500 text-xs">Coins</div>
                </div>
              </div>
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

        {/* Weltmeister-Tipp */}
        <button
          onClick={() => !championLocked && setChampionModalOpen(true)}
          disabled={championLocked}
          className={`w-full text-left bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-800/50 mb-6 transition-all ${
            !championLocked ? 'hover:border-yellow-600 cursor-pointer' : 'opacity-80'
          }`}
        >
          <div className="text-xs text-yellow-500 mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4" />
            DEIN WELTMEISTER-TIPP 2025
            {championLocked && <Lock className="w-3 h-3 text-yellow-600" />}
          </div>
          {championTip ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-white">{getDriverName(championTip)}</div>
                <div className="text-sm text-yellow-400/70">+100 Punkte wenn richtig!</div>
              </div>
              <div className="text-4xl">🏆</div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg text-gray-400">Noch nicht getippt</div>
                <div className="text-sm text-yellow-400/70">{championLocked ? 'Saison hat begonnen' : 'Klicke um zu tippen!'}</div>
              </div>
              {!championLocked && (
                <span className="px-4 py-2 bg-yellow-600 text-black font-bold rounded-lg text-sm">
                  Tippen →
                </span>
              )}
            </div>
          )}
        </button>

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

        {/* Meine Garage */}
        <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <span className="text-xl">🏎️</span>
              Meine Garage
            </h2>
            <Link href="/shop" className="text-sm text-yellow-500 hover:underline">
              Mehr Autos →
            </Link>
          </div>

          <div className="p-4">
            {/* Aktuelles Auto */}
            <div className="mb-4 p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl border border-green-800/50">
              <div className="text-xs text-green-400 mb-2">AUSGEWÄHLTES AUTO</div>
              <div className="flex items-center gap-4">
                <img 
                  src={equippedCarId === 'default' ? '/cars/default.png' : (ownedCars.find(c => c.id === equippedCarId)?.image || '/cars/default.png')}
                  alt="Ausgewähltes Auto"
                  className="w-24 h-16 object-contain bg-zinc-900 rounded-lg"
                />
                <div>
                  <div className="font-bold text-white">
                    {equippedCarId === 'default' ? 'Standard-Wagen' : (ownedCars.find(c => c.id === equippedCarId)?.name || 'Standard-Wagen')}
                  </div>
                  <div className="text-xs text-gray-400">Wird auf der Rennstrecke angezeigt</div>
                </div>
              </div>
            </div>

            {/* Alle Autos zum Auswählen */}
            <div className="text-xs text-gray-500 mb-2">WÄHLE DEIN AUTO</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Default Wagen */}
              <button
                onClick={async () => {
                  if (!user) return
                  await supabase.from('profiles').update({ equipped_car_id: 'default' }).eq('id', user.id)
                  setEquippedCarId('default')
                }}
                className={`relative rounded-xl border-2 bg-black/50 overflow-hidden transition-all ${
                  equippedCarId === 'default' ? 'border-green-500 ring-2 ring-green-500/30' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                {equippedCarId === 'default' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <img 
                  src="/cars/default.png"
                  alt="Standard-Wagen"
                  className="w-full aspect-video object-contain bg-zinc-900"
                />
                <div className="p-2">
                  <div className="text-xs font-bold text-white truncate">Standard-Wagen</div>
                  <div className="text-[10px] text-gray-500">Kostenlos</div>
                </div>
              </button>

              {/* Gekaufte Autos */}
              {ownedCars.map(car => {
                const rarityStyle = RARITY_COLORS[car.rarity]
                const isEquipped = equippedCarId === car.id
                return (
                  <button
                    key={car.id}
                    onClick={async () => {
                      if (!user) return
                      await supabase.from('profiles').update({ equipped_car_id: car.id }).eq('id', user.id)
                      setEquippedCarId(car.id)
                    }}
                    className={`relative rounded-xl border-2 bg-black/50 overflow-hidden transition-all ${
                      isEquipped ? 'border-green-500 ring-2 ring-green-500/30' : `${rarityStyle.border} hover:opacity-80`
                    }`}
                  >
                    {isEquipped && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center z-10">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <img 
                      src={car.image} 
                      alt={car.name}
                      className="w-full aspect-video object-contain bg-zinc-900"
                    />
                    <div className="p-2">
                      <div className="text-xs font-bold text-white truncate">{car.name}</div>
                      <div className={`text-[10px] ${rarityStyle.text} uppercase`}>{car.rarity}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {ownedCars.length === 0 && (
              <p className="text-center text-gray-500 text-sm mt-4">
                Kaufe Autos im <Link href="/shop" className="text-yellow-500 hover:underline">Shop</Link> um mehr Auswahl zu haben!
              </p>
            )}
          </div>
        </div>

        {/* Recent Predictions */}
        <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-bold text-white">Letzte Tipps</h2>
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

      {/* Weltmeister Modal */}
      {championModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center p-4">
          <div className="bg-[#111] rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg">Weltmeister 2025</h3>
                <p className="text-sm text-gray-500">+100 Punkte wenn richtig!</p>
              </div>
              <button onClick={() => setChampionModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Fahrer suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-yellow-600"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {drivers
                  .filter(d => 
                    d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    d.team_name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((driver) => (
                  <button
                    key={driver.driver_number}
                    onClick={async () => {
                      if (!user) return
                      
                      try {
                        const data = {
                          user_id: user.id,
                          season: 2025,
                          wdc_p1_driver: driver.driver_number,
                        }

                        if (championTipId) {
                          await supabase.from('season_predictions').update(data).eq('id', championTipId)
                        } else {
                          const { data: newTip } = await supabase.from('season_predictions').insert(data).select('id').single()
                          if (newTip) setChampionTipId(newTip.id)
                        }
                        
                        setChampionTip(driver.driver_number)
                      } catch {
                        console.error('season_predictions table not found')
                      }
                      
                      setChampionModalOpen(false)
                      setSearchTerm('')
                    }}
                    className={`p-3 rounded-xl bg-[#0a0a0a] hover:bg-[#1a1a1a] border transition-all text-left ${
                      championTip === driver.driver_number
                        ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                        : 'border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="w-full aspect-square rounded-lg overflow-hidden mb-3"
                      style={{ backgroundColor: driver.team_color || '#333' }}
                    >
                      <img
                        src={`https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/2025Drivers/${driver.full_name?.split(' ').pop()?.toLowerCase() || 'driver'}.png.transform/1col/image.png`}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

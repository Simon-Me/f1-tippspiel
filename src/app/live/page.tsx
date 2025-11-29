'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { getDriverHeadshot } from '@/lib/images'
import { 
  Trophy, 
  RefreshCw,
  Flag,
  Clock,
  Award,
  Users
} from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface DriverStanding {
  position: string
  points: string
  wins: string
  Driver: {
    driverId: string
    permanentNumber: string
    code: string
    givenName: string
    familyName: string
  }
  Constructors: Array<{
    constructorId: string
    name: string
  }>
}

interface ConstructorStanding {
  position: string
  points: string
  wins: string
  Constructor: {
    constructorId: string
    name: string
    nationality: string
  }
}

interface RaceResult {
  position: string
  Driver: {
    code: string
    givenName: string
    familyName: string
  }
  Constructor: {
    name: string
  }
  points: string
  status: string
}

interface LastRace {
  raceName: string
  date: string
  round: string
  Results: RaceResult[]
}

const TEAM_COLORS: Record<string, string> = {
  'red_bull': '#3671C6',
  'ferrari': '#E8002D',
  'mclaren': '#FF8000',
  'mercedes': '#27F4D2',
  'aston_martin': '#229971',
  'alpine': '#0093CC',
  'williams': '#64C4FF',
  'rb': '#6692FF',
  'sauber': '#52E252',
  'haas': '#B6BABD',
}

export default function LivePage() {
  const { user } = useAuth()
  
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([])
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([])
  const [lastRace, setLastRace] = useState<LastRace | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors' | 'lastRace'>('drivers')

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true)
      
      const [driversRes, constructorsRes, lastRaceRes] = await Promise.all([
        fetch('https://api.jolpi.ca/ergast/f1/current/driverStandings/'),
        fetch('https://api.jolpi.ca/ergast/f1/current/constructorStandings/'),
        fetch('https://api.jolpi.ca/ergast/f1/current/last/results/')
      ])
      
      if (driversRes.ok) {
        const data = await driversRes.json()
        setDriverStandings(data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [])
      }
      
      if (constructorsRes.ok) {
        const data = await constructorsRes.json()
        setConstructorStandings(data.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [])
      }
      
      if (lastRaceRes.ok) {
        const data = await lastRaceRes.json()
        setLastRace(data.MRData?.RaceTable?.Races?.[0] || null)
      }
      
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-calculate points when viewing results
  useEffect(() => {
    if (lastRace && activeTab === 'lastRace') {
      fetch('/api/calculate-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }).catch(() => {})
    }
  }, [lastRace, activeTab])

  const getTeamColor = (constructorId: string): string => {
    return TEAM_COLORS[constructorId] || '#666666'
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E10600] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Lade WM-Stand...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Trophy className="w-10 h-10 text-[#E10600]" />
              WM-Stand 2025
            </h1>
            <p className="text-gray-400 mt-2">
              Aktuelle Fahrer- und Konstrukteurswertung
            </p>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdate && (
              <div className="text-sm text-gray-500">
                <Clock className="w-4 h-4 inline mr-1" />
                {format(lastUpdate, 'HH:mm', { locale: de })} Uhr
              </div>
            )}
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Aktualisieren
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-[#111] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'drivers' 
                ? 'bg-[#E10600] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Award className="w-5 h-5" />
            Fahrer-WM
          </button>
          <button
            onClick={() => setActiveTab('constructors')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'constructors' 
                ? 'bg-[#E10600] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            Team-WM
          </button>
          <button
            onClick={() => setActiveTab('lastRace')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'lastRace' 
                ? 'bg-[#E10600] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Flag className="w-5 h-5" />
            Letztes Rennen
          </button>
        </div>

        {/* Drivers Standing */}
        {activeTab === 'drivers' && (
          <div className="bg-[#111] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="font-bold text-lg">Fahrerwertung 2025</h2>
              <span className="text-sm text-gray-500">{driverStandings.length} Fahrer</span>
            </div>
            <div className="divide-y divide-[#222]">
              {driverStandings.map((standing, index) => {
                const teamId = standing.Constructors?.[0]?.constructorId || ''
                const teamColor = getTeamColor(teamId)
                const driverNumber = parseInt(standing.Driver.permanentNumber) || 0
                
                return (
                  <div
                    key={standing.Driver.driverId}
                    className="p-4 flex items-center gap-4 hover:bg-[#1a1a1a] transition-colors"
                    style={{ borderLeft: `4px solid ${teamColor}` }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-[#222] text-white'
                    }`}>
                      {standing.position}
                    </div>

                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#222] shrink-0">
                      <img 
                        src={getDriverHeadshot(driverNumber)}
                        alt={standing.Driver.familyName}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback.png.transform/1col/image.png'
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">
                        {standing.Driver.givenName} {standing.Driver.familyName}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {standing.Constructors?.[0]?.name || 'Unknown'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xl" style={{ color: teamColor }}>
                        {standing.points}
                      </div>
                      <div className="text-xs text-gray-500">
                        {standing.wins} {parseInt(standing.wins) === 1 ? 'Sieg' : 'Siege'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Constructors Standing */}
        {activeTab === 'constructors' && (
          <div className="bg-[#111] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#222] flex items-center justify-between">
              <h2 className="font-bold text-lg">Konstrukteurswertung 2025</h2>
              <span className="text-sm text-gray-500">{constructorStandings.length} Teams</span>
            </div>
            <div className="divide-y divide-[#222]">
              {constructorStandings.map((standing, index) => {
                const teamColor = getTeamColor(standing.Constructor.constructorId)
                
                return (
                  <div
                    key={standing.Constructor.constructorId}
                    className="p-4 flex items-center gap-4 hover:bg-[#1a1a1a] transition-colors"
                    style={{ borderLeft: `4px solid ${teamColor}` }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-[#222] text-white'
                    }`}>
                      {standing.position}
                    </div>

                    <div 
                      className="w-12 h-12 rounded-lg shrink-0"
                      style={{ backgroundColor: teamColor }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">
                        {standing.Constructor.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {standing.Constructor.nationality}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xl" style={{ color: teamColor }}>
                        {standing.points}
                      </div>
                      <div className="text-xs text-gray-500">
                        {standing.wins} {parseInt(standing.wins) === 1 ? 'Sieg' : 'Siege'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Last Race Results */}
        {activeTab === 'lastRace' && lastRace && (
          <div className="bg-[#111] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#222]">
              <div className="flex items-center gap-3 mb-2">
                <Flag className="w-6 h-6 text-[#E10600]" />
                <h2 className="font-bold text-xl">{lastRace.raceName}</h2>
              </div>
              <p className="text-gray-500">
                Runde {lastRace.round} • {format(new Date(lastRace.date), 'd. MMMM yyyy', { locale: de })}
              </p>
              <p className="text-xs text-green-500 mt-2">
                ✓ Punkte wurden automatisch berechnet
              </p>
            </div>
            <div className="divide-y divide-[#222]">
              {lastRace.Results?.map((result, index) => (
                <div
                  key={result.Driver.code}
                  className="p-4 flex items-center gap-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                    'bg-[#222] text-white'
                  }`}>
                    {result.position}
                  </div>

                  <div className="w-12 h-12 rounded-lg bg-[#222] flex items-center justify-center font-bold text-lg shrink-0">
                    {result.Driver.code}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">
                      {result.Driver.givenName} {result.Driver.familyName}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {result.Constructor.name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold text-lg ${parseFloat(result.points) > 0 ? 'text-[#00FF7F]' : 'text-gray-500'}`}>
                      +{result.points}
                    </div>
                    <div className="text-xs text-gray-500">
                      {result.status === 'Finished' ? 'Ziel' : result.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Daten von der <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noopener" className="text-[#E10600] hover:underline">Jolpica F1 API</a></p>
        </div>
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
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
    constructorId: string
  }
  points: string
  status: string
  FastestLap?: {
    rank: string
  }
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

export default function WMPage() {
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([])
  const [constructorStandings, setConstructorStandings] = useState<ConstructorStanding[]>([])
  const [lastRace, setLastRace] = useState<LastRace | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors' | 'lastRace'>('drivers')

  const fetchData = useCallback(async () => {
    try {
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
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh alle 5 Minuten
  useEffect(() => {
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [fetchData])

  const getTeamColor = (constructorId: string): string => {
    return TEAM_COLORS[constructorId] || '#666666'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      
      <main className="pt-20 pb-12 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-[#E10600]" />
              WM-Stand 2025
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Offizielle Fahrer- & Konstrukteurswertung
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                <Clock className="w-3 h-3 inline mr-1" />
                {format(lastUpdate, 'HH:mm', { locale: de })}
              </span>
            )}
            <button
              onClick={fetchData}
              className="p-2 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
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
            Fahrer
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
            Teams
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

        {/* Fahrer-WM */}
        {activeTab === 'drivers' && (
          <div className="bg-[#111] rounded-xl overflow-hidden border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-bold text-white">Fahrerwertung 2025</h2>
            </div>
            
            <div className="divide-y divide-gray-800/50">
              {driverStandings.map((driver, idx) => (
                <div key={driver.Driver.driverId} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a]">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {driver.position}
                    </span>
                    <div 
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: getTeamColor(driver.Constructors[0]?.constructorId) }}
                    />
                    <div>
                      <div className="font-medium text-white">
                        {driver.Driver.givenName} <span className="font-bold">{driver.Driver.familyName}</span>
                      </div>
                      <div className="text-xs text-gray-500">{driver.Constructors[0]?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-lg">{driver.points}</div>
                    <div className="text-xs text-gray-500">{driver.wins} Siege</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Konstrukteurs-WM */}
        {activeTab === 'constructors' && (
          <div className="bg-[#111] rounded-xl overflow-hidden border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-bold text-white">Konstrukteurswertung 2025</h2>
            </div>
            
            <div className="divide-y divide-gray-800/50">
              {constructorStandings.map((team, idx) => (
                <div key={team.Constructor.constructorId} className="flex items-center justify-between px-4 py-4 hover:bg-[#1a1a1a]">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {team.position}
                    </span>
                    <div 
                      className="w-1 h-10 rounded-full"
                      style={{ backgroundColor: getTeamColor(team.Constructor.constructorId) }}
                    />
                    <div className="font-bold text-white text-lg">{team.Constructor.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-xl">{team.points}</div>
                    <div className="text-xs text-gray-500">{team.wins} Siege</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Letztes Rennen */}
        {activeTab === 'lastRace' && lastRace && (
          <div className="bg-[#111] rounded-xl overflow-hidden border border-gray-800">
            <div className="p-4 border-b border-gray-800">
              <h2 className="font-bold text-white">{lastRace.raceName}</h2>
              <p className="text-sm text-gray-500">Runde {lastRace.round} • {format(new Date(lastRace.date), 'dd. MMMM yyyy', { locale: de })}</p>
            </div>
            
            <div className="divide-y divide-gray-800/50">
              {lastRace.Results?.slice(0, 10).map((result, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a]">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500 text-black' :
                      idx === 1 ? 'bg-gray-400 text-black' :
                      idx === 2 ? 'bg-orange-500 text-black' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      {result.position}
                    </span>
                    <div 
                      className="w-1 h-8 rounded-full"
                      style={{ backgroundColor: getTeamColor(result.Constructor.constructorId) }}
                    />
                    <div>
                      <div className="font-medium text-white">
                        {result.Driver.givenName} <span className="font-bold">{result.Driver.familyName}</span>
                        {result.FastestLap?.rank === '1' && (
                          <span className="ml-2 text-purple-400 text-xs">⚡ FL</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{result.Constructor.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white">+{result.points}</div>
                    <div className="text-xs text-gray-500">{result.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

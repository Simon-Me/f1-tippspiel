'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { 
  Trophy, 
  Users, 
  Zap, 
  Flag, 
  ChevronRight,
  Timer,
  Target,
  TrendingUp
} from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 racing-stripes opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#E10600] rounded-full blur-[200px] opacity-20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Traffic Lights */}
            <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-[#E10600] animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>

            <h1 className="font-[family-name:var(--font-orbitron)] text-5xl md:text-7xl font-black mb-6">
              <span className="text-white">F1</span>
              <span className="text-[#E10600]"> TIPPSPIEL</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10">
              Tippe auf Podiumsplätze, schnellste Runden und Pole Positions. 
              <span className="text-white font-semibold"> Kämpfe um den WM-Titel!</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {loading ? (
                <div className="w-8 h-8 border-4 border-[#E10600] border-t-transparent rounded-full tire-spin mx-auto" />
              ) : user ? (
                <Link
                  href="/dashboard"
                  className="btn-racing text-lg py-4 px-10 rounded-xl flex items-center justify-center gap-3 group"
                >
                  Zum Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="btn-racing text-lg py-4 px-10 rounded-xl flex items-center justify-center gap-3 group"
                  >
                    Jetzt starten
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/login"
                    className="bg-transparent border-2 border-[#2D2D2D] text-white text-lg py-4 px-10 rounded-xl hover:border-[#E10600] transition-colors"
                  >
                    Einloggen
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
            {[
              { icon: Users, label: 'Aktive Spieler', value: '1,247' },
              { icon: Flag, label: 'Rennen 2025', value: '24' },
              { icon: Target, label: 'Tipps abgegeben', value: '15.8K' },
              { icon: Trophy, label: 'Punkte vergeben', value: '89.2K' },
            ].map((stat, i) => (
              <div key={i} className="stat-box">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-[#E10600]" />
                <div className="stat-value text-2xl">{stat.value}</div>
                <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 carbon-fiber opacity-50" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-orbitron)] text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="text-[#E10600]">FEATURES</span> DIE ÜBERZEUGEN
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="race-card p-8 gradient-border">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E10600] to-[#FF6B6B] flex items-center justify-center mb-6">
                <Timer className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Tracking</h3>
              <p className="text-gray-400">
                Verfolge Rennen in Echtzeit mit Live-Positionen, Rundenzeiten und Pit-Stop-Daten direkt aus der OpenF1 API.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="race-card p-8 gradient-border">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#0093CC] flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Spannendes Punktesystem</h3>
              <p className="text-gray-400">
                Punkte für Podiumstipps, Pole Position, schnellste Runde und mehr. Je genauer, desto mehr Punkte!
              </p>
            </div>

            {/* Feature 3 */}
            <div className="race-card p-8 gradient-border">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00FF7F] to-[#229971] flex items-center justify-center mb-6">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live Rangliste</h3>
              <p className="text-gray-400">
                Sieh in Echtzeit, wo du stehst. Die Rangliste aktualisiert sich sofort nach jedem Rennen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Punktesystem Section */}
      <section className="py-20 bg-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-orbitron)] text-3xl md:text-4xl font-bold text-center mb-16">
            <span className="text-[#E10600]">PUNKTE</span>SYSTEM
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { place: '1.', points: 25, color: 'from-[#FFD700] to-[#FFA500]', label: 'Platz korrekt' },
              { place: '2.', points: 18, color: 'from-[#E8E8E8] to-[#A0A0A0]', label: 'Platz korrekt' },
              { place: '3.', points: 15, color: 'from-[#CD7F32] to-[#8B4513]', label: 'Platz korrekt' },
              { place: 'FL', points: 10, color: 'from-[#9333EA] to-[#7C3AED]', label: 'Fastest Lap' },
            ].map((item, i) => (
              <div key={i} className="race-card p-6 text-center">
                <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
                  <span className="font-[family-name:var(--font-orbitron)] font-bold text-xl text-white">
                    {item.place}
                  </span>
                </div>
                <div className="text-3xl font-black text-[#E10600] mb-1">+{item.points}</div>
                <div className="text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-12 race-card p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#E10600]" />
              Bonus-Punkte
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between py-2 border-b border-[#2D2D2D]">
                <span className="text-gray-400">Fahrer auf Podium (falscher Platz)</span>
                <span className="font-bold text-[#00FF7F]">+5</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#2D2D2D]">
                <span className="text-gray-400">Pole Position korrekt</span>
                <span className="font-bold text-[#00FF7F]">+8</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#2D2D2D]">
                <span className="text-gray-400">Perfektes Podium (1-2-3)</span>
                <span className="font-bold text-[#FFD700]">+20 Bonus</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 checkered-pattern opacity-10" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E10600] via-[#00D4FF] to-[#00FF7F]" />
        
        <div className="relative max-w-3xl mx-auto text-center px-4">
          <h2 className="font-[family-name:var(--font-orbitron)] text-3xl md:text-5xl font-bold mb-6">
            BEREIT FÜR DEN <span className="text-[#E10600]">START?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Melde dich jetzt an und tippe auf das nächste Rennen!
          </p>
          
          {!user && !loading && (
            <Link
              href="/register"
              className="btn-racing text-xl py-5 px-12 rounded-xl inline-flex items-center gap-3 group"
            >
              <Flag className="w-6 h-6" />
              Los geht&apos;s!
              <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[#2D2D2D] text-center text-gray-500 text-sm">
        <p>
          Made with 🏎️ by F1 Fans • Daten von{' '}
          <a href="https://openf1.org" target="_blank" rel="noopener" className="text-[#E10600] hover:underline">
            OpenF1 API
          </a>
        </p>
      </footer>
    </div>
  )
}

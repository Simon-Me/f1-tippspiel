'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Flag, 
  Trophy, 
  Calendar, 
  User, 
  LogOut, 
  Gauge,
  Menu,
  X,
  TrendingUp,
  History,
  ShoppingBag,
  Coins
} from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Avatar Component
  const Avatar = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => {
    const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
    const textSize = size === 'sm' ? 'text-sm' : 'text-lg'
    
    if (profile?.avatar_url) {
      return (
        <img 
          src={profile.avatar_url} 
          alt={profile.username} 
          className={`${sizeClass} rounded-full object-cover border-2 border-[#E10600]`}
        />
      )
    }
    
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-[#E10600] to-[#FF6B6B] flex items-center justify-center ${textSize} font-bold`}>
        {profile?.username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
      </div>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#2D2D2D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Flag className="w-8 h-8 text-[#E10600] group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E10600] rounded-full animate-ping" />
            </div>
            <span className="font-[family-name:var(--font-orbitron)] font-bold text-xl tracking-wider">
              F1<span className="text-[#E10600]">TIPP</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {user ? (
              <>
                <Link href="/dashboard" className="nav-link flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link href="/races" className="nav-link flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Tippen
                </Link>
                <Link href="/leaderboard" className="nav-link flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Rangliste
                </Link>
                <Link href="/history" className="nav-link flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Verlauf
                </Link>
                <Link href="/live" className="nav-link flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  WM
                </Link>
                <Link href="/shop" className="nav-link flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
                  <ShoppingBag className="w-4 h-4" />
                  Shop
                </Link>

                {/* User Menu */}
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-[#2D2D2D]">
                  <Link href="/profile" className="flex items-center gap-2 hover:text-[#E10600] transition-colors">
                    <Avatar size="sm" />
                    <span className="font-semibold">{profile?.username || 'User'}</span>
                  </Link>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[#E10600] font-bold">{profile?.total_points || 0} Pts</span>
                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      {profile?.coins || 0}
                    </span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="text-gray-400 hover:text-[#E10600] transition-colors"
                    title="Ausloggen"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="nav-link">
                  Login
                </Link>
                <Link href="/register" className="btn-racing text-sm py-2 px-6 rounded-lg">
                  Registrieren
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#2D2D2D]">
            {user ? (
              <div className="flex flex-col gap-4">
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-3 py-2 text-gray-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Gauge className="w-5 h-5" />
                  Dashboard
                </Link>
                <Link 
                  href="/races" 
                  className="flex items-center gap-3 py-2 text-gray-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Calendar className="w-5 h-5" />
                  Tippen
                </Link>
                <Link 
                  href="/leaderboard" 
                  className="flex items-center gap-3 py-2 text-gray-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Trophy className="w-5 h-5" />
                  Rangliste
                </Link>
                <Link 
                  href="/history" 
                  className="flex items-center gap-3 py-2 text-gray-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <History className="w-5 h-5" />
                  Verlauf
                </Link>
                <Link 
                  href="/live" 
                  className="flex items-center gap-3 py-2 text-gray-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <TrendingUp className="w-5 h-5" />
                  WM
                </Link>
                <Link 
                  href="/shop" 
                  className="flex items-center gap-3 py-2 text-yellow-400 hover:text-yellow-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Shop
                </Link>
                <div className="border-t border-[#2D2D2D] pt-4 mt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar size="md" />
                    <div>
                      <p className="font-semibold">{profile?.username}</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-[#E10600] font-bold">{profile?.total_points || 0} Pts</span>
                        <span className="text-yellow-400 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {profile?.coins || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      signOut()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center gap-2 text-gray-400 hover:text-[#E10600]"
                  >
                    <LogOut className="w-5 h-5" />
                    Ausloggen
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Link 
                  href="/login" 
                  className="py-2 text-gray-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="btn-racing text-center py-3 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Registrieren
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

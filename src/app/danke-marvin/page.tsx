'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { Heart, Sparkles, Crown, Trophy, Star, Coins } from 'lucide-react'
import Image from 'next/image'
import confetti from 'canvas-confetti'

export default function DankeMarvinPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [clickCount, setClickCount] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [showCoinReward, setShowCoinReward] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Lade gespeicherte Klicks
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`marvin_thanks_${user.id}`)
      if (saved) {
        setClickCount(parseInt(saved))
      }
    }
    
    // Lade globale Klicks
    loadTotalClicks()
  }, [user])

  async function loadTotalClicks() {
    const { data } = await supabase
      .from('marvin_thanks')
      .select('total_clicks')
      .single()
    
    if (data) {
      setTotalClicks(data.total_clicks)
    }
  }

  async function handleThankClick() {
    if (!user) return
    
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
    
    const newCount = clickCount + 1
    setClickCount(newCount)
    localStorage.setItem(`marvin_thanks_${user.id}`, newCount.toString())
    
    // Global counter erhöhen
    await supabase.rpc('increment_marvin_thanks')
    setTotalClicks(prev => prev + 1)
    
    // Alle 100 Klicks: 1 Münze!
    if (newCount % 100 === 0) {
      setShowCoinReward(true)
      
      // Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      })
      
      // Münze gutschreiben
      await supabase
        .from('profiles')
        .update({ coins: (profile?.coins || 0) + 1 })
        .eq('id', user.id)
      
      await refreshProfile()
      
      setTimeout(() => setShowCoinReward(false), 3000)
    }
  }

  const progressTo100 = clickCount % 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-amber-950/20 to-black text-white">
      <Navbar />
      
      {/* Goldene Partikel Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-500/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>
      
      <main className="pt-24 pb-16 px-4 max-w-4xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-yellow-500" />
            <Trophy className="w-8 h-8 text-yellow-400" />
            <Crown className="w-8 h-8 text-yellow-500" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Danke Marvin
          </h1>
          <p className="text-yellow-500/80 text-lg">Die Legende. Der Held. Der Tippspiel-Meister.</p>
        </div>

        {/* Statue/Bild */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            {/* Goldener Glow */}
            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
            
            <div className="relative bg-gradient-to-b from-yellow-900/30 to-black rounded-3xl p-8 border border-yellow-500/30">
              <Image
                src="/marvin-statue.png"
                alt="Statue für Marvin"
                width={300}
                height={400}
                className="mx-auto drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.3))' }}
              />
              
              {/* Plakette */}
              <div className="mt-6 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 rounded-lg p-4 text-center">
                <p className="text-black font-bold text-lg">MARVIN</p>
                <p className="text-black/70 text-sm">Tippspiel-Organisator seit Ewigkeiten</p>
              </div>
            </div>
          </div>
        </div>

        {/* Haupttext */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-2xl md:text-3xl text-white leading-relaxed mb-6">
            Vielen Dank Marvin, für die Organisation der Tippspiele. 
          </p>
          <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            Wir sind dir auf ewig dankbar! 🙏
          </p>
          <p className="text-gray-400 mt-6 text-lg">
            Jahrelang hast du alles von Hand organisiert, berechnet und verwaltet.
            <br />
            Diese App ist eine Hommage an deine unermüdliche Arbeit.
          </p>
        </div>

        {/* Danke Button */}
        <div className="text-center mb-8">
          <button
            onClick={handleThankClick}
            disabled={!user}
            className={`
              relative px-12 py-6 rounded-2xl text-2xl font-bold
              bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600
              hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-500
              text-black shadow-lg shadow-yellow-500/30
              transition-all duration-200
              ${isAnimating ? 'scale-95' : 'scale-100 hover:scale-105'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <span className="flex items-center gap-3">
              <Heart className={`w-8 h-8 ${isAnimating ? 'text-red-600 fill-red-600' : ''}`} />
              DANKE MARVIN!
              <Heart className={`w-8 h-8 ${isAnimating ? 'text-red-600 fill-red-600' : ''}`} />
            </span>
          </button>
          
          {!user && (
            <p className="text-gray-500 mt-3">Logge dich ein um Danke zu sagen!</p>
          )}
        </div>

        {/* Progress Bar für Münze */}
        {user && (
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Fortschritt zur Münze</span>
              <span className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-500" />
                {progressTo100}/100
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-300"
                style={{ width: `${progressTo100}%` }}
              />
            </div>
            <p className="text-center text-gray-500 text-sm mt-2">
              Du hast <span className="text-yellow-500 font-bold">{clickCount}x</span> Danke gesagt!
            </p>
          </div>
        )}

        {/* Münzen Belohnung Popup */}
        {showCoinReward && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-black/90 border-2 border-yellow-500 rounded-2xl p-8 text-center animate-bounce">
              <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-yellow-500 mb-2">+1 Münze!</p>
              <p className="text-gray-400">Marvin wäre stolz auf dich!</p>
            </div>
          </div>
        )}

        {/* Globale Stats */}
        <div className="text-center bg-zinc-900/50 rounded-2xl p-6 border border-yellow-500/20">
          <p className="text-gray-400 mb-2">Die Community hat insgesamt</p>
          <p className="text-5xl font-bold text-yellow-500 mb-2">
            {totalClicks.toLocaleString()}
          </p>
          <p className="text-gray-400">mal Danke gesagt! 💛</p>
        </div>

        {/* Stern-Dekoration */}
        <div className="flex justify-center gap-4 mt-12">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              className="w-8 h-8 text-yellow-500 fill-yellow-500"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </main>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}


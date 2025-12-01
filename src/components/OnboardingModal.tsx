'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Flag, Trophy, Calendar, Zap, Star, Crown, 
  ChevronRight, ChevronLeft, Check, Car, Coins, Target
} from 'lucide-react'

interface OnboardingModalProps {
  userId: string
  username: string
  onComplete: () => void
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Willkommen bei F1 TIPP! 🏎️',
    description: 'Tippe auf Rennen, sammle Punkte und werde der beste Tipper unter deinen Freunden!',
    icon: Flag,
    color: 'red'
  },
  {
    id: 'tips',
    title: 'So funktioniert\'s',
    description: 'Für jedes Rennen kannst du auf Qualifying, Sprint (wenn vorhanden) und das Rennen tippen.',
    icon: Target,
    color: 'blue',
    details: [
      { label: 'Qualifying', desc: 'Tippe die Pole Position', points: '+10 Punkte' },
      { label: 'Sprint', desc: 'Tippe das Podium', points: '+30 Punkte' },
      { label: 'Rennen', desc: 'Podium + Schnellste Runde', points: '+68 Punkte' },
    ]
  },
  {
    id: 'bonus',
    title: 'Bonus-Tipps',
    description: 'Verdiene Extra-Punkte mit Bonus-Vorhersagen für jedes Rennen!',
    icon: Star,
    color: 'orange',
    details: [
      { label: 'Safety Car?', desc: 'Ja/Nein tippen', points: '+5 Punkte' },
      { label: 'Rote Flagge?', desc: 'Ja/Nein tippen', points: '+10 Punkte' },
      { label: 'Regen?', desc: 'Ja/Nein tippen', points: '+8 Punkte' },
      { label: 'Erster DNF', desc: 'Wer fällt zuerst aus?', points: '+15 Punkte' },
    ]
  },
  {
    id: 'season',
    title: 'Saison-Tipps',
    description: 'Tippe vor dem ersten Rennen wer Weltmeister wird – bis zu 430 Bonus-Punkte!',
    icon: Crown,
    color: 'yellow',
    details: [
      { label: 'Fahrer-WM', desc: 'Top 3 der Saison', points: '+180 Punkte' },
      { label: 'Konstrukteurs-WM', desc: 'Top 3 Teams', points: '+140 Punkte' },
      { label: 'Bonus', desc: 'Most Wins, Most Poles...', points: '+110 Punkte' },
    ]
  },
  {
    id: 'coins',
    title: 'Shop & Coins',
    description: 'Deine Punkte werden zu Coins! Kaufe coole Autos für dein Profil.',
    icon: Coins,
    color: 'yellow',
    details: [
      { label: '10 Punkte', desc: '= 100 Coins', points: '' },
      { label: 'Startguthaben', desc: '500 Coins geschenkt!', points: '' },
      { label: 'Autos', desc: 'Zeig sie auf der Rennstrecke', points: '' },
    ]
  },
  {
    id: 'ready',
    title: 'Bereit? 🏁',
    description: 'Du hast 500 Coins Startguthaben. Schau dir den Shop an oder starte direkt mit Tippen!',
    icon: Trophy,
    color: 'green'
  }
]

export default function OnboardingModal({ userId, username, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  const step = STEPS[currentStep]
  const Icon = step.icon
  const isLast = currentStep === STEPS.length - 1
  const isFirst = currentStep === 0

  const handleNext = () => {
    if (isLast) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId)
    } catch (e) {
      console.error('Error completing onboarding:', e)
    }
    onComplete()
  }

  const handleSkip = async () => {
    await handleComplete()
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string, text: string, border: string }> = {
      red: { bg: 'bg-red-600/20', text: 'text-red-400', border: 'border-red-600' },
      blue: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600' },
      orange: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600' },
      yellow: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-600' },
      green: { bg: 'bg-green-600/20', text: 'text-green-400', border: 'border-green-600' },
      purple: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-600' },
    }
    return colors[color] || colors.red
  }

  const colors = getColorClasses(step.color)

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-[#111] rounded-2xl w-full max-w-md overflow-hidden border border-gray-800 shadow-2xl">
        {/* Progress */}
        <div className="h-1 bg-gray-800">
          <div 
            className="h-full bg-red-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center mx-auto mb-6`}>
            <Icon className={`w-8 h-8 ${colors.text}`} />
          </div>

          {/* Welcome with Name */}
          {currentStep === 0 && (
            <div className="text-center mb-4">
              <span className="text-gray-400">Hey</span>{' '}
              <span className="text-white font-bold">{username}</span>
              <span className="text-gray-400">!</span>
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-3">{step.title}</h2>
          
          {/* Description */}
          <p className="text-gray-400 text-center mb-6">{step.description}</p>

          {/* Details */}
          {step.details && (
            <div className="space-y-2 mb-6">
              {step.details.map((detail, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${colors.text.replace('text', 'bg')}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{detail.label}</div>
                    <div className="text-xs text-gray-500">{detail.desc}</div>
                  </div>
                  {detail.points && (
                    <div className={`text-sm font-bold ${colors.text}`}>{detail.points}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons on Last Step */}
          {isLast && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => { handleComplete(); router.push('/shop') }}
                className="py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Car className="w-4 h-4" />
                Zum Shop
              </button>
              <button
                onClick={() => { handleComplete(); router.push('/races') }}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Tippen
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {!isFirst ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-300 text-sm"
              >
                Überspringen
              </button>
            )}

            {/* Step Indicators */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? 'bg-red-500' : i < currentStep ? 'bg-red-800' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {!isLast ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex items-center gap-1 text-green-400 hover:text-green-300 font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Los geht's!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


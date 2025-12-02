'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Flag, Mail, Lock, User, AlertCircle, ChevronRight, Check } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben')
      return
    }

    if (username.length < 3) {
      setError('Username muss mindestens 3 Zeichen haben')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, username)
    
    if (error) {
      setError(error.message || 'Registrierung fehlgeschlagen')
      setLoading(false)
    } else {
      // Flag setzen damit Onboarding angezeigt wird
      sessionStorage.setItem('just_registered', 'true')
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-[#00FF7F] rounded-full flex items-center justify-center mb-6 glow-green">
            <Check className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Willkommen bei F1 Tippnasen!</h1>
          <p className="text-gray-400">Du wirst gleich weitergeleitet...</p>
          <div className="mt-6">
            <div className="w-8 h-8 border-4 border-[#E10600] border-t-transparent rounded-full tire-spin mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 racing-stripes opacity-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E10600] rounded-full blur-[200px] opacity-10" />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <Flag className="w-10 h-10 text-[#E10600]" />
          <span className="font-[family-name:var(--font-orbitron)] font-bold text-2xl">
            F1<span className="text-[#E10600]">TIPP</span>
          </span>
        </Link>

        {/* Form Card */}
        <div className="race-card p-8 gradient-border">
          <h1 className="text-2xl font-bold text-center mb-2">Account erstellen</h1>
          <p className="text-gray-400 text-center mb-8">Werde Teil der F1 Tippnasen Community</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-racing w-full pl-12"
                  placeholder="DeinUsername"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-racing w-full pl-12"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-racing w-full pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-racing w-full pl-12"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-racing w-full py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full tire-spin" />
              ) : (
                <>
                  Registrieren
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Schon einen Account?{' '}
            <Link href="/login" className="text-[#E10600] hover:underline font-semibold">
              Einloggen
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}



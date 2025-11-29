import type { Metadata } from 'next'
import { Titillium_Web, Orbitron } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

const titillium = Titillium_Web({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700', '900'],
  variable: '--font-titillium',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: 'F1 Tippspiel | Race Predictions',
  description: 'Tippe auf F1 Rennergebnisse und kämpfe um die Spitze der Rangliste!',
  keywords: 'F1, Formel 1, Tippspiel, Prediction, Racing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={`${titillium.variable} ${orbitron.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

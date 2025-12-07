'use client'

import { useEffect, useState, useCallback } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
  type: 'spark' | 'trail' | 'star'
}

interface Firework {
  id: number
  x: number
  targetY: number
  currentY: number
  exploded: boolean
  color: string
}

const COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Rot
  '#4ECDC4', // Türkis
  '#45B7D1', // Blau
  '#96E6A1', // Grün
  '#DDA0DD', // Lila
  '#F7DC6F', // Gelb
  '#FF69B4', // Pink
  '#00FF00', // Neon Grün
]

export default function Fireworks({ intensity = 'high' }: { intensity?: 'low' | 'medium' | 'high' }) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [fireworks, setFireworks] = useState<Firework[]>([])

  const launchInterval = intensity === 'high' ? 300 : intensity === 'medium' ? 600 : 1000

  const createExplosion = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = []
    const particleCount = intensity === 'high' ? 80 : intensity === 'medium' ? 50 : 30

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3
      const speed = 2 + Math.random() * 4
      const life = 60 + Math.random() * 40

      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.3 ? color : COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 2 + Math.random() * 3,
        life,
        maxLife: life,
        type: Math.random() > 0.7 ? 'star' : 'spark'
      })
    }

    // Glitter particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 2
      
      newParticles.push({
        id: Date.now() + particleCount + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#FFFFFF',
        size: 1,
        life: 80,
        maxLife: 80,
        type: 'trail'
      })
    }

    setParticles(prev => [...prev, ...newParticles])
  }, [intensity])

  // Launch fireworks
  useEffect(() => {
    const interval = setInterval(() => {
      const newFirework: Firework = {
        id: Date.now(),
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
        targetY: 100 + Math.random() * 200,
        currentY: typeof window !== 'undefined' ? window.innerHeight : 800,
        exploded: false,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      }
      setFireworks(prev => [...prev.slice(-10), newFirework])
    }, launchInterval)

    return () => clearInterval(interval)
  }, [launchInterval])

  // Animate fireworks
  useEffect(() => {
    const animate = () => {
      setFireworks(prev => {
        const updated = prev.map(fw => {
          if (fw.exploded) return fw
          
          const newY = fw.currentY - 8
          if (newY <= fw.targetY) {
            createExplosion(fw.x, fw.targetY, fw.color)
            return { ...fw, exploded: true }
          }
          return { ...fw, currentY: newY }
        }).filter(fw => !fw.exploded || Date.now() - fw.id < 100)

        return updated
      })

      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.05, // Gravity
            life: p.life - 1,
            size: p.size * 0.99
          }))
          .filter(p => p.life > 0)
      )
    }

    const animationId = setInterval(animate, 16)
    return () => clearInterval(animationId)
  }, [createExplosion])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Rising fireworks */}
      {fireworks.filter(fw => !fw.exploded).map(fw => (
        <div
          key={fw.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            left: fw.x,
            top: fw.currentY,
            backgroundColor: fw.color,
            boxShadow: `0 0 10px ${fw.color}, 0 10px 20px ${fw.color}`,
          }}
        />
      ))}

      {/* Particles */}
      <svg className="absolute inset-0 w-full h-full">
        {particles.map(p => {
          const opacity = p.life / p.maxLife
          
          if (p.type === 'star') {
            return (
              <text
                key={p.id}
                x={p.x}
                y={p.y}
                fill={p.color}
                fontSize={p.size * 3}
                opacity={opacity}
                style={{ filter: `drop-shadow(0 0 ${p.size}px ${p.color})` }}
              >
                ✦
              </text>
            )
          }
          
          return (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill={p.color}
              opacity={opacity}
              style={{ filter: `blur(${p.type === 'trail' ? 1 : 0}px)` }}
            />
          )
        })}
      </svg>
    </div>
  )
}


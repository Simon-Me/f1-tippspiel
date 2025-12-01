'use client'

interface ShopItemIconProps {
  itemId: string
  category: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Farbschema pro Team
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Red Bull Racing': { primary: '#1E41FF', secondary: '#FFD700' },
  'McLaren': { primary: '#FF8700', secondary: '#000000' },
  'Ferrari': { primary: '#DC0000', secondary: '#FFEB3B' },
  'Mercedes': { primary: '#00D2BE', secondary: '#000000' },
  'Aston Martin': { primary: '#006F62', secondary: '#CEDC00' },
  'default': { primary: '#E10600', secondary: '#FFFFFF' }
}

export default function ShopItemIcon({ itemId, category, size = 'md', className = '' }: ShopItemIconProps) {
  const sizeClass = size === 'sm' ? 'w-12 h-12' : size === 'md' ? 'w-16 h-16' : 'w-24 h-24'
  
  // Helm SVG
  const HelmetSVG = ({ color1, color2 }: { color1: string; color2: string }) => (
    <svg viewBox="0 0 64 64" className={`${sizeClass} ${className}`}>
      <defs>
        <linearGradient id={`helmet-${itemId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <path 
        d="M32 8C18 8 10 20 10 32c0 8 4 16 8 20h28c4-4 8-12 8-20C54 20 46 8 32 8z" 
        fill={`url(#helmet-${itemId})`}
      />
      <path 
        d="M14 36c0 0 8-2 18-2s18 2 18 2v8c0 4-8 6-18 6s-18-2-18-6V36z" 
        fill="rgba(0,0,0,0.3)"
      />
      <ellipse cx="32" cy="28" rx="16" ry="8" fill="rgba(255,255,255,0.2)" />
      <path d="M18 32h28v4H18z" fill="rgba(0,0,0,0.5)" />
    </svg>
  )

  // Auto SVG
  const CarSVG = ({ color1, color2 }: { color1: string; color2: string }) => (
    <svg viewBox="0 0 64 64" className={`${sizeClass} ${className}`}>
      <defs>
        <linearGradient id={`car-${itemId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      {/* Body */}
      <path 
        d="M8 32L16 24H48L56 32V38H8V32Z" 
        fill={`url(#car-${itemId})`}
      />
      {/* Front wing */}
      <rect x="4" y="34" width="8" height="4" fill={color1} />
      {/* Rear wing */}
      <rect x="52" y="34" width="8" height="4" fill={color1} />
      {/* Cockpit */}
      <ellipse cx="32" cy="28" rx="6" ry="4" fill="rgba(0,0,0,0.7)" />
      {/* Wheels */}
      <circle cx="18" cy="40" r="6" fill="#222" />
      <circle cx="18" cy="40" r="3" fill="#444" />
      <circle cx="46" cy="40" r="6" fill="#222" />
      <circle cx="46" cy="40" r="3" fill="#444" />
      {/* Halo */}
      <path d="M26 26C26 26 32 22 38 26" stroke="#333" strokeWidth="2" fill="none" />
    </svg>
  )

  // Trophäe SVG
  const TrophySVG = ({ color1 }: { color1: string }) => (
    <svg viewBox="0 0 64 64" className={`${sizeClass} ${className}`}>
      <defs>
        <linearGradient id={`trophy-${itemId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color1}88 />
        </linearGradient>
      </defs>
      {/* Cup */}
      <path 
        d="M20 12H44V28C44 36 38 44 32 44C26 44 20 36 20 28V12Z" 
        fill={`url(#trophy-${itemId})`}
      />
      {/* Handles */}
      <path d="M20 16H14C14 16 12 16 12 20C12 24 14 26 18 26H20" stroke={color1} strokeWidth="3" fill="none" />
      <path d="M44 16H50C50 16 52 16 52 20C52 24 50 26 46 26H44" stroke={color1} strokeWidth="3" fill="none" />
      {/* Base */}
      <rect x="28" y="44" width="8" height="6" fill={color1} />
      <rect x="22" y="50" width="20" height="4" rx="2" fill={color1} />
      {/* Shine */}
      <ellipse cx="28" cy="22" rx="4" ry="6" fill="rgba(255,255,255,0.3)" />
    </svg>
  )

  // Badge SVG
  const BadgeSVG = ({ color1, emoji }: { color1: string; emoji: string }) => (
    <svg viewBox="0 0 64 64" className={`${sizeClass} ${className}`}>
      <defs>
        <linearGradient id={`badge-${itemId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color1}99 />
        </linearGradient>
      </defs>
      {/* Shield shape */}
      <path 
        d="M32 6L52 14V30C52 44 42 54 32 58C22 54 12 44 12 30V14L32 6Z" 
        fill={`url(#badge-${itemId})`}
      />
      {/* Inner border */}
      <path 
        d="M32 10L48 16V30C48 42 40 50 32 54C24 50 16 42 16 30V16L32 10Z" 
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
      />
      {/* Emoji */}
      <text x="32" y="38" textAnchor="middle" fontSize="20">{emoji}</text>
    </svg>
  )

  // Special SVG
  const SpecialSVG = ({ color1, emoji }: { color1: string; emoji: string }) => (
    <svg viewBox="0 0 64 64" className={`${sizeClass} ${className}`}>
      <defs>
        <radialGradient id={`special-${itemId}`}>
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color1}44 />
        </radialGradient>
      </defs>
      {/* Star burst */}
      <polygon 
        points="32,4 38,24 58,24 42,38 48,58 32,46 16,58 22,38 6,24 26,24" 
        fill={`url(#special-${itemId})`}
      />
      {/* Center circle */}
      <circle cx="32" cy="32" r="12" fill="rgba(0,0,0,0.3)" />
      {/* Emoji */}
      <text x="32" y="38" textAnchor="middle" fontSize="16">{emoji}</text>
    </svg>
  )

  // Bestimme Farben basierend auf Item
  const getColors = () => {
    if (itemId.includes('verstappen') || itemId.includes('redbull')) return TEAM_COLORS['Red Bull Racing']
    if (itemId.includes('norris') || itemId.includes('mclaren')) return TEAM_COLORS['McLaren']
    if (itemId.includes('leclerc') || itemId.includes('hamilton') || itemId.includes('ferrari')) return TEAM_COLORS['Ferrari']
    if (itemId.includes('mercedes') || itemId.includes('russell')) return TEAM_COLORS['Mercedes']
    if (itemId.includes('alonso') || itemId.includes('aston')) return TEAM_COLORS['Aston Martin']
    if (itemId.includes('red')) return { primary: '#DC0000', secondary: '#FF6B6B' }
    if (itemId.includes('blue')) return { primary: '#1E41FF', secondary: '#6B9FFF' }
    if (itemId.includes('wdc')) return { primary: '#FFD700', secondary: '#FFA500' }
    if (itemId.includes('race_win')) return { primary: '#FFD700', secondary: '#C0C0C0' }
    return TEAM_COLORS['default']
  }

  const getBadgeEmoji = () => {
    if (itemId.includes('monaco')) return '🎰'
    if (itemId.includes('monza')) return '🇮🇹'
    if (itemId.includes('silverstone')) return '🇬🇧'
    if (itemId.includes('spa')) return '🇧🇪'
    if (itemId.includes('suzuka')) return '🇯🇵'
    return '🏁'
  }

  const getSpecialEmoji = () => {
    if (itemId.includes('drs')) return '⚡'
    if (itemId.includes('pitcrew')) return '🔧'
    if (itemId.includes('champagne')) return '🍾'
    if (itemId.includes('checkered')) return '🏁'
    return '✨'
  }

  const colors = getColors()

  switch (category) {
    case 'helmet':
      return <HelmetSVG color1={colors.primary} color2={colors.secondary} />
    case 'car':
      return <CarSVG color1={colors.primary} color2={colors.secondary} />
    case 'trophy':
      return <TrophySVG color1={itemId.includes('wdc') ? '#FFD700' : itemId.includes('race') ? '#FFD700' : '#C0C0C0'} />
    case 'badge':
      return <BadgeSVG color1={colors.primary} emoji={getBadgeEmoji()} />
    case 'special':
      return <SpecialSVG color1={colors.primary} emoji={getSpecialEmoji()} />
    default:
      return <div className={`${sizeClass} flex items-center justify-center text-4xl`}>🎁</div>
  }
}


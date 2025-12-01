'use client'

import { User } from 'lucide-react'

interface AvatarProps {
  url?: string | null
  username?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZES = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-3xl'
}

export default function Avatar({ url, username, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = SIZES[size]
  
  if (url) {
    return (
      <img 
        src={url} 
        alt={username || 'Avatar'} 
        className={`${sizeClass} rounded-full object-cover border-2 border-[#E10600] ${className}`}
      />
    )
  }
  
  if (username) {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-[#E10600] to-[#FF6B6B] flex items-center justify-center font-bold ${className}`}>
        {username.charAt(0).toUpperCase()}
      </div>
    )
  }
  
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center ${className}`}>
      <User className="w-1/2 h-1/2" />
    </div>
  )
}




import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Typen für die Datenbank
export interface Profile {
  id: string
  username: string
  avatar_url?: string
  total_points: number
  coins: number
  predictions_count?: number
  created_at: string
}

export interface ShopItem {
  id: string
  name: string
  description: string
  category: 'helmet' | 'car' | 'trophy' | 'badge' | 'special'
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image_url: string
  team?: string
  driver?: string
  available: boolean
}

export interface UserItem {
  id: string
  user_id: string
  item_id: string
  purchased_at: string
  equipped: boolean
}

export interface Bet {
  id: string
  user_id: string
  race_id: number
  bet_type: string
  selection: string
  amount: number
  odds: number
  status: 'pending' | 'won' | 'lost'
  winnings: number
  created_at: string
}

export interface Race {
  id: number
  season: number
  round: number
  race_name: string
  circuit_name: string
  country: string
  race_date: string
  quali_date?: string
  sprint_date?: string
  is_sprint: boolean
  status: 'upcoming' | 'qualifying' | 'racing' | 'finished'
}

export interface Driver {
  id: number
  driver_number: number
  full_name: string
  team_name: string
  team_color?: string
  country_code?: string
  headshot_url?: string
  active: boolean
}

export interface Prediction {
  id: string
  user_id: string
  race_id: number
  session_type?: 'qualifying' | 'sprint' | 'race'
  p1_driver?: number
  p2_driver?: number
  p3_driver?: number
  fastest_lap_driver?: number
  pole_driver?: number
  points_earned: number
  submitted_at: string
}

export interface RaceResult {
  id: number
  race_id: number
  position: number
  driver_id: number
  points_scored: number
  fastest_lap: boolean
  pole_position: boolean
}


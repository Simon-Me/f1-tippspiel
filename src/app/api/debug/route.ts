import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  // Hole alle Predictions
  const { data: predictions, error: predError } = await supabase
    .from('predictions')
    .select('id, user_id, race_id, session_type, points_earned, p1_driver, p2_driver, p3_driver, pole_driver')
    .limit(50)
  
  // Hole alle Profile
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, username, total_points, predictions_count, coins')
  
  // Hole Rennen
  const { data: races, error: raceError } = await supabase
    .from('races')
    .select('id, round, race_name, status')
    .eq('season', 2025)
    .order('round', { ascending: true })
  
  return NextResponse.json({
    predictions: {
      count: predictions?.length || 0,
      error: predError,
      sample: predictions?.slice(0, 10)
    },
    profiles: {
      count: profiles?.length || 0,
      error: profError,
      data: profiles
    },
    races: {
      count: races?.length || 0,
      error: raceError,
      sample: races?.slice(0, 5)
    }
  })
}


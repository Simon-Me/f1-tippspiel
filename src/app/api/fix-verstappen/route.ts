import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Dieser Endpunkt fixt alle Predictions wo Verstappen mit 33 statt 1 gespeichert wurde
export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const results = {
    p1_fixed: 0,
    p2_fixed: 0,
    p3_fixed: 0,
    pole_fixed: 0,
    fl_fixed: 0
  }

  // Fix P1
  const { data: p1Data } = await supabase
    .from('predictions')
    .update({ p1_driver: 1 })
    .eq('p1_driver', 33)
    .select()
  results.p1_fixed = p1Data?.length || 0

  // Fix P2
  const { data: p2Data } = await supabase
    .from('predictions')
    .update({ p2_driver: 1 })
    .eq('p2_driver', 33)
    .select()
  results.p2_fixed = p2Data?.length || 0

  // Fix P3
  const { data: p3Data } = await supabase
    .from('predictions')
    .update({ p3_driver: 1 })
    .eq('p3_driver', 33)
    .select()
  results.p3_fixed = p3Data?.length || 0

  // Fix Pole
  const { data: poleData } = await supabase
    .from('predictions')
    .update({ pole_driver: 1 })
    .eq('pole_driver', 33)
    .select()
  results.pole_fixed = poleData?.length || 0

  // Fix Fastest Lap
  const { data: flData } = await supabase
    .from('predictions')
    .update({ fastest_lap_driver: 1 })
    .eq('fastest_lap_driver', 33)
    .select()
  results.fl_fixed = flData?.length || 0

  const total = results.p1_fixed + results.p2_fixed + results.p3_fixed + results.pole_fixed + results.fl_fixed

  return NextResponse.json({
    success: true,
    message: `${total} Verstappen-Tipps von #33 auf #1 korrigiert`,
    details: results
  })
}


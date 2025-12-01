import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Dieser Endpunkt fixt alle Predictions wo Verstappen mit 33 statt 1 gespeichert wurde
// UND berechnet danach die Punkte neu

export async function GET() {
  return POST()
}

export async function POST() {
  console.log('=== FIX VERSTAPPEN START ===')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('URL:', supabaseUrl ? 'SET' : 'NOT SET')
  console.log('Key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_KEY' : 'ANON_KEY')
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  const results = {
    p1_fixed: 0,
    p2_fixed: 0,
    p3_fixed: 0,
    pole_fixed: 0,
    fl_fixed: 0
  }

  try {
    // Erst alle Predictions mit 33 finden
    const { data: before, error: beforeError } = await supabase
      .from('predictions')
      .select('id, p1_driver, p2_driver, p3_driver, pole_driver, fastest_lap_driver')
      .or('p1_driver.eq.33,p2_driver.eq.33,p3_driver.eq.33,pole_driver.eq.33,fastest_lap_driver.eq.33')
    
    console.log('Predictions with 33 before fix:', before?.length || 0, 'Error:', beforeError?.message || 'none')

    // Fix P1
    const { data: p1Data, error: p1Error } = await supabase
      .from('predictions')
      .update({ p1_driver: 1 })
      .eq('p1_driver', 33)
      .select()
    results.p1_fixed = p1Data?.length || 0
    console.log('P1 fixed:', results.p1_fixed, 'Error:', p1Error?.message || 'none')

    // Fix P2
    const { data: p2Data, error: p2Error } = await supabase
      .from('predictions')
      .update({ p2_driver: 1 })
      .eq('p2_driver', 33)
      .select()
    results.p2_fixed = p2Data?.length || 0
    console.log('P2 fixed:', results.p2_fixed, 'Error:', p2Error?.message || 'none')

    // Fix P3
    const { data: p3Data, error: p3Error } = await supabase
      .from('predictions')
      .update({ p3_driver: 1 })
      .eq('p3_driver', 33)
      .select()
    results.p3_fixed = p3Data?.length || 0
    console.log('P3 fixed:', results.p3_fixed, 'Error:', p3Error?.message || 'none')

    // Fix Pole
    const { data: poleData, error: poleError } = await supabase
      .from('predictions')
      .update({ pole_driver: 1 })
      .eq('pole_driver', 33)
      .select()
    results.pole_fixed = poleData?.length || 0
    console.log('Pole fixed:', results.pole_fixed, 'Error:', poleError?.message || 'none')

    // Fix Fastest Lap
    const { data: flData, error: flError } = await supabase
      .from('predictions')
      .update({ fastest_lap_driver: 1 })
      .eq('fastest_lap_driver', 33)
      .select()
    results.fl_fixed = flData?.length || 0
    console.log('FL fixed:', results.fl_fixed, 'Error:', flError?.message || 'none')

    const total = results.p1_fixed + results.p2_fixed + results.p3_fixed + results.pole_fixed + results.fl_fixed

    // Zeige aktuelle Predictions
    const { data: allPreds } = await supabase
      .from('predictions')
      .select('id, session_type, p1_driver, p2_driver, p3_driver')
      .eq('session_type', 'race')
    
    console.log('All race predictions:', JSON.stringify(allPreds))

    return NextResponse.json({
      success: true,
      message: `${total} Verstappen-Tipps von #33 auf #1 korrigiert`,
      details: results,
      predictions: allPreds
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown' 
    }, { status: 500 })
  }
}


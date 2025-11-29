import { NextResponse } from 'next/server'
import { syncDriversFromAPI } from '@/lib/sync-drivers'

export async function POST() {
  try {
    const result = await syncDriversFromAPI()
    
    if (result.success) {
      return NextResponse.json({
        message: `Erfolgreich ${result.driversCount} Fahrer synchronisiert`,
        driversCount: result.driversCount
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Sync fehlgeschlagen' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // GET zeigt nur Info an
  return NextResponse.json({
    info: 'POST an diese Route um Fahrer aus der OpenF1 API zu synchronisieren',
    endpoint: '/api/sync-drivers',
    method: 'POST'
  })
}



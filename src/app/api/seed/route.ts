import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

// Driver code to number mapping
const DRIVER_MAP: { [key: string]: number } = {
  'VER': 1,    // Max Verstappen
  'NOR': 4,    // Lando Norris
  'LEC': 16,   // Charles Leclerc
  'PIA': 81,   // Oscar Piastri
  'SAI': 55,   // Carlos Sainz
  'RUS': 63,   // George Russell
  'HAM': 44,   // Lewis Hamilton
  'ALO': 14,   // Fernando Alonso
  'STR': 18,   // Lance Stroll
  'HUL': 27,   // Nico Hulkenberg
  'ANT': 12,   // Kimi Antonelli
  'GAS': 10,   // Pierre Gasly
  'TSU': 22,   // Yuki Tsunoda
  'OCO': 31,   // Esteban Ocon
  'ALB': 23,   // Alexander Albon
  'BOT': 77,   // Valtteri Bottas
  'ZHO': 24,   // Guanyu Zhou
  'MAG': 20,   // Kevin Magnussen
  'LAW': 30,   // Liam Lawson
  'HAD': 6,    // Isack Hadjar
  'BEA': 87,   // Oliver Bearman
  'DOO': 7,    // Jack Doohan
  'COL': 43,   // Franco Colapinto
}

// Race name mapping from the JSON to database race names
const RACE_MAP: { [key: string]: number } = {
  'Louis Vuitton Australian GP': 3,
  'Heineken Chinese GP': 5,
  'Lenovo Japanese GP': 4,
  'Gulf Air Bahrain GP': 1,
  'STC Saudi Arabian GP': 2,
  'Crypto.com Miami GP': 6,
  'AWS GP del Emilia-Romagna': 7,
  'Tag Heuer GP de Monaco': 8,
  'Aramco GP de España': 9,
  'Pirelli GP du Canada': 10,
  'MSC Cruises Austrian GP': 11,
  'Qatar Airways British GP': 12,
  'Moët & Chandon Belgian GP': 13,
  'Lenovo Hungarian GP': 14,
  'Heineken Dutch GP': 15,
  'Pirelli GP d\'Italia': 16,
  'Qatar Airways Azerbaijan GP': 17,
  'Singapore Airlines GP': 18,
  'MSC Cruises United States GP': 19,
  'GP de la Ciudad de México': 20,
  'MSC Cruises GP de São Paulo': 21,
  'Heineken Las Vegas GP': 22,
  'Qatar Airways Qatar GP': 23,
  'Etihad Airways Abu Dhabi GP': 24,
}

// Users data
const USERS = [
  { username: 'Marshall-Marvin', email: 'marvin@tippspiel.local' },
  { username: 'Nürburgring-Nik', email: 'nik@tippspiel.local' },
  { username: 'Safetycar-Sophie', email: 'sophie@tippspiel.local' },
  { username: 'Pitstop-Pascal', email: 'pascal@tippspiel.local' },
  { username: 'Short-Shift-Simon', email: 'shortshiftsimon@tippspiel.local' },
  { username: 'VSC-Viola', email: 'viola@tippspiel.local' },
  { username: 'Jackman-Jannis', email: 'jannis@tippspiel.local' },
]

// All predictions data
const PREDICTIONS_DATA: { [gp: string]: { [user: string]: string | null } } = {
  'Louis Vuitton Australian GP': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'VER',
    'Safetycar-Sophie': 'RUS',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': null,
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Heineken Chinese GP': {
    'Marshall-Marvin': 'RUS',
    'Nürburgring-Nik': 'HAM',
    'Safetycar-Sophie': 'PIA',
    'Pitstop-Pascal': 'VER',
    'Short-Shift-Simon': 'PIA',
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Lenovo Japanese GP': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': 'NOR',
    'Safetycar-Sophie': 'PIA',
    'Pitstop-Pascal': 'NOR',
    'Short-Shift-Simon': 'PIA',
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Gulf Air Bahrain GP': {
    'Marshall-Marvin': 'PIA',
    'Nürburgring-Nik': 'RUS',
    'Safetycar-Sophie': 'NOR',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': 'PIA',
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'STC Saudi Arabian GP': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'PIA',
    'Safetycar-Sophie': 'HAM',
    'Pitstop-Pascal': 'PIA',
    'Short-Shift-Simon': 'PIA',
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Crypto.com Miami GP': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': 'NOR',
    'Safetycar-Sophie': 'PIA',
    'Pitstop-Pascal': 'NOR',
    'Short-Shift-Simon': 'RUS',
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'AWS GP del Emilia-Romagna': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'LEC',
    'Safetycar-Sophie': 'PIA',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': null,
    'VSC-Viola': 'NOR',
    'Jackman-Jannis': null
  },
  'Tag Heuer GP de Monaco': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': 'PIA',
    'Safetycar-Sophie': 'NOR',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': 'NOR',
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Aramco GP de España': {
    'Marshall-Marvin': 'RUS',
    'Nürburgring-Nik': 'VER',
    'Safetycar-Sophie': 'ANT',
    'Pitstop-Pascal': 'PIA',
    'Short-Shift-Simon': 'NOR',
    'VSC-Viola': 'LEC',
    'Jackman-Jannis': null
  },
  'Pirelli GP du Canada': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'PIA',
    'Safetycar-Sophie': 'NOR',
    'Pitstop-Pascal': 'PIA',
    'Short-Shift-Simon': 'NOR',
    'VSC-Viola': 'PIA',
    'Jackman-Jannis': null
  },
  'MSC Cruises Austrian GP': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'PIA',
    'Safetycar-Sophie': 'LEC',
    'Pitstop-Pascal': 'NOR',
    'Short-Shift-Simon': 'PIA',
    'VSC-Viola': 'LEC',
    'Jackman-Jannis': null
  },
  'Qatar Airways British GP': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'PIA',
    'Safetycar-Sophie': 'HUL',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': 'NOR',
    'VSC-Viola': null,
    'Jackman-Jannis': 'PIA'
  },
  'Moët & Chandon Belgian GP': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': 'PIA',
    'Safetycar-Sophie': 'NOR',
    'Pitstop-Pascal': 'PIA',
    'Short-Shift-Simon': 'NOR',
    'VSC-Viola': 'LEC',
    'Jackman-Jannis': null
  },
  'Lenovo Hungarian GP': {
    'Marshall-Marvin': 'PIA',
    'Nürburgring-Nik': 'RUS',
    'Safetycar-Sophie': null,
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': null,
    'VSC-Viola': 'LEC',
    'Jackman-Jannis': null
  },
  'Heineken Dutch GP': {
    'Marshall-Marvin': 'PIA',
    'Nürburgring-Nik': 'VER',
    'Safetycar-Sophie': 'HAD',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': 'RUS',
    'VSC-Viola': 'VER',
    'Jackman-Jannis': null
  },
  'Pirelli GP d\'Italia': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': 'NOR',
    'Safetycar-Sophie': 'PIA',
    'Pitstop-Pascal': 'VER',
    'Short-Shift-Simon': 'RUS',
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Qatar Airways Azerbaijan GP': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': 'RUS',
    'Safetycar-Sophie': 'SAI',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': null,
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Singapore Airlines GP': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': 'RUS',
    'Safetycar-Sophie': 'SAI',
    'Pitstop-Pascal': 'VER',
    'Short-Shift-Simon': 'RUS',
    'VSC-Viola': 'VER',
    'Jackman-Jannis': null
  },
  'MSC Cruises United States GP': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'LEC',
    'Safetycar-Sophie': 'VER',
    'Pitstop-Pascal': 'NOR',
    'Short-Shift-Simon': 'LEC',
    'VSC-Viola': 'VER',
    'Jackman-Jannis': null
  },
  'GP de la Ciudad de México': {
    'Marshall-Marvin': 'NOR',
    'Nürburgring-Nik': 'ANT',
    'Safetycar-Sophie': 'RUS',
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': 'NOR',
    'VSC-Viola': 'ANT',
    'Jackman-Jannis': null
  },
  'MSC Cruises GP de São Paulo': {
    'Marshall-Marvin': null,  // marked as "-"
    'Nürburgring-Nik': null,
    'Safetycar-Sophie': null,
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': 'VER',
    'VSC-Viola': 'RUS',
    'Jackman-Jannis': 'ANT'
  },
  'Heineken Las Vegas GP': {
    'Marshall-Marvin': 'VER',
    'Nürburgring-Nik': null,
    'Safetycar-Sophie': null,
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': null,
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Qatar Airways Qatar GP': {
    'Marshall-Marvin': null,  // marked as "-"
    'Nürburgring-Nik': null,
    'Safetycar-Sophie': null,
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': null,
    'VSC-Viola': null,
    'Jackman-Jannis': null
  },
  'Etihad Airways Abu Dhabi GP': {
    'Marshall-Marvin': null,
    'Nürburgring-Nik': null,
    'Safetycar-Sophie': null,
    'Pitstop-Pascal': null,
    'Short-Shift-Simon': null,
    'VSC-Viola': null,
    'Jackman-Jannis': null
  }
}

// Helper function to generate a fake UUID for virtual users
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export async function POST() {
  const results: { users: string[], predictions: number, errors: string[] } = {
    users: [],
    predictions: 0,
    errors: []
  }

  try {
    const userIdMap: { [username: string]: string } = {}
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    for (const user of USERS) {
      try {
        // Check if user already exists by looking for profile with that username
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, username')
          .eq('username', user.username)
          .maybeSingle()

        if (existingProfile) {
          userIdMap[user.username] = existingProfile.id
          results.users.push(`${user.username} (existing)`)
          continue
        }

        // Try to create via admin API if service role key is available
        if (hasServiceRole) {
          try {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
              email: user.email,
              password: 'test1234',
              email_confirm: true,
              user_metadata: { username: user.username }
            })

            if (!authError && authData.user) {
              userIdMap[user.username] = authData.user.id
              
              // Create profile
              await supabaseAdmin.from('profiles').upsert({
                id: authData.user.id,
                username: user.username,
                total_points: 0
              })
              
              results.users.push(`${user.username} (auth created)`)
              continue
            }
          } catch (adminError) {
            // Admin API might not be available, fall through to direct insert
          }
        }

        // Fallback: Create profile directly (user won't be able to login, but will appear in leaderboard)
        const newUserId = generateUUID()
        const { error: insertError } = await supabaseAdmin.from('profiles').insert({
          id: newUserId,
          username: user.username,
          total_points: 0
        })

        if (insertError) {
          results.errors.push(`Profile ${user.username}: ${insertError.message}`)
        } else {
          userIdMap[user.username] = newUserId
          results.users.push(`${user.username} (profile only)`)
        }

      } catch (e) {
        results.errors.push(`User ${user.username}: ${(e as Error).message}`)
      }
    }

    // Create predictions for each race
    for (const [gpName, predictions] of Object.entries(PREDICTIONS_DATA)) {
      const raceId = RACE_MAP[gpName]
      if (!raceId) {
        results.errors.push(`Unknown race: ${gpName}`)
        continue
      }

      for (const [username, driverCode] of Object.entries(predictions)) {
        if (!driverCode) continue

        const userId = userIdMap[username]
        if (!userId) {
          continue
        }

        const driverNumber = DRIVER_MAP[driverCode]
        if (!driverNumber) {
          results.errors.push(`Unknown driver code: ${driverCode}`)
          continue
        }

        try {
          // Check if prediction already exists
          const { data: existing } = await supabaseAdmin
            .from('predictions')
            .select('id')
            .eq('user_id', userId)
            .eq('race_id', raceId)
            .eq('session_type', 'race')
            .maybeSingle()

          if (existing) {
            // Update existing
            await supabaseAdmin
              .from('predictions')
              .update({ p1_driver: driverNumber })
              .eq('id', existing.id)
          } else {
            // Insert new
            const { error } = await supabaseAdmin.from('predictions').insert({
              user_id: userId,
              race_id: raceId,
              session_type: 'race',
              p1_driver: driverNumber,
              points_earned: 0
            })

            if (error) {
              results.errors.push(`Prediction ${username}/${gpName}: ${error.message}`)
            } else {
              results.predictions++
            }
          }
        } catch (e) {
          results.errors.push(`Prediction ${username}/${gpName}: ${(e as Error).message}`)
        }
      }
    }

    // Note: predictions_count column may not exist, so we skip updating it
    // The dashboard will calculate counts from the predictions table directly

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.users.length} users and ${results.predictions} predictions`,
      details: results,
      hasServiceRole
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      details: results
    }, { status: 500 })
  }
}

// Also allow GET for easy testing
export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed data. Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full user auth creation.',
    users: USERS.map(u => u.username),
    races: Object.keys(RACE_MAP),
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })
}

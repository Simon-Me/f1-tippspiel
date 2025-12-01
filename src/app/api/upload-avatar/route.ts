import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request: Request) {
  const logs: string[] = []
  
  try {
    logs.push(`[1] Start - URL: ${supabaseUrl ? 'SET' : 'MISSING'}, Key: ${supabaseKey ? (supabaseKey.startsWith('eyJ') ? 'ANON_KEY' : 'SERVICE_KEY') : 'MISSING'}`)
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error', logs }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    logs.push(`[2] FormData - userId: ${userId}, file: ${file?.name}, size: ${file?.size}`)

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId', logs }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileName = `${userId}-${Date.now()}.jpg`
    
    logs.push(`[3] Uploading to storage: ${fileName}`)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      logs.push(`[4] Storage ERROR: ${uploadError.message}`)
      return NextResponse.json({ error: 'Upload failed', details: uploadError.message, logs }, { status: 500 })
    }

    logs.push(`[4] Storage OK: ${JSON.stringify(uploadData)}`)

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const avatarUrl = urlData.publicUrl
    logs.push(`[5] Public URL: ${avatarUrl}`)

    // Check if profile exists first
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', userId)
      .single()
    
    logs.push(`[6] Existing profile: ${JSON.stringify(existingProfile)}, Error: ${selectError?.message || 'none'}`)

    // Update profile
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select()

    if (updateError) {
      logs.push(`[7] Update ERROR: ${updateError.message}, Code: ${updateError.code}`)
      return NextResponse.json({ error: 'Failed to update profile', details: updateError.message, logs }, { status: 500 })
    }

    logs.push(`[7] Update OK: ${JSON.stringify(updateData)}`)

    // Verify the update
    const { data: verifyData } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    
    logs.push(`[8] Verify: ${JSON.stringify(verifyData)}`)

    return NextResponse.json({ 
      success: true, 
      avatar_url: avatarUrl,
      logs
    })

  } catch (error) {
    logs.push(`[ERROR] ${error instanceof Error ? error.message : 'Unknown'}`)
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown', logs }, { status: 500 })
  }
}

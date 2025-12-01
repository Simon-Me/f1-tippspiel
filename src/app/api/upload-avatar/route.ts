import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request: Request) {
  try {
    // Check environment variables
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase env vars')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename (direkt im Bucket, nicht in Unterordner)
    const fileName = `${userId}-${Date.now()}.jpg`

    // Upload new avatar (upsert = überschreibt alte)
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message)
      return NextResponse.json({ 
        error: 'Upload failed', 
        details: uploadError.message 
      }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const avatarUrl = urlData.publicUrl

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError.message)
      return NextResponse.json({ 
        error: 'Failed to update profile',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      avatar_url: avatarUrl 
    })

  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

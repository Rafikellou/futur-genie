import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthMeta } from '@/lib/auth-meta'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    
    // Verify the user token and get user info
    const { data: { user }, error: userError } = await admin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const meta = getAuthMeta({ user } as any)
    if (meta.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied - teachers only' }, { status: 403 })
    }

    // Get teacher's classroom using service role
    const { data: userProfile, error: profileError } = await admin
      .from('users')
      .select('classroom_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 })
    }

    if (!userProfile?.classroom_id) {
      return NextResponse.json({ classrooms: [] }, { status: 200 })
    }

    // Get classroom details
    const { data: classroom, error: classroomError } = await admin
      .from('classrooms')
      .select('*')
      .eq('id', userProfile.classroom_id)
      .single()

    if (classroomError) {
      return NextResponse.json({ error: 'Failed to get classroom' }, { status: 500 })
    }

    return NextResponse.json({ classrooms: [classroom] }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error teacher/classrooms:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

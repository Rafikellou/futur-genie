import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthMeta } from '@/lib/auth-meta'

export async function GET(req: NextRequest) {
  console.log('=== API teacher/students called ===')
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Environment check:', {
      hasUrl: !!url,
      hasServiceRole: !!serviceRoleKey,
      hasAnonKey: !!anonKey
    })
    
    if (!url || !serviceRoleKey || !anonKey) {
      console.error('Missing environment variables:', { url: !!url, serviceRoleKey: !!serviceRoleKey, anonKey: !!anonKey })
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    console.log('Auth header present:', !!authHeader)
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Invalid auth header format')
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log('Token extracted, length:', token.length)
    
    // Create clients
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    const regularClient = createClient(url, anonKey, { auth: { persistSession: false } })
    
    // Verify the user token
    console.log('Verifying user token...')
    const { data: { user }, error: userError } = await regularClient.auth.getUser(token)
    
    if (userError) {
      console.error('User verification error:', userError)
      return NextResponse.json({ error: 'Invalid token: ' + userError.message }, { status: 401 })
    }
    
    if (!user) {
      console.error('No user found from token')
      return NextResponse.json({ error: 'No user found' }, { status: 401 })
    }
    
    console.log('User verified:', { id: user.id, email: user.email })

    const meta = getAuthMeta({ user } as any)
    console.log('User meta:', meta)
    
    if (meta.role !== 'TEACHER') {
      console.error('Access denied - not a teacher:', meta.role)
      return NextResponse.json({ error: 'Access denied - teachers only' }, { status: 403 })
    }

    // Get teacher's classroom
    console.log('Getting teacher profile...')
    const { data: userProfile, error: profileError } = await admin
      .from('users')
      .select('classroom_id, school_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get user profile: ' + profileError.message }, { status: 500 })
    }
    
    console.log('Teacher profile:', userProfile)

    if (!userProfile?.classroom_id) {
      console.log('No classroom assigned, returning empty array')
      return NextResponse.json({ students: [] }, { status: 200 })
    }

    // Get students (parents) in teacher's classroom
    console.log('Getting students for classroom:', userProfile.classroom_id)
    const { data: students, error: studentsError } = await admin
      .from('users')
      .select('id, email, full_name, child_first_name, created_at')
      .eq('role', 'PARENT')
      .eq('classroom_id', userProfile.classroom_id)
      .order('created_at', { ascending: false })

    if (studentsError) {
      console.error('Students query error:', studentsError)
      return NextResponse.json({ error: 'Failed to get students: ' + studentsError.message }, { status: 500 })
    }
    
    console.log('Students found:', students?.length || 0)
    return NextResponse.json({ students: students || [] }, { status: 200 })
    
  } catch (e: any) {
    console.error('Unexpected error in teacher/students:', e)
    console.error('Error stack:', e.stack)
    return NextResponse.json({ 
      error: 'Unexpected error: ' + (e.message || 'Unknown error'),
      details: e.stack 
    }, { status: 500 })
  }
}

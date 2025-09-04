import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !serviceRoleKey || !anonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Use anon client for token verification
    const anonClient = createClient(url, anonKey)
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Extract user metadata
    const userRole = user.app_metadata?.user_role
    const classroomId = user.app_metadata?.classroom_id
    const schoolId = user.app_metadata?.school_id

    if (userRole !== 'TEACHER' || !classroomId || !schoolId) {
      return NextResponse.json({ error: 'Access denied: Teacher role and classroom assignment required' }, { status: 403 })
    }

    // Use service role client for database operations
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // Check if an active parent invitation already exists for this classroom
    const { data: existingInvitation } = await admin
      .from('invitation_links')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('intended_role', 'PARENT')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      return NextResponse.json({ invitation: existingInvitation }, { status: 200 })
    }

    // Create a new invitation link if none exists
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // Valid for 1 year

    const { data: newInvitation, error: createError } = await admin
      .from('invitation_links')
      .insert({
        token: crypto.randomUUID(),
        school_id: schoolId,
        classroom_id: classroomId,
        intended_role: 'PARENT',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating invitation:', createError)
      return NextResponse.json({ error: 'Failed to create invitation link' }, { status: 500 })
    }

    return NextResponse.json({ invitation: newInvitation }, { status: 201 })

  } catch (error: any) {
    console.error('Unexpected error in teacher invitation API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

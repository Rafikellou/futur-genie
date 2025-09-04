import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWT } from '@/lib/auth-meta'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const claims = verifyJWT(token)
    
    if (!claims || !claims.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (claims.role !== 'PARENT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const submissionData = await req.json()
    console.log('Creating submission for user:', claims.userId, 'quiz:', submissionData.quiz_id)

    // Validate that the parent_id matches the authenticated user
    if (submissionData.parent_id !== claims.userId) {
      return NextResponse.json({ error: 'Parent ID mismatch' }, { status: 403 })
    }

    // Validate that school_id and classroom_id match the user's claims
    if (submissionData.school_id !== claims.schoolId || submissionData.classroom_id !== claims.classroomId) {
      return NextResponse.json({ error: 'School or classroom ID mismatch' }, { status: 403 })
    }

    // Create the submission
    const { data, error } = await admin
      .from('submissions')
      .insert(submissionData)
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
    }

    console.log('Successfully created submission:', data.id)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in submissions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

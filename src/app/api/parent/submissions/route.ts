import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWT } from '@/lib/auth-meta'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const claims = verifyJWT(token)
    
    if (!claims || claims.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // Get submissions for this parent
    const { data: submissions, error } = await admin
      .from('submissions')
      .select(`
        id,
        quiz_id,
        parent_id,
        answers,
        score,
        total_questions,
        created_at,
        quiz:quizzes(
          id,
          title,
          description,
          level
        )
      `)
      .eq('parent_id', claims.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching parent submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    return NextResponse.json({ submissions: submissions || [] })
  } catch (error) {
    console.error('Unexpected error in parent/submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

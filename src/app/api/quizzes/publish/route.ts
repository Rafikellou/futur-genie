import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthMeta } from '@/lib/auth-meta'

export async function PATCH(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !serviceRoleKey || !anonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Get current user from auth header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create clients
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    const regularClient = createClient(url, anonKey, { auth: { persistSession: false } })
    
    // Verify the user token
    const { data: { user }, error: userError } = await regularClient.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const meta = getAuthMeta({ user } as any)
    if (meta.role !== 'TEACHER' && meta.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Access denied - teachers and directors only' }, { status: 403 })
    }

    // Get quiz ID and published status from request body
    const { quizId, isPublished } = await req.json()

    if (!quizId || typeof isPublished !== 'boolean') {
      return NextResponse.json({ error: 'Quiz ID and published status are required' }, { status: 400 })
    }

    // Update quiz publication status using service role to bypass RLS
    const { data: quiz, error: updateError } = await admin
      .from('quizzes')
      .update({ is_published: isPublished })
      .eq('id', quizId)
      .select()
      .single()

    if (updateError) {
      console.error('Quiz publication error:', updateError)
      return NextResponse.json({ error: 'Failed to update quiz: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ quiz }, { status: 200 })
  } catch (e: any) {
    console.error('Unexpected error in quizzes/publish:', e)
    return NextResponse.json({ 
      error: 'Unexpected error: ' + (e.message || 'Unknown error')
    }, { status: 500 })
  }
}

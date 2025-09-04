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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const quizId = resolvedParams.id
    console.log('Fetching quiz with ID:', quizId, 'for user:', claims.userId)

    // Fetch quiz data
    const { data: quiz, error: quizError } = await admin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('is_published', true)
      .single()

    if (quizError) {
      console.error('Error fetching quiz:', quizError)
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Fetch quiz items
    const { data: items, error: itemsError } = await admin
      .from('quiz_items')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index')

    if (itemsError) {
      console.error('Error fetching quiz items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch quiz items' }, { status: 500 })
    }

    const quizWithItems = {
      ...quiz,
      items: items || []
    }

    console.log('Successfully fetched quiz:', quizWithItems.title, 'with', items?.length || 0, 'items')
    
    return NextResponse.json(quizWithItems)

  } catch (error) {
    console.error('Error in quiz API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

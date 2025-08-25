import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    const { data, error } = await admin
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Admin get user error:', error)
      return NextResponse.json({ error: 'Failed to fetch user profile', details: error }, { status: 500 })
    }

    return NextResponse.json({ user: data }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error fetching user profile:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, email, role, school_id, full_name } = body || {}

    if (!id || !role) {
      return NextResponse.json({ error: 'Missing required fields (id, role)' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    const { data, error } = await admin
      .from('users')
      .insert({ id, email: email ?? null, role, school_id: school_id ?? null, full_name: full_name ?? null })
      .select()
      .single()

    if (error) {
      console.error('Admin create user error:', error)
      return NextResponse.json({ error: 'Failed to create user profile', details: error }, { status: 500 })
    }

    return NextResponse.json({ user: data }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error creating user profile:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

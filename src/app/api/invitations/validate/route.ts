import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // Use service role to bypass RLS and validate invitation token
    const { data, error } = await admin
      .from('invitation_links')
      .select(`
        *,
        school:schools(id, name),
        classroom:classrooms(id, name, grade)
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid or expired invitation token' }, { status: 410 })
    }

    return NextResponse.json({ invitation: data }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error invitations/validate:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

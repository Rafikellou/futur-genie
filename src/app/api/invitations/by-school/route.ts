import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { schoolId } = await req.json()
    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // Use service role to bypass RLS recursion on joins
    const { data, error } = await admin
      .from('invitation_links')
      .select(`
        *,
        classroom:classrooms(id, name, grade),
        creator:users!created_by(id, full_name)
      `)
      .eq('school_id', schoolId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Admin invitations by school error:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations', details: error }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] }, { status: 200 })
  } catch (e) {
    console.error('Unexpected error invitations/by-school:', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

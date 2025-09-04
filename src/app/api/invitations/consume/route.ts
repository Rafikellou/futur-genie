import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Role } from '@/lib/auth-meta'

// POST /api/invitations/consume
// Body: { token, email, password, full_name, role }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const { token, email, password, full_name, role } = body as {
      token?: string
      email?: string
      password?: string
      full_name?: string
      role?: Role
    }

    // Basic validation
    if (!token || !email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // For MVP, invitations are for TEACHER or PARENT (classroom-scoped)
    if (role !== 'TEACHER' && role !== 'PARENT') {
      return NextResponse.json({ error: 'Invalid role for invitation flow' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server is not configured for admin operations' }, { status: 500 })
    }

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

    // 1) Validate invitation token (not expired, not used)
    const { data: invite, error: inviteErr } = await admin
      .from('invitation_links')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single()

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation token' }, { status: 410 })
    }

    // 2) Create Auth user (email confirmed to avoid email flow for MVP)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: 409 })
    }

    const newUserId = created.user.id

    // 3) Set app_metadata with role + school/classroom from the invite
    // Use the intended_role from the invitation instead of the role from the request
    const { error: metaErr } = await admin.auth.admin.updateUserById(newUserId, {
      app_metadata: {
        user_role: invite.intended_role,
        school_id: invite.school_id,
        classroom_id: invite.classroom_id,
      },
    })

    if (metaErr) {
      // Cleanup the auth user if we cannot set claims
      await admin.auth.admin.deleteUser(newUserId).catch(() => {})
      return NextResponse.json({ error: metaErr.message || 'Failed to set app metadata' }, { status: 500 })
    }

    // 4) Upsert into public.users
    const upsertPayload = {
      id: newUserId,
      role: invite.intended_role,
      school_id: invite.school_id,
      classroom_id: invite.classroom_id,
      email,
      full_name,
    }

    const { data: userRow, error: upsertErr } = await admin
      .from('users')
      .upsert(upsertPayload as any, { onConflict: 'id' })
      .select('*')
      .single()

    if (upsertErr || !userRow) {
      // Rollback auth user if DB row cannot be created (to keep systems consistent)
      await admin.auth.admin.deleteUser(newUserId).catch(() => {})
      return NextResponse.json({ error: upsertErr?.message || 'Failed to persist user profile' }, { status: 500 })
    }

    // 5) Mark invitation as used
    const { error: usedErr } = await admin
      .from('invitation_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (usedErr) {
      // Not fatal for the user creation, but surface it to caller
      return NextResponse.json({
        warning: 'User created but failed to mark invite as used',
        user: userRow,
      }, { status: 201 })
    }

    return NextResponse.json({ user: userRow }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

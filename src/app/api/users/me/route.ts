import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  // profil SQL (protégé par RLS p_users_self_select)
  const { data: profile, error } = await supabase
    .from('users').select('*').eq('id', user.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const role = user.app_metadata?.user_role ?? profile?.role ?? null;
  const schoolId = user.app_metadata?.school_id ?? profile?.school_id ?? null;
  const classroomId = user.app_metadata?.classroom_id ?? profile?.classroom_id ?? null;

  // ✅ Pas d'erreur si Directeur (classroomId peut être null)
  return NextResponse.json({
    id: user.id,
    email: profile?.email ?? user.email,
    fullName: profile?.full_name ?? null,
    role,
    schoolId,
    classroomId // peut être null si DIRECTOR
  });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // nécessaire pour app_metadata
);

export async function POST(req: Request) {
  try {
    const { email, password, fullName, schoolName } = await req.json();

    // 1) créer l'école
    const { data: school, error: es } = await supabaseAdmin
      .from('schools').insert({ name: schoolName }).select('id').single();
    if (es) throw es;

    // 2) créer l'utilisateur Auth
    const { data: signUp, error: eu } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true
    });
    if (eu) throw eu;
    const user = signUp.user!;

    // 3) app_metadata (rôle/portée RLS)
    const { error: em } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { user_role: 'DIRECTOR', school_id: school.id }
    });
    if (em) throw em;

    // 4) upsert dans public.users
    const { error: ep } = await supabaseAdmin.from('users').upsert({
      id: user.id,
      role: 'DIRECTOR',
      school_id: school.id,
      email,
      full_name: fullName
    });
    if (ep) throw ep;

    return NextResponse.json({ ok: true, needRefresh: true });
  } catch (e: any) {
    console.error('signup-director failed', e);
    return NextResponse.json({ error: e.message ?? 'failed' }, { status: 500 });
  }
}

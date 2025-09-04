import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function updateUserClassroom(userId: string, classroomId: string) {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  
  const { error } = await supabase
    .from('users')
    .update({ classroom_id: classroomId })
    .eq('id', userId)
    
  if (error) {
    throw new Error(error.message)
  }
}

export async function removeUserFromClassroom(userId: string) {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
  
  const { error } = await supabase
    .from('users')
    .update({ classroom_id: null })
    .eq('id', userId)
    
  if (error) {
    throw new Error(error.message)
  }
}

import { PostgrestError } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

/**
 * Handles Supabase Postgrest errors, showing a user-friendly toast message.
 * @param error The PostgrestError from a Supabase query.
 * @returns `true` if an error was handled, `false` otherwise.
 */
export const handleSupabaseError = (error: PostgrestError | null): boolean => {
  if (!error) {
    return false;
  }

  // PGRST116: RLS violation (Supabase)
  // 42501: permission denied (PostgreSQL)
  if (error.code === 'PGRST116' || error.code === '42501') {
    toast.error("Action non autorisée pour votre rôle ou votre classe.");
  } else {
    toast.error(`Oups… Une erreur est survenue: ${error.message}`);
  }

  return true;
};

import { supabase } from './supabase'
import { UserRole } from '@/types/database'
// user profile creation now handled via server API route to bypass RLS

export interface SignUpData {
  email: string
  password: string
  role: UserRole
  school_id?: string
  full_name?: string
  schoolName?: string
  school_data?: {
    name: string
    address?: string
    postal_code?: string
    city?: string
    phone?: string
    email?: string
  }
  invitation_token?: string
  // Optional: collected during parent signup for onboarding the child later
  child_first_name?: string
}

export interface AuthUser {
  id: string
  email: string | null
  role: UserRole
  school_id: string | null
  classroom_id?: string | null
  full_name: string | null
}

/**
 * Service d'authentification centralisé inspiré de Petit Génie
 * Gère la création atomique des utilisateurs et des écoles
 */
export class AuthService {
  /**
   * Inscription avec gestion automatique des écoles pour les directeurs
   */
  static async signUp(signUpData: SignUpData): Promise<AuthUser> {
    const { email, password, role, school_data, invitation_token, ...userData } = signUpData

    try {
      // Invitation-based signup for TEACHER or PARENT: handle entirely server-side
      if (invitation_token && (role === 'TEACHER' || role === 'PARENT')) {
        // 0. Create Auth user + app_metadata + public.users via server route
        const res = await fetch('/api/invitations/consume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: invitation_token,
            email,
            password,
            full_name: userData.full_name,
            child_first_name: userData.child_first_name,
            role,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Failed to consume invitation')
        }
        const { user: userProfile } = await res.json()

        // 1. Sign in to establish a session with correct JWT (app_metadata claims)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) throw signInErr

        return {
          id: userProfile.id,
          email: userProfile.email ?? null,
          role: userProfile.role,
          school_id: userProfile.school_id ?? null,
          full_name: userProfile.full_name ?? null,
        }
      }

      // 1. Créer l'utilisateur Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Échec de la création du compte utilisateur')

      let finalSchoolId = userData.school_id

      // 2. Pour les directeurs, créer l'école d'abord si nécessaire
      if (role === 'DIRECTOR' && (school_data?.name || signUpData.schoolName)) {
        try {
          const schoolName = school_data?.name || signUpData.schoolName!
          const res = await fetch('/api/schools/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: schoolName }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err?.error || 'Failed to create school')
          }
          const { school } = await res.json()
          finalSchoolId = school.id as string
        } catch (schoolError) {
          // Si la création d'école échoue, supprimer l'utilisateur auth créé
          try {
            await supabase.auth.admin.deleteUser(authData.user.id)
          } catch (deleteError) {
            console.warn('Impossible de supprimer l\'utilisateur auth:', deleteError)
            // Continuer avec l'erreur principale
          }
          throw new Error(`Erreur lors de la création de l'école: ${schoolError}`)
        }
      }

      // 3. Créer le profil utilisateur avec le school_id correct (via API server)
      try {
        const res = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: authData.user.id,
            email,
            role,
            school_id: finalSchoolId ?? null,
            full_name: userData.full_name ?? null,
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Failed to create user profile')
        }
        const { user: userProfile } = await res.json()

        // 4. Gérer le token d'invitation si présent
        if (invitation_token) {
          await this.handleInvitationToken(invitation_token)
        }

        return {
          id: userProfile.id,
          email: userProfile.email ?? null,
          role: userProfile.role,
          school_id: userProfile.school_id ?? null,
          full_name: userProfile.full_name ?? null,
        }
      } catch (profileError) {
        // Si la création du profil échoue, nettoyer l'utilisateur auth
        try {
          await supabase.auth.admin.deleteUser(authData.user.id)
        } catch (deleteError) {
          console.warn('Impossible de supprimer l\'utilisateur auth:', deleteError)
          // Continuer avec l'erreur principale
        }
        throw new Error(`Erreur lors de la création du profil: ${profileError}`)
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error)
      throw error
    }
  }

  /**
   * Connexion standard
   */
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  /**
   * Déconnexion
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  /**
   * Gérer les tokens d'invitation
   */
  private static async handleInvitationToken(token: string) {
    try {
      const { getInvitationLinkByToken, markInvitationLinkAsUsed } = await import('./database')
      
      const invitation = await getInvitationLinkByToken(token)
      if (invitation?.id) {
        await markInvitationLinkAsUsed(invitation.id)
      }
    } catch (error) {
      console.warn('Erreur lors du traitement du token d\'invitation:', error)
      // Ne pas faire échouer l'inscription pour un problème d'invitation
    }
  }

  /**
   * Obtenir le profil utilisateur actuel
   */
  static async getCurrentUserProfile(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Utiliser directement Supabase client pour éviter les problèmes d'auth avec l'API
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, email, role, school_id, full_name')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erreur lors de la récupération du profil:', error)
        return null
      }

      if (!profile) {
        return null
      }

      return {
        id: (profile as any).id,
        email: (profile as any).email ?? user.email ?? null,
        role: (profile as any).role,
        school_id: (profile as any).school_id ?? null,
        full_name: (profile as any).full_name ?? null,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error)
      return null
    }
  }

  /**
   * Vérifier si un utilisateur est un nouveau directeur sans école
   */
  static isNewDirector(user: AuthUser | null): boolean {
    return user?.role === 'DIRECTOR' && !user.school_id
  }

  /**
   * Créer une école pour un directeur existant (fallback)
   */
  static async createSchoolForDirector(directorId: string, schoolName: string): Promise<void> {
    try {
      const { updateUser } = await import('./database')
      
      // Créer l'école
      const res = await fetch('/api/schools/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: schoolName }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to create school')
      }
      const { school } = await res.json()
      
      // Mettre à jour l'utilisateur avec le school_id
      await updateUser(directorId, { school_id: school.id })
    } catch (error) {
      console.error('Erreur lors de la création d\'école pour le directeur:', error)
      throw error
    }
  }
}

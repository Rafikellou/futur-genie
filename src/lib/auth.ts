import { supabase } from './supabase'
import { UserRole } from '@/types/database'
import { createSchool, createUser } from './database'

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
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  school_id: string | null
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
          const school = await createSchool(schoolName)
          finalSchoolId = school.id
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

      // 3. Créer le profil utilisateur avec le school_id correct
      try {
        const userProfile = await createUser({
          id: authData.user.id,
          email: email,
          role: role,
          school_id: finalSchoolId,
          full_name: userData.full_name || null,
        })

        // 4. Gérer le token d'invitation si présent
        if (invitation_token) {
          await this.handleInvitationToken(invitation_token)
        }

        return {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
          school_id: userProfile.school_id,
          full_name: userProfile.full_name,
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

      const { getUserById } = await import('./database')
      const profile = await getUserById(user.id)

      return {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        school_id: profile.school_id,
        full_name: profile.full_name,
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
      const school = await createSchool(schoolName)
      
      // Mettre à jour l'utilisateur avec le school_id
      await updateUser(directorId, { school_id: school.id })
    } catch (error) {
      console.error('Erreur lors de la création d\'école pour le directeur:', error)
      throw error
    }
  }
}

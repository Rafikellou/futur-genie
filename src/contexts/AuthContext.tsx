'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserRole } from '@/types/database'
import { AuthService, AuthUser, SignUpData } from '@/lib/auth'
import { getAuthMeta } from '@/lib/auth-meta'

interface AuthClaims {
  userId: string
  role: UserRole | null
  schoolId: string | null
  classroomId: string | null
}

interface AuthContextType {
  user: User | null
  profile: AuthUser | null
  loading: boolean
  isNewDirector: boolean
  claims: AuthClaims | null
  schoolName: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<SignUpData>) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSession: () => Promise<void> // Add this line
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewDirector, setIsNewDirector] = useState(false)
  const [claims, setClaims] = useState<AuthClaims | null>(null)
  const [schoolName, setSchoolName] = useState<string | null>(null)

  const refreshProfile = async () => {
    if (user) {
      try {
        // Utiliser directement les claims du JWT au lieu d'appeler l'API
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const meta = getAuthMeta(session as any)
          const userProfile: AuthUser = {
            id: session.user.id,
            email: session.user.email ?? null,
            role: meta.role || 'PARENT',
            school_id: meta.schoolId,
            classroom_id: meta.classroomId,
            full_name: session.user.user_metadata?.full_name ?? null,
          }
          setProfile(userProfile)
          
          // Check if this is a director without a school assigned yet
          setIsNewDirector(AuthService.isNewDirector(userProfile))
          
          // Fetch school name if user has a school_id
          if (meta.schoolId) {
            try {
              const { getSchoolById } = await import('@/lib/database')
              const school = await getSchoolById(meta.schoolId)
              setSchoolName((school as any)?.name || null)
            } catch (error) {
              console.error('Error fetching school name:', error)
              setSchoolName(null)
            }
          } else {
            setSchoolName(null)
          }
        } else {
          setProfile(null)
          setIsNewDirector(false)
          setSchoolName(null)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setProfile(null)
        setIsNewDirector(false)
        setSchoolName(null)
      }
    } else {
      setProfile(null)
      setIsNewDirector(false)
      setSchoolName(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const meta = getAuthMeta(session as any)
        setClaims({
          userId: meta.userId,
          role: (meta.role as UserRole) ?? null,
          schoolId: meta.schoolId ?? null,
          classroomId: meta.classroomId ?? null,
        })
      } else {
        setClaims(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const meta = getAuthMeta(session as any)
        setClaims({
          userId: meta.userId,
          role: (meta.role as UserRole) ?? null,
          schoolId: meta.schoolId ?? null,
          classroomId: meta.classroomId ?? null,
        })
      } else {
        setClaims(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      refreshProfile()
    } else {
      setProfile(null)
      setIsNewDirector(false)
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    await AuthService.signIn(email, password)
  }

  const signUp = async (email: string, password: string, userData: Partial<SignUpData>) => {
    // Préparer les données pour le service d'authentification
    const signUpData: SignUpData = {
      email,
      password,
      role: userData.role || 'PARENT',
      full_name: userData.full_name,
      school_id: userData.school_id,
      invitation_token: userData.invitation_token,
      schoolName: userData.schoolName,
      child_first_name: userData.child_first_name,
      // Pour les directeurs, créer les données d'école
      school_data: userData.role === 'DIRECTOR' && userData.schoolName ? {
        name: userData.schoolName
      } : undefined
    }

    // Utiliser le service d'authentification centralisé
    await AuthService.signUp(signUpData)
  }

  const signOut = async () => {
    try {
      await AuthService.signOut()
    } catch (error) {
      // If we get a session_not_found error, it means the session is already invalid
      // We can safely ignore this error and clear the local state
      console.warn('Sign out error (likely already signed out):', error)
      setUser(null)
      setProfile(null)
      setClaims(null)
      setIsNewDirector(false)
      setSchoolName(null)
    }
  }

  // Add a function to refresh the session
  const refreshSession = async () => {
    try {
      // Force refresh the session
      const session = await AuthService.refreshSession()
      
      if (session) {
        setUser(session.user)
        const meta = getAuthMeta({ user: session.user } as any)
        setClaims({
          userId: meta.userId,
          role: (meta.role as UserRole) ?? null,
          schoolId: meta.schoolId ?? null,
          classroomId: meta.classroomId ?? null,
        })
      } else {
        setUser(null)
        setClaims(null)
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      // If refresh fails, sign out the user
      await signOut()
    }
  }

  const value = {
    user,
    profile,
    loading,
    isNewDirector,
    claims,
    schoolName,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshSession, // Add this to the context value
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
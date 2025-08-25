'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserRole } from '@/types/database'
import { getUserById } from '@/lib/database'

interface UserProfile {
  id: string
  role: UserRole
  school_id: string | null
  email: string | null
  full_name: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isNewDirector: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<UserProfile>, invitationToken?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isNewDirector, setIsNewDirector] = useState(false)

  const refreshProfile = async () => {
    if (user) {
      try {
        const userProfile = await getUserById(user.id)
        setProfile(userProfile)
        
        // Check if this is a director without a school assigned yet
        // This will help redirect them to the school creation page
        if (userProfile.role === 'DIRECTOR' && !userProfile.school_id) {
          setIsNewDirector(true)
        } else {
          setIsNewDirector(false)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setProfile(null)
      }
    } else {
      setProfile(null)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [user])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>, invitationToken?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) throw error
    
    // Create user profile if signup successful
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          role: (userData.role || 'STUDENT') as UserRole,
          school_id: userData.school_id || null,
          full_name: userData.full_name || null,
        } as any) // Using 'as any' to bypass type issues temporarily
      
      if (profileError) throw profileError
      
      // If there's an invitation token, mark it as used
      if (invitationToken) {
        try {
          const { markInvitationLinkAsUsed, getInvitationLinkByToken } = await import('@/lib/database')
          const invitation = await getInvitationLinkByToken(invitationToken)
          await markInvitationLinkAsUsed((invitation as any).id)
        } catch (invitationError) {
          console.warn('Could not mark invitation as used:', invitationError)
          // Don't throw here as the user account was created successfully
        }
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    profile,
    loading,
    isNewDirector,
    signIn,
    signUp,
    signOut,
    refreshProfile,
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
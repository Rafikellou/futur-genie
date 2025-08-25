'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, School } from 'lucide-react'
import { createSchool, updateUser } from '@/lib/database'
import { Database } from '@/types/database'

type TablesRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export function SchoolCreation() {
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { profile, refreshProfile } = useAuth()
  const router = useRouter()

  // Check if there's a pending school name from previous step
  useEffect(() => {
    const pendingSchoolName = localStorage.getItem('pendingSchoolName')
    if (pendingSchoolName) {
      setSchoolName(pendingSchoolName)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolName) {
      setError('Le nom de l\'école est requis')
      return
    }

    if (!profile || !profile.id) {
      setError('Votre profil utilisateur n\'est pas disponible. Veuillez vous reconnecter.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create the school
      const school: TablesRow<'schools'> = await createSchool(schoolName)
      
      // Update the director's user record with the school_id
      await updateUser(profile.id, {
        school_id: school.id
      })
      
      // Refresh the user profile to get the updated school_id
      await refreshProfile()
      
      // Clear the pending school name from localStorage
      localStorage.removeItem('pendingSchoolName')
      
      // Redirect to the director dashboard
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue lors de la création de l\'école')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <School className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle>Création d'École</CardTitle>
        <CardDescription>
          Maintenant, configurez votre école
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">Nom de l'école</Label>
            <Input
              id="schoolName"
              placeholder="École Primaire Jean Moulin"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer l'école
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
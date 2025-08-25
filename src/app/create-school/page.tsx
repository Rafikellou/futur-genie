import { SchoolCreation } from '@/components/auth/SchoolCreation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function SchoolCreationPage() {
  return (
    <ProtectedRoute allowedRoles={['DIRECTOR']}>
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <SchoolCreation />
      </div>
    </ProtectedRoute>
  )
}
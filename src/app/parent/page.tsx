'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ParentDashboard } from '@/components/dashboards/ParentDashboard'

export default function ParentPage() {
  return (
    <ProtectedRoute allowedRoles={['PARENT']}>
      <ParentDashboard />
    </ProtectedRoute>
  )
}

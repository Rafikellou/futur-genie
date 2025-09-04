'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { QuizTaking } from '@/components/student/QuizTaking'

interface QuizPageProps {
  params: {
    id: string
  }
}

export default function QuizPage({ params }: QuizPageProps) {
  return (
    <ProtectedRoute allowedRoles={['PARENT']}>
      <QuizTaking quizId={params.id} />
    </ProtectedRoute>
  )
}

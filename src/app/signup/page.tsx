'use client'

import { Suspense } from 'react'
import { SignupRouter } from '@/components/auth/SignupRouter'
import { GraduationCap, Loader2 } from 'lucide-react'
import Link from 'next/link'

function SignupContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Link href="/">
              <GraduationCap className="h-12 w-12 text-blue-600 cursor-pointer" />
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Futur Génie</h1>
          <p className="text-gray-600">Plateforme éducative interactive</p>
        </div>
        
        <SignupRouter onBack={() => window.location.href = '/'} />
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
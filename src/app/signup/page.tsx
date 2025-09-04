'use client'

import { Suspense } from 'react'
import { SignupRouter } from '@/components/auth/SignupRouter'
import { GraduationCap, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

function SignupContent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mb-6">
            <Link href="/">
              <Image 
                src="/logo-principal.png" 
                alt="Futur Génie" 
                width={80} 
                height={80} 
                className="mx-auto mb-4 cursor-pointer"
              />
            </Link>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
            Futur Génie
          </h1>
          <p className="text-lg text-slate-300 mb-4">Construis ton potentiel</p>
        </div>
        
        <SignupRouter onBack={() => window.location.href = '/'} />
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--background)' }}>
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
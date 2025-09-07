'use client'

import { useState } from 'react'
import Image from 'next/image'
import { LogOut, Menu, X } from 'lucide-react'

interface DashboardHeaderProps {
  schoolName?: string
  onSignOut: () => void
  mobileMenuOpen: boolean
  onToggleMobileMenu: () => void
}

export function DashboardHeader({ 
  schoolName, 
  onSignOut, 
  mobileMenuOpen, 
  onToggleMobileMenu 
}: DashboardHeaderProps) {
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-b border-slate-700/50">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-sm"></div>
      <div className="relative max-w-7xl mx-auto px-4 lg:px-6 py-3">
        <div className="flex justify-between items-center">
          {/* Left side - Logo and School Name */}
          <div className="flex items-center flex-1 min-w-0">
            <div className="relative mr-3">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50"></div>
              <Image 
                src="/logo-principal.png" 
                alt="Futur Génie" 
                width={40} 
                height={40}
                className="relative w-8 h-8 lg:w-10 lg:h-10"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                <span className="text-lg lg:text-xl font-bold text-transparent bg-gradient-to-r from-white to-blue-200 bg-clip-text hidden lg:inline">
                  Futur Génie
                </span>
                {schoolName && (
                  <>
                    <span className="hidden lg:inline text-slate-400">•</span>
                    <span className="text-lg lg:text-xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text truncate">
                      {schoolName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Desktop logout, Mobile menu toggle */}
          <div className="flex items-center gap-2">
            {/* Desktop logout button */}
            <button 
              onClick={onSignOut}
              className="hidden lg:flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200 p-2 rounded-lg hover:bg-slate-700/30"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Déconnexion</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/30 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

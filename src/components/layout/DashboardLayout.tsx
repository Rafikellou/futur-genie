'use client'

import { useState, ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { DashboardHeader } from './DashboardHeader'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardMobileMenu } from './DashboardMobileMenu'

interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  disabled?: boolean
}

interface DashboardLayoutProps {
  schoolName?: string
  navigationItems: NavigationItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onSignOut: () => void
  children: ReactNode
  userName?: string
}

export function DashboardLayout({
  schoolName,
  navigationItems,
  activeTab,
  onTabChange,
  onSignOut,
  children,
  userName
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <DashboardHeader
        schoolName={schoolName}
        onSignOut={onSignOut}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={toggleMobileMenu}
      />

      {/* Mobile Menu */}
      <DashboardMobileMenu
        isOpen={mobileMenuOpen}
        navigationItems={navigationItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onSignOut={onSignOut}
        onClose={closeMobileMenu}
      />

      {/* Desktop Sidebar */}
      <DashboardSidebar
        navigationItems={navigationItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="pt-4">
          
          {/* Page Content */}
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

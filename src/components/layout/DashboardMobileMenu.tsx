'use client'

import { LucideIcon, LogOut } from 'lucide-react'

interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  disabled?: boolean
}

interface DashboardMobileMenuProps {
  isOpen: boolean
  navigationItems: NavigationItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onSignOut: () => void
  onClose: () => void
}

export function DashboardMobileMenu({ 
  isOpen, 
  navigationItems, 
  activeTab, 
  onTabChange, 
  onSignOut,
  onClose 
}: DashboardMobileMenuProps) {
  if (!isOpen) return null

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId)
    onClose()
  }

  const handleSignOut = () => {
    onSignOut()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-16 left-0 right-0 bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <nav className="px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isDisabled = item.disabled

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleTabChange(item.id)}
                disabled={isDisabled}
                className={`group relative w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 overflow-hidden ${
                  isActive
                    ? 'text-white shadow-lg'
                    : isDisabled
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {isActive && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-90"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl"></div>
                  </>
                )}
                <Icon className={`relative mr-3 h-5 w-5 ${isDisabled ? 'opacity-50' : ''}`} />
                <span className={`relative ${isDisabled ? 'opacity-50' : ''}`}>
                  {item.label}
                  {isDisabled && (
                    <span className="ml-2 text-xs">(bientôt)</span>
                  )}
                </span>
              </button>
            )
          })}
          
          {/* Separator */}
          <div className="my-4 border-t border-slate-700/50"></div>
          
          {/* Logout button */}
          <button
            onClick={handleSignOut}
            className="group relative w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            <LogOut className="relative mr-3 h-5 w-5" />
            <span className="relative">Déconnexion</span>
          </button>
        </nav>
      </div>
    </>
  )
}

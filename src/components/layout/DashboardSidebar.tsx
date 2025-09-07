'use client'

import { LucideIcon } from 'lucide-react'

interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  disabled?: boolean
}

interface DashboardSidebarProps {
  navigationItems: NavigationItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function DashboardSidebar({ 
  navigationItems, 
  activeTab, 
  onTabChange 
}: DashboardSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:bg-gradient-to-b lg:from-slate-800/50 lg:to-slate-900/50 lg:backdrop-blur-sm lg:border-r lg:border-slate-700/50">
      <div className="flex-1 flex flex-col min-h-0 pt-6">
        <nav className="flex-1 px-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isDisabled = item.disabled

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && onTabChange(item.id)}
                disabled={isDisabled}
                className={`group relative w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 overflow-hidden ${
                  isActive
                    ? 'text-white shadow-lg transform scale-105'
                    : isDisabled
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50 hover:scale-102'
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
        </nav>
      </div>
    </aside>
  )
}

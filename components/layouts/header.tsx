'use client'

import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { LogOut, Home, BarChart3, History, FileText } from 'lucide-react'

export function Header() {
  const { currentCompany, logout, currentView, setView, currentModule, clearCurrentAudit } = useApp()

  const handleNavigation = (view: 'dashboard' | 'history') => {
    if (currentModule && currentView === 'audit') {
      clearCurrentAudit()
    }
    setView(view)
  }

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleNavigation('dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <h1 className="text-xl font-bold text-slate-900">WhoISO</h1>
            </button>
            
            {currentCompany && (
              <span className="text-sm text-slate-500 border-l border-slate-200 pl-4">
                {currentCompany.name}
              </span>
            )}
          </div>

          {currentCompany && (
            <nav className="flex items-center gap-2">
              <Button
                variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Início
              </Button>
              <Button
                variant={currentView === 'dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('dashboard')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant={currentView === 'history' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleNavigation('history')}
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
              <div className="border-l border-slate-200 pl-2 ml-2">
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
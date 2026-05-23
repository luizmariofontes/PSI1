'use client'

import { useApp } from '@/lib/app-context'
import { LoginForm } from '@/components/auth/login-form'
import { Header } from '@/components/layout/header'
import { HomePage } from '@/components/home/home-page'
import { AuditPage } from '@/components/audit/audit-page'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { HistoryPage } from '@/components/history/history-page'

export function WhoISOApp() {
  const { currentView } = useApp()

  if (currentView === 'login') {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>
        {currentView === 'home' && <HomePage />}
        {currentView === 'audit' && <AuditPage />}
        {currentView === 'dashboard' && <DashboardPage />}
        {currentView === 'history' && <HistoryPage />}
      </main>
    </div>
  )
}
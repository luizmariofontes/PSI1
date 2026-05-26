'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/app-context'
import { ViewMode } from '@/lib/types'
import { getTodayDateString } from '@/lib/audit-utils'
import { StartAuditConfirmDialog } from '@/components/audit/start-audit-confirm-dialog'
import { WhoISOLogo } from '@/components/brand/whoiso-logo'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── ItsHover Animated SVG Icons ──────────────────────────────────────────────

function IconBarChart({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="itshover-barchart"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .group:hover .bar-1, .itshover-barchart:hover .bar-1 { animation: bar-rise-1 0.4s ease forwards; }
        .group:hover .bar-2, .itshover-barchart:hover .bar-2 { animation: bar-rise-2 0.4s ease 0.08s forwards; }
        .group:hover .bar-3, .itshover-barchart:hover .bar-3 { animation: bar-rise-3 0.4s ease 0.16s forwards; }
        @keyframes bar-rise-1 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.25)} }
        @keyframes bar-rise-2 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.3)} }
        @keyframes bar-rise-3 { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.2)} }
      `}</style>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <rect className="bar-1" x="3" y="12" width="4" height="8" rx="1" style={{ transformOrigin: '5px 20px' }} />
      <rect className="bar-2" x="10" y="8" width="4" height="12" rx="1" style={{ transformOrigin: '12px 20px' }} />
      <rect className="bar-3" x="17" y="4" width="4" height="16" rx="1" style={{ transformOrigin: '19px 20px' }} />
    </svg>
  )
}

function IconShield({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="itshover-shield"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .group:hover .shield-body, .itshover-shield:hover .shield-body { animation: shield-pulse 0.5s ease; }
        .group:hover .shield-check, .itshover-shield:hover .shield-check { animation: check-draw 0.4s ease 0.15s both; }
        @keyframes shield-pulse { 0%,100%{transform:scale(1)} 40%{transform:scale(1.1)} }
        @keyframes check-draw { from{stroke-dashoffset:20} to{stroke-dashoffset:0} }
      `}</style>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path className="shield-body" d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" style={{ transformOrigin: '12px 12px' }} />
      <path className="shield-check" d="M9 12l2 2l4 -4" strokeDasharray="20" strokeDashoffset="0" />
    </svg>
  )
}

function IconLock({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="itshover-lock"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .group:hover .lock-shackle, .itshover-lock:hover .lock-shackle { animation: shackle-open 0.45s ease; }
        @keyframes shackle-open {
          0%{transform:translateY(0)}
          40%{transform:translateY(-3px)}
          100%{transform:translateY(0)}
        }
      `}</style>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path className="lock-shackle" d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z" style={{ transformOrigin: '12px 16px' }} />
      <path className="lock-shackle" d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" style={{ transformOrigin: '12px 16px' }} />
      <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
    </svg>
  )
}

function IconHistory({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="itshover-history"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .group:hover .clock-hand, .itshover-history:hover .clock-hand { animation: tick 0.5s steps(4) forwards; }
        .group:hover .clock-body, .itshover-history:hover .clock-body { animation: spin-ccw 0.5s ease; }
        @keyframes tick { from{transform:rotate(0deg)} to{transform:rotate(90deg)} }
        @keyframes spin-ccw { 0%{transform:rotate(0deg)} 50%{transform:rotate(-15deg)} 100%{transform:rotate(0deg)} }
      `}</style>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path className="clock-hand" d="M12 8l0 4l2.5 2.5" style={{ transformOrigin: '12px 12px' }} />
      <path className="clock-body" d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" style={{ transformOrigin: '12px 12px' }} />
    </svg>
  )
}

function IconSettings({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="itshover-settings"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .group:hover .settings-gear, .itshover-settings:hover .settings-gear { animation: gear-turn 0.55s ease; }
        @keyframes gear-turn { from{transform:rotate(0deg)} to{transform:rotate(45deg)} }
      `}</style>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path
        className="settings-gear"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06 .06a2 2 0 1 1 -2.83 2.83l-.06 -.06a1.65 1.65 0 0 0 -1.82 -.33a1.65 1.65 0 0 0 -1 1.51v.17a2 2 0 1 1 -4 0v-.09a1.65 1.65 0 0 0 -1 -1.51a1.65 1.65 0 0 0 -1.82 .33l-.06 .06a2 2 0 1 1 -2.83 -2.83l.06 -.06a1.65 1.65 0 0 0 .33 -1.82a1.65 1.65 0 0 0 -1.51 -1h-.17a2 2 0 1 1 0 -4h.09a1.65 1.65 0 0 0 1.51 -1a1.65 1.65 0 0 0 -.33 -1.82l-.06 -.06a2 2 0 1 1 2.83 -2.83l.06 .06a1.65 1.65 0 0 0 1.82 .33h.09a1.65 1.65 0 0 0 1 -1.51v-.17a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51a1.65 1.65 0 0 0 1.82 -.33l.06 -.06a2 2 0 1 1 2.83 2.83l-.06 .06a1.65 1.65 0 0 0 -.33 1.82v.09a1.65 1.65 0 0 0 1.51 1h.17a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0 -1.51 1z"
        style={{ transformOrigin: '12px 12px' }}
      />
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
    </svg>
  )
}

function IconLogOut({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="itshover-logout"
      style={{ overflow: 'visible' }}
    >
      <style>{`
        .group:hover .logout-arrow, .itshover-logout:hover .logout-arrow { animation: slide-right 0.4s ease; }
        @keyframes slide-right { 0%{transform:translateX(0)} 45%{transform:translateX(5px)} 100%{transform:translateX(0)} }
      `}</style>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
      <path className="logout-arrow" d="M9 12h12l-3 -3m0 6l3 -3" style={{ transformOrigin: '15px 12px' }} />
    </svg>
  )
}

function IconChevronsLeft({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </svg>
  )
}

function IconChevronsRight({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 7l5 5-5 5" />
      <path d="M6 7l5 5-5 5" />
    </svg>
  )
}

// ── Sidebar Component ────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  collapsed: boolean
  onClick: () => void
  accent?: string
}

function NavItem({ icon, label, active, collapsed, onClick, accent = '#3b82f6' }: NavItemProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative group/tooltip">
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
        style={{
          background: active
            ? `linear-gradient(135deg, ${accent}22 0%, ${accent}11 100%)`
            : hovered
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
          color: active ? '#fff' : 'rgba(255,255,255,0.65)',
          borderLeft: active ? `3px solid ${accent}` : '3px solid transparent',
        }}
      >
        <span
          className="flex-shrink-0 transition-all duration-200"
          style={{ color: active ? accent : hovered ? '#fff' : 'rgba(255,255,255,0.55)' }}
        >
          {icon}
        </span>
        {!collapsed && (
          <span
            className="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200"
            style={{ opacity: collapsed ? 0 : 1 }}
          >
            {label}
          </span>
        )}
      </button>

      {/* Tooltip when collapsed */}
      {collapsed && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150"
          style={{
            background: 'rgba(15,23,42,0.95)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {label}
          <div
            className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent"
            style={{ borderRightColor: 'rgba(15,23,42,0.95)' }}
          />
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const router = useRouter()
  const {
    currentView,
    currentCompany,
    currentModule,
    selectModule,
    setView,
    logout,
    clearCurrentAudit,
  } = useApp()

  const [collapsed, setCollapsed] = useState(false)
  const [pendingModule, setPendingModule] = useState<'iso27001' | 'iso27701' | null>(null)
  const [pendingAuditDate, setPendingAuditDate] = useState(getTodayDateString())
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const hasCompany = Boolean(currentCompany?.companyId)

  const navigate = (view: ViewMode) => {
    if (currentModule && currentView === 'audit') {
      clearCurrentAudit()
    }
    setView(view)
  }

  const requestStartAudit = (module: 'iso27001' | 'iso27701') => {
    if (!hasCompany) return

    setPendingAuditDate(getTodayDateString())
    setPendingModule(module)
  }

  const handleStartAudit = () => {
    if (!pendingModule) return

    selectModule(pendingModule)
    setView('audit')
    setPendingModule(null)
  }

  const confirmLogout = () => {
    logout()
    router.push('/login')
  }

  const SIDEBAR_W = collapsed ? 68 : 240

  return (
    <aside
      className="flex flex-col h-screen flex-shrink-0 relative"
      style={{
        width: SIDEBAR_W,
        minWidth: SIDEBAR_W,
        background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Logo / Brand */}
      <div
        className={
          collapsed
            ? 'flex flex-col items-center gap-3 px-3 py-4 flex-shrink-0'
            : 'flex items-center justify-between gap-3 px-4 py-5 flex-shrink-0'
        }
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          minHeight: collapsed ? 104 : 72,
        }}
      >
        <div className="flex min-w-0 items-center">
          {collapsed ? (
            <WhoISOLogo markOnly mode="dark" className="w-9 flex-shrink-0" />
          ) : (
            <WhoISOLogo inverse mode="dark" className="w-36" />
          )}
        </div>

        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          className="flex shrink-0 items-center justify-center transition-all duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'rgba(30,41,59,0.72)',
            border: '1px solid rgba(148,163,184,0.22)',
            color: 'rgba(255,255,255,0.72)',
            cursor: 'pointer',
          }}
        >
          {collapsed ? <IconChevronsRight size={14} /> : <IconChevronsLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
        {/* Section: Main */}
        {!collapsed && (
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Menu
          </p>
        )}

        <div className="space-y-1">
          <NavItem
            icon={<IconBarChart />}
            label="Dashboard"
            active={currentView === 'dashboard'}
            collapsed={collapsed}
            onClick={() => navigate('dashboard')}
            accent="#3b82f6"
          />
          <NavItem
            icon={<IconHistory />}
            label="Histórico"
            active={currentView === 'history'}
            collapsed={collapsed}
            onClick={() => navigate('history')}
            accent="#06b6d4"
          />
        </div>

        {hasCompany && (
          <>
            {/* Divider */}
            <div className="my-4 mx-2" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

            {/* Section: Auditorias */}
            {!collapsed && (
              <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Nova Auditoria
              </p>
            )}

            <div className="space-y-1">
              <NavItem
                icon={<IconShield />}
                label="ISO 27001 / 27002"
                active={currentView === 'audit' && currentModule === 'iso27001'}
                collapsed={collapsed}
                onClick={() => requestStartAudit('iso27001')}
                accent="#10b981"
              />
              <NavItem
                icon={<IconLock />}
                label="ISO 27701"
                active={currentView === 'audit' && currentModule === 'iso27701'}
                collapsed={collapsed}
                onClick={() => requestStartAudit('iso27701')}
                accent="#f59e0b"
              />
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        className="flex-shrink-0 px-2 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <NavItem
          icon={<IconSettings />}
          label="Configurações"
          active={currentView === 'account'}
          collapsed={collapsed}
          onClick={() => navigate('account')}
          accent="#3b82f6"
        />
        <NavItem
          icon={<IconLogOut />}
          label="Sair"
          collapsed={collapsed}
          onClick={() => setShowLogoutConfirm(true)}
          accent="#ef4444"
        />
      </div>

      <StartAuditConfirmDialog
        open={pendingModule !== null}
        module={pendingModule}
        auditDate={pendingAuditDate}
        onOpenChange={(open) => {
          if (!open) setPendingModule(null)
        }}
        onConfirm={handleStartAudit}
      />

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente sair da sua conta? Você precisará fazer login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-red-600 hover:bg-red-700">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

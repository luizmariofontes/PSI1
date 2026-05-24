'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsChart } from './stats-chart'
import { CategoryChart } from './category-chart'
import { ComparativeChart } from './comparative-chart'
import { StatsCards } from './stats-cards'
import { calculateStats, calculateCategoryStats, formatAuditNumber, formatDate, getTodayDateString } from '@/lib/audit-utils'
import { iso27002Controls } from '@/lib/data/iso27002-controls'
import { iso27701Controls } from '@/lib/data/iso27701-controls'
import { Shield, Lock, ArrowRight, BarChart3, TrendingUp, History, Plus } from 'lucide-react'
import { StartAuditConfirmDialog } from '@/components/audit/start-audit-confirm-dialog'

// ── Module Shortcut Card ─────────────────────────────────────────────────────

interface ModuleCardProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  accentColor: string
  accentBg: string
  onNewAudit: () => void
}

function ModuleCard({
  icon, title, subtitle, description, accentColor, accentBg, onNewAudit,
}: ModuleCardProps) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-md"
      style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg, color: accentColor }}
        >
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed flex-1">{description}</p>

      <Button
        size="sm"
        onClick={onNewAudit}
        className="w-full gap-2 rounded-xl text-xs font-semibold"
        style={{
          background: accentColor,
          color: '#fff',
          border: 'none',
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Nova Auditoria
      </Button>
    </div>
  )
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────

export function DashboardPage() {
  const {
    selectedAuditId,
    setSelectedAuditId,
    dashboardMode,
    setDashboardMode,
    getCompanyAudits,
    getAuditById,
    selectModule,
    setView,
    currentCompany,
  } = useApp()

  const [pendingModule, setPendingModule] = useState<'iso27001' | 'iso27701' | null>(null)
  const [pendingAuditDate, setPendingAuditDate] = useState(getTodayDateString())

  const allAudits = getCompanyAudits()
  const iso27001Audits = getCompanyAudits('iso27001')
  const iso27701Audits = getCompanyAudits('iso27701')
  const hasAudits = allAudits.length > 0

  const selectedAudit = selectedAuditId ? getAuditById(selectedAuditId) : null

  const requestStartAudit = (module: 'iso27001' | 'iso27701') => {
    setPendingAuditDate(getTodayDateString())
    setPendingModule(module)
  }

  const handleStartAudit = () => {
    if (!pendingModule) return

    selectModule(pendingModule)
    setView('audit')
    setPendingModule(null)
  }

  // Stats for selected / combined view
  const stats = useMemo(() => {
    if (selectedAudit) {
      const controls = selectedAudit.module === 'iso27001' ? iso27002Controls : iso27701Controls
      return {
        overall: calculateStats(selectedAudit.responses, controls.length),
        byCategory: calculateCategoryStats(selectedAudit.responses, controls),
      }
    }
    const latest27001 = iso27001Audits[0]
    const latest27701 = iso27701Audits[0]
    const combinedResponses = [
      ...(latest27001?.responses || []),
      ...(latest27701?.responses || []),
    ]
    const combinedControls = [
      ...(latest27001 ? iso27002Controls : []),
      ...(latest27701 ? iso27701Controls : []),
    ]
    return {
      overall: calculateStats(combinedResponses, combinedControls.length),
      byCategory: calculateCategoryStats(combinedResponses, combinedControls),
    }
  }, [selectedAudit, iso27001Audits, iso27701Audits])

  return (
    <div className="min-h-full">
      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4"
        style={{
          background: 'rgba(248,250,252,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          {currentCompany && (
            <p className="text-xs text-slate-400 mt-0.5">{currentCompany.name}</p>
          )}
        </div>

        {hasAudits && (
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => setDashboardMode('current')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: dashboardMode === 'current' ? '#3b82f6' : 'transparent',
                color: dashboardMode === 'current' ? '#fff' : '#64748b',
              }}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Atual
            </button>
            <button
              onClick={() => setDashboardMode('comparative')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: dashboardMode === 'comparative' ? '#3b82f6' : 'transparent',
                color: dashboardMode === 'comparative' ? '#fff' : '#64748b',
              }}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Comparativo
            </button>
          </div>
        )}
      </div>

      <div className="px-8 py-6 space-y-6">

        {/* ── Quick Stats row (only when has audits) ── */}
        {hasAudits && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total de Auditorias', value: allAudits.length, icon: <History className="h-5 w-5" />, color: '#3b82f6', bg: '#3b82f615' },
              { label: 'ISO 27001', value: iso27001Audits.length, icon: <Shield className="h-5 w-5" />, color: '#10b981', bg: '#10b98115' },
              { label: 'ISO 27701', value: iso27701Audits.length, icon: <Lock className="h-5 w-5" />, color: '#f59e0b', bg: '#f59e0b15' },
            ].map(({ label, value, icon, color, bg }) => (
              <div
                key={label}
                className="rounded-2xl p-5 flex items-center justify-between"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div>
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
                  {icon}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Module shortcut cards ── */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">
            {hasAudits ? 'Atalhos — Nova Auditoria' : 'Selecione um módulo para começar'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModuleCard
              icon={<Shield className="h-5 w-5" />}
              title="ISO 27001 / 27002"
              subtitle="Segurança da Informação"
              description="Diagnóstico de conformidade com os requisitos da ISO 27001 e controles da ISO 27002 para sistemas de gestão de segurança da informação."
              accentColor="#10b981"
              accentBg="#10b98115"
              onNewAudit={() => requestStartAudit('iso27001')}
            />
            <ModuleCard
              icon={<Lock className="h-5 w-5" />}
              title="ISO 27701"
              subtitle="Privacidade de Dados"
              description="Diagnóstico de conformidade com os controles de privacidade para proteção de dados pessoais (DP)."
              accentColor="#f59e0b"
              accentBg="#f59e0b15"
              onNewAudit={() => requestStartAudit('iso27701')}
            />
          </div>
        </div>

        {/* ── Dashboard charts (only when has audits) ── */}
        {hasAudits && (
          <>
            {/* ── Audit Selector (current mode only) ── */}
            {dashboardMode === 'current' && (
              <div
                className="rounded-2xl p-5"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-slate-600 whitespace-nowrap">
                    Auditoria:
                  </label>
                  <Select
                    value={selectedAuditId || 'combined'}
                    onValueChange={(v) => setSelectedAuditId(v === 'combined' ? null : v)}
                  >
                    <SelectTrigger className="w-[380px] rounded-xl border-slate-200">
                      <SelectValue placeholder="Selecione uma auditoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">
                        Dashboard Completo (ISO 27001 + 27701)
                      </SelectItem>
                      {allAudits.map(audit => (
                        <SelectItem key={audit.id} value={audit.id}>
                          {formatAuditNumber(audit.auditNumber)} — {audit.module === 'iso27001' ? 'ISO 27001' : 'ISO 27701'} — {formatDate(audit.auditDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAudit && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 border-l pl-4">
                      {selectedAudit.module === 'iso27001'
                        ? <Shield className="h-3.5 w-3.5 text-emerald-500" />
                        : <Lock className="h-3.5 w-3.5 text-amber-500" />}
                      <span>
                        {selectedAudit.module === 'iso27001' ? 'Segurança da Informação' : 'Privacidade de Dados'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Current Dashboard ── */}
            {dashboardMode === 'current' && (
              <>
                <StatsCards stats={stats.overall} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div
                    className="rounded-2xl p-6"
                    style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    <p className="font-semibold text-slate-800 mb-1">Distribuição Geral</p>
                    <p className="text-xs text-slate-400 mb-4">Visão geral da conformidade</p>
                    <StatsChart stats={stats.overall} />
                  </div>

                  <div
                    className="rounded-2xl p-6"
                    style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    <p className="font-semibold text-slate-800 mb-1">Conformidade por Categoria</p>
                    <p className="text-xs text-slate-400 mb-4">Detalhamento por tipo de controle</p>
                    <CategoryChart categoryStats={stats.byCategory} />
                  </div>
                </div>
              </>
            )}

            {/* ── Comparative Dashboard ── */}
            {dashboardMode === 'comparative' && (
              <Tabs defaultValue="iso27001" className="w-full">
                <TabsList className="mb-4 bg-white border border-slate-200 rounded-xl p-1">
                  <TabsTrigger value="iso27001" className="gap-2 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                    <Shield className="h-4 w-4" />
                    ISO 27001
                  </TabsTrigger>
                  <TabsTrigger value="iso27701" className="gap-2 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                    <Lock className="h-4 w-4" />
                    ISO 27701
                  </TabsTrigger>
                  <TabsTrigger value="combined" className="rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                    Combinado
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="iso27001">
                  <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <p className="font-semibold text-slate-800 mb-1">Evolução da Conformidade — ISO 27001</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Comparativo das últimas {Math.min(iso27001Audits.length, 3)} auditorias
                    </p>
                    <ComparativeChart audits={iso27001Audits.slice(0, 3)} module="iso27001" />
                  </div>
                </TabsContent>

                <TabsContent value="iso27701">
                  <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <p className="font-semibold text-slate-800 mb-1">Evolução da Conformidade — ISO 27701</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Comparativo das últimas {Math.min(iso27701Audits.length, 3)} auditorias
                    </p>
                    <ComparativeChart audits={iso27701Audits.slice(0, 3)} module="iso27701" />
                  </div>
                </TabsContent>

                <TabsContent value="combined">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-emerald-500" />
                        <p className="font-semibold text-slate-800">ISO 27001</p>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">Evolução da conformidade</p>
                      <ComparativeChart audits={iso27001Audits.slice(0, 3)} module="iso27001" />
                    </div>
                    <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <p className="font-semibold text-slate-800">ISO 27701</p>
                      </div>
                      <p className="text-xs text-slate-400 mb-4">Evolução da conformidade</p>
                      <ComparativeChart audits={iso27701Audits.slice(0, 3)} module="iso27701" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}

        {/* ── Empty state (no audits yet) ── */}
        {!hasAudits && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: '#fff', border: '1px dashed rgba(0,0,0,0.1)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#3b82f615' }}>
              <BarChart3 className="h-7 w-7 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">Nenhuma auditoria ainda</h3>
            <p className="text-sm text-slate-400">
              Selecione um módulo acima para iniciar seu primeiro diagnóstico de conformidade.
            </p>
          </div>
        )}

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
    </div>
  )
}

'use client'

import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Lock, BarChart3, History, ArrowRight } from 'lucide-react'

export function HomePage() {
  const { 
    selectModule, 
    setView, 
    getCompanyAudits,
    setSelectedAuditId,
    setDashboardMode,
  } = useApp()

  const iso27001Audits = getCompanyAudits('iso27001')
  const iso27701Audits = getCompanyAudits('iso27701')
  const allAudits = getCompanyAudits()

  const handleStartAudit = (module: 'iso27001' | 'iso27701') => {
    selectModule(module)
    setView('audit')
  }

  const handleViewDashboard = (module?: 'iso27001' | 'iso27701') => {
    const audits = module ? getCompanyAudits(module) : allAudits
    if (audits.length > 0) {
      setSelectedAuditId(audits[0].id)
      setDashboardMode('current')
      setView('dashboard')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Bem-vindo ao WhoISO</h2>
        <p className="text-slate-600 mt-1">
          Selecione um módulo para iniciar uma nova auditoria ou visualize os dashboards de auditorias anteriores.
        </p>
      </div>

      {/* Quick Stats */}
      {allAudits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total de Auditorias</p>
                  <p className="text-2xl font-bold text-slate-900">{allAudits.length}</p>
                </div>
                <History className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">ISO 27001</p>
                  <p className="text-2xl font-bold text-slate-900">{iso27001Audits.length}</p>
                </div>
                <Shield className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">ISO 27701</p>
                  <p className="text-2xl font-bold text-slate-900">{iso27701Audits.length}</p>
                </div>
                <Lock className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Shield className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <CardTitle>ISO 27001 / 27002</CardTitle>
                <CardDescription>Segurança da Informação</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Diagnóstico de conformidade com os controles da ISO 27002 para sistemas de gestão de segurança da informação.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => handleStartAudit('iso27001')} className="flex-1">
                Nova Auditoria
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              {iso27001Audits.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => handleViewDashboard('iso27001')}
                  className="flex-1"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Lock className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <CardTitle>ISO 27701</CardTitle>
                <CardDescription>Privacidade de Dados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Diagnóstico de conformidade com os controles de privacidade para proteção de dados pessoais (DP).
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => handleStartAudit('iso27701')} className="flex-1">
                Nova Auditoria
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              {iso27701Audits.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => handleViewDashboard('iso27701')}
                  className="flex-1"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Ver Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Dashboard */}
      {allAudits.length > 0 && (
        <Card className="bg-slate-900 text-white">
          <CardHeader>
            <CardTitle className="text-white">Dashboard Completo</CardTitle>
            <CardDescription className="text-slate-400">
              Visualize um relatório consolidado com ambas as normas ISO 27001 e ISO 27701
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="secondary"
              onClick={() => {
                setSelectedAuditId(null)
                setDashboardMode('current')
                setView('dashboard')
              }}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Dashboard Completo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
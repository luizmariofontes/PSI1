'use client'

import { useMemo } from 'react'
import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsChart } from './stats-chart'
import { CategoryChart } from './category-chart'
import { ComparativeChart } from './comparative-chart'
import { StatsCards } from './stats-cards'
import { calculateStats, calculateCategoryStats, formatDate } from '@/lib/audit-utils'
import { iso27002Controls } from '@/lib/data/iso27002-controls'
import { iso27701Controls } from '@/lib/data/iso27701-controls'
import { Shield, Lock, ArrowLeft, BarChart3, TrendingUp } from 'lucide-react'

export function DashboardPage() {
  const {
    selectedAuditId,
    setSelectedAuditId,
    dashboardMode,
    setDashboardMode,
    getCompanyAudits,
    getAuditById,
    setView,
  } = useApp()

  const allAudits = getCompanyAudits()
  const iso27001Audits = getCompanyAudits('iso27001')
  const iso27701Audits = getCompanyAudits('iso27701')

  const selectedAudit = selectedAuditId ? getAuditById(selectedAuditId) : null

  // Calculate stats for selected audit or combined view
  const stats = useMemo(() => {
    if (selectedAudit) {
      const controls = selectedAudit.module === 'iso27001' ? iso27002Controls : iso27701Controls
      return {
        overall: calculateStats(selectedAudit.responses, controls.length),
        byCategory: calculateCategoryStats(selectedAudit.responses, controls),
      }
    }
    
    // Combined view - use latest audit from each module
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

  if (allAudits.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Nenhuma auditoria encontrada
              </h3>
              <p className="text-slate-500 mb-4">
                Realize uma auditoria para visualizar os dashboards.
              </p>
              <Button onClick={() => setView('home')}>
                Ir para Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setView('home')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        </div>
        
        {/* Dashboard Mode Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <Button
              variant={dashboardMode === 'current' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDashboardMode('current')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Atual
            </Button>
            <Button
              variant={dashboardMode === 'comparative' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setDashboardMode('comparative')}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Comparativo
            </Button>
          </div>
        </div>
      </div>

      {/* Audit Selector */}
      {dashboardMode === 'current' && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700">
                Selecionar Auditoria:
              </label>
              <Select
                value={selectedAuditId || 'combined'}
                onValueChange={(value) => setSelectedAuditId(value === 'combined' ? null : value)}
              >
                <SelectTrigger className="w-[400px]">
                  <SelectValue placeholder="Selecione uma auditoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combined">
                    Dashboard Completo (ISO 27001 + 27701)
                  </SelectItem>
                  {allAudits.map(audit => (
                    <SelectItem key={audit.id} value={audit.id}>
                      {audit.module === 'iso27001' ? 'ISO 27001' : 'ISO 27701'} - {formatDate(audit.auditDate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedAudit && (
                <div className="flex items-center gap-2 text-sm text-slate-500 border-l pl-4">
                  {selectedAudit.module === 'iso27001' ? (
                    <Shield className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  <span>
                    {selectedAudit.module === 'iso27001' ? 'Segurança da Informação' : 'Privacidade de Dados'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Dashboard */}
      {dashboardMode === 'current' && (
        <>
          {/* Stats Cards */}
          <StatsCards stats={stats.overall} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição Geral</CardTitle>
                <CardDescription>
                  Visão geral da conformidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatsChart stats={stats.overall} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conformidade por Categoria</CardTitle>
                <CardDescription>
                  Detalhamento por tipo de controle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart categoryStats={stats.byCategory} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Comparative Dashboard */}
      {dashboardMode === 'comparative' && (
        <Tabs defaultValue="iso27001" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="iso27001" className="gap-2">
              <Shield className="h-4 w-4" />
              ISO 27001
            </TabsTrigger>
            <TabsTrigger value="iso27701" className="gap-2">
              <Lock className="h-4 w-4" />
              ISO 27701
            </TabsTrigger>
            <TabsTrigger value="combined" className="gap-2">
              Combinado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="iso27001">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Conformidade - ISO 27001</CardTitle>
                <CardDescription>
                  Comparativo das últimas {Math.min(iso27001Audits.length, 3)} auditorias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparativeChart 
                  audits={iso27001Audits.slice(0, 3)} 
                  module="iso27001" 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="iso27701">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Conformidade - ISO 27701</CardTitle>
                <CardDescription>
                  Comparativo das últimas {Math.min(iso27701Audits.length, 3)} auditorias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparativeChart 
                  audits={iso27701Audits.slice(0, 3)} 
                  module="iso27701" 
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="combined">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    ISO 27001
                  </CardTitle>
                  <CardDescription>
                    Evolução da conformidade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComparativeChart 
                    audits={iso27001Audits.slice(0, 3)} 
                    module="iso27001" 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    ISO 27701
                  </CardTitle>
                  <CardDescription>
                    Evolução da conformidade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComparativeChart 
                    audits={iso27701Audits.slice(0, 3)} 
                    module="iso27701" 
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
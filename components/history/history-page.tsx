'use client'

import { useApp } from '@/lib/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, calculateStats, getStatusColor, getStatusLabel } from '@/lib/audit-utils'
import { iso27002Controls } from '@/lib/data/iso27002-controls'
import { iso27701Controls } from '@/lib/data/iso27701-controls'
import { Shield, Lock, ArrowLeft, BarChart3, Eye, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useState } from 'react'

export function HistoryPage() {
  const {
    getCompanyAudits,
    setSelectedAuditId,
    setDashboardMode,
    setView,
    audits,
  } = useApp()

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const allAudits = getCompanyAudits()

  const handleViewDashboard = (auditId: string) => {
    setSelectedAuditId(auditId)
    setDashboardMode('current')
    setView('dashboard')
  }

  if (allAudits.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setView('home')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold text-slate-900">Histórico de Auditorias</h2>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Nenhuma auditoria encontrada
              </h3>
              <p className="text-slate-500 mb-4">
                Realize uma auditoria para visualizar o histórico.
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
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold text-slate-900">Histórico de Auditorias</h2>
      </div>

      {/* Audits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Auditorias Realizadas</CardTitle>
          <CardDescription>
            {allAudits.length} auditoria(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Conforme</TableHead>
                <TableHead>Não Conforme</TableHead>
                <TableHead>Em Andamento</TableHead>
                <TableHead>Não se Aplica</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAudits.map(audit => {
                const controls = audit.module === 'iso27001' ? iso27002Controls : iso27701Controls
                const stats = calculateStats(audit.responses, controls.length)
                
                return (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">
                      {formatDate(audit.auditDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {audit.module === 'iso27001' ? (
                          <>
                            <Shield className="h-4 w-4 text-slate-500" />
                            <span>ISO 27001</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 text-slate-500" />
                            <span>ISO 27701</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor('conforme')}`} />
                        {stats.conforme} ({stats.conformePercentage}%)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor('nao-conforme')}`} />
                        {stats.naoConforme} ({stats.naoConformePercentage}%)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor('em-andamento')}`} />
                        {stats.emAndamento} ({stats.emAndamentoPercentage}%)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor('nao-aplica')}`} />
                        {stats.naoAplica}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDashboard(audit.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Dashboard
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
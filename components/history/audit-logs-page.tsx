'use client'

import { ArrowLeft, CheckCircle2, Pencil, ShieldCheck } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatAuditNumber, formatDate } from '@/lib/audit-utils'

export function AuditLogsPage() {
  const { auditLogs, selectedAuditId, getAuditById, setView } = useApp()
  const audit = selectedAuditId ? getAuditById(selectedAuditId) : undefined

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Logs da Auditoria</h2>
          <p className="mt-1 text-sm text-slate-500">
            {audit ? `${formatAuditNumber(audit.auditNumber)} - ${formatDate(audit.auditDate)}` : 'Registro de integridade'}
          </p>
        </div>
        <Button variant="outline" onClick={() => setView('history')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividades imutáveis</CardTitle>
          <CardDescription>
            Cada evento possui hash SHA-256 e referência ao hash anterior para validação da cadeia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Nenhum log encontrado para esta auditoria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Hash anterior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map(log => {
                  const Icon = log.action === 'created' ? CheckCircle2 : Pencil
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <Icon className="h-4 w-4 text-blue-600" />
                          {log.action === 'created' ? 'Criou' : 'Alterou'}
                        </div>
                      </TableCell>
                      <TableCell>{log.actorEmail}</TableCell>
                      <TableCell>{log.actorCompanyName}</TableCell>
                      <TableCell>{formatDate(log.occurredAt)}</TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs" title={log.hash}>
                          {log.hash.slice(0, 16)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        {log.previousHash ? (
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs" title={log.previousHash}>
                            {log.previousHash.slice(0, 16)}...
                          </code>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Início da cadeia
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

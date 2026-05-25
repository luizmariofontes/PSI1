'use client'

import { useState, useMemo } from 'react'
import { mergeControlResponse, useApp } from '@/lib/app-context'
import { iso27002Controls } from '@/lib/data/iso27002-controls'
import { iso27701Controls } from '@/lib/data/iso27701-controls'
import { ControlCard } from './control-card'
import { ProgressBar } from './progress-bar'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Shield, Lock, ArrowLeft, Calendar, Check, RefreshCw } from 'lucide-react'
import { ControlStatus, EvidenceFile } from '@/lib/types'
import { formatAuditNumber, formatDate } from '@/lib/audit-utils'

export function AuditPage() {
  const {
    currentModule,
    currentAuditDate,
    currentResponses,
    editingAuditId,
    getAuditById,
    setControlResponse,
    saveAudit,
    syncAuditResponses,
    editAudit,
    clearCurrentAudit,
    setView,
    uploadEvidenceFile,
    deleteEvidenceFile,
    buildEvidenceDownloadUrl,
  } = useApp()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!editingAuditId) return
    setRefreshing(true)
    await editAudit(editingAuditId)
    setRefreshing(false)
  }

  const controls = useMemo(() => {
    if (currentModule === 'iso27001') return iso27002Controls
    if (currentModule === 'iso27701') return iso27701Controls
    return []
  }, [currentModule])

  const currentControl = controls[currentIndex]
  const currentResponse = currentResponses.find(r => r.controlId === currentControl?.id)
  const editingAudit = editingAuditId ? getAuditById(editingAuditId) : null

  const handleResponseChange = (status: ControlStatus, inProgressDetails?: string) => {
    if (currentControl) {
      setControlResponse(currentControl.id, status, { inProgressDetails })
    }
  }

  // Auto-save de evidencia: alem de atualizar o estado local, persistimos no
  // backend logo em seguida quando estamos em modo de edicao. Isso garante
  // que outros membros da empresa vejam o anexo/descricao sem precisar
  // esperar o "Finalizar Auditoria".
  const handleEvidenceChange = (evidence: string) => {
    if (!currentControl) return
    const existing = currentResponses.find(r => r.controlId === currentControl.id)
    const status: ControlStatus = existing?.status || 'pendente'
    const nextResponses = mergeControlResponse(currentResponses, currentControl.id, status, { evidence })
    setControlResponse(currentControl.id, status, { evidence })
    if (editingAuditId) {
      void syncAuditResponses(nextResponses)
    }
  }

  const handleEvidenceFileChange = (evidenceFile: EvidenceFile | null) => {
    if (!currentControl) return
    const existing = currentResponses.find(r => r.controlId === currentControl.id)
    const status: ControlStatus = existing?.status || 'pendente'
    const nextResponses = mergeControlResponse(currentResponses, currentControl.id, status, { evidenceFile })
    setControlResponse(currentControl.id, status, { evidenceFile })
    if (editingAuditId) {
      void syncAuditResponses(nextResponses)
    }
  }

  const handleUploadEvidenceFile = async (file: File) => {
    if (!editingAuditId) {
      return {
        success: false,
        error: 'Salve a auditoria antes de anexar arquivos. Marque pelo menos um controle, finalize e depois edite para anexar evidencias.',
      }
    }
    return uploadEvidenceFile(editingAuditId, currentControl!.id, file)
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < controls.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleControlClick = (index: number) => {
    setCurrentIndex(index)
  }

  const handleFinish = () => {
    setShowFinishDialog(true)
  }

  const handleConfirmFinish = async () => {
    setSaving(true)
    await saveAudit()
    setSaving(false)
    setShowFinishDialog(false)
  }

  const handleCancel = () => {
    clearCurrentAudit()
    setView('dashboard')
  }

  const pendingCount = controls.length - currentResponses.length

  if (!currentModule || !currentControl) {
    return null
  }

  const moduleInfo = {
    iso27001: {
      icon: Shield,
      title: 'ISO 27001 / 27002',
      subtitle: 'Segurança da Informação',
    },
    iso27701: {
      icon: Lock,
      title: 'ISO 27701',
      subtitle: 'Privacidade de Dados',
    },
  }

  const info = moduleInfo[currentModule]
  const Icon = info.icon

  return (
    <div className="min-h-full bg-slate-50">
      {/* Module Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                <Icon className="h-5 w-5 text-slate-700" />
                <div>
                  <h2 className="font-semibold text-slate-900">{info.title}</h2>
                  <p className="text-xs text-slate-500">
                    {editingAuditId ? `Editando auditoria - ${info.subtitle}` : info.subtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">Data da Auditoria:</span>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm">
                  {formatDate(currentAuditDate)}
                </div>
                {editingAudit && (
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    {formatAuditNumber(editingAudit.auditNumber)}
                  </div>
                )}
                {editingAuditId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Atualizar para puxar alteracoes de outros membros da empresa"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        controls={controls}
        responses={currentResponses}
        currentIndex={currentIndex}
        onControlClick={handleControlClick}
      />

      {/* Control Card */}
      <div className="py-8">
        <ControlCard
          control={currentControl}
          currentResponse={currentResponse}
          onResponseChange={handleResponseChange}
          onEvidenceChange={handleEvidenceChange}
          onEvidenceFileChange={handleEvidenceFileChange}
          onUploadEvidenceFile={handleUploadEvidenceFile}
          onDeleteEvidenceFile={deleteEvidenceFile}
          buildEvidenceDownloadUrl={buildEvidenceDownloadUrl}
          controlNumber={currentIndex + 1}
          totalControls={controls.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          isFirst={currentIndex === 0}
          isLast={currentIndex === controls.length - 1}
        />
      </div>

      {/* Botão flutuante de Finalizar - sempre visível no canto inferior direito.
          Cinza ate todos os controles serem preenchidos; azul quando todos respondidos. */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-30">
        <Button
          onClick={handleFinish}
          disabled={pendingCount > 0}
          className={`pointer-events-auto h-12 rounded-xl px-5 font-semibold shadow-lg ${
            pendingCount > 0
              ? 'bg-slate-300 text-slate-600 hover:bg-slate-300 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={pendingCount > 0 ? `Faltam ${pendingCount} controle(s) para finalizar` : 'Finalizar auditoria'}
        >
          <Check className="mr-2 h-4 w-4" />
          Finalizar Auditoria
          {pendingCount > 0 && (
            <span className="ml-2 rounded-full bg-white/30 px-2 py-0.5 text-xs font-bold">
              {pendingCount}
            </span>
          )}
        </Button>
      </div>

      {/* Finish Dialog */}
      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Auditoria</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount > 0 ? (
                <>
                  Você ainda tem <strong>{pendingCount}</strong> controle(s) pendente(s).
                  Deseja {editingAuditId ? 'salvar as alterações' : 'finalizar'} mesmo assim?
                </>
              ) : (
                editingAuditId
                  ? 'Todos os controles foram avaliados. Deseja salvar as alterações desta auditoria?'
                  : 'Todos os controles foram avaliados. Deseja finalizar a auditoria?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFinish} disabled={saving}>
              {saving ? 'Salvando...' : editingAuditId ? 'Salvar alterações' : 'Finalizar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

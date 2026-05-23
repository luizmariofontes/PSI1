'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/app-context'
import { iso27002Controls } from '@/lib/data/iso27002-controls'
import { iso27701Controls } from '@/lib/data/iso27701-controls'
import { ControlCard } from './control-card'
import { ProgressBar } from './progress-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Shield, Lock, ArrowLeft, Calendar } from 'lucide-react'
import { ControlStatus } from '@/lib/types'

export function AuditPage() {
  const {
    currentModule,
    currentAuditDate,
    currentResponses,
    setAuditDate,
    setControlResponse,
    saveAudit,
    clearCurrentAudit,
    setView,
  } = useApp()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showFinishDialog, setShowFinishDialog] = useState(false)

  const controls = useMemo(() => {
    if (currentModule === 'iso27001') return iso27002Controls
    if (currentModule === 'iso27701') return iso27701Controls
    return []
  }, [currentModule])

  const currentControl = controls[currentIndex]
  const currentResponse = currentResponses.find(r => r.controlId === currentControl?.id)

  const handleResponseChange = (status: ControlStatus, inProgressDetails?: string) => {
    if (currentControl) {
      setControlResponse(currentControl.id, status, inProgressDetails)
    }
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

  const handleConfirmFinish = () => {
    saveAudit()
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
                  <p className="text-xs text-slate-500">{info.subtitle}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Label htmlFor="auditDate" className="text-sm text-slate-600">
                  Data da Auditoria:
                </Label>
                <Input
                  id="auditDate"
                  type="date"
                  value={currentAuditDate}
                  onChange={(e) => setAuditDate(e.target.value)}
                  className="w-40"
                />
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
          controlNumber={currentIndex + 1}
          totalControls={controls.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          isFirst={currentIndex === 0}
          isLast={currentIndex === controls.length - 1}
          onFinish={handleFinish}
        />
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
                  Deseja finalizar mesmo assim?
                </>
              ) : (
                'Todos os controles foram avaliados. Deseja finalizar a auditoria?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFinish}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
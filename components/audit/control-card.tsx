'use client'

import { useState, useEffect } from 'react'
import { Control, ControlResponse, ControlStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getStatusLabel, getStatusColor } from '@/lib/audit-utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Check, FileText } from 'lucide-react'

interface ControlCardProps {
  control: Control
  currentResponse?: ControlResponse
  onResponseChange: (status: ControlStatus, inProgressDetails?: string) => void
  controlNumber: number
  totalControls: number
  onPrevious: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
  onFinish: () => void
}

// Opção principal exibida na UI (não inclui "em-andamento" diretamente)
type PrimaryChoice = 'conforme' | 'nao-conforme' | 'nao-aplica' | 'pendente'

export function ControlCard({
  control,
  currentResponse,
  onResponseChange,
  controlNumber,
  totalControls,
  onPrevious,
  onNext,
  isFirst,
  isLast,
  onFinish,
}: ControlCardProps) {
  // Deriva a escolha primária a partir do status real persistido
  const derivePrimary = (status: ControlStatus | undefined): PrimaryChoice => {
    if (!status || status === 'pendente') return 'pendente'
    if (status === 'em-andamento') return 'nao-conforme'
    return status
  }

  const [primaryChoice, setPrimaryChoice] = useState<PrimaryChoice>(derivePrimary(currentResponse?.status))
  const [showInProgressQuestion, setShowInProgressQuestion] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [detailsText, setDetailsText] = useState('')
  const [detailsError, setDetailsError] = useState('')
  const [advanceAfterDetails, setAdvanceAfterDetails] = useState(false)

  // Sincroniza estado local quando muda o controle exibido
  useEffect(() => {
    setPrimaryChoice(derivePrimary(currentResponse?.status))
    setDetailsText(currentResponse?.inProgressDetails || '')
    setDetailsError('')
    setShowInProgressQuestion(false)
    setShowDetailsDialog(false)
  }, [control.id, currentResponse?.status])

  const advanceToNext = () => {
    if (!isLast) {
      window.setTimeout(onNext, 180)
    }
  }

  const handlePrimaryChange = (choice: PrimaryChoice) => {
    setPrimaryChoice(choice)

    if (choice === 'nao-conforme') {
      setShowInProgressQuestion(true)
      return
    }

    if (choice === 'conforme' || choice === 'nao-aplica') {
      onResponseChange(choice)
      advanceToNext()
    }
  }

  const resetPendingChoice = () => {
    setPrimaryChoice(derivePrimary(currentResponse?.status))
    setShowInProgressQuestion(false)
  }

  const handleNotInProgress = () => {
    onResponseChange('nao-conforme')
    setShowInProgressQuestion(false)
    advanceToNext()
  }

  const handleAskDetails = () => {
    setDetailsText(currentResponse?.inProgressDetails || '')
    setDetailsError('')
    setAdvanceAfterDetails(true)
    setShowInProgressQuestion(false)
    setShowDetailsDialog(true)
  }

  const handleEditDetails = () => {
    setDetailsText(currentResponse?.inProgressDetails || '')
    setDetailsError('')
    setAdvanceAfterDetails(false)
    setShowDetailsDialog(true)
  }

  const handleSaveDetails = () => {
    const trimmed = detailsText.trim()
    if (!trimmed) {
      setDetailsError('Descreva o que esta em andamento.')
      return
    }

    setPrimaryChoice('nao-conforme')
    onResponseChange('em-andamento', trimmed)
    setShowDetailsDialog(false)

    if (advanceAfterDetails) {
      advanceToNext()
    }
  }

  const isAnswered =
    primaryChoice === 'conforme' ||
    primaryChoice === 'nao-aplica' ||
    primaryChoice === 'nao-conforme'

  const primaryOptions: { value: PrimaryChoice; status: ControlStatus }[] = [
    { value: 'conforme', status: 'conforme' },
    { value: 'nao-conforme', status: 'nao-conforme' },
    { value: 'nao-aplica', status: 'nao-aplica' },
  ]

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {control.category}
            </Badge>
            {currentResponse?.status === 'em-andamento' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEditDetails}
                className="h-7 rounded-full px-3 text-xs"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Em andamento
              </Button>
            )}
          </div>
          <span className="text-sm text-slate-500">
            {controlNumber} de {totalControls}
          </span>
        </div>
        <CardTitle className="text-lg flex items-start gap-2">
          <span className="text-slate-500 font-mono text-sm mt-0.5">{control.code}</span>
          <span>{control.title}</span>
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">{control.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-medium">Status de Conformidade</Label>
          <RadioGroup
            value={primaryChoice}
            onValueChange={(value) => handlePrimaryChange(value as PrimaryChoice)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {primaryOptions.map((opt) => (
              <Label
                key={opt.value}
                htmlFor={`status-${control.id}-${opt.value}`}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('[role="radio"]')) return
                  handlePrimaryChange(opt.value)
                }}
                className={cn(
                  'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50',
                  primaryChoice === opt.value && 'border-slate-300 bg-slate-50',
                )}
              >
                <RadioGroupItem value={opt.value} id={`status-${control.id}-${opt.value}`} />
                <span className={`h-2 w-2 rounded-full ${getStatusColor(opt.status)}`} />
                <span>{getStatusLabel(opt.status)}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onPrevious} disabled={isFirst}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {isLast ? (
            <Button onClick={onFinish} disabled={!isAnswered}>
              <Check className="h-4 w-4 mr-2" />
              Finalizar Auditoria
            </Button>
          ) : (
            <Button onClick={onNext} disabled={!isAnswered}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showInProgressQuestion} onOpenChange={(open) => {
        if (!open) resetPendingChoice()
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Está em andamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Este controle foi marcado como não conforme. Existe alguma ação em andamento para resolver este ponto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetPendingChoice}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={handleNotInProgress}>
              Não
            </Button>
            <Button onClick={handleAskDetails} className="bg-blue-600 hover:bg-blue-700">
              Sim
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDetailsDialog} onOpenChange={(open) => {
        setShowDetailsDialog(open)
        if (!open && advanceAfterDetails) {
          setPrimaryChoice(derivePrimary(currentResponse?.status))
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O que está em andamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Descreva o que já foi feito, o que ainda falta e qualquer contexto importante para acompanhar esta não conformidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Textarea
              value={detailsText}
              onChange={(event) => {
                setDetailsText(event.target.value)
                setDetailsError('')
              }}
              placeholder="Ex.: política revisada, aguardando aprovação da diretoria, pendente publicação e comunicação aos responsáveis."
              className="min-h-32 resize-y"
            />
            {detailsError && (
              <p className="text-sm text-red-600">{detailsError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (advanceAfterDetails) {
                setPrimaryChoice(derivePrimary(currentResponse?.status))
              }
            }}>
              Cancelar
            </AlertDialogCancel>
            <Button onClick={handleSaveDetails} className="bg-blue-600 hover:bg-blue-700">
              Salvar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

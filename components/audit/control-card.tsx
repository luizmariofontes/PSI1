'use client'

import { useState, useEffect } from 'react'
import { Control, ControlResponse, ControlStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel, getStatusColor } from '@/lib/audit-utils'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

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

  // Sincroniza estado local quando muda o controle exibido
  useEffect(() => {
    setPrimaryChoice(derivePrimary(currentResponse?.status))
  }, [control.id, currentResponse?.status])

  const handlePrimaryChange = (choice: PrimaryChoice) => {
    setPrimaryChoice(choice)

    if (choice === 'conforme' || choice === 'nao-conforme' || choice === 'nao-aplica') {
      onResponseChange(choice)

      if (!isLast) {
        window.setTimeout(onNext, 180)
      }
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
          <Badge variant="outline" className="text-xs">
            {control.category}
          </Badge>
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
    </Card>
  )
}

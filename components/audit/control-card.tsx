'use client'

import { useState, useEffect } from 'react'
import { Control, ControlResponse, ControlStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel, getStatusColor } from '@/lib/audit-utils'
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
  const [isInProgress, setIsInProgress] = useState<boolean | null>(
    currentResponse?.status === 'em-andamento' ? true : currentResponse?.status === 'nao-conforme' ? false : null,
  )
  const [inProgressDetails, setInProgressDetails] = useState(currentResponse?.inProgressDetails || '')

  // Sincroniza estado local quando muda o controle exibido
  useEffect(() => {
    setPrimaryChoice(derivePrimary(currentResponse?.status))
    setIsInProgress(
      currentResponse?.status === 'em-andamento' ? true : currentResponse?.status === 'nao-conforme' ? false : null,
    )
    setInProgressDetails(currentResponse?.inProgressDetails || '')
  }, [control.id, currentResponse?.status, currentResponse?.inProgressDetails])

  const handlePrimaryChange = (choice: PrimaryChoice) => {
    setPrimaryChoice(choice)
    if (choice === 'nao-conforme') {
      // Aguarda definição da etapa "está em andamento?" antes de registrar
      setIsInProgress(null)
      setInProgressDetails('')
      // Não chama onResponseChange ainda — fica pendente até decisão
      onResponseChange('pendente')
    } else if (choice === 'conforme' || choice === 'nao-aplica') {
      setIsInProgress(null)
      setInProgressDetails('')
      onResponseChange(choice)
    }
  }

  const handleInProgressDecision = (value: 'sim' | 'nao') => {
    if (value === 'sim') {
      setIsInProgress(true)
      onResponseChange('em-andamento', inProgressDetails)
    } else {
      setIsInProgress(false)
      setInProgressDetails('')
      onResponseChange('nao-conforme')
    }
  }

  const handleDetailsChange = (details: string) => {
    setInProgressDetails(details)
    if (isInProgress) {
      onResponseChange('em-andamento', details)
    }
  }

  const isAnswered =
    primaryChoice === 'conforme' ||
    primaryChoice === 'nao-aplica' ||
    (primaryChoice === 'nao-conforme' && isInProgress === false) ||
    (primaryChoice === 'nao-conforme' && isInProgress === true)

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
              <div
                key={opt.value}
                className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-slate-50"
              >
                <RadioGroupItem value={opt.value} id={opt.value} />
                <Label htmlFor={opt.value} className="cursor-pointer flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(opt.status)}`} />
                  {getStatusLabel(opt.status)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {primaryChoice === 'nao-conforme' && (
          <div className="space-y-3 border-l-4 border-amber-400 bg-amber-50 p-4 rounded-r-md">
            <Label className="text-base font-medium">Está em andamento?</Label>
            <RadioGroup
              value={isInProgress === null ? '' : isInProgress ? 'sim' : 'nao'}
              onValueChange={(value) => handleInProgressDecision(value as 'sim' | 'nao')}
              className="flex gap-3"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 bg-white cursor-pointer hover:bg-slate-50 flex-1">
                <RadioGroupItem value="sim" id="andamento-sim" />
                <Label htmlFor="andamento-sim" className="cursor-pointer flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor('em-andamento')}`} />
                  Sim, em andamento
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 bg-white cursor-pointer hover:bg-slate-50 flex-1">
                <RadioGroupItem value="nao" id="andamento-nao" />
                <Label htmlFor="andamento-nao" className="cursor-pointer flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor('nao-conforme')}`} />
                  Não, registrar como não conforme
                </Label>
              </div>
            </RadioGroup>

            {isInProgress === true && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="details" className="text-sm font-medium">
                  Indique o que está em andamento
                </Label>
                <Textarea
                  id="details"
                  placeholder="Descreva as ações em andamento para este controle..."
                  value={inProgressDetails}
                  onChange={(e) => handleDetailsChange(e.target.value)}
                  rows={3}
                  className="bg-white"
                />
              </div>
            )}
          </div>
        )}

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
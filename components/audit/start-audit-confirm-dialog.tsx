'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/audit-utils'

interface StartAuditConfirmDialogProps {
  open: boolean
  module: 'iso27001' | 'iso27701' | null
  auditDate: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const moduleLabels = {
  iso27001: 'ISO 27001 / 27002',
  iso27701: 'ISO 27701',
}

export function StartAuditConfirmDialog({
  open,
  module,
  auditDate,
  onOpenChange,
  onConfirm,
}: StartAuditConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar nova auditoria</AlertDialogTitle>
          <AlertDialogDescription>
            Deseja criar uma nova auditoria
            {module ? ` de ${moduleLabels[module]}` : ''} com a data atual{' '}
            <strong>{formatDate(auditDate)}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Criar auditoria
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

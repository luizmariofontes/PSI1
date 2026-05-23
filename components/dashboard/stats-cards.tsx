'use client'

import { AuditStats } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { getStatusColor } from '@/lib/audit-utils'

interface StatsCardsProps {
  stats: AuditStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const applicable = stats.total - stats.naoAplica

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor('conforme')}`} />
            <div>
              <p className="text-sm text-slate-500">Conforme</p>
              <p className="text-2xl font-bold text-slate-900">{stats.conforme}</p>
              <p className="text-xs text-slate-400">
                {stats.conformePercentage}% dos aplicáveis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor('nao-conforme')}`} />
            <div>
              <p className="text-sm text-slate-500">Não Conforme</p>
              <p className="text-2xl font-bold text-slate-900">{stats.naoConforme}</p>
              <p className="text-xs text-slate-400">
                {stats.naoConformePercentage}% dos aplicáveis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor('em-andamento')}`} />
            <div>
              <p className="text-sm text-slate-500">Em Andamento</p>
              <p className="text-2xl font-bold text-slate-900">{stats.emAndamento}</p>
              <p className="text-xs text-slate-400">
                {stats.emAndamentoPercentage}% dos aplicáveis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor('nao-aplica')}`} />
            <div>
              <p className="text-sm text-slate-500">Não se Aplica</p>
              <p className="text-2xl font-bold text-slate-900">{stats.naoAplica}</p>
              <p className="text-xs text-slate-400">
                {stats.naoAplicaPercentage}% do total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
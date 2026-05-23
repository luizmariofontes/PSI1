'use client'

import { AuditRecord } from '@/lib/types'
import { calculateStats } from '@/lib/audit-utils'
import { getChartColors, formatDate } from '@/lib/audit-utils'
import { iso27002Controls } from '@/lib/data/iso27002-controls'
import { iso27701Controls } from '@/lib/data/iso27701-controls'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ComparativeChartProps {
  audits: AuditRecord[]
  module: 'iso27001' | 'iso27701'
}

export function ComparativeChart({ audits, module }: ComparativeChartProps) {
  const colors = getChartColors()
  const controls = module === 'iso27001' ? iso27002Controls : iso27701Controls
  
  // Sort audits by date (oldest first for timeline)
  const sortedAudits = [...audits].sort(
    (a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime()
  )

  const data = sortedAudits.map(audit => {
    const stats = calculateStats(audit.responses, controls.length)
    return {
      date: formatDate(audit.auditDate),
      'Conforme (%)': stats.conformePercentage,
      'Não Conforme (%)': stats.naoConformePercentage,
      'Em Andamento (%)': stats.emAndamentoPercentage,
    }
  })

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
        É necessário ter pelo menos 2 auditorias para comparação
      </div>
    )
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number) => [`${value}%`]}
          />
          <Legend 
            verticalAlign="top"
            formatter={(value) => <span className="text-xs">{value}</span>}
          />
          <Line 
            type="monotone" 
            dataKey="Conforme (%)" 
            stroke={colors.conforme} 
            strokeWidth={2}
            dot={{ fill: colors.conforme, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="Não Conforme (%)" 
            stroke={colors.naoConforme} 
            strokeWidth={2}
            dot={{ fill: colors.naoConforme, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="Em Andamento (%)" 
            stroke={colors.emAndamento} 
            strokeWidth={2}
            dot={{ fill: colors.emAndamento, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
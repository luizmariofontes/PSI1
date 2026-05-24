'use client'

import { AuditStats } from '@/lib/types'
import { getChartColors } from '@/lib/audit-utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface StatsChartProps {
  stats: AuditStats
  title?: string
  showLegend?: boolean
}

export function StatsChart({ stats, title, showLegend = true }: StatsChartProps) {
  const colors = getChartColors()
  
  const data = [
    { name: 'Conforme', value: stats.conforme, color: colors.conforme },
    { name: 'Não Conforme', value: stats.naoConforme, color: colors.naoConforme },
    { name: 'Em Andamento', value: stats.emAndamento, color: colors.emAndamento },
    { name: 'Não se Aplica', value: stats.naoAplica, color: colors.naoAplica },
  ].filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
        Sem dados disponíveis
      </div>
    )
  }

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-slate-700 mb-2 text-center">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="42%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number, name: string) => [value, name]}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          {showLegend && (
            <Legend 
              verticalAlign="bottom" 
              height={52}
              formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

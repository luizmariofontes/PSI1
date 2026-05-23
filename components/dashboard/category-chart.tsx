'use client'

import { CategoryStats } from '@/lib/types'
import { getChartColors } from '@/lib/audit-utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface CategoryChartProps {
  categoryStats: CategoryStats[]
  title?: string
}

export function CategoryChart({ categoryStats, title }: CategoryChartProps) {
  const colors = getChartColors()
  
  const data = categoryStats.map(cat => ({
    name: cat.category.length > 25 ? cat.category.substring(0, 25) + '...' : cat.category,
    fullName: cat.category,
    Conforme: cat.stats.conforme,
    'Não Conforme': cat.stats.naoConforme,
    'Em Andamento': cat.stats.emAndamento,
    'Não se Aplica': cat.stats.naoAplica,
  }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
        Sem dados disponíveis
      </div>
    )
  }

  return (
    <div className="w-full">
      {title && (
        <h4 className="text-sm font-medium text-slate-700 mb-4">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={150} 
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelFormatter={(_, payload) => payload[0]?.payload?.fullName || ''}
          />
          <Legend 
            verticalAlign="top"
            formatter={(value) => <span className="text-xs">{value}</span>}
          />
          <Bar dataKey="Conforme" stackId="a" fill={colors.conforme} />
          <Bar dataKey="Não Conforme" stackId="a" fill={colors.naoConforme} />
          <Bar dataKey="Em Andamento" stackId="a" fill={colors.emAndamento} />
          <Bar dataKey="Não se Aplica" stackId="a" fill={colors.naoAplica} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
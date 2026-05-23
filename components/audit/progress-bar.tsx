'use client'

import { Control, ControlResponse } from '@/lib/types'
import { getStatusColor, getStatusLabel } from '@/lib/audit-utils'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  controls: Control[]
  responses: ControlResponse[]
  currentIndex: number
  onControlClick: (index: number) => void
}

export function ProgressBar({ controls, responses, currentIndex, onControlClick }: ProgressBarProps) {
  const categories = [...new Set(controls.map(c => c.category))]

  return (
    <div className="bg-white border-b border-slate-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">
            Progresso da Auditoria
          </span>
          <span className="text-sm text-slate-500">
            {responses.length} de {controls.length} respondidos
          </span>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
          <div
            className="bg-slate-900 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(responses.length / controls.length) * 100}%` }}
          />
        </div>

        {/* Category-based mini indicators */}
        <div className="space-y-2">
          {categories.map(category => {
            const categoryControls = controls.filter(c => c.category === category)
            const startIndex = controls.findIndex(c => c.category === category)
            
            return (
              <div key={category} className="space-y-1">
                <span className="text-xs text-slate-500">{category}</span>
                <div className="flex gap-1">
                  {categoryControls.map((control, idx) => {
                    const globalIndex = startIndex + idx
                    const response = responses.find(r => r.controlId === control.id)
                    const status = response?.status || 'pendente'
                    const isCurrent = globalIndex === currentIndex
                    
                    return (
                      <button
                        key={control.id}
                        onClick={() => onControlClick(globalIndex)}
                        className={cn(
                          'h-2 flex-1 rounded-sm transition-all',
                          getStatusColor(status),
                          isCurrent && 'ring-2 ring-slate-900 ring-offset-1',
                          status === 'pendente' && 'bg-slate-200 hover:bg-slate-300'
                        )}
                        title={`${control.code} - ${control.title} (${getStatusLabel(status)})`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
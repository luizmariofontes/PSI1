'use client'

import { useRef, useState } from 'react'
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
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    if (!el) return
    // Botao esquerdo apenas
    if (event.button !== 0) return
    dragState.current = {
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    }
    setIsDragging(true)
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const drag = dragState.current
    const el = scrollerRef.current
    if (!drag || !el) return
    const dx = event.clientX - drag.startX
    if (Math.abs(dx) > 4) drag.moved = true
    el.scrollLeft = drag.startScroll - dx
  }

  const endDrag = () => {
    setIsDragging(false)
    // dragState.current = null sera limpo no proximo mousedown; manter por enquanto
    // para que onClickCapture possa checar `moved`.
    window.setTimeout(() => {
      dragState.current = null
    }, 0)
  }

  // Converte rolagem vertical do mouse em horizontal, para permitir varredura
  // dos cartoes de progresso usando a roda do mouse.
  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    if (!el) return
    if (event.deltaY === 0) return
    if (el.scrollWidth <= el.clientWidth) return
    el.scrollLeft += event.deltaY
    event.preventDefault()
  }

  // Cancela o clique nos botoes quando o gesto foi um arrasto (e nao um toque).
  const blockClickIfDragged = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current?.moved) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const categories = [...new Set(controls.map(c => c.category))]
  const answeredCount = responses.length
  const completionPercentage = controls.length > 0 ? (answeredCount / controls.length) * 100 : 0

  return (
    <div className="bg-white border-b border-slate-200 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">Progresso</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {answeredCount} de {controls.length} respondidos
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              Atual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Conforme
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Não conforme
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              N/A
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-200" />
              Pendente
            </span>
          </div>
        </div>
        
        <div className="mb-3 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-slate-900 transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div
          ref={scrollerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onWheel={handleWheel}
          onClickCapture={blockClickIfDragged}
          className={cn(
            'overflow-x-auto pb-2 select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        >
          <div className="flex min-w-max gap-4">
            {categories.map(category => {
              const categoryControls = controls.filter(c => c.category === category)
              const startIndex = controls.findIndex(c => c.category === category)
              const answeredInCategory = categoryControls.filter(control =>
                responses.some(response => response.controlId === control.id),
              ).length

              return (
                <div
                  key={category}
                  className="min-w-[320px] space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2"
                  style={{ width: Math.max(320, categoryControls.length * 44 + 32) }}
                >
                  <button
                    type="button"
                    onClick={() => onControlClick(startIndex)}
                    className="flex max-w-full items-center gap-2 text-left text-xs font-medium text-slate-500 hover:text-slate-900"
                    title={category}
                  >
                    <span className="truncate">{category}</span>
                    <span className="shrink-0 text-slate-400">
                      {answeredInCategory}/{categoryControls.length}
                    </span>
                  </button>
                  <div className="flex gap-3">
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
                            'relative h-3.5 w-8 shrink-0 rounded-full transition-all',
                            getStatusColor(status),
                            isCurrent && 'z-10 ring-2 ring-slate-900 ring-offset-2',
                            status === 'pendente' && 'bg-slate-200 hover:bg-slate-300',
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
    </div>
  )
}

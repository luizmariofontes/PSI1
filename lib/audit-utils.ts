import { AuditRecord, AuditStats, CategoryStats, Control, ControlResponse } from '../types'


export function calculateStats(responses: ControlResponse[], totalControls: number): AuditStats {
  const conforme = responses.filter(r => r.status === 'conforme').length
  const naoConforme = responses.filter(r => r.status === 'nao-conforme').length
  const emAndamento = responses.filter(r => r.status === 'em-andamento').length
  const naoAplica = responses.filter(r => r.status === 'nao-aplica').length
  
  const applicable = totalControls - naoAplica
  
  return {
    total: totalControls,
    conforme,
    naoConforme,
    emAndamento,
    naoAplica,
    conformePercentage: applicable > 0 ? Math.round((conforme / applicable) * 100) : 0,
    naoConformePercentage: applicable > 0 ? Math.round((naoConforme / applicable) * 100) : 0,
    emAndamentoPercentage: applicable > 0 ? Math.round((emAndamento / applicable) * 100) : 0,
    naoAplicaPercentage: totalControls > 0 ? Math.round((naoAplica / totalControls) * 100) : 0,
  }
}


export function calculateCategoryStats(
  responses: ControlResponse[],
  controls: Control[]
): CategoryStats[] {
  const categories = [...new Set(controls.map(c => c.category))]
  
  return categories.map(category => {
    const categoryControls = controls.filter(c => c.category === category)
    const categoryResponses = responses.filter(r => 
      categoryControls.some(c => c.id === r.controlId)
    )
    
    return {
      category,
      stats: calculateStats(categoryResponses, categoryControls.length),
    }
  })
}


export function getLastAudits(
  audits: AuditRecord[],
  companyName: string,
  module: 'iso27001' | 'iso27701',
  count: number = 3
): AuditRecord[] {
  return audits
    .filter(a => a.companyName === companyName && a.module === module)
    .sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime())
    .slice(0, count)
}


export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}


export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'conforme': 'Conforme',
    'nao-conforme': 'Não Conforme',
    'em-andamento': 'Em Andamento',
    'nao-aplica': 'Não se Aplica',
    'pendente': 'Pendente',
  }
  return labels[status] || status
}


export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'conforme': 'bg-emerald-500',
    'nao-conforme': 'bg-red-500',
    'em-andamento': 'bg-amber-500',
    'nao-aplica': 'bg-slate-400',
    'pendente': 'bg-slate-300',
  }
  return colors[status] || 'bg-slate-300'
}

export function getChartColors() {
  return {
    conforme: '#10b981',
    naoConforme: '#ef4444',
    emAndamento: '#f59e0b',
    naoAplica: '#94a3b8',
  }
}
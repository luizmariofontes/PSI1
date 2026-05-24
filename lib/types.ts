// Types for WhoISO Application

export type ControlStatus = 'conforme' | 'nao-conforme' | 'em-andamento' | 'nao-aplica' | 'pendente'

export interface Control {
  id: string
  code: string
  title: string
  description: string
  category: string
}

export interface ControlResponse {
  controlId: string
  status: ControlStatus
  inProgressDetails?: string
}

export interface AuditRecord {
  id: string
  auditNumber: number
  companyName: string
  auditDate: string
  module: 'iso27001' | 'iso27701'
  responses: ControlResponse[]
  createdAt: string
}

export interface Company {
  id: string
  name: string
  email: string
  password: string
  createdAt: string
}

export interface AuditStats {
  total: number
  conforme: number
  naoConforme: number
  emAndamento: number
  naoAplica: number
  conformePercentage: number
  naoConformePercentage: number
  emAndamentoPercentage: number
  naoAplicaPercentage: number
}

export interface CategoryStats {
  category: string
  stats: AuditStats
}

export type ViewMode = 'login' | 'dashboard' | 'audit' | 'history' | 'account'

export type DashboardMode = 'current' | 'comparative'

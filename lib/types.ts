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

export interface Company {
  id: string
  name: string
  createdAt: string
}
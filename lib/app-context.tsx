'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuditLog, AuditRecord, Company, ControlResponse, DashboardMode, ViewMode } from './types'
import { getTodayDateString } from './audit-utils'

const API_URL = process.env.NEXT_PUBLIC_WHOISO_API_URL || 'http://127.0.0.1:8090'
const TOKEN_KEY = 'whoiso-auth-token'

interface AppState {
  currentCompany: Company | null
  currentModule: 'iso27001' | 'iso27701' | null
  currentAuditDate: string
  currentResponses: ControlResponse[]
  editingAuditId: string | null
  audits: AuditRecord[]
  auditLogs: AuditLog[]
  currentView: ViewMode
  dashboardMode: DashboardMode
  selectedAuditId: string | null
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<boolean>
  signup: (companyName: string, email: string, password: string) => Promise<boolean>
  updateAccount: (data: {
    companyName: string
    email: string
    currentPassword?: string
    newPassword?: string
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  selectModule: (module: 'iso27001' | 'iso27701') => void
  editAudit: (auditId: string) => boolean
  setControlResponse: (controlId: string, status: ControlResponse['status'], inProgressDetails?: string) => void
  saveAudit: () => Promise<void>
  clearCurrentAudit: () => void
  setView: (view: ViewMode) => void
  setDashboardMode: (mode: DashboardMode) => void
  setSelectedAuditId: (id: string | null) => void
  loadAuditLogs: (auditId: string) => Promise<boolean>
  getCompanyAudits: (module?: 'iso27001' | 'iso27701') => AuditRecord[]
  getAuditById: (id: string) => AuditRecord | undefined
}

const AppContext = createContext<AppContextType | undefined>(undefined)

function getToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(TOKEN_KEY) || ''
}

function setToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = 'Nao foi possivel completar a operacao.'
    try {
      const data = await response.json()
      message = data.message || message
    } catch {
      // keep fallback message
    }
    throw new Error(message)
  }

  return response.json()
}

function toCompany(user: { id: string; companyName: string; email: string; createdAt: string }): Company {
  return {
    id: user.id,
    name: user.companyName,
    email: user.email,
    createdAt: user.createdAt,
  }
}

function normalizeAudit(audit: AuditRecord): AuditRecord {
  return {
    ...audit,
    module: audit.module === 'iso27701' ? 'iso27701' : 'iso27001',
    responses: audit.responses || [],
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentCompany: null,
    currentModule: null,
    currentAuditDate: getTodayDateString(),
    currentResponses: [],
    editingAuditId: null,
    audits: [],
    auditLogs: [],
    currentView: 'login',
    dashboardMode: 'current',
    selectedAuditId: null,
  })

  const loadAudits = async () => {
    const audits = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
    setState(prev => ({ ...prev, audits: audits.map(normalizeAudit) }))
    return audits
  }

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let active = true

    async function restoreSession() {
      try {
        const user = await apiRequest<{ id: string; companyName: string; email: string; createdAt: string }>('/api/whoiso/me')
        const audits = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
        if (!active) return
        setState(prev => ({
          ...prev,
          currentCompany: toCompany(user),
          audits: audits.map(normalizeAudit),
          currentView: 'dashboard',
        }))
      } catch {
        clearToken()
      }
    }

    restoreSession()
    return () => {
      active = false
    }
  }, [])

  const login: AppContextType['login'] = async (email, password) => {
    try {
      const data = await apiRequest<{
        token: string
        user: { id: string; companyName: string; email: string; createdAt: string }
      }>('/api/whoiso/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(data.token)
      const audits = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
      setState(prev => ({
        ...prev,
        currentCompany: toCompany(data.user),
        audits: audits.map(normalizeAudit),
        currentView: 'dashboard',
      }))
      return true
    } catch {
      return false
    }
  }

  const signup: AppContextType['signup'] = async (companyName, email, password) => {
    try {
      const data = await apiRequest<{
        token: string
        user: { id: string; companyName: string; email: string; createdAt: string }
      }>('/api/whoiso/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ companyName, email, password }),
      })
      setToken(data.token)
      setState(prev => ({
        ...prev,
        currentCompany: toCompany(data.user),
        audits: [],
        currentView: 'dashboard',
      }))
      return true
    } catch {
      return false
    }
  }

  const logout = () => {
    clearToken()
    setState(prev => ({
      ...prev,
      currentCompany: null,
      currentModule: null,
      currentResponses: [],
      editingAuditId: null,
      audits: [],
      auditLogs: [],
      currentView: 'login',
      selectedAuditId: null,
    }))
  }

  const updateAccount: AppContextType['updateAccount'] = async ({
    companyName,
    email,
    currentPassword,
    newPassword,
  }) => {
    try {
      const user = await apiRequest<{ id: string; companyName: string; email: string; createdAt: string }>('/api/whoiso/account', {
        method: 'PATCH',
        body: JSON.stringify({ companyName, email, currentPassword, newPassword }),
      })
      const updatedCompany = toCompany(user)
      setState(prev => ({
        ...prev,
        currentCompany: updatedCompany,
        audits: prev.audits.map(audit => ({ ...audit, companyName: updatedCompany.name })),
      }))
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nao foi possivel salvar as alteracoes.',
      }
    }
  }

  const selectModule = (module: 'iso27001' | 'iso27701') => {
    setState(prev => ({
      ...prev,
      currentModule: module,
      currentResponses: [],
      editingAuditId: null,
      currentAuditDate: getTodayDateString(),
    }))
  }

  const editAudit = (auditId: string) => {
    const audit = state.audits.find(a => a.id === auditId)
    if (!audit) return false

    setState(prev => ({
      ...prev,
      currentModule: audit.module,
      currentAuditDate: audit.auditDate,
      currentResponses: audit.responses.map(response => ({ ...response })),
      editingAuditId: audit.id,
      currentView: 'audit',
    }))

    return true
  }

  const setControlResponse: AppContextType['setControlResponse'] = (controlId, status, inProgressDetails) => {
    setState(prev => {
      const existingIndex = prev.currentResponses.findIndex(r => r.controlId === controlId)
      const newResponse: ControlResponse = {
        controlId,
        status,
        inProgressDetails: status === 'em-andamento' ? inProgressDetails : undefined,
      }

      if (existingIndex >= 0) {
        const newResponses = [...prev.currentResponses]
        newResponses[existingIndex] = newResponse
        return { ...prev, currentResponses: newResponses }
      }

      return { ...prev, currentResponses: [...prev.currentResponses, newResponse] }
    })
  }

  const saveAudit = async () => {
    if (!state.currentCompany || !state.currentModule) return

    const body = JSON.stringify({
      module: state.currentModule,
      auditDate: state.currentAuditDate,
      responses: state.currentResponses,
    })
    const path = state.editingAuditId
      ? `/api/whoiso/audits/${state.editingAuditId}`
      : '/api/whoiso/audits'
    const method = state.editingAuditId ? 'PUT' : 'POST'
    const savedAudit = normalizeAudit(await apiRequest<AuditRecord>(path, { method, body }))

    setState(prev => ({
      ...prev,
      audits: prev.audits.some(audit => audit.id === savedAudit.id)
        ? prev.audits.map(audit => audit.id === savedAudit.id ? savedAudit : audit)
        : [savedAudit, ...prev.audits],
      currentResponses: [],
      editingAuditId: null,
      selectedAuditId: savedAudit.id,
      currentView: 'dashboard',
    }))

    await loadAudits()
  }

  const clearCurrentAudit = () => {
    setState(prev => ({
      ...prev,
      currentModule: null,
      currentResponses: [],
      editingAuditId: null,
      currentAuditDate: getTodayDateString(),
    }))
  }

  const setView = (view: ViewMode) => {
    setState(prev => ({ ...prev, currentView: view }))
  }

  const setDashboardMode = (mode: DashboardMode) => {
    setState(prev => ({ ...prev, dashboardMode: mode }))
  }

  const setSelectedAuditId = (id: string | null) => {
    setState(prev => ({ ...prev, selectedAuditId: id }))
  }

  const loadAuditLogs: AppContextType['loadAuditLogs'] = async (auditId) => {
    try {
      const logs = await apiRequest<AuditLog[]>(`/api/whoiso/audits/${auditId}/logs`)
      setState(prev => ({
        ...prev,
        selectedAuditId: auditId,
        auditLogs: logs,
        currentView: 'auditLogs',
      }))
      return true
    } catch {
      return false
    }
  }

  const getCompanyAudits = (module?: 'iso27001' | 'iso27701') => {
    if (!state.currentCompany) return []
    let audits = state.audits
    if (module) {
      audits = audits.filter(a => a.module === module)
    }
    return [...audits].sort((a, b) => {
      const dateDiff = new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime()
      return dateDiff || b.auditNumber - a.auditNumber
    })
  }

  const getAuditById = (id: string) => {
    return state.audits.find(a => a.id === id)
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        signup,
        updateAccount,
        logout,
        selectModule,
        editAudit,
        setControlResponse,
        saveAudit,
        clearCurrentAudit,
        setView,
        setDashboardMode,
        setSelectedAuditId,
        loadAuditLogs,
        getCompanyAudits,
        getAuditById,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

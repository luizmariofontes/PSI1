'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuditLog, AuditRecord, AuthActionResult, AuthChallenge, Company, CompanyDetails, ControlResponse, DashboardMode, EvidenceFile, ViewMode } from './types'
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
  isInitializing: boolean
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<AuthActionResult>
  signup: (companyName: string, email: string, password: string) => Promise<AuthActionResult>
  signupUser: (email: string, password: string, name?: string) => Promise<AuthActionResult>
  signupCompany: (companyName: string, email: string, password: string) => Promise<AuthActionResult>
  verifyOTP: (challengeId: string, code: string) => Promise<AuthActionResult>
  updateAccount: (data: {
    companyName: string
    email: string
    currentPassword?: string
    newPassword?: string
  }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  selectModule: (module: 'iso27001' | 'iso27701') => void
  editAudit: (auditId: string) => Promise<boolean>
  refreshAudits: () => Promise<void>
  setControlResponse: (
    controlId: string,
    status: ControlResponse['status'],
    options?: { inProgressDetails?: string; evidence?: string; evidenceFile?: EvidenceFile | null },
  ) => void
  saveAudit: () => Promise<void>
  syncAuditResponses: (responses: ControlResponse[]) => Promise<{ success: boolean; error?: string }>
  clearCurrentAudit: () => void
  setView: (view: ViewMode) => void
  setDashboardMode: (mode: DashboardMode) => void
  setSelectedAuditId: (id: string | null) => void
  loadAuditLogs: (auditId: string) => Promise<boolean>
  getCompanyAudits: (module?: 'iso27001' | 'iso27701') => AuditRecord[]
  getAuditById: (id: string) => AuditRecord | undefined
  uploadEvidenceFile: (auditId: string, controlId: string, file: File) => Promise<{ success: boolean; error?: string; evidence?: EvidenceFile }>
  deleteEvidenceFile: (evidenceId: string) => Promise<{ success: boolean; error?: string }>
  buildEvidenceDownloadUrl: (evidenceId: string) => string
  loadCompany: () => Promise<CompanyDetails | null>
  renameCompany: (name: string) => Promise<{ success: boolean; error?: string; company?: CompanyDetails }>
  inviteCompanyMember: (email: string) => Promise<{ success: boolean; error?: string; company?: CompanyDetails }>
  removeCompanyMember: (memberId: string) => Promise<{ success: boolean; error?: string; company?: CompanyDetails }>
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

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.')
  }

  if (!response.ok) {
    let message = 'Não foi possível completar a operação.'
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

function toCompany(user: { id: string; companyName: string; companyId?: string; email: string; createdAt: string }): Company {
  return {
    id: user.id,
    name: user.companyName,
    email: user.email,
    createdAt: user.createdAt,
    companyId: user.companyId,
  }
}

function normalizeAudit(audit: AuditRecord): AuditRecord {
  return {
    ...audit,
    module: audit.module === 'iso27701' ? 'iso27701' : 'iso27001',
    responses: audit.responses || [],
  }
}

// Funcao pura usada pelo provider e por chamadas que precisam computar o novo
// array de respostas SEM passar pelo setState (ex.: auto-save de evidencia).
export function mergeControlResponse(
  responses: ControlResponse[],
  controlId: string,
  status: ControlResponse['status'],
  options?: { inProgressDetails?: string; evidence?: string; evidenceFile?: EvidenceFile | null },
): ControlResponse[] {
  const existingIndex = responses.findIndex(r => r.controlId === controlId)
  const previous = existingIndex >= 0 ? responses[existingIndex] : undefined

  const evidence = options?.evidence !== undefined ? options.evidence : previous?.evidence
  const inProgressDetails =
    status === 'em-andamento'
      ? (options?.inProgressDetails !== undefined ? options.inProgressDetails : previous?.inProgressDetails)
      : undefined
  const evidenceFile =
    options?.evidenceFile === null
      ? undefined
      : options?.evidenceFile !== undefined
        ? options.evidenceFile
        : previous?.evidenceFile

  const next: ControlResponse = {
    controlId,
    status,
    inProgressDetails,
    evidence: evidence && evidence.trim() !== '' ? evidence : undefined,
    evidenceFile,
  }

  if (existingIndex >= 0) {
    const copy = [...responses]
    copy[existingIndex] = next
    return copy
  }
  return [...responses, next]
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
    isInitializing: true,
  })

  const loadAudits = async () => {
    const audits = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
    setState(prev => ({ ...prev, audits: audits.map(normalizeAudit) }))
    return audits
  }

  const applyAuthResponse = async (data: {
    token: string
    user: { id: string; companyName: string; companyId?: string; email: string; createdAt: string }
  }) => {
    setToken(data.token)
    let audits: AuditRecord[] = []
    try {
      audits = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
    } catch {
      // O OTP ja foi validado e o token salvo; falha ao carregar auditorias nao deve invalidar o login.
    }
    setState(prev => ({
      ...prev,
      currentCompany: toCompany(data.user),
      audits: audits.map(normalizeAudit),
      currentView: 'dashboard',
    }))
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setState(prev => ({ ...prev, isInitializing: false }))
      return
    }

    let active = true

    async function restoreSession() {
      try {
        const user = await apiRequest<{ id: string; companyName: string; companyId?: string; email: string; createdAt: string }>('/api/whoiso/me')
        const audits = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
        if (!active) return
        setState(prev => ({
          ...prev,
          currentCompany: toCompany(user),
          audits: audits.map(normalizeAudit),
          currentView: 'dashboard',
          isInitializing: false,
        }))
      } catch {
        clearToken()
        if (active) {
          setState(prev => ({ ...prev, isInitializing: false }))
        }
      }
    }

    restoreSession()
    return () => {
      active = false
    }
  }, [])

  const login: AppContextType['login'] = async (email, password) => {
    try {
      const challenge = await apiRequest<AuthChallenge>('/api/whoiso/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      return { success: true, challenge }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credenciais nao encontradas.',
      }
    }
  }

  const runSignup = async (payload: Record<string, string>): Promise<AuthActionResult> => {
    try {
      const challenge = await apiRequest<AuthChallenge>('/api/whoiso/auth/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return { success: true, challenge }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nao foi possivel concluir o cadastro.',
      }
    }
  }

  // Mantido para compatibilidade com chamadas antigas (modo empresa).
  const signup: AppContextType['signup'] = (companyName, email, password) =>
    runSignup({ mode: 'company', companyName, email, password })

  const signupCompany: AppContextType['signupCompany'] = (companyName, email, password) =>
    runSignup({ mode: 'company', companyName, email, password })

  const signupUser: AppContextType['signupUser'] = (email, password, name) =>
    runSignup({ mode: 'user', email, password, name: name || '' })

  const verifyOTP: AppContextType['verifyOTP'] = async (challengeId, code) => {
    try {
      const data = await apiRequest<{
        token: string
        user: { id: string; companyName: string; companyId?: string; email: string; createdAt: string }
      }>('/api/whoiso/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId, code }),
      })
      await applyAuthResponse(data)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Codigo invalido.',
      }
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
      const user = await apiRequest<{ id: string; companyName: string; companyId?: string; email: string; createdAt: string }>('/api/whoiso/account', {
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

  const editAudit: AppContextType['editAudit'] = async (auditId) => {
    // Sempre buscamos a versao mais atual antes de abrir a auditoria, para que
    // evidencias gravadas por outros membros da empresa fiquem visiveis sem
    // depender de quando o usuario logou.
    let normalized: AuditRecord[] | null = null
    try {
      const fresh = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
      normalized = fresh.map(normalizeAudit)
    } catch {
      // fallback silencioso para o cache local se houver falha de rede
    }

    const source = normalized ?? state.audits
    const audit = source.find(a => a.id === auditId)
    if (!audit) return false

    setState(prev => ({
      ...prev,
      audits: normalized ?? prev.audits,
      currentModule: audit.module,
      currentAuditDate: audit.auditDate,
      currentResponses: audit.responses.map(response => ({ ...response })),
      editingAuditId: audit.id,
      currentView: 'audit',
    }))

    return true
  }

  const refreshAudits: AppContextType['refreshAudits'] = async () => {
    try {
      const fresh = await apiRequest<AuditRecord[]>('/api/whoiso/audits')
      setState(prev => ({ ...prev, audits: fresh.map(normalizeAudit) }))
    } catch {
      // ignorar erro: refresh eh oportunista
    }
  }

  const setControlResponse: AppContextType['setControlResponse'] = (controlId, status, options) => {
    setState(prev => ({
      ...prev,
      currentResponses: mergeControlResponse(prev.currentResponses, controlId, status, options),
    }))
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

  // Persiste no backend o conjunto fornecido de respostas SEM limpar o estado
  // local nem navegar (diferente de saveAudit). Usado para sincronizar
  // imediatamente evidencias com outros membros da empresa.
  const syncAuditResponses: AppContextType['syncAuditResponses'] = async (responses) => {
    const auditId = state.editingAuditId
    if (!auditId || !state.currentModule) {
      return { success: false, error: 'Auditoria nao esta em modo de edicao.' }
    }
    try {
      const body = JSON.stringify({
        module: state.currentModule,
        auditDate: state.currentAuditDate,
        responses,
      })
      const saved = normalizeAudit(
        await apiRequest<AuditRecord>(`/api/whoiso/audits/${auditId}`, { method: 'PUT', body }),
      )
      setState(prev => ({
        ...prev,
        audits: prev.audits.map(audit => audit.id === saved.id ? saved : audit),
      }))
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao sincronizar.',
      }
    }
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

  const uploadEvidenceFile: AppContextType['uploadEvidenceFile'] = async (auditId, controlId, file) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'Arquivo excede o limite de 5MB.' }
      }
      const formData = new FormData()
      formData.append('controlId', controlId)
      formData.append('file', file)

      const token = getToken()
      const headers = new Headers()
      if (token) headers.set('Authorization', `Bearer ${token}`)

      const response = await fetch(`${API_URL}/api/whoiso/audits/${auditId}/evidences`, {
        method: 'POST',
        headers,
        body: formData,
      })
      if (!response.ok) {
        let message = 'Nao foi possivel enviar o arquivo.'
        try {
          const data = await response.json()
          message = data.message || message
        } catch {}
        return { success: false, error: message }
      }
      const data = await response.json()
      return {
        success: true,
        evidence: {
          id: data.id,
          fileName: data.fileName,
          size: data.size,
          createdAt: data.createdAt,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Falha no upload da evidencia.',
      }
    }
  }

  const deleteEvidenceFile: AppContextType['deleteEvidenceFile'] = async (evidenceId) => {
    try {
      const token = getToken()
      const headers = new Headers()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      const response = await fetch(`${API_URL}/api/whoiso/evidences/${evidenceId}`, {
        method: 'DELETE',
        headers,
      })
      if (!response.ok && response.status !== 204) {
        return { success: false, error: 'Nao foi possivel remover o arquivo.' }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao remover.',
      }
    }
  }

  const buildEvidenceDownloadUrl: AppContextType['buildEvidenceDownloadUrl'] = (evidenceId) => {
    const token = getToken()
    const url = new URL(`${API_URL}/api/whoiso/evidences/${evidenceId}`)
    if (token) url.searchParams.set('token', token)
    return url.toString()
  }

  const loadCompany: AppContextType['loadCompany'] = async () => {
    try {
      return await apiRequest<CompanyDetails>('/api/whoiso/company')
    } catch {
      return null
    }
  }

  const renameCompany: AppContextType['renameCompany'] = async (name) => {
    try {
      const company = await apiRequest<CompanyDetails>('/api/whoiso/company', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      })
      setState(prev => ({
        ...prev,
        currentCompany: prev.currentCompany ? { ...prev.currentCompany, name: company.name } : prev.currentCompany,
      }))
      return { success: true, company }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nao foi possivel atualizar a empresa.',
      }
    }
  }

  const inviteCompanyMember: AppContextType['inviteCompanyMember'] = async (email) => {
    try {
      const company = await apiRequest<CompanyDetails>('/api/whoiso/company/invite', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      await loadAudits()
      return { success: true, company }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nao foi possivel adicionar o membro.',
      }
    }
  }

  const removeCompanyMember: AppContextType['removeCompanyMember'] = async (memberId) => {
    try {
      const company = await apiRequest<CompanyDetails>(`/api/whoiso/company/members/${memberId}`, {
        method: 'DELETE',
      })
      if (memberId === state.currentCompany?.id) {
        setState(prev => ({
          ...prev,
          currentCompany: prev.currentCompany
            ? { ...prev.currentCompany, companyId: undefined, name: prev.currentCompany.email }
            : prev.currentCompany,
          currentModule: null,
          currentResponses: [],
          editingAuditId: null,
          audits: [],
          auditLogs: [],
          selectedAuditId: null,
          currentView: 'dashboard',
        }))
      } else {
        await loadAudits()
      }
      return { success: true, company }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Nao foi possivel remover o membro.',
      }
    }
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        login,
        signup,
        signupUser,
        signupCompany,
        verifyOTP,
        updateAccount,
        logout,
        selectModule,
        editAudit,
        refreshAudits,
        setControlResponse,
        saveAudit,
        syncAuditResponses,
        clearCurrentAudit,
        setView,
        setDashboardMode,
        setSelectedAuditId,
        loadAuditLogs,
        getCompanyAudits,
        getAuditById,
        uploadEvidenceFile,
        deleteEvidenceFile,
        buildEvidenceDownloadUrl,
        loadCompany,
        renameCompany,
        inviteCompanyMember,
        removeCompanyMember,
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

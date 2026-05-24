'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuditRecord, Company, ControlResponse, ViewMode, DashboardMode } from './types'
import { generateId, getTodayDateString } from './audit-utils'

interface AppState {
  // Company
  currentCompany: Company | null
  companies: Company[]
  
  // Audit
  currentModule: 'iso27001' | 'iso27701' | null
  currentAuditDate: string
  currentResponses: ControlResponse[]
  editingAuditId: string | null
  audits: AuditRecord[]
  
  // Navigation
  currentView: ViewMode
  dashboardMode: DashboardMode
  selectedAuditId: string | null
}

interface AppContextType extends AppState {
  // Company actions
  login: (email: string, password: string) => boolean
  signup: (companyName: string, email: string, password: string) => boolean
  updateAccount: (data: {
    companyName: string
    email: string
    currentPassword?: string
    newPassword?: string
  }) => { success: boolean; error?: string }
  logout: () => void
  
  // Audit actions
  selectModule: (module: 'iso27001' | 'iso27701') => void
  editAudit: (auditId: string) => boolean
  setControlResponse: (controlId: string, status: ControlResponse['status'], inProgressDetails?: string) => void
  saveAudit: () => void
  clearCurrentAudit: () => void
  
  // Navigation
  setView: (view: ViewMode) => void
  setDashboardMode: (mode: DashboardMode) => void
  setSelectedAuditId: (id: string | null) => void
  
  // Data
  getCompanyAudits: (module?: 'iso27001' | 'iso27701') => AuditRecord[]
  getAuditById: (id: string) => AuditRecord | undefined
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const STORAGE_KEY = 'whoiso-data'

function normalizeAudits(audits: Partial<AuditRecord>[]): AuditRecord[] {
  const nextNumberByCompany = new Map<string, number>()

  return audits.map((audit, index) => {
    const companyName = audit.companyName || 'Empresa'
    const nextNumber = nextNumberByCompany.get(companyName) || 1
    const auditNumber = audit.auditNumber || nextNumber

    nextNumberByCompany.set(companyName, Math.max(nextNumber, auditNumber) + 1)

    return {
      id: audit.id || generateId(),
      auditNumber,
      companyName,
      auditDate: audit.auditDate || getTodayDateString(),
      module: audit.module === 'iso27701' ? 'iso27701' : 'iso27001',
      responses: audit.responses || [],
      createdAt: audit.createdAt || new Date(Date.now() + index).toISOString(),
    }
  })
}

function loadFromStorage(): Partial<AppState> {
  if (typeof window === 'undefined') return {}
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      const companies = (parsed.companies || []).map((company: Partial<Company>) => ({
        ...company,
        email: company.email || `${company.name || 'empresa'}@local.test`.toLowerCase().replace(/\s+/g, ''),
        password: company.password || 'whoiso123',
      }))

      return {
        ...parsed,
        companies,
        audits: normalizeAudits(parsed.audits || []),
      }
    }
  } catch (e) {
    console.error('Error loading from storage:', e)
  }
  return {}
}

function saveToStorage(state: Partial<AppState>) {
  if (typeof window === 'undefined') return
  
  try {
    const dataToSave = {
      companies: state.companies,
      audits: state.audits,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (e) {
    console.error('Error saving to storage:', e)
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentCompany: null,
    companies: [],
    currentModule: null,
    currentAuditDate: getTodayDateString(),
    currentResponses: [],
    editingAuditId: null,
    audits: [],
    currentView: 'login' as ViewMode,
    dashboardMode: 'current',
    selectedAuditId: null,
  })

  // Load data from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored.companies || stored.audits) {
      setState(prev => ({
        ...prev,
        companies: stored.companies || [],
        audits: stored.audits || [],
      }))
    }
  }, [])

  // Save to localStorage when companies or audits change
  useEffect(() => {
    saveToStorage({ companies: state.companies, audits: state.audits })
  }, [state.companies, state.audits])

  const login = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const company = state.companies.find(
      c => c.email.toLowerCase() === normalizedEmail && c.password === password
    )

    if (!company) {
      return false
    }

    setState(prev => ({
      ...prev,
      currentCompany: company,
      currentView: 'dashboard',
    }))

    return true
  }

  const signup = (companyName: string, email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const existingCompany = state.companies.find(c => c.email.toLowerCase() === normalizedEmail)

    if (existingCompany) {
      return false
    }

    const company = {
      id: generateId(),
      name: companyName.trim(),
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    }

    setState(prev => ({
      ...prev,
      companies: [...prev.companies, company],
      currentCompany: company,
      currentView: 'dashboard',
    }))

    return true
  }

  const logout = () => {
    setState(prev => ({
      ...prev,
      currentCompany: null,
      currentModule: null,
      currentResponses: [],
      editingAuditId: null,
      currentView: 'login',
      selectedAuditId: null,
    }))
  }

  const updateAccount: AppContextType['updateAccount'] = ({
    companyName,
    email,
    currentPassword,
    newPassword,
  }) => {
    if (!state.currentCompany) {
      return { success: false, error: 'Sessão não encontrada.' }
    }

    const trimmedName = companyName.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const trimmedPassword = newPassword?.trim() || ''

    if (!trimmedName || !normalizedEmail) {
      return { success: false, error: 'Informe nome da empresa e email.' }
    }

    const emailOwner = state.companies.find(company =>
      company.email.toLowerCase() === normalizedEmail && company.id !== state.currentCompany!.id
    )

    if (emailOwner) {
      return { success: false, error: 'Este email ja esta em uso.' }
    }

    if (trimmedPassword) {
      if (currentPassword !== state.currentCompany.password) {
        return { success: false, error: 'Senha atual incorreta.' }
      }

      if (trimmedPassword.length < 6) {
        return { success: false, error: 'A nova senha deve ter pelo menos 6 caracteres.' }
      }
    }

    const previousCompanyName = state.currentCompany.name
    const updatedCompany: Company = {
      ...state.currentCompany,
      name: trimmedName,
      email: normalizedEmail,
      password: trimmedPassword || state.currentCompany.password,
    }

    setState(prev => ({
      ...prev,
      currentCompany: updatedCompany,
      companies: prev.companies.map(company => company.id === updatedCompany.id ? updatedCompany : company),
      audits: prev.audits.map(audit =>
        audit.companyName === previousCompanyName
          ? { ...audit, companyName: updatedCompany.name }
          : audit,
      ),
    }))

    return { success: true }
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

    if (!audit) {
      return false
    }

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

  const setControlResponse = (
    controlId: string,
    status: ControlResponse['status'],
    inProgressDetails?: string
  ) => {
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
      } else {
        return { ...prev, currentResponses: [...prev.currentResponses, newResponse] }
      }
    })
  }

  const saveAudit = () => {
    if (!state.currentCompany || !state.currentModule) return

    if (state.editingAuditId) {
      const updatedAudit: AuditRecord = {
        id: state.editingAuditId,
        auditNumber: state.audits.find(a => a.id === state.editingAuditId)?.auditNumber || 1,
        companyName: state.currentCompany.name,
        auditDate: state.currentAuditDate,
        module: state.currentModule,
        responses: state.currentResponses,
        createdAt: state.audits.find(a => a.id === state.editingAuditId)?.createdAt || new Date().toISOString(),
      }

      setState(prev => ({
        ...prev,
        audits: prev.audits.map(audit => audit.id === state.editingAuditId ? updatedAudit : audit),
        currentResponses: [],
        editingAuditId: null,
        selectedAuditId: updatedAudit.id,
        currentView: 'dashboard',
      }))

      return
    }
    
    const audit: AuditRecord = {
      id: generateId(),
      auditNumber:
        Math.max(
          0,
          ...state.audits
            .filter(audit => audit.companyName === state.currentCompany!.name)
            .map(audit => audit.auditNumber),
        ) + 1,
      companyName: state.currentCompany.name,
      auditDate: state.currentAuditDate,
      module: state.currentModule,
      responses: state.currentResponses,
      createdAt: new Date().toISOString(),
    }
    
    setState(prev => ({
      ...prev,
      audits: [...prev.audits, audit],
      currentResponses: [],
      editingAuditId: null,
      selectedAuditId: audit.id,
      currentView: 'dashboard',
    }))
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

  const getCompanyAudits = (module?: 'iso27001' | 'iso27701') => {
    if (!state.currentCompany) return []
    
    let audits = state.audits.filter(a => a.companyName === state.currentCompany!.name)
    
    if (module) {
      audits = audits.filter(a => a.module === module)
    }
    
    return audits.sort((a, b) => {
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

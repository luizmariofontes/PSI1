'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuditRecord, Company, ControlResponse, ViewMode, DashboardMode } from './types'
import { generateId } from './audit-utils'

interface AppState {
  // Company
  currentCompany: Company | null
  companies: Company[]
  
  // Audit
  currentModule: 'iso27001' | 'iso27701' | null
  currentAuditDate: string
  currentResponses: ControlResponse[]
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
  logout: () => void
  
  // Audit actions
  selectModule: (module: 'iso27001' | 'iso27701') => void
  setAuditDate: (date: string) => void
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

function loadFromStorage(): Partial<AppState> {
  if (typeof window === 'undefined') return {}
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      const companies = (parsed.companies || []).map((company: Partial<Company>) => ({
        ...company,
        email: company.email || `${company.name || 'empresa'}@mock.local`.toLowerCase().replace(/\s+/g, ''),
        password: company.password || 'mock123',
      }))

      return {
        ...parsed,
        companies,
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
    currentAuditDate: new Date().toISOString().split('T')[0],
    currentResponses: [],
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
      currentView: 'login',
      selectedAuditId: null,
    }))
  }

  const selectModule = (module: 'iso27001' | 'iso27701') => {
    setState(prev => ({
      ...prev,
      currentModule: module,
      currentResponses: [],
      currentAuditDate: new Date().toISOString().split('T')[0],
    }))
  }

  const setAuditDate = (date: string) => {
    setState(prev => ({
      ...prev,
      currentAuditDate: date,
    }))
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
    
    const audit: AuditRecord = {
      id: generateId(),
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
      selectedAuditId: audit.id,
      currentView: 'dashboard',
    }))
  }

  const clearCurrentAudit = () => {
    setState(prev => ({
      ...prev,
      currentModule: null,
      currentResponses: [],
      currentAuditDate: new Date().toISOString().split('T')[0],
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
    
    return audits.sort((a, b) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime())
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
        logout,
        selectModule,
        setAuditDate,
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

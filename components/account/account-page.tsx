'use client'

import { useEffect, useState } from 'react'
import { Building2, CheckCircle2, Lock, Mail, Settings } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/audit-utils'

export function AccountPage() {
  const { currentCompany, getCompanyAudits, updateAccount } = useApp()
  const [companyName, setCompanyName] = useState(currentCompany?.name || '')
  const [email, setEmail] = useState(currentCompany?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const audits = getCompanyAudits()

  useEffect(() => {
    setCompanyName(currentCompany?.name || '')
    setEmail(currentCompany?.email || '')
  }, [currentCompany?.name, currentCompany?.email])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword || confirmPassword || currentPassword) {
      if (!newPassword || !confirmPassword || !currentPassword) {
        setError('Preencha senha atual, nova senha e confirmação para alterar a senha.')
        return
      }

      if (newPassword !== confirmPassword) {
        setError('A confirmação da senha não confere.')
        return
      }
    }

    const result = updateAccount({
      companyName,
      email,
      currentPassword,
      newPassword,
    })

    if (!result.success) {
      setError(result.error || 'Não foi possível salvar as alterações.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess('Dados atualizados com sucesso.')
  }

  if (!currentCompany) {
    return null
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie dados de acesso e informações da empresa.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Dados de acesso</h2>
              <p className="text-xs text-slate-500">As alterações são salvas localmente.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(event) => {
                      setCompanyName(event.target.value)
                      setError('')
                      setSuccess('')
                    }}
                    className="h-12 rounded-xl pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="accountEmail"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError('')
                      setSuccess('')
                    }}
                    className="h-12 rounded-xl pl-11"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">Alterar senha</h3>
                <p className="text-xs text-slate-500">Deixe em branco para manter a senha atual.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => {
                        setCurrentPassword(event.target.value)
                        setError('')
                        setSuccess('')
                      }}
                      className="h-12 rounded-xl bg-white pl-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value)
                      setError('')
                      setSuccess('')
                    }}
                    className="h-12 rounded-xl bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      setError('')
                      setSuccess('')
                    }}
                    className="h-12 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" className="h-11 rounded-xl bg-blue-600 px-6 font-semibold hover:bg-blue-700">
                Salvar alterações
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Empresa</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{currentCompany.name}</p>
            <p className="mt-1 text-sm text-slate-500">{currentCompany.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Resumo</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Auditorias</span>
                <span className="font-semibold text-slate-900">{audits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cadastro</span>
                <span className="font-semibold text-slate-900">{formatDate(currentCompany.createdAt)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

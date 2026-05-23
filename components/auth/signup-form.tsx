'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Building2, CheckCircle2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignupForm() {
  const router = useRouter()
  const { signup } = useApp()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName.trim() || !email.trim() || !password) {
      setError('Preencha nome da empresa, email e senha.')
      return
    }

    if (password.length < 6) {
      setError('Use uma senha mock com pelo menos 6 caracteres.')
      return
    }

    const created = signup(companyName, email, password)

    if (!created) {
      setError('Este email ja existe no mock.')
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:min-h-[calc(100vh-4rem)] md:grid-cols-[0.95fr_1.05fr]">
        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
                W
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">WhoISO</p>
                <p className="text-sm text-slate-500">Novo ambiente mock</p>
              </div>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-500">Cadastro</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Crie sua conta</h1>
            <p className="mt-2 text-sm text-slate-500">
              Cadastre a empresa para acessar o dashboard imediatamente.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Acme Segurança"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value)
                      setError('')
                    }}
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signupPassword">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="signupPassword"
                    type="password"
                    placeholder="Minimo de 6 caracteres"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button type="submit" className="h-11 w-full rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-700">
                Criar conta
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Ja tem conta?{' '}
              <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Entrar
              </Link>
            </p>
          </div>
        </section>

        <section className="hidden bg-[#0f172a] p-10 text-white md:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Compliance workspace
              </div>

              <h2 className="mt-10 max-w-md text-4xl font-bold leading-tight">
                Uma base limpa para diagnosticar ISO 27001 e ISO 27701.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                O cadastro mock cria a empresa localmente e libera a experiencia completa do produto.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Dashboard com indicadores de auditoria', color: '#6366f1' },
                { label: 'Historico por empresa cadastrada', color: '#10b981' },
                { label: 'Fluxos separados para seguranca e privacidade', color: '#f59e0b' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <CheckCircle2 className="h-5 w-5" style={{ color }} />
                  <p className="text-sm font-medium text-slate-200">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

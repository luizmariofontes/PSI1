'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WhoISOLogo } from '@/components/brand/whoiso-logo'

export function LoginForm() {
  const router = useRouter()
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password) {
      setError('Informe email e senha para continuar.')
      return
    }

    setLoading(true)
    const loggedIn = await login(email, password)
    setLoading(false)

    if (!loggedIn) {
      setError('Credenciais não encontradas.')
      return
    }

    router.push('/')
  }

  return (
    <div className="grid min-h-screen bg-white md:grid-cols-[1.06fr_0.94fr]">
      <section className="hidden min-h-screen flex-col justify-between bg-[#0f172a] px-12 py-10 text-white lg:px-16 md:flex">
        <div>
          <WhoISOLogo inverse mode="dark" className="w-48" />

          <div className="mt-20 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">Acesso seguro</p>
            <h1 className="mt-4 text-5xl font-bold leading-tight tracking-normal lg:text-6xl">
              Acompanhe a maturidade ISO da sua empresa.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
              Entre para visualizar indicadores, iniciar auditorias e revisar o histórico de conformidade em um só lugar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'ISO 27001', icon: ShieldCheck, color: '#10b981' },
            { label: 'Controles', icon: BarChart3, color: '#3b82f6' },
            { label: 'Privacidade', icon: Lock, color: '#f59e0b' },
          ].map(({ label, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <Icon className="h-5 w-5" style={{ color }} />
              <p className="mt-4 text-sm font-medium text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-10 md:hidden">
            <WhoISOLogo className="w-48" />
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">Login</p>
          <h2 className="mt-3 text-4xl font-bold text-slate-900">Bem-vindo de volta</h2>
          <p className="mt-3 text-base text-slate-500">
            Use suas credenciais cadastradas para acessar o painel.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  className="h-12 rounded-xl pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  className="h-12 rounded-xl pl-11"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-blue-600 font-semibold hover:bg-blue-700">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500">
            Ainda nao tem conta?{' '}
            <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
              Criar cadastro
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}

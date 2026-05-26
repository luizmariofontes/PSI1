'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_WHOISO_API_URL || 'http://127.0.0.1:8090'

interface InviteConfirmationPageProps {
  token: string
}

export function InviteConfirmationPage({ token }: InviteConfirmationPageProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Confirmando convite...')

  useEffect(() => {
    let active = true

    async function confirmInvite() {
      if (!token) {
        setStatus('error')
        setMessage('Convite inválido ou ausente.')
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/whoiso/company/invite/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await response.json().catch(() => ({}))
        if (!active) return

        if (!response.ok) {
          setStatus('error')
          setMessage(data.message || 'Não foi possível confirmar o convite.')
          return
        }

        setStatus('success')
        setMessage(data.message || 'Convite confirmado com sucesso.')
      } catch {
        if (!active) return
        setStatus('error')
        setMessage('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.')
      }
    }

    confirmInvite()
    return () => {
      active = false
    }
  }, [token])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
          {status === 'loading' && <Loader2 className="h-7 w-7 animate-spin text-blue-600" />}
          {status === 'success' && <CheckCircle2 className="h-7 w-7 text-emerald-600" />}
          {status === 'error' && <XCircle className="h-7 w-7 text-red-600" />}
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {status === 'success' ? 'Convite confirmado' : status === 'error' ? 'Convite não confirmado' : 'Confirmando convite'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
        <Button asChild className="mt-6 h-11 rounded-xl bg-blue-600 px-6 font-semibold hover:bg-blue-700">
          <a href="/login">Ir para o login</a>
        </Button>
      </section>
    </main>
  )
}

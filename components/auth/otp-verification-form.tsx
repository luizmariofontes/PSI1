'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AuthChallenge } from '@/lib/types'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

interface OTPVerificationFormProps {
  challenge: AuthChallenge
  onBack: () => void
  onVerified: () => void
}

export function OTPVerificationForm({ challenge, onBack, onVerified }: OTPVerificationFormProps) {
  const { verifyOTP } = useApp()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (code.length !== 6) {
      setError('Informe o codigo de 6 digitos.')
      return
    }

    setLoading(true)
    const result = await verifyOTP(challenge.challengeId, code)
    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Codigo invalido.')
      return
    }

    onVerified()
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <ShieldCheck className="h-6 w-6" />
      </div>

      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
        Verificacao
      </p>
      <h2 className="mt-3 text-4xl font-bold text-slate-900">
        Informe o codigo
      </h2>
      <p className="mt-3 text-base leading-7 text-slate-500">
        Enviamos um codigo de 6 digitos para <span className="font-semibold text-slate-700">{challenge.email}</span>.
      </p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-6">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => {
            setCode(value)
            setError('')
          }}
          containerClassName="justify-center gap-3"
        >
          <InputOTPGroup className="gap-3">
            {[0, 1, 2, 3, 4, 5].map(index => (
              <InputOTPSlot
                key={index}
                index={index}
                className="h-14 w-12 rounded-xl border text-lg font-semibold"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-blue-600 font-semibold hover:bg-blue-700">
          {loading ? 'Validando...' : 'Validar codigo'}
        </Button>

        <Button type="button" variant="ghost" onClick={onBack} className="h-11 w-full rounded-xl">
          Voltar
        </Button>
      </form>
    </div>
  )
}

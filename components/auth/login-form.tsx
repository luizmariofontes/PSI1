'use client'

import { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const { login } = useApp()
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!companyName.trim()) {
      setError('Por favor, informe o nome da empresa')
      return
    }
    
    login(companyName.trim())
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-slate-900">WhoISO</h1>
            <p className="text-sm text-slate-500 mt-1">Sistema de Diagnóstico de Conformidade</p>
          </div>
          <CardTitle className="text-xl">Acesso ao Sistema</CardTitle>
          <CardDescription>
            Informe o nome da sua empresa para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Nome da Empresa</Label>
              <Input
                id="company"
                type="text"
                placeholder="Digite o nome da empresa"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value)
                  setError('')
                }}
                className="w-full"
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
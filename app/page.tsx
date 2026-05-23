'use client'

import { AppProvider } from '@/lib/app-context'
import { WhoISOApp } from '@/components/whoiso-app'

export default function Home() {
  return (
    <AppProvider>
      <WhoISOApp />
    </AppProvider>
  )
}
'use client'
import { SessionProvider } from 'next-auth/react'
import { LangProvider } from '@/lib/LangContext'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LangProvider>
        {children}
      </LangProvider>
    </SessionProvider>
  )
}

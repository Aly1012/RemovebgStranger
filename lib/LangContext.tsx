'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { Locale, translations, TranslationKey } from '@/lib/i18n'

interface LangContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => translations.en[key],
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')
  const t = (key: TranslationKey) => translations[locale][key]
  return (
    <LangContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)

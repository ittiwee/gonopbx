import { createContext, useContext, useMemo, useState } from 'react'

export type Language = 'en' | 'de'

const DEFAULT_LANG = (import.meta.env.VITE_UI_LANG as Language) || 'en'

type I18nContextValue = {
  lang: Language
  setLang: (lang: Language) => void
  tr: (de: string, en: string) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(DEFAULT_LANG === 'de' ? 'de' : 'en')

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    tr: (de: string, en: string) => (lang === 'de' ? de : en),
  }), [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

'use client'

// lib/LangContext.tsx
// Contexte global de langue — FR / AR

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Lang, t as translate } from './translations'

type LangContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
  isAr: boolean
}

const LangContext = createContext<LangContextType>({
  lang: 'fr',
  setLang: () => {},
  t: (k) => k,
  isAr: false,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    // Récupérer la langue sauvegardée
    const saved = localStorage.getItem('beti-lang') as Lang
    if (saved === 'ar' || saved === 'fr') {
      setLangState(saved)
      applyLang(saved)
    }
  }, [])

  const applyLang = (l: Lang) => {
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
  }

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('beti-lang', l)
    applyLang(l)
  }

  const t = (key: string) => translate(key, lang)

  return (
    <LangContext.Provider value={{ lang, setLang, t, isAr: lang === 'ar' }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}

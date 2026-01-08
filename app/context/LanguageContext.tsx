'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations } from '@/app/utils/supabase/../translations' // Adjust path if needed

type Language = 'en' | 'ru'

interface LanguageContextType {
  lang: Language
  t: typeof translations['en']
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en')

  // Load saved language from browser storage
  useEffect(() => {
    const saved = localStorage.getItem('app_lang') as Language
    if (saved) setLang(saved)
  }, [])

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'ru' : 'en'
    setLang(newLang)
    localStorage.setItem('app_lang', newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
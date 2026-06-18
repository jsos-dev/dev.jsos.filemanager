import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import en from './en.js'
import zhCN from './zh-CN.js'

const messages = { en, 'zh-CN': zhCN }

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState('zh-CN')

  useEffect(() => {
    async function init() {
      try {
        const lang = await window.JSOS?.getLocale()
        if (lang && messages[lang]) setLocaleState(lang)
      } catch (e) {}
    }
    init()
    const unsub = window.JSOS?.onLocaleChange?.(lang => {
      if (lang && messages[lang]) setLocaleState(lang)
    })
    return () => unsub?.()
  }, [])

  const t = useCallback((key, params) => {
    let text = messages[locale]?.[key]
    if (text == null) text = messages.en?.[key]
    if (text == null) text = key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v)
      })
    }
    return text
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    return { locale: 'zh-CN', t: (key, params) => key }
  }
  return ctx
}

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'unihostel-theme'

function getInitialMode() {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => getInitialMode())

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', mode === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* quota / private mode */
    }
  }, [mode])

  const toggleTheme = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))

  const value = useMemo(() => ({ mode, setMode, toggleTheme }), [mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

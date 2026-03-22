import { useMemo } from 'react'
import { Toaster } from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

export default function ThemedToaster() {
  const { mode } = useTheme()
  const isDark = mode === 'dark'

  const toastOptions = useMemo(
    () => ({
      duration: 4000,
      className: 'text-sm',
      style: isDark
        ? {
            background: '#1e293b',
            color: '#f1f5f9',
            boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          }
        : {
            background: '#fff',
            color: '#0f172a',
            boxShadow: '0 4px 24px rgba(15,23,42,0.12)',
          },
      success: {
        iconTheme: {
          primary: isDark ? '#60a5fa' : '#2563eb',
          secondary: isDark ? '#1e293b' : '#fff',
        },
      },
      error: {
        iconTheme: {
          primary: '#f87171',
          secondary: isDark ? '#1e293b' : '#fff',
        },
      },
    }),
    [isDark]
  )

  return <Toaster position="top-right" toastOptions={toastOptions} />
}

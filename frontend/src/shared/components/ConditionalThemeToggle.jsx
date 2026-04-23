import { useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

/** Floating theme toggle on public routes only — dashboards use inline ThemeToggle with notification bells. */
export default function ConditionalThemeToggle() {
  const { pathname } = useLocation()
  const hide =
    pathname.startsWith('/student') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/warden')
  if (hide) return null
  return <ThemeToggle className="fixed right-4 top-4 z-[70]" />
}

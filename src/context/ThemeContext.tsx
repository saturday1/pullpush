import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { STORAGE } from '../constants/storage'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

interface ThemeProviderProps {
  children: ReactNode
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(STORAGE.THEME) as Theme) ?? 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE.THEME, theme)
  }, [theme])

  const toggle = (): void => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue | undefined {
  return useContext(ThemeContext)
}

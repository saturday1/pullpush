import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

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
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) ?? 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
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

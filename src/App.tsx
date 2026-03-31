import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import { ThemeProvider } from './context/ThemeContext'
import Login from './components/Login/Login'
import Splash from './components/Splash/Splash'
import ProfileSetupModal from './components/ProfileSetupModal/ProfileSetupModal'
import PageHeader from './components/PageHeader/PageHeader'
import Nav from './components/Nav/Nav'
import Settings from './components/sections/Settings/Settings'
import Mat from './components/sections/Mat/Mat'
import Traning from './components/sections/Traning/Traning'
import Vecka from './components/sections/Vecka/Vecka'
import Vikt from './components/sections/Vikt/Vikt'
import styles from './App.module.scss'

function AppContent(): React.ReactElement {
  const profile = useProfile()
  const loading = profile?.loading ?? true
  const location = useLocation()
  const path = location.pathname

  if (loading) return <Splash />

  return (
    <>
      <ProfileSetupModal />
      <Nav />
      <PageHeader />
      <main className={styles.main}>
        <div style={{ display: path === '/traning' ? 'block' : 'none' }}><Traning /></div>
        <div style={{ display: path === '/vikt' ? 'block' : 'none' }}><Vikt /></div>
        <div style={{ display: path === '/mat' ? 'block' : 'none' }}><Mat /></div>
        <div style={{ display: path === '/vecka' ? 'block' : 'none' }}><Vecka /></div>
        <div style={{ display: path === '/settings' ? 'block' : 'none' }}><Settings /></div>
        <Routes>
          <Route path="/" element={<Navigate to="/traning" replace />} />
          <Route path="*" element={null} />
        </Routes>
      </main>
    </>
  )
}

export default function App(): React.ReactElement | null {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect((): (() => void) => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }): void => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null): void => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <HashRouter>
      <ThemeProvider>
      <ProfileProvider>
        <Routes>
          <Route path="*" element={<AppContent />} />
        </Routes>
      </ProfileProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

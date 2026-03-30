import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { ProfileProvider } from './context/ProfileContext'
import { ThemeProvider } from './context/ThemeContext'
import Login from './components/Login/Login'
import ProfileSetupModal from './components/ProfileSetupModal/ProfileSetupModal'
import PageHeader from './components/PageHeader/PageHeader'
import Nav from './components/Nav/Nav'
import Profil from './components/sections/Profil/Profil'
import Mat from './components/sections/Mat/Mat'
import Traning from './components/sections/Traning/Traning'
import Vecka from './components/sections/Vecka/Vecka'
import Tips from './components/sections/Tips/Tips'
import Vikt from './components/sections/Vikt/Vikt'
import styles from './App.module.scss'

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
        <ProfileSetupModal />
        <Nav />
        <PageHeader />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Navigate to="/traning" replace />} />
            <Route path="/profil"  element={<Profil />} />
            <Route path="/mat"     element={<Mat />} />
            <Route path="/traning" element={<Traning />} />
            <Route path="/vecka"   element={<Vecka />} />
            <Route path="/tips"    element={<Tips />} />
            <Route path="/vikt"    element={<Vikt />} />
          </Routes>
        </main>
      </ProfileProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

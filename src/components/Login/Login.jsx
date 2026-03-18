import { useState } from 'react'
import { supabase } from '../../supabase'
import styles from './Login.module.scss'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Fel email eller lösenord.')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user?.identities?.length === 0) {
        setError('Det finns redan ett konto med den emailadressen.')
      } else {
        setMessage('check-email')
      }
    }
    setLoading(false)
  }

  if (message === 'check-email') {
    return (
      <div className={styles.wrapper}>
        <div className={styles.form}>
          <div className={styles.title}>Kolla din mail</div>
          <p className={styles.checkEmailText}>
            Vi har skickat en bekräftelselänk till <strong>{email}</strong>. Klicka på länken i mailet för att aktivera ditt konto och sedan logga in.
          </p>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => { setMessage(null); setMode('login') }}
          >
            Tillbaka till inloggning
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.title}>{mode === 'login' ? 'Logga in' : 'Skapa konto'}</div>
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={styles.input}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Lösenord"
          aria-label="Lösenord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={styles.input}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {error && <div className={styles.error}>{error}</div>}
        <button type="submit" disabled={loading} className={styles.btn}>
          {loading ? '…' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
        </button>
        <button
          type="button"
          className={styles.toggle}
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }}
        >
          {mode === 'login' ? 'Skapa nytt konto' : 'Logga in istället'}
        </button>
      </form>
    </div>
  )
}

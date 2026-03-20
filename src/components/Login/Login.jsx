import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../supabase'
import styles from './Login.module.scss'

export default function Login() {
    const { t } = useTranslation()
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
            if (error) setError(t('Wrong email or password.'))
        } else {
            const { data, error } = await supabase.auth.signUp({ email, password })
            if (error) {
                setError(error.message)
            } else if (data.user?.identities?.length === 0) {
                setError(t('An account with this email already exists.'))
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
                    <div className={styles.title}>{t('Check your email')}</div>
                    <p className={styles.checkEmailText} dangerouslySetInnerHTML={{ __html: t('We sent a confirmation link to <strong>{{email}}</strong>. Click the link in the email to activate your account and log in.', { email }) }} />
                    <button
                        type="button"
                        className={styles.toggle}
                        onClick={() => { setMessage(null); setMode('login') }}
                    >
                        {t('Back to login')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.wrapper}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.title}>{mode === 'login' ? t('Log in') : t('Create account')}</div>
                <label className={styles.label}>
                    {t('Email')}
                    <input
                        type="email"
                        placeholder={t('Email')}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={styles.input}
                        autoComplete="email"
                    />
                </label>
                <label className={styles.label}>
                    {t('Password')}
                    <input
                        type="password"
                        placeholder={t('Password')}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className={styles.input}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                </label>
                {error && <div className={styles.error}>{error}</div>}
                <button type="submit" disabled={loading} className={styles.btn}>
                    {loading ? '…' : mode === 'login' ? t('Log in') : t('Create account')}
                </button>
                <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }}
                >
                    {mode === 'login' ? t('Create new account') : t('Log in instead')}
                </button>
            </form>
        </div>
    )
}

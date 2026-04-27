import { useState, FormEvent, ChangeEvent, useRef } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { supabase } from '../../supabase'
import TermsModal from '../TermsModal/TermsModal'
import styles from './Login.module.scss'

type AuthMode = 'login' | 'signup' | 'verify'

export default function Login(): React.ReactElement {
    const { t } = useTranslation()
    const [mode, setMode] = useState<AuthMode>('login')
    const [email, setEmail] = useState<string>('')
    const [password, setPassword] = useState<string>('')
    const [token, setToken] = useState<string>('')
    const [agreed, setAgreed] = useState<boolean>(false)
    const [showTerms, setShowTerms] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [resendMsg, setResendMsg] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const tokenRef = useRef<HTMLInputElement>(null)

    async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResendMsg(null)

        if (mode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) setError(t('Wrong email or password.'))
        } else if (mode === 'signup') {
            const { data, error } = await supabase.auth.signUp({ email, password })
            if (error) {
                setError(error.message)
            } else if (data.user?.identities?.length === 0) {
                setError(t('An account with this email already exists.'))
            } else {
                setMode('verify')
                setTimeout(() => tokenRef.current?.focus(), 100)
            }
        } else if (mode === 'verify') {
            const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
            if (error) setError(t('Invalid or expired code.'))
        }

        setLoading(false)
    }

    async function handleResend(): Promise<void> {
        setResendMsg(null)
        setError(null)
        const { error } = await supabase.auth.resend({ type: 'signup', email })
        if (error) setError(t('Something went wrong. Please try again.'))
        else setResendMsg(t('Code sent!'))
    }

    function handleTokenChange(e: ChangeEvent<HTMLInputElement>): void {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6)
        setToken(val)
    }

    if (mode === 'verify') {
        return (
            <div className={styles.wrapper}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.title}>{t('Check your email')}</div>
                    <p className={styles.checkEmailText}>
                        {t('We sent a 6-digit code to {{email}}.', { email })}
                    </p>
                    <label className={styles.label}>
                        {t('Code (6 digits)')}
                        <input
                            ref={tokenRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="000000"
                            value={token}
                            onChange={handleTokenChange}
                            className={`${styles.input} ${styles.tokenInput}`}
                            autoComplete="one-time-code"
                            maxLength={6}
                        />
                    </label>
                    {error && <div className={styles.error}>{error}</div>}
                    {resendMsg && <div className={styles.message}>{resendMsg}</div>}
                    <button type="submit" disabled={loading || token.length !== 6} className={styles.btn}>
                        {loading ? '…' : t('Confirm')}
                    </button>
                    <button type="button" className={styles.toggle} onClick={handleResend}>
                        {t('Resend code')}
                    </button>
                    <button
                        type="button"
                        className={styles.toggle}
                        onClick={() => { setMode('login'); setToken(''); setError(null) }}
                    >
                        {t('Back to login')}
                    </button>
                </form>
            </div>
        )
    }

    return (
        <>
            <div className={styles.wrapper}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.title}>{mode === 'login' ? t('Log in') : t('Create account')}</div>
                    <label className={styles.label}>
                        {t('Email')}
                        <input
                            type="email"
                            placeholder={t('Email')}
                            value={email}
                            onChange={(e: ChangeEvent<HTMLInputElement>): void => setEmail(e.target.value)}
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
                            onChange={(e: ChangeEvent<HTMLInputElement>): void => setPassword(e.target.value)}
                            className={styles.input}
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                    </label>
                    {mode === 'signup' && (
                        <label className={styles.agreeLabel}>
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={e => setAgreed(e.target.checked)}
                                className={styles.checkbox}
                            />
                            <span>
                                <Trans
                                    i18nKey="agreeTerms"
                                    components={{
                                        termsLink: (
                                            <button
                                                type="button"
                                                className={styles.termsLink}
                                                onClick={() => setShowTerms(true)}
                                            />
                                        ),
                                    }}
                                />
                            </span>
                        </label>
                    )}
                    {error && <div className={styles.error}>{error}</div>}
                    <button
                        type="submit"
                        disabled={loading || (mode === 'signup' && !agreed)}
                        className={styles.btn}
                    >
                        {loading ? '…' : mode === 'login' ? t('Log in') : t('Create account')}
                    </button>
                    {mode === 'login' ? (
                        <button
                            type="button"
                            className={styles.signupBtn}
                            onClick={(): void => { setMode('signup'); setError(null) }}
                        >
                            {t('Create new account')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className={styles.toggle}
                            onClick={(): void => { setMode('login'); setError(null) }}
                        >
                            {t('Log in instead')}
                        </button>
                    )}
                </form>
            </div>
            {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        </>
    )
}

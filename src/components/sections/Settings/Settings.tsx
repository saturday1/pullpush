import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../../context/ThemeContext'
import { useWeightUnit, type WeightUnit } from '../../../hooks/useWeightUnit'
import { useFlowSounds, getCountdownStyle, setCountdownStyle, getCountdownLength, setCountdownLength, type CountdownStyle } from '../../../hooks/useFlowSounds'
import { useProfile, type UserRole } from '../../../context/ProfileContext'
import { useSubscription } from '../../../context/SubscriptionContext'
import { supabase } from '../../../supabase'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Profil from '../Profil/Profil'
import Tips from '../Tips/Tips'
import styles from './Settings.module.scss'

const ALL_ROLES: UserRole[] = ['free', 'standard', 'premium', 'developer']
const ROLE_LABEL: Record<UserRole, string> = {
    free: 'Free',
    standard: 'Standard',
    premium: 'Premium',
    developer: 'Developer (full)',
}

type SettingsTab = 'profile' | 'settings' | 'sound' | 'time' | 'guide'

export default function Settings(): React.ReactElement {
    const { t, i18n } = useTranslation()
    const themeCtx = useTheme()
    const theme = themeCtx?.theme ?? 'light'
    const toggle = themeCtx?.toggle ?? (() => {})
    const [tab, setTab] = useState<SettingsTab>('profile')
    const flowSounds = useFlowSounds()
    const [soundsOn, setSoundsOn] = useState(flowSounds.enabled)
    const [countdownStyle, setCountdownStyleState] = useState<CountdownStyle>(getCountdownStyle())
    const [countdownLength, setCountdownLengthState] = useState<3 | 5>(getCountdownLength())
    const [weightUnit, setWeightUnit] = useWeightUnit()
    const profile = useProfile()
    const updateProfile = profile?.updateProfile
    const { effectiveRole } = useSubscription()
    const isDeveloper = profile?.role === 'developer'
    const [devOverride, setDevOverrideState] = useState<UserRole | null>(
        isDeveloper ? (localStorage.getItem('dev_role_override') as UserRole | null) : null
    )

    function setDevRole(role: UserRole | null): void {
        if (role === null || role === 'developer') {
            localStorage.removeItem('dev_role_override')
            setDevOverrideState(null)
        } else {
            localStorage.setItem('dev_role_override', role)
            setDevOverrideState(role)
        }
        // Force re-render of subscription context by reloading
        window.location.reload()
    }
    const [restSec, setRestSec] = useState(String(profile?.restSeconds ?? 90))
    const [secPerRep, setSecPerRep] = useState(String(profile?.secPerRep ?? 4))
    const [cdSec, setCdSec] = useState(String(profile?.countdownSeconds ?? 10))
    const [sidePauseSec, setSidePauseSec] = useState(String(profile?.sidePauseSeconds ?? 5))

    function saveTime(field: 'rest_seconds' | 'sec_per_rep' | 'countdown_seconds' | 'side_pause_seconds', value: string): void {
        const n = parseInt(value)
        if (!isNaN(n) && n >= 0 && updateProfile) {
            updateProfile({ [field]: n } as never).catch(() => {})
        }
    }

    return (
        <section id="settings">
            <SectionHeader title={t('Account & Settings')} />

            <div className={styles.tabBar}>
                <button className={`${styles.tabBtn} ${tab === 'profile' ? styles.tabBtnActive : ''}`} onClick={() => setTab('profile')}>
                    {t('Profile')}
                </button>
                <button className={`${styles.tabBtn} ${tab === 'settings' ? styles.tabBtnActive : ''}`} onClick={() => setTab('settings')}>
                    {t('Settings')}
                </button>
                <button className={`${styles.tabBtn} ${tab === 'sound' ? styles.tabBtnActive : ''}`} onClick={() => setTab('sound')}>
                    {t('Sound')}
                </button>
                <button className={`${styles.tabBtn} ${tab === 'time' ? styles.tabBtnActive : ''}`} onClick={() => setTab('time')}>
                    {t('Time')}
                </button>
                {/* <button className={`${styles.tabBtn} ${tab === 'guide' ? styles.tabBtnActive : ''}`} onClick={() => setTab('guide')}>
                    {t('Guide')}
                </button> */}
            </div>

            {tab === 'profile' && (
                <>
                    <Profil />
                    <Reveal>
                        <button className={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
                            {t('Log out')}
                        </button>
                    </Reveal>
                </>
            )}

            {tab === 'settings' && (
                <>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Language')}</div>
                            <div className={styles.optionRow}>
                                <button
                                    className={`${styles.optionBtn} ${i18n.language === 'sv' ? styles.optionActive : ''}`}
                                    onClick={() => i18n.changeLanguage('sv')}
                                >
                                    <span className={styles.langCode}>SE</span> Svenska
                                </button>
                                <button
                                    className={`${styles.optionBtn} ${i18n.language === 'en' ? styles.optionActive : ''}`}
                                    onClick={() => i18n.changeLanguage('en')}
                                >
                                    <span className={styles.langCode}>EN</span> English
                                </button>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Theme')}</div>
                            <div className={styles.optionRow}>
                                <button
                                    className={`${styles.optionBtn} ${theme === 'light' ? styles.optionActive : ''}`}
                                    onClick={() => theme === 'dark' && toggle()}
                                >
                                    ☀️ {t('Light')}
                                </button>
                                <button
                                    className={`${styles.optionBtn} ${theme === 'dark' ? styles.optionActive : ''}`}
                                    onClick={() => theme === 'light' && toggle()}
                                >
                                    🌙 {t('Dark')}
                                </button>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Weight unit')}</div>
                            <div className={styles.optionRow}>
                                {(['both', 'kg', 'lbs'] as WeightUnit[]).map(u => (
                                    <button
                                        key={u}
                                        className={`${styles.optionBtn} ${weightUnit === u ? styles.optionActive : ''}`}
                                        onClick={() => setWeightUnit(u)}
                                    >
                                        {u === 'both' ? 'KG / LBS' : u.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Reveal>

                    {isDeveloper && (
                        <Reveal>
                            <div className={`${styles.card} ${styles.devCard}`}>
                                <div className={styles.devCardHeader}>
                                    <span className={styles.devBadge}>DEV</span>
                                    <div className={styles.cardTitle}>Testa rollnivå</div>
                                </div>
                                <div className={styles.devCurrent}>
                                    Aktiv roll: <strong>{ROLE_LABEL[effectiveRole]}</strong>
                                    {devOverride && <span className={styles.devOverrideTag}>override</span>}
                                </div>
                                <div className={styles.optionRow}>
                                    {ALL_ROLES.map(r => (
                                        <button
                                            key={r}
                                            className={`${styles.optionBtn} ${(devOverride ?? 'developer') === r ? styles.optionActive : ''}`}
                                            onClick={() => setDevRole(r === 'developer' ? null : r)}
                                        >
                                            {ROLE_LABEL[r]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Reveal>
                    )}

                </>
            )}

            {tab === 'sound' && (
                <>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Flow sounds')}</div>
                            <div className={styles.optionRow}>
                                <button
                                    className={`${styles.optionBtn} ${soundsOn ? styles.optionActive : ''}`}
                                    onClick={() => { flowSounds.setEnabled(true); setSoundsOn(true) }}
                                >
                                    {t('On')}
                                </button>
                                <button
                                    className={`${styles.optionBtn} ${!soundsOn ? styles.optionActive : ''}`}
                                    onClick={() => { flowSounds.setEnabled(false); setSoundsOn(false) }}
                                >
                                    {t('Off')}
                                </button>
                            </div>
                        </div>
                    </Reveal>

                    {soundsOn && (
                        <Reveal>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>{t('Countdown sound')}</div>
                                <div className={styles.optionRow}>
                                    <button
                                        className={`${styles.optionBtn} ${countdownStyle === 'voice' ? styles.optionActive : ''}`}
                                        onClick={() => { setCountdownStyle('voice'); setCountdownStyleState('voice') }}
                                    >
                                        {t('Voice')}
                                    </button>
                                    <button
                                        className={`${styles.optionBtn} ${countdownStyle === 'beep' ? styles.optionActive : ''}`}
                                        onClick={() => { setCountdownStyle('beep'); setCountdownStyleState('beep') }}
                                    >
                                        {t('Beep')}
                                    </button>
                                </div>
                            </div>
                        </Reveal>
                    )}

                    {soundsOn && (
                        <Reveal>
                            <div className={styles.card}>
                                <div className={styles.cardTitle}>{t('Countdown length')}</div>
                                <div className={styles.optionRow}>
                                    <button
                                        className={`${styles.optionBtn} ${countdownLength === 3 ? styles.optionActive : ''}`}
                                        onClick={() => { setCountdownLength(3); setCountdownLengthState(3) }}
                                    >
                                        3 {t('sec')}
                                    </button>
                                    <button
                                        className={`${styles.optionBtn} ${countdownLength === 5 ? styles.optionActive : ''}`}
                                        onClick={() => { setCountdownLength(5); setCountdownLengthState(5) }}
                                    >
                                        5 {t('sec')}
                                    </button>
                                </div>
                            </div>
                        </Reveal>
                    )}
                </>
            )}

            {tab === 'time' && (
                <div className={styles.timeGrid}>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Countdown (seconds)')}</div>
                            <input
                                className={styles.timeInput}
                                type="number"
                                min="0"
                                value={cdSec}
                                onChange={(e) => setCdSec(e.target.value)}
                                onBlur={() => saveTime('countdown_seconds', cdSec)}
                            />
                        </div>
                    </Reveal>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Seconds per rep')}</div>
                            <input
                                className={styles.timeInput}
                                type="number"
                                min="0"
                                value={secPerRep}
                                onChange={(e) => setSecPerRep(e.target.value)}
                                onBlur={() => saveTime('sec_per_rep', secPerRep)}
                            />
                        </div>
                    </Reveal>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Rest timer (seconds)')}</div>
                            <input
                                className={styles.timeInput}
                                type="number"
                                min="0"
                                value={restSec}
                                onChange={(e) => setRestSec(e.target.value)}
                                onBlur={() => saveTime('rest_seconds', restSec)}
                            />
                        </div>
                    </Reveal>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Side pause (seconds)')}</div>
                            <input
                                className={styles.timeInput}
                                type="number"
                                min="0"
                                value={sidePauseSec}
                                onChange={(e) => setSidePauseSec(e.target.value)}
                                onBlur={() => saveTime('side_pause_seconds', sidePauseSec)}
                            />
                        </div>
                    </Reveal>
                </div>
            )}

            {/* {tab === 'guide' && <Tips />} */}
        </section>
    )
}

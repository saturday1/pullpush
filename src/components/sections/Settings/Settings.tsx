import { useState, useEffect } from 'react'
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

interface AdminUser {
    user_id: string
    email: string
    role: string
    first_name: string | null
    last_name: string | null
}

const ALL_ROLES: UserRole[] = ['free', 'standard', 'premium', 'lifetime', 'developer']
const ROLE_LABEL: Record<UserRole, string> = {
    free: 'Free',
    standard: 'Standard',
    premium: 'Premium',
    lifetime: 'Lifetime',
    developer: 'Developer (full)',
}

type SettingsTab = 'profile' | 'settings' | 'sound' | 'time' | 'guide' | 'god'

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
    const storedOverride = localStorage.getItem('dev_role_override') as UserRole | null
    const [devOverride, setDevOverrideState] = useState<UserRole | null>(storedOverride)

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
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
    const [adminLoading, setAdminLoading] = useState(false)
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [togglingId, setTogglingId] = useState<string | null>(null)

    useEffect(() => {
        if (tab !== 'god' || !isDeveloper) return
        setAdminLoading(true)
        supabase.rpc('admin_list_profiles').then(({ data }) => {
            setAdminUsers((data as AdminUser[]) ?? [])
            setAdminLoading(false)
        })
    }, [tab, isDeveloper])

    async function setUserRole(user: AdminUser, newRole: string): Promise<void> {
        if (newRole === user.role) return
        setTogglingId(user.user_id)
        await supabase.rpc('admin_set_role', { target_user_id: user.user_id, new_role: newRole })
        setAdminUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, role: newRole } : u))
        setTogglingId(null)
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
                {isDeveloper && (
                    <button className={`${styles.tabBtn} ${styles.tabBtnGod} ${tab === 'god' ? styles.tabBtnActive : ''}`} onClick={() => setTab('god')}>
                        Gud
                    </button>
                )}
            </div>

            {tab === 'profile' && (
                <>
                    <Profil />
                    <Reveal>
                        <div className={styles.legalLinks}>
                            <a className={styles.legalLink} href="/#/privacy">{t('Privacy Policy')}</a>
                            <span className={styles.legalDot}>·</span>
                            <a className={styles.legalLink} href="/#/terms">{t('Terms of Service')}</a>
                        </div>
                    </Reveal>
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

            {tab === 'god' && isDeveloper && (
                <>
                    <Reveal>
                        <div className={`${styles.card} ${styles.devCard}`}>
                            <div className={styles.devCardHeader}>
                                <span className={styles.devBadge}>DEV</span>
                                <div className={styles.cardTitle}>Testa rollnivå</div>
                            </div>
                            <select
                                className={styles.devSelect}
                                value={devOverride ?? 'developer'}
                                onChange={e => setDevRole(e.target.value === 'developer' ? null : e.target.value as UserRole)}
                            >
                                {ALL_ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                                ))}
                            </select>
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>Användare</div>

                            {/* Role filter */}
                            <select
                                className={styles.roleFilterSelect}
                                value={roleFilter}
                                onChange={e => setRoleFilter(e.target.value)}
                            >
                                <option value="all">Alla ({adminUsers.length})</option>
                                {['free', 'standard', 'premium', 'lifetime'].map(f => (
                                    <option key={f} value={f}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)} ({adminUsers.filter(u => u.role === f).length})
                                    </option>
                                ))}
                            </select>

                            {adminLoading ? (
                                <div className={styles.adminLoading}>Laddar…</div>
                            ) : (
                                <div className={styles.userList}>
                                    {adminUsers
                                        .filter(u => roleFilter === 'all' || u.role === roleFilter)
                                        .map(user => {
                                            const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || null
                                            const ROLES = ['free', 'standard', 'premium', 'lifetime'] as const
                                            const isBusy = togglingId === user.user_id
                                            return (
                                                <div key={user.user_id} className={styles.userRow}>
                                                    <div className={styles.userInfo}>
                                                        <span className={styles.userName}>{name ?? user.email}</span>
                                                        {name && <span className={styles.userEmail}>{user.email}</span>}
                                                    </div>
                                                    <div className={styles.roleSelector}>
                                                        {ROLES.map(r => (
                                                            <button
                                                                key={r}
                                                                type="button"
                                                                className={`${styles.rolePill} ${user.role === r ? styles.rolePillActive : ''} ${styles[`rolePill_${r}`]}`}
                                                                onClick={() => setUserRole(user, r)}
                                                                disabled={isBusy}
                                                                title={r.charAt(0).toUpperCase() + r.slice(1)}
                                                            >
                                                                {isBusy && user.role === r ? '…' : r.charAt(0).toUpperCase()}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    }
                                    {adminUsers.filter(u => roleFilter === 'all' || u.role === roleFilter).length === 0 && (
                                        <div className={styles.adminLoading}>Inga användare</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Reveal>
                </>
            )}
        </section>
    )
}

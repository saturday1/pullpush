import { useState, useEffect } from 'react'
import { Drawer } from 'vaul'
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
import ContactModal from '../../ContactModal/ContactModal'
import TermsModal from '../../TermsModal/TermsModal'
import PrivacyPolicyModal from '../../PrivacyPolicyModal/PrivacyPolicyModal'
import { DB } from '../../../constants/database'
import { STORAGE } from '../../../constants/storage'
import { DEFAULT_REST_SECONDS, DEFAULT_SEC_PER_REP, DEFAULT_COUNTDOWN_SECONDS, DEFAULT_SIDE_PAUSE_SECONDS } from '../../../constants/training'
import styles from './Settings.module.scss'

interface AdminUser {
    user_id: string
    email: string
    role: string
    first_name: string | null
    last_name: string | null
}

interface ContactMessage {
    id: number
    created_at: string
    email: string | null
    subject: string | null
    message: string
    status: 'unhandled' | 'seen' | 'handled'
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
    const [keepScreenOn, setKeepScreenOnState] = useState(() => localStorage.getItem(STORAGE.KEEP_SCREEN_ON) !== 'false')
    const profile = useProfile()
    const updateProfile = profile?.updateProfile
    const { effectiveRole } = useSubscription()
    const isDeveloper = profile?.role === 'developer'
    const storedOverride = localStorage.getItem(STORAGE.DEV_ROLE_OVERRIDE) as UserRole | null
    const [devOverride, setDevOverrideState] = useState<UserRole | null>(storedOverride)
    const [showContact, setShowContact] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    const [showPrivacy, setShowPrivacy] = useState(false)

    function setDevRole(role: UserRole | null): void {
        if (role === null || role === 'developer') {
            localStorage.removeItem(STORAGE.DEV_ROLE_OVERRIDE)
            setDevOverrideState(null)
        } else {
            localStorage.setItem(STORAGE.DEV_ROLE_OVERRIDE, role)
            setDevOverrideState(role)
        }
        // Force re-render of subscription context by reloading
        window.location.reload()
    }
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
    const [adminLoading, setAdminLoading] = useState(false)
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [contactMessages, setContactMessages] = useState<ContactMessage[]>([])
    const [messagesLoading, setMessagesLoading] = useState(false)
    const [showHandled, setShowHandled] = useState(false)
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
    const [messageDrawerOpen, setMessageDrawerOpen] = useState(false)

    useEffect(() => {
        if (tab !== 'god' || !isDeveloper) return
        setAdminLoading(true)
        setMessagesLoading(true)
        supabase.rpc('admin_list_profiles').then(({ data }) => {
            setAdminUsers((data as AdminUser[]) ?? [])
            setAdminLoading(false)
        })
        supabase.from(DB.CONTACT_MESSAGES).select('*').order('created_at', { ascending: false }).then(({ data }) => {
            setContactMessages((data as ContactMessage[]) ?? [])
            setMessagesLoading(false)
        })
    }, [tab, isDeveloper])

    async function setMessageStatus(id: number, status: ContactMessage['status']): Promise<void> {
        await supabase.from(DB.CONTACT_MESSAGES).update({ status }).eq('id', id)
        setContactMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
        setSelectedMessage(prev => prev?.id === id ? { ...prev, status } : prev)
    }

    function openMessage(msg: ContactMessage): void {
        setSelectedMessage(msg)
        setMessageDrawerOpen(true)
        if (msg.status === 'unhandled') setMessageStatus(msg.id, 'seen')
    }

    function closeMessageDrawer(): void {
        setMessageDrawerOpen(false)
        setTimeout(() => setSelectedMessage(null), 500)
    }

    async function setUserRole(user: AdminUser, newRole: string): Promise<void> {
        if (newRole === user.role) return
        setTogglingId(user.user_id)
        await supabase.rpc('admin_set_role', { target_user_id: user.user_id, new_role: newRole })
        setAdminUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, role: newRole } : u))
        setTogglingId(null)
    }

    const [restSec, setRestSec] = useState(String(profile?.restSeconds ?? DEFAULT_REST_SECONDS))
    const [secPerRep, setSecPerRep] = useState(String(profile?.secPerRep ?? DEFAULT_SEC_PER_REP))
    const [cdSec, setCdSec] = useState(String(profile?.countdownSeconds ?? DEFAULT_COUNTDOWN_SECONDS))
    const [sidePauseSec, setSidePauseSec] = useState(String(profile?.sidePauseSeconds ?? DEFAULT_SIDE_PAUSE_SECONDS))

    function saveTime(field: 'rest_seconds' | 'sec_per_rep' | 'countdown_seconds' | 'side_pause_seconds', value: string): void {
        const n = field === 'sec_per_rep' ? parseFloat(value) : parseInt(value)
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
                            <button className={styles.legalLink} onClick={() => setShowPrivacy(true)}>{t('Privacy Policy')}</button>
                            <span className={styles.legalDot}>·</span>
                            <button className={styles.legalLink} onClick={() => setShowTerms(true)}>{t('Terms of Service')}</button>
                        </div>
                    </Reveal>
                    <Reveal>
                        <div className={styles.profileActions}>
                            <button
                                className={styles.manageSubBtn}
                                onClick={() => window.open('itms-apps://apps.apple.com/account/subscriptions', '_system')}
                            >
                                {t('Manage subscription')}
                            </button>
                            <button className={styles.contactBtn} onClick={() => setShowContact(true)}>
                                {t('Contact support')}
                            </button>
                            <button className={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
                                {t('Log out')}
                            </button>
                        </div>
                    </Reveal>
                    {showContact && <ContactModal onClose={() => setShowContact(false)} />}
                    {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
                    {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
                </>
            )}

            {tab === 'settings' && (
                <>
                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Language')}</div>
                            <select
                                className={styles.langSelect}
                                value={i18n.language}
                                onChange={e => i18n.changeLanguage(e.target.value)}
                            >
                                <option value="sv">🇸🇪 Svenska</option>
                                <option value="en">🇬🇧 English</option>
                                <option value="nb">🇳🇴 Norsk</option>
                                <option value="da">🇩🇰 Dansk</option>
                                <option value="fi">🇫🇮 Suomi</option>
                                <option value="is">🇮🇸 Íslenska</option>
                                <option value="de">🇩🇪 Deutsch</option>
                                <option value="fr">🇫🇷 Français</option>
                                <option value="es">🇪🇸 Español</option>
                                <option value="it">🇮🇹 Italiano</option>
                            </select>
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

                    <Reveal>
                        <div className={styles.card}>
                            <div className={styles.cardTitle}>{t('Keep screen on during exercise')}</div>
                            <div className={styles.optionRow}>
                                <button
                                    className={`${styles.optionBtn} ${keepScreenOn ? styles.optionActive : ''}`}
                                    onClick={() => { localStorage.setItem(STORAGE.KEEP_SCREEN_ON, 'true'); setKeepScreenOnState(true) }}
                                >
                                    {t('On')}
                                </button>
                                <button
                                    className={`${styles.optionBtn} ${!keepScreenOn ? styles.optionActive : ''}`}
                                    onClick={() => { localStorage.setItem(STORAGE.KEEP_SCREEN_ON, 'false'); setKeepScreenOnState(false) }}
                                >
                                    {t('Off')}
                                </button>
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
                                step="0.5"
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
                                {ALL_ROLES.filter(r => r !== 'developer').map(f => (
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
                                            const ROLES = ALL_ROLES.filter(r => r !== 'developer')
                                            const isBusy = togglingId === user.user_id
                                            return (
                                                <div key={user.user_id} className={styles.userRow}>
                                                    <div className={styles.userInfo}>
                                                        <span className={styles.userName}>{name ?? user.email}</span>
                                                        {name && <span className={styles.userEmail}>{user.email}</span>}
                                                    </div>
                                                    <div className={styles.roleSelector}>
                                                        <select
                                                            className={`${styles.userRoleSelect} ${styles[`userRoleSelect_${user.role}`]}`}
                                                            value={user.role}
                                                            disabled={isBusy}
                                                            onChange={e => setUserRole(user, e.target.value)}
                                                        >
                                                            {ROLES.map(r => (
                                                                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                                                            ))}
                                                        </select>
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
                    <Reveal>
                        <div className={styles.card}>
                            {(() => {
                                const STATUS_LABEL: Record<ContactMessage['status'], string> = { unhandled: 'Ohanterat', seen: 'Sett', handled: 'Hanterat' }
                                const visible = contactMessages.filter(m => showHandled ? true : m.status !== 'handled')
                                const handledCount = contactMessages.filter(m => m.status === 'handled').length
                                return (
                                    <>
                                        <div className={styles.cardTitle}>Meddelanden ({contactMessages.filter(m => m.status !== 'handled').length})</div>
                                        {messagesLoading ? (
                                            <div className={styles.adminLoading}>Laddar…</div>
                                        ) : visible.length === 0 ? (
                                            <div className={styles.adminLoading}>Inga meddelanden</div>
                                        ) : (
                                            <div className={styles.messageList}>
                                                {visible.map(msg => (
                                                    <button key={msg.id} className={`${styles.messageRow} ${msg.status === 'handled' ? styles.messageRowHandled : ''}`} onClick={() => openMessage(msg)}>
                                                        <div className={styles.messageRowTop}>
                                                            <span className={styles.messageSubject}>{msg.subject ?? '—'}</span>
                                                            <span className={`${styles.statusPill} ${styles[`statusPill_${msg.status}`]}`}>{STATUS_LABEL[msg.status]}</span>
                                                        </div>
                                                        <div className={styles.messageRowBottom}>
                                                            <span className={styles.messageEmail}>{msg.email ?? '—'}</span>
                                                            <span className={styles.messageDate}>{new Date(msg.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                        </div>
                                                        <div className={styles.messagePreview}>{msg.message}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {handledCount > 0 && (
                                            <button className={styles.showHandledBtn} onClick={() => setShowHandled(p => !p)}>
                                                {showHandled ? 'Dölj hanterade' : `Visa hanterade (${handledCount})`}
                                            </button>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    </Reveal>

                    {selectedMessage && (
                        <Drawer.Root open={messageDrawerOpen} onOpenChange={v => { if (!v) closeMessageDrawer() }}>
                            <Drawer.Portal>
                                <Drawer.Overlay className={styles.msgOverlay} />
                                <Drawer.Content className={styles.msgSheet}>
                                    <Drawer.Handle className={styles.msgHandle} />
                                    {(() => {
                                        const STATUS_LABEL: Record<ContactMessage['status'], string> = { unhandled: 'Ohanterat', seen: 'Sett', handled: 'Hanterat' }
                                        return (
                                            <>
                                                <div className={styles.msgHeader}>
                                                    <Drawer.Title className={styles.msgTitle}>{selectedMessage.subject ?? '—'}</Drawer.Title>
                                                    <button className={styles.msgClose} onClick={closeMessageDrawer}>✕</button>
                                                </div>
                                                <div className={styles.msgBody}>
                                                    <div className={styles.msgMeta}>
                                                        <span>{selectedMessage.email ?? '—'}</span>
                                                        <span>{new Date(selectedMessage.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                    </div>
                                                    <p className={styles.msgText}>{selectedMessage.message}</p>
                                                    {selectedMessage.status !== 'handled' ? (
                                                        <button
                                                            className={styles.handledBtn}
                                                            onClick={() => { setMessageStatus(selectedMessage.id, 'handled'); closeMessageDrawer() }}
                                                        >
                                                            Markera som hanterat
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className={styles.unhandleBtn}
                                                            onClick={() => setMessageStatus(selectedMessage.id, 'seen')}
                                                        >
                                                            Återöppna
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )
                                    })()}
                                </Drawer.Content>
                            </Drawer.Portal>
                        </Drawer.Root>
                    )}
                </>
            )}
        </section>
    )
}

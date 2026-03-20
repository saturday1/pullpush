import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../supabase'
import styles from './Nav.module.scss'

const links = [
    { to: '/traning', label: 'Training' },
    { to: '/vecka',   label: 'Week' },
    { to: '/vikt',    label: 'Weight' },
    { to: '/mat',     label: 'Food' },
    { to: '/profil',  label: 'Profile' },
    { to: '/tips',    label: 'Tips' },
]

function GearIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    )
}

export default function Nav() {
    const { t, i18n } = useTranslation()
    const { theme, toggle } = useTheme()
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!open) return
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    return (
        <nav className={styles.nav}>
            <div className={styles.navLinks}>
                {links.map(({ to, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                    >
                        {t(label)}
                    </NavLink>
                ))}
            </div>

            <div className={styles.settingsWrap} ref={ref}>
                <button className={styles.settingsBtn} onClick={() => setOpen(o => !o)} title={t('Settings')}>
                    <GearIcon />
                </button>

                {open && (
                    <div className={styles.settingsPopup}>
                        <div className={styles.settingsSection}>
                            <div className={styles.settingsSectionLabel}>{t('Language')}</div>
                            <div className={styles.settingsRow}>
                                <button
                                    className={`${styles.settingsOption} ${i18n.language === 'sv' ? styles.settingsOptionActive : ''}`}
                                    onClick={() => i18n.changeLanguage('sv')}
                                >
                                    <span className={styles.langCode}>SE</span> Svenska
                                </button>
                                <button
                                    className={`${styles.settingsOption} ${i18n.language === 'en' ? styles.settingsOptionActive : ''}`}
                                    onClick={() => i18n.changeLanguage('en')}
                                >
                                    <span className={styles.langCode}>EN</span> English
                                </button>
                            </div>
                        </div>

                        <div className={styles.settingsDivider} />

                        <div className={styles.settingsSection}>
                            <div className={styles.settingsSectionLabel}>{t('Theme')}</div>
                            <div className={styles.settingsRow}>
                                <button
                                    className={`${styles.settingsOption} ${theme === 'light' ? styles.settingsOptionActive : ''}`}
                                    onClick={() => theme === 'dark' && toggle()}
                                >
                                    ☀️ {t('Light')}
                                </button>
                                <button
                                    className={`${styles.settingsOption} ${theme === 'dark' ? styles.settingsOptionActive : ''}`}
                                    onClick={() => theme === 'light' && toggle()}
                                >
                                    🌙 {t('Dark')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <button className={styles.logout} onClick={() => supabase.auth.signOut()}>
                {t('Log out')}
            </button>
        </nav>
    )
}

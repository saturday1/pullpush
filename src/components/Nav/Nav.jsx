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

export default function Nav() {
    const { t } = useTranslation()
    const { theme, toggle } = useTheme()

    return (
        <nav className={styles.nav}>
            {links.map(({ to, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                >
                    {t(label)}
                </NavLink>
            ))}
            <button className={styles.themeToggle} onClick={toggle} title={theme === 'light' ? t('Dark mode') : t('Light mode')}>
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className={styles.logout} onClick={() => supabase.auth.signOut()}>
                {t('Log out')}
            </button>
        </nav>
    )
}

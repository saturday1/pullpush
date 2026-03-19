import { NavLink } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../supabase'
import styles from './Nav.module.scss'

const links = [
    { to: '/traning', label: 'Träning' },
    { to: '/vecka', label: 'Vecka' },
    { to: '/vikt', label: 'Vikt' },
    { to: '/mat', label: 'Mat' },
    { to: '/profil', label: 'Profil' },
    { to: '/tips', label: 'Tips' },
]

export default function Nav() {
    const { theme, toggle } = useTheme()

    return (
        <nav className={styles.nav}>
            {links.map(({ to, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                >
                    {label}
                </NavLink>
            ))}
            <button className={styles.themeToggle} onClick={toggle} title={theme === 'light' ? 'Mörkt läge' : 'Ljust läge'}>
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className={styles.logout} onClick={() => supabase.auth.signOut()}>
                Logga ut
            </button>
        </nav>
    )
}

import { NavLink } from 'react-router-dom'
<<<<<<< HEAD
import { useTheme } from '../../context/ThemeContext'
=======
import { useTranslation } from 'react-i18next'
>>>>>>> 4f3320d07fd5c27f99a8ad109eaf23f4529680d5
import { supabase } from '../../supabase'
import styles from './Nav.module.scss'

const links = [
<<<<<<< HEAD
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
=======
  { to: '/traning', label: 'Training' },
  { to: '/vecka',   label: 'Week' },
  { to: '/vikt',    label: 'Weight' },
  { to: '/mat',     label: 'Food' },
  { to: '/profil',  label: 'Profile' },
  { to: '/tips',    label: 'Tips' },
]

export default function Nav() {
  const { t } = useTranslation()

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
      <button className={styles.logout} onClick={() => supabase.auth.signOut()}>
        {t('Log out')}
      </button>
    </nav>
  )
>>>>>>> 4f3320d07fd5c27f99a8ad109eaf23f4529680d5
}

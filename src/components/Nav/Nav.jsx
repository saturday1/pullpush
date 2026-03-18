import { NavLink } from 'react-router-dom'
import { supabase } from '../../supabase'
import styles from './Nav.module.scss'

const links = [
  { to: '/traning', label: 'Träning' },
  { to: '/vecka',   label: 'Vecka' },
  { to: '/vikt',    label: 'Vikt' },
  { to: '/mat',     label: 'Mat' },
  { to: '/profil',  label: 'Profil' },
  { to: '/tips',    label: 'Tips' },
]

export default function Nav() {
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
      <button className={styles.logout} onClick={() => supabase.auth.signOut()}>
        Logga ut
      </button>
    </nav>
  )
}

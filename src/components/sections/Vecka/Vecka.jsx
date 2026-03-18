import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Vecka.module.scss'

const DAY_NAMES = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

export default function Vecka() {
  const { sessions } = useProfile()

  const days = DAY_NAMES.map((name, i) => {
    const session = sessions.find(s => s.day_of_week === i + 1)
    return { name, type: session ? session.name.toUpperCase() : 'VILA', train: !!session }
  })

  return (
    <section id="vecka">
      <SectionHeader number="07" title="Veckoöversikt" />

      <Reveal>
        <div className={styles.grid}>
          {days.map(({ name, type, train }) => (
            <div key={name} className={`${styles.day} ${train ? styles.train : styles.rest}`}>
              <div className={styles.dayName}>{name}</div>
              <div className={styles.dayType} style={!train ? { color: 'var(--muted)' } : {}}>{type}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

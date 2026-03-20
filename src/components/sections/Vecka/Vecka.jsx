import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Vecka.module.scss'

export default function Vecka() {
  const { t } = useTranslation()
  const { sessions } = useProfile()
  const dayNames = t('dayNames', { returnObjects: true })

  const days = dayNames.map((name, i) => {
    const session = sessions.find(s => s.day_of_week === i + 1)
    return { name, type: session ? session.name.toUpperCase() : t('REST'), train: !!session }
  })

  return (
    <section id="vecka">
      <SectionHeader number="07" title={t('Weekly overview')} />

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

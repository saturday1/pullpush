import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useProfile } from '../../context/ProfileContext'
import styles from './PageHeader.module.scss'

function useSubtitle(): string {
  const { t } = useTranslation()
  const profile = useProfile()
  const { pathname } = useLocation()

  const currentWeight = profile?.currentWeight ?? null
  const startWeight = profile?.startWeight ?? null
  const macros = profile?.macros ?? null
  const programs = profile?.programs ?? []
  const activeProgramId = profile?.activeProgramId ?? null

  const sessions = profile?.sessions ?? []
  const goalWeight = profile?.goalWeight ?? null
  const dayFull = t('dayFull', { returnObjects: true }) as string[]
  const today = new Date().getDay() || 7 // 1=Mon..7=Sun

  switch (pathname) {
    case '/traning': {
      const prog = programs.find(p => p.id === activeProgramId)
      const todaySession = sessions.find(s => s.day_of_week === today)
      if (prog && todaySession) return `${prog.name} — ${todaySession.name}`
      if (prog) return prog.name
      return t('Training')
    }
    case '/vikt': {
      if (currentWeight != null && goalWeight != null) {
        return `${currentWeight} kg → ${goalWeight} kg`
      }
      if (currentWeight != null) return `${currentWeight} kg`
      return t('Weight')
    }
    case '/mat':
      return macros ? `${macros.targetKcal} kcal/${t('day')}` : t('Food & Nutrition')
    case '/vecka': {
      return `${programs.length} ${t('programs')} · ${sessions.length} ${t('sessions')}`
    }
    case '/settings':
      return t('Account & Settings')
    default:
      return t('Training & Diet Plan')
  }
}

export default function PageHeader(): React.ReactElement {
  const profile = useProfile()
  const loading = profile?.loading ?? true
  const firstName = profile?.firstName ?? null
  const subtitle = useSubtitle()

  return (
    <header className={styles.header}>
      <div className={styles.blobOrange} aria-hidden="true" />
      <div className={styles.blobPink} aria-hidden="true" />
      <div className={styles.blobPurple} aria-hidden="true" />
      <div className={styles.content}>
        <h1 className={styles.title}>
          Hey <span>{loading ? '…' : (firstName ?? '–')}!</span>
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  )
}

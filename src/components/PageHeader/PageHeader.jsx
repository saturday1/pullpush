import { useTranslation } from 'react-i18next'
import { useProfile } from '../../context/ProfileContext'
import styles from './PageHeader.module.scss'

export default function PageHeader() {
  const { t } = useTranslation()
  const { loading, firstName, startWeight, currentWeight } = useProfile()

  const rawDiff = !loading && startWeight != null && currentWeight != null
    ? parseFloat((currentWeight - startWeight).toFixed(1))
    : null
  const diff = rawDiff !== null && rawDiff !== 0 ? rawDiff : null

  return (
    <header className={styles.header}>
      <div className={styles.blobOrange} aria-hidden="true" />
      <div className={styles.blobPink}   aria-hidden="true" />
      <div className={styles.blobPurple} aria-hidden="true" />
      <h1 className={styles.title}>
        {t('Hi')} <span>{loading ? '…' : (firstName ?? '–')}</span>
      </h1>
      <p className={styles.subtitle}>{t('Training & Diet Plan')}</p>
      {diff !== null && (
        <div className={styles.weightStat}>
          {t('{{diff}} kg since start', { diff: diff > 0 ? `+${diff}` : diff })}
        </div>
      )}
    </header>
  )
}

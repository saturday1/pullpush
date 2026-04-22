import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Feature } from '../../context/SubscriptionContext'
import { FEATURE_REQUIRED_ROLE } from '../../context/SubscriptionContext'
import styles from './UpgradeModal.module.scss'

interface FeatureInfo {
  label: string
  description: string
}

const FEATURE_INFO: Record<Feature, FeatureInfo> = {
  flow:            { label: 'Flow-läge',             description: 'Automatisk nedräkning, reps och vilofas med ljud' },
  liveActivity:    { label: 'Live Activity',          description: 'Vilotimer synlig på låsskärmen och Dynamic Island' },
  foodSearch:      { label: 'Matsökning',             description: 'Sök i USDA:s livsmedelsdatabas med 500 000+ livsmedel' },
  statsExtended:   { label: 'Utökad statistik',       description: 'Se träningshistorik 30 dagar bakåt' },
  barcodeScanner:  { label: 'Streckkodsskanner',      description: 'Scanna livsmedel med kameran och hämta näringsvärden direkt' },
  macroRings:      { label: 'Makroring',              description: 'Visualisera ditt dagliga intag av kalorier, protein, kolhydrater och fett' },
  macroGoals:      { label: 'Makromål & BMR/TDEE',    description: 'Personliga makromål beräknade från din kropp och aktivitetsnivå' },
  recurringMeals:  { label: 'Återkommande måltider',  description: 'Spara måltider som visas automatiskt varje dag' },
  statsUnlimited:  { label: 'Obegränsad statistik',   description: 'Se hela din träningshistorik utan tidsgräns' },
}

const TIER_LABEL: Record<string, string> = {
  standard: 'Standard',
  premium: 'Premium',
}

const TIER_PRICE: Record<string, string> = {
  standard: '49 kr/mån',
  premium: '79 kr/mån',
}

interface UpgradeModalProps {
  feature: Feature
  onClose: () => void
}

export default function UpgradeModal({ feature, onClose }: UpgradeModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const info = FEATURE_INFO[feature]
  const requiredRole = FEATURE_REQUIRED_ROLE[feature]
  const tierLabel = TIER_LABEL[requiredRole] ?? requiredRole
  const tierPrice = TIER_PRICE[requiredRole] ?? ''

  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.lockIcon}>🔒</div>

        <div className={styles.tierBadge} data-tier={requiredRole}>
          {tierLabel}
        </div>

        <h2 className={styles.title}>{info.label}</h2>
        <p className={styles.description}>{info.description}</p>

        <div className={styles.priceBox}>
          <span className={styles.priceLabel}>{tierLabel}-abonnemang</span>
          <span className={styles.price}>{tierPrice}</span>
        </div>

        <button className={styles.upgradeBtn} type="button" disabled>
          {t('Upgrade')} — {t('Coming soon')}
        </button>
        <button className={styles.closeBtn} type="button" onClick={onClose}>
          {t('Maybe later')}
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Drawer } from 'vaul'
import type { Feature } from '../../context/SubscriptionContext'
import { FEATURE_REQUIRED_ROLE } from '../../context/SubscriptionContext'
import styles from './UpgradeModal.module.scss'

type Tier = 'standard' | 'premium'

interface PlanInfo {
  id: Tier
  label: string
  price: string
  priceNote: string
  color: string
  features: string[]
}

const PLANS: PlanInfo[] = [
  {
    id: 'standard',
    label: 'Standard',
    price: '49 kr',
    priceNote: 'per månad',
    color: '#60a5fa',
    features: [
      'Flow-läge med automatisk nedräkning',
      'Live Activity på låsskärmen',
      'Matsökning (500 000+ livsmedel)',
      'Statistik 30 dagar bakåt',
    ],
  },
  {
    id: 'premium',
    label: 'Premium',
    price: '79 kr',
    priceNote: 'per månad',
    color: '#e8197d',
    features: [
      'Allt i Standard',
      'Streckkodsskanner',
      'Makroringar & makromål',
      'BMR / TDEE-beräkning',
      'Återkommande måltider',
      'Obegränsad statistikhistorik',
    ],
  },
]

const FEATURE_LABEL: Record<Feature, string> = {
  flow:           'Flow-läge',
  liveActivity:   'Live Activity',
  foodSearch:     'Matsökning',
  statsExtended:  'Utökad statistik',
  barcodeScanner: 'Streckkodsskanner',
  macroRings:     'Makroringar',
  macroGoals:     'Makromål & BMR/TDEE',
  recurringMeals: 'Återkommande måltider',
  statsUnlimited: 'Obegränsad statistik',
}

const TIER_RANK: Record<Tier, number> = { standard: 0, premium: 1 }

interface UpgradeModalProps {
  feature: Feature
  onClose: () => void
}

export default function UpgradeModal({ feature, onClose }: UpgradeModalProps): React.JSX.Element {
  const requiredRole = FEATURE_REQUIRED_ROLE[feature] as Tier
  const defaultTab: Tier = requiredRole === 'standard' ? 'standard' : 'premium'
  const [selected, setSelected] = useState<Tier>(defaultTab)
  const [open, setOpen] = useState(true)

  function handleClose(): void {
    setOpen(false)
    setTimeout(onClose, 500)
  }

  const plan = PLANS.find(p => p.id === selected)!

  return (
    <Drawer.Root
      open={open}
      onOpenChange={v => { if (!v) handleClose() }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className={styles.overlay} />
        <Drawer.Content className={styles.content}>
          <Drawer.Handle className={styles.handle} />

          <div className={styles.header}>
            <div className={styles.lockIcon}>🔒</div>
            <div className={styles.headerText}>
              <div className={styles.headerTitle}>Uppgradera för att använda</div>
              <Drawer.Title className={styles.featureLabel}>{FEATURE_LABEL[feature]}</Drawer.Title>
            </div>
          </div>

          <div className={styles.tabs}>
            {PLANS.map(p => (
              <button
                key={p.id}
                className={`${styles.tab} ${selected === p.id ? styles.tabActive : ''} ${TIER_RANK[p.id] < TIER_RANK[requiredRole] ? styles.tabDimmed : ''}`}
                style={selected === p.id ? { '--tab-color': p.color } as React.CSSProperties : {}}
                onClick={() => setSelected(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.planCard} style={{ '--plan-color': plan.color } as React.CSSProperties}>
            <div className={styles.priceRow}>
              <span className={styles.price}>{plan.price}</span>
              <span className={styles.priceNote}>{plan.priceNote}</span>
            </div>
            <ul className={styles.featureList}>
              {plan.features.map(f => (
                <li key={f} className={styles.featureItem}>
                  <span className={styles.check}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <button
            className={styles.upgradeBtn}
            type="button"
            disabled
            style={{ '--plan-color': plan.color } as React.CSSProperties}
          >
            Välj {plan.label} — Kommer snart
          </button>
          <button className={styles.closeBtn} type="button" onClick={handleClose}>
            Kanske senare
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

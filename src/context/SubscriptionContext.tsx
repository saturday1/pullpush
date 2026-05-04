import { createContext, useContext, useState, type ReactNode } from 'react'
import { useProfile, type UserRole } from './ProfileContext'
import { STORAGE } from '../constants/storage'
import UpgradeModal from '../components/UpgradeModal/UpgradeModal'

export type Feature =
  | 'flow'
  | 'liveActivity'
  | 'foodSearch'
  | 'statsExtended'
  | 'barcodeScanner'
  | 'macroRings'
  | 'macroGoals'
  | 'recurringMeals'
  | 'statsUnlimited'
  | 'aiCoach'
  | 'foodPhoto'
  | 'recipes'

const ROLE_RANK: Record<UserRole, number> = { free: 0, standard: 1, premium: 2, lifetime: 3, developer: 4 }

const FEATURE_REQUIRED: Record<Feature, UserRole> = {
  flow: 'standard',
  liveActivity: 'standard',
  foodSearch: 'standard',
  statsExtended: 'standard',
  barcodeScanner: 'premium',
  macroRings: 'premium',
  macroGoals: 'premium',
  recurringMeals: 'premium',
  statsUnlimited: 'premium',
  aiCoach: 'premium',
  foodPhoto: 'premium',
  recipes: 'premium',
}

export const FEATURE_REQUIRED_ROLE = FEATURE_REQUIRED

interface SubscriptionContextValue {
  effectiveRole: UserRole
  isTrialing: boolean
  trialDaysLeft: number
  canUse: (feature: Feature) => boolean
  requireUpgrade: (feature: Feature) => boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const profile = useProfile()
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null)

  const role: UserRole = profile?.role ?? 'free'
  const trialExpiresAt = profile?.trialExpiresAt ?? null

  const isTrialing = !!trialExpiresAt && new Date(trialExpiresAt) > new Date()
  const trialDaysLeft = trialExpiresAt
    ? Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / 86_400_000))
    : 0

  // Developers can override their effective role locally for testing
  const devOverride = role === 'developer'
    ? (localStorage.getItem(STORAGE.DEV_ROLE_OVERRIDE) as UserRole | null)
    : null

  const effectiveRole: UserRole = devOverride ?? (
    role === 'developer' ? 'developer' :
    role === 'lifetime' ? 'lifetime' :
    isTrialing ? 'premium' :
    role
  )

  function canUse(feature: Feature): boolean {
    return ROLE_RANK[effectiveRole] >= ROLE_RANK[FEATURE_REQUIRED[feature]]
  }

  function requireUpgrade(feature: Feature): boolean {
    if (canUse(feature)) return true
    setUpgradeFeature(feature)
    return false
  }

  return (
    <SubscriptionContext.Provider value={{ effectiveRole, isTrialing, trialDaysLeft, canUse, requireUpgrade }}>
      {children}
      {upgradeFeature && (
        <UpgradeModal feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} />
      )}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}

import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useProfile } from '../../context/ProfileContext'
import styles from './ProfileSetupModal.module.scss'

type Step = 1 | 2 | 3

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

export default function ProfileSetupModal(): React.ReactElement | null {
  const { t } = useTranslation()
  const profile = useProfile()
  if (!profile) return null
  const { profileLoading, firstName: existingFirst, lastName: existingLast, birthDate: existingBirth, phone: existingPhone, goalWeight, logWeight, updateProfile } = profile

  if (profileLoading || goalWeight !== null) return null

  // Determine initial step — skip step 1 if personal info already exists
  const hasPersonalInfo = !!(existingFirst && existingLast && existingBirth)
  const initialStep: Step = hasPersonalInfo ? 2 : 1

  return <WizardInner
    initialStep={initialStep}
    existingFirst={existingFirst}
    existingLast={existingLast}
    existingBirth={existingBirth}
    existingPhone={existingPhone}
    updateProfile={updateProfile}
    logWeight={logWeight}
    t={t}
  />
}

interface WizardInnerProps {
  initialStep: Step
  existingFirst: string | null
  existingLast: string | null
  existingBirth: string | null
  existingPhone: string | null
  updateProfile: (data: Record<string, unknown>) => Promise<boolean>
  logWeight: (kg: number) => Promise<boolean>
  t: (key: string, opts?: object) => string
}

function WizardInner({ initialStep, existingFirst, existingLast, existingBirth, existingPhone, updateProfile, logWeight, t }: WizardInnerProps): React.ReactElement {
  const [step, setStep] = useState<Step>(initialStep)
  const [dir, setDir] = useState<number>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Personal
  const [firstName, setFirstName] = useState(existingFirst ?? '')
  const [lastName, setLastName] = useState(existingLast ?? '')
  const [birthDate, setBirthDate] = useState(existingBirth ?? '')
  const [phone, setPhone] = useState(existingPhone ?? '')

  // Step 2: Weights
  const [weight, setWeight] = useState('')
  const [goalW, setGoalW] = useState('')
  const [height, setHeight] = useState('')

  // Step 3: Timers (defaults)
  const [restSec, setRestSec] = useState('90')
  const [secPerRep, setSecPerRep] = useState('4')
  const [countdown, setCountdown] = useState('10')
  const [sidePause, setSidePause] = useState('5')

  function goNext(): void {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !birthDate) {
        setError(t('Please fill in first name, last name and birthday.'))
        return
      }
      setError('')
      setDir(1)
      setStep(2)
    } else if (step === 2) {
      const w = parseFloat(weight.replace(',', '.'))
      const g = parseFloat(goalW.replace(',', '.'))
      const h = parseFloat(height.replace(',', '.'))
      if (isNaN(w) || isNaN(g) || isNaN(h)) {
        setError(t('Please fill in current weight, goal weight and height.'))
        return
      }
      setError('')
      setDir(1)
      setStep(3)
    }
  }

  function goBack(): void {
    setError('')
    setDir(-1)
    setStep((step - 1) as Step)
  }

  async function handleFinish(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError('')

    const w = parseFloat(weight.replace(',', '.'))
    const g = parseFloat(goalW.replace(',', '.'))
    const h = parseFloat(height.replace(',', '.'))

    await Promise.all([
      updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
        phone: phone.trim() || null,
        goal_weight: g,
        start_weight: w,
        height_cm: h,
        rest_seconds: parseInt(restSec) || 90,
        sec_per_rep: parseInt(secPerRep) || 4,
        countdown_seconds: parseInt(countdown) || 10,
        side_pause_seconds: parseInt(sidePause) || 5,
      }),
      logWeight(w),
    ])
    setSaving(false)
  }

  const steps: Step[] = initialStep === 1 ? [1, 2, 3] : [2, 3]

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Animated step content */}
        <div className={styles.stepContent}>
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            >
              {step === 1 && (
                <>
                  <div className={styles.badge}>{t('Step 1')}</div>
                  <h2 className={styles.title}>{t('About you')}</h2>
                  <p className={styles.sub}>{t('This information is used to calculate calories, macros and weight goals.')}</p>
                  <div className={styles.form}>
                    <div className={styles.row2}>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('First name *')}</span>
                        <input className={styles.input} type="text" value={firstName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} placeholder={t('First name')} autoFocus />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Last name *')}</span>
                        <input className={styles.input} type="text" value={lastName} onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} placeholder={t('Last name')} />
                      </label>
                    </div>
                    <div className={styles.row2}>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Birthday *')}</span>
                        <input className={styles.input} type="date" value={birthDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setBirthDate(e.target.value)} />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Phone')}</span>
                        <input className={styles.input} type="tel" value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} placeholder={t('Optional')} />
                      </label>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <button type="button" className={styles.btn} onClick={goNext}>{t('Next')}</button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className={styles.badge}>{initialStep === 1 ? t('Step 2') : t('Step 1')}</div>
                  <h2 className={styles.title}>{t('Your body')}</h2>
                  <p className={styles.sub}>{t('Used to calculate BMR, TDEE and macro targets.')}</p>
                  <div className={styles.form}>
                    <div className={styles.row3}>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Weight (kg) *')}</span>
                        <input className={styles.input} type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e: ChangeEvent<HTMLInputElement>) => setWeight(e.target.value)} placeholder="kg" autoFocus />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Goal weight *')}</span>
                        <input className={styles.input} type="number" inputMode="decimal" step="0.1" value={goalW} onChange={(e: ChangeEvent<HTMLInputElement>) => setGoalW(e.target.value)} placeholder="kg" />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Height *')}</span>
                        <input className={styles.input} type="number" value={height} onChange={(e: ChangeEvent<HTMLInputElement>) => setHeight(e.target.value)} placeholder="cm" />
                      </label>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.stepActions}>
                      {initialStep === 1 && <button type="button" className={styles.backBtn} onClick={goBack}>{t('Back')}</button>}
                      <button type="button" className={styles.btn} onClick={goNext}>{t('Next')}</button>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <form onSubmit={handleFinish}>
                  <div className={styles.badge}>{initialStep === 1 ? t('Step 3') : t('Step 2')}</div>
                  <h2 className={styles.title}>{t('Workout timers')}</h2>
                  <p className={styles.sub}>{t('You can change these later in settings.')}</p>
                  <div className={styles.form}>
                    <div className={styles.row2}>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Rest timer (seconds)')}</span>
                        <input className={styles.input} type="number" value={restSec} onChange={(e: ChangeEvent<HTMLInputElement>) => setRestSec(e.target.value)} placeholder="90" />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Sec per rep')}</span>
                        <input className={styles.input} type="number" value={secPerRep} onChange={(e: ChangeEvent<HTMLInputElement>) => setSecPerRep(e.target.value)} placeholder="4" />
                      </label>
                    </div>
                    <div className={styles.row2}>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Countdown (sec)')}</span>
                        <input className={styles.input} type="number" value={countdown} onChange={(e: ChangeEvent<HTMLInputElement>) => setCountdown(e.target.value)} placeholder="10" />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>{t('Side pause (sec)')}</span>
                        <input className={styles.input} type="number" value={sidePause} onChange={(e: ChangeEvent<HTMLInputElement>) => setSidePause(e.target.value)} placeholder="5" />
                      </label>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.stepActions}>
                      <button type="button" className={styles.backBtn} onClick={goBack}>{t('Back')}</button>
                      <button type="submit" disabled={saving} className={styles.btn}>
                        {saving ? t('Saving…') : t('Get started')}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

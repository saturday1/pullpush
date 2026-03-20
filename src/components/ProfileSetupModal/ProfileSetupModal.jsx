import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfile } from '../../context/ProfileContext'
import styles from './ProfileSetupModal.module.scss'

export default function ProfileSetupModal() {
  const { t } = useTranslation()
  const { loading, goalWeight, logWeight, updateProfile } = useProfile()
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [birthDate,   setBirthDate]   = useState('')
  const [phone,       setPhone]       = useState('')
  const [setupWeight, setSetupWeight] = useState('')
  const [setupGoal,   setSetupGoal]   = useState('')
  const [setupHeight, setSetupHeight] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  if (loading || goalWeight !== null) return null

  async function handleSetup(e) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !birthDate) {
      setError(t('Please fill in first name, last name and birthday.'))
      return
    }
    const goal_weight = parseFloat(setupGoal.replace(',', '.'))
    const height_cm   = parseFloat(setupHeight.replace(',', '.'))
    const startKg     = parseFloat(setupWeight.replace(',', '.'))
    if (isNaN(goal_weight) || isNaN(height_cm) || isNaN(startKg)) {
      setError(t('Please fill in current weight, goal weight and height.'))
      return
    }
    setError('')
    setSaving(true)
    await Promise.all([
      updateProfile({
        goal_weight,
        height_cm,
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        birth_date: birthDate,
        phone:      phone.trim() || null,
      }),
      logWeight(startKg),
    ])
    setSaving(false)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.badge}>{t('PROFILE')}</div>
        <h2 className={styles.title} dangerouslySetInnerHTML={{ __html: t('Welcome —<br/>fill in your profile') }} />
        <p className={styles.sub}>{t('This information is used to calculate calories, macros and weight goals.')}</p>

        <form onSubmit={handleSetup} className={styles.form}>
          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>{t('First name *')}</span>
              <input className={styles.input} type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('First name')} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('Last name *')}</span>
              <input className={styles.input} type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('Last name')} />
            </label>
          </div>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>{t('Birthday *')}</span>
              <input className={styles.input} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('Phone')}</span>
              <input className={styles.input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('Optional')} />
            </label>
          </div>

          <div className={styles.row3}>
            <label className={styles.field}>
              <span className={styles.label}>{t('Weight (kg) *')}</span>
              <input className={styles.input} type="number" step="0.1" value={setupWeight} onChange={e => setSetupWeight(e.target.value)} placeholder="kg" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('Goal weight *')}</span>
              <input className={styles.input} type="number" step="0.1" value={setupGoal} onChange={e => setSetupGoal(e.target.value)} placeholder="kg" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>{t('Height *')}</span>
              <input className={styles.input} type="number" value={setupHeight} onChange={e => setSetupHeight(e.target.value)} placeholder="cm" />
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={saving} className={styles.btn}>
            {saving ? t('Saving…') : t('Get started')}
          </button>
        </form>
      </div>
    </div>
  )
}

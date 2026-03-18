import { useState } from 'react'
import { useProfile } from '../../context/ProfileContext'
import styles from './ProfileSetupModal.module.scss'

export default function ProfileSetupModal() {
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
      setError('Fyll i förnamn, efternamn och födelsedag.')
      return
    }
    const goal_weight = parseFloat(setupGoal.replace(',', '.'))
    const height_cm   = parseFloat(setupHeight.replace(',', '.'))
    const startKg     = parseFloat(setupWeight.replace(',', '.'))
    if (isNaN(goal_weight) || isNaN(height_cm) || isNaN(startKg)) {
      setError('Fyll i nuvarande vikt, målvikt och längd.')
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
        <div className={styles.badge}>PROFIL</div>
        <h2 className={styles.title}>Välkommen —<br />fyll i din profil</h2>
        <p className={styles.sub}>Uppgifterna används för att beräkna kalorier, makros och viktmål.</p>

        <form onSubmit={handleSetup} className={styles.form}>
          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>Förnamn *</span>
              <input className={styles.input} type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Förnamn" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Efternamn *</span>
              <input className={styles.input} type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Efternamn" />
            </label>
          </div>

          <div className={styles.row2}>
            <label className={styles.field}>
              <span className={styles.label}>Födelsedag *</span>
              <input className={styles.input} type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Telefon</span>
              <input className={styles.input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Valfritt" />
            </label>
          </div>

          <div className={styles.row3}>
            <label className={styles.field}>
              <span className={styles.label}>Vikt (kg) *</span>
              <input className={styles.input} type="number" step="0.1" value={setupWeight} onChange={e => setSetupWeight(e.target.value)} placeholder="kg" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Målvikt *</span>
              <input className={styles.input} type="number" step="0.1" value={setupGoal} onChange={e => setSetupGoal(e.target.value)} placeholder="kg" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Längd *</span>
              <input className={styles.input} type="number" value={setupHeight} onChange={e => setSetupHeight(e.target.value)} placeholder="cm" />
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={saving} className={styles.btn}>
            {saving ? 'Sparar…' : 'Kom igång'}
          </button>
        </form>
      </div>
    </div>
  )
}

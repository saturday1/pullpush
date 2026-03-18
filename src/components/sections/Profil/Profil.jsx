import { useState, useEffect } from 'react'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { supabase } from '../../../supabase'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Profil.module.scss'

function formatDate(dateStr) {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('sv-SE')
}

export default function Profil() {
  const { loading, firstName, lastName, birthDate, phone, age, height, goalWeight, updateProfile } = useProfile()
  const [email, setEmail] = useState('')

  // Edit mode
  const [editing,    setEditing]    = useState(false)
  const [editFirst,  setEditFirst]  = useState('')
  const [editLast,   setEditLast]   = useState('')
  const [editBirth,  setEditBirth]  = useState('')
  const [editPhone,  setEditPhone]  = useState('')
  const [editHeight, setEditHeight] = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email ?? '')
    })
  }, [])

  function startEdit() {
    setEditFirst(firstName ?? '')
    setEditLast(lastName ?? '')
    setEditBirth(birthDate ?? '')
    setEditPhone(phone ?? '')
    setEditHeight(height?.toString() ?? '')
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await updateProfile({
      goal_weight: goalWeight,
      height_cm:   parseFloat(editHeight) || height,
      first_name:  editFirst.trim(),
      last_name:   editLast.trim(),
      birth_date:  editBirth || null,
      phone:       editPhone.trim() || null,
    })
    setSaving(false)
    setEditing(false)
  }

  return (
    <section id="profil">
      <SectionHeader number="01" title="Profil" />

      <Reveal>
        <div className={styles.infoCard}>
          <div className={styles.infoCardHeader}>
            <span className={styles.infoCardTitle}>Personuppgifter</span>
            {!editing && (
              <button className={styles.editBtn} onClick={startEdit}>Redigera</button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className={styles.editForm}>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Förnamn</span>
                  <input className={styles.fieldInput} type="text" value={editFirst} onChange={e => setEditFirst(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Efternamn</span>
                  <input className={styles.fieldInput} type="text" value={editLast} onChange={e => setEditLast(e.target.value)} />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Födelsedag</span>
                  <input className={styles.fieldInput} type="date" value={editBirth} onChange={e => setEditBirth(e.target.value)} />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Längd (cm)</span>
                  <input className={styles.fieldInput} type="number" value={editHeight} onChange={e => setEditHeight(e.target.value)} placeholder="cm" />
                </label>
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Telefon</span>
                  <input className={styles.fieldInput} type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Valfritt" />
                </label>
              </div>
              <div className={styles.editActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>Avbryt</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Sparar…' : 'Spara'}</button>
              </div>
            </form>
          ) : (
            <div className={styles.infoRows}>
              <div className={styles.infoRow}><span>Namn</span><span>{loading ? '…' : `${firstName ?? '–'} ${lastName ?? ''}`}</span></div>
              <div className={styles.infoRow}><span>Ålder</span><span>{loading ? '…' : `${age ?? '–'} år (${formatDate(birthDate)})`}</span></div>
              <div className={styles.infoRow}><span>Längd</span><span>{loading ? '…' : `${height ?? '–'} cm`}</span></div>
              <div className={styles.infoRow}><span>Telefon</span><span>{loading ? '…' : (phone ?? '–')}</span></div>
              <div className={styles.infoRow}><span>E-post</span><span>{email || '…'}</span></div>
            </div>
          )}
        </div>
      </Reveal>

    </section>
  )
}

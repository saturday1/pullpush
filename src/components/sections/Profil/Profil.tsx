import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfile } from '../../../context/ProfileContext'
import { supabase } from '../../../supabase'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Skeleton from '../../Skeleton/Skeleton'
import styles from './Profil.module.scss'

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '–'
    return new Date(dateStr).toLocaleDateString('sv-SE')
}

function maskPhone(phone: string | null | undefined): string {
    if (!phone) return '–'
    const digits = phone.replace(/\D/g, '')
    const last4 = digits.slice(-4)
    const prefix = phone.startsWith('+') ? phone.slice(0, phone.indexOf(' ') > 0 ? phone.indexOf(' ') : 3) : ''
    return `${prefix} *** *** ${last4}`
}

function maskEmail(email: string): string {
    if (!email) return '…'
    const [local, domain] = email.split('@')
    if (!domain) return email
    return `${local[0]}***@${domain}`
}

export default function Profil(): React.JSX.Element {
    const { t, i18n } = useTranslation()
    const { profileLoading, firstName, lastName, birthDate, phone, age, height, goalWeight, startWeight, updateProfile } = useProfile()!
    const [email, setEmail] = useState<string>('')

    const [editing, setEditing] = useState<boolean>(false)
    const [editFirst, setEditFirst] = useState<string>('')
    const [editLast, setEditLast] = useState<string>('')
    const [editBirth, setEditBirth] = useState<string>('')
    const [editPhone, setEditPhone] = useState<string>('')
    const [editHeight, setEditHeight] = useState<string>('')
    const [editGoal, setEditGoal] = useState<string>('')
    const [editStart, setEditStart] = useState<string>('')
    const [saving, setSaving] = useState<boolean>(false)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setEmail(user.email ?? '')
        })
    }, [])

    function startEdit(): void {
        setEditFirst(firstName ?? '')
        setEditLast(lastName ?? '')
        setEditBirth(birthDate ?? '')
        setEditPhone(phone ?? '')
        setEditHeight(height?.toString() ?? '')
        setEditGoal(goalWeight?.toString() ?? '')
        setEditStart(startWeight?.toString() ?? '')
        setEditing(true)
    }

    async function handleSave(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault()
        setSaving(true)
        await updateProfile({
            goal_weight: parseFloat(editGoal) || goalWeight,
            start_weight: parseFloat(editStart) || startWeight,
            height_cm: parseFloat(editHeight) || height,
            first_name: editFirst.trim(),
            last_name: editLast.trim(),
            birth_date: editBirth || null,
            phone: editPhone.trim() || null,
        })
        setSaving(false)
        setEditing(false)
    }

    return (
        <section id="profil">
            <SectionHeader number="01" title={t('Profile')} />

            <Reveal>
                <div className={styles.infoCard}>
                    <div className={styles.infoCardHeader}>
                        <span className={styles.infoCardTitle}>{t('Personal information')}</span>
                        {!editing && (
                            <button className={styles.editBtn} onClick={startEdit}>{t('Edit')}</button>
                        )}
                    </div>

                    {editing ? (
                        <form onSubmit={handleSave} className={styles.editForm}>
                            <div className={styles.fieldRow}>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>{t('First name')}</span>
                                    <input className={styles.fieldInput} type="text" value={editFirst} onChange={e => setEditFirst(e.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>{t('Last name')}</span>
                                    <input className={styles.fieldInput} type="text" value={editLast} onChange={e => setEditLast(e.target.value)} />
                                </label>
                            </div>
                            <div className={styles.fieldRow}>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>{t('Birthday')}</span>
                                    <input className={styles.fieldInput} type="date" value={editBirth} onChange={e => setEditBirth(e.target.value)} />
                                </label>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>{t('Height (cm)')}</span>
                                    <input className={styles.fieldInput} type="number" value={editHeight} onChange={e => setEditHeight(e.target.value)} placeholder="cm" />
                                </label>
                            </div>
                            <div className={styles.fieldRow}>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>{t('Phone')}</span>
                                    <input className={styles.fieldInput} type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder={t('Optional')} />
                                </label>
                            </div>
                            <div className={styles.fieldRow}>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>{t('Start weight (kg)')}</span>
                                    <input className={styles.fieldInput} type="number" step="0.1" value={editStart} onChange={e => setEditStart(e.target.value)} placeholder="kg" />
                                </label>
                                <label className={styles.field}>
                                    <span className={styles.fieldLabel}>{t('Goal weight (kg)')}</span>
                                    <input className={styles.fieldInput} type="number" step="0.1" value={editGoal} onChange={e => setEditGoal(e.target.value)} placeholder="kg" />
                                </label>
                            </div>
                            <div className={styles.editActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)}>{t('Cancel')}</button>
                                <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? t('Saving…') : t('Save')}</button>
                            </div>
                        </form>
                    ) : (
                        <div className={styles.infoRows}>
                            <div className={styles.infoRow}><span>{t('Name')}</span><span>{profileLoading ? <Skeleton width={120} height={14} /> : `${firstName ?? '–'} ${lastName ?? ''}`}</span></div>
                            <div className={styles.infoRow}><span>{t('Age')}</span><span>{profileLoading ? <Skeleton width={140} height={14} /> : t('{{age}} years ({{date}})', { age: age ?? '–', date: formatDate(birthDate) })}</span></div>
                            <div className={styles.infoRow}><span>{t('Height')}</span><span>{profileLoading ? <Skeleton width={60} height={14} /> : t('{{height}} cm', { height: height ?? '–' })}</span></div>
                            <div className={styles.infoRow}><span>{t('Phone')}</span><span>{profileLoading ? <Skeleton width={100} height={14} /> : maskPhone(phone)}</span></div>
                            <div className={styles.infoRow}><span>{t('Start weight')}</span><span>{profileLoading ? <Skeleton width={60} height={14} /> : (startWeight ? `${startWeight} kg` : '–')}</span></div>
                            <div className={styles.infoRow}><span>{t('Goal weight')}</span><span>{profileLoading ? <Skeleton width={60} height={14} /> : (goalWeight ? `${goalWeight} kg` : '–')}</span></div>
                            <div className={styles.infoRow}><span>{t('Email')}</span><span>{maskEmail(email)}</span></div>
                        </div>
                    )}
                </div>
            </Reveal>

        </section>
    )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './WeeklyPlanEditor.module.scss'

interface Session {
  id: string
  name: string
}

interface WeeklyPlan {
  id: string
  name: string
  is_active: boolean
}

interface PlanDay {
  day_of_week: number
  session_id: string
}

interface Props {
  plans: WeeklyPlan[]
  days: PlanDay[]
  activePlanId: string | null
  sessions: Session[]
  onSaveDays: (planId: string, days: PlanDay[]) => Promise<void>
  onCreatePlan: (name: string) => Promise<void>
  onSwitchPlan: (id: string) => Promise<void>
  onRenamePlan: (id: string, name: string) => Promise<void>
  onDeletePlan: (id: string) => Promise<void>
  onClose: () => void
}

export default function WeeklyPlanEditor({ plans, days, activePlanId, sessions, onSaveDays, onCreatePlan, onSwitchPlan, onRenamePlan, onDeletePlan, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const dayNames = t('dayFull', { returnObjects: true }) as string[]

  const activePlan = plans.find(p => p.id === activePlanId) ?? plans[0]
  const planDays = days.filter(d => d.plan_id === activePlanId)

  const [localDays, setLocalDays] = useState<PlanDay[]>(planDays.map(d => ({ day_of_week: d.day_of_week, session_id: d.session_id })))
  const [saving, setSaving] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(activePlan?.name ?? '')
  const [pickingDay, setPickingDay] = useState<number | null>(null)

  function addDay(dow: number, sessionId: string): void {
    setLocalDays(prev => [...prev, { day_of_week: dow, session_id: sessionId }])
    setPickingDay(null)
  }

  function removeDay(dow: number, sessionId: string): void {
    setLocalDays(prev => {
      const idx = prev.findIndex(d => d.day_of_week === dow && d.session_id === sessionId)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }

  async function handleSave(): Promise<void> {
    if (!activePlanId) return
    setSaving(true)
    await onSaveDays(activePlanId, localDays)
    setSaving(false)
    onClose()
  }

  async function handleCreatePlan(): Promise<void> {
    if (!newPlanName.trim()) return
    await onCreatePlan(newPlanName.trim())
    setCreatingPlan(false)
    setNewPlanName('')
  }

  async function handleRename(): Promise<void> {
    if (!activePlanId || !editName.trim()) return
    await onRenamePlan(activePlanId, editName.trim())
    setEditingName(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('Weekly plan')}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Plan selector */}
        {plans.length > 1 && (
          <div className={styles.planSelector}>
            {plans.map(p => (
              <button
                key={p.id}
                className={`${styles.planPill} ${p.id === activePlanId ? styles.planPillActive : ''}`}
                onClick={() => onSwitchPlan(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Plan name edit */}
        {activePlan && (
          <div className={styles.planNameRow}>
            {editingName ? (
              <>
                <input className={styles.planNameInput} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                <button className={styles.smallBtn} onClick={handleRename}>{t('Save')}</button>
                <button className={styles.smallBtn} onClick={() => setEditingName(false)}>{t('Cancel')}</button>
              </>
            ) : (
              <>
                <span className={styles.planName}>{activePlan.name}</span>
                <button className={styles.smallBtn} onClick={() => { setEditName(activePlan.name); setEditingName(true) }}>✎</button>
                {plans.length > 1 && (
                  <button className={styles.smallBtnDanger} onClick={() => { if (confirm(t('Delete this plan?'))) onDeletePlan(activePlan.id) }}>{t('Delete')}</button>
                )}
              </>
            )}
          </div>
        )}

        {/* Days */}
        <div className={styles.dayList}>
          {[1, 2, 3, 4, 5, 6, 7].map(dow => {
            const assigned = localDays.filter(d => d.day_of_week === dow)
            const assignedSessions = assigned.map(a => ({ ...a, session: sessions.find(s => s.id === a.session_id) })).filter(a => a.session)
            return (
              <div key={dow} className={styles.dayRow}>
                <span className={styles.dayLabel}>{dayNames[dow - 1]}</span>
                <div className={styles.dayContent}>
                  {assignedSessions.map((a, i) => (
                    <div key={i} className={styles.daySession}>
                      <span className={styles.daySessionName}>{a.session!.name}</span>
                      <button className={styles.dayRemoveBtn} onClick={() => removeDay(dow, a.session_id)}>✕</button>
                    </div>
                  ))}
                  {pickingDay === dow ? (
                  <div className={styles.dayPicker}>
                    {sessions.map(s => (
                      <button key={s.id} className={styles.dayPickerItem} onClick={() => addDay(dow, s.id)}>{s.name}</button>
                    ))}
                    <button className={styles.dayPickerCancel} onClick={() => setPickingDay(null)}>{t('Cancel')}</button>
                  </div>
                ) : (
                  <button className={styles.addDayBtn} onClick={() => setPickingDay(dow)}>+ {t('Add')}</button>
                )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '…' : t('Save')}
          </button>
        </div>

        {/* Create new plan */}
        <div className={styles.newPlanSection}>
          {creatingPlan ? (
            <div className={styles.newPlanRow}>
              <input className={styles.planNameInput} value={newPlanName} onChange={e => setNewPlanName(e.target.value)} placeholder={t('Plan name')} autoFocus />
              <button className={styles.smallBtn} onClick={handleCreatePlan}>{t('Create')}</button>
              <button className={styles.smallBtn} onClick={() => setCreatingPlan(false)}>✕</button>
            </div>
          ) : (
            <button className={styles.newPlanBtn} onClick={() => setCreatingPlan(true)}>+ {t('New plan')}</button>
          )}
        </div>
      </div>
    </div>
  )
}

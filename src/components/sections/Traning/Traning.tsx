import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor, registerPlugin } from '@capacitor/core'
import SectionHeader from '../../SectionHeader/SectionHeader'
import AutoplayIcon from '../../icons/Normal/AutoplayIcon'
import CirclePauseIcon from '../../icons/Normal/CirclePauseIcon'
import MinimizeIcon from '../../icons/Normal/MinimizeIcon'
import MaximizeIcon from '../../icons/Normal/MaximizeIcon'
import PlayIcon from '../../icons/Normal/PlayIcon'
import { useWeightUnit, formatWeight, formatWeightJsx, toLbs as toLbsShared } from '../../../hooks/useWeightUnit'

interface RestTimerPlugin {
  start(options: { seconds: number; label?: string }): Promise<void>
  stop(): Promise<void>
}

const RestTimer: RestTimerPlugin | null = Capacitor.isNativePlatform() ? registerPlugin<RestTimerPlugin>('RestTimer') : null
import Reveal from '../../Reveal/Reveal'
import Skeleton from '../../Skeleton/Skeleton'
import { supabase } from '../../../supabase'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Traning.module.scss'

// --- Data interfaces ---

interface Exercise {
  id: string
  name: string
  note?: string | null
  session_id: string
  user_id: string
  sort_order: number
  tab: string
  catalog_id: number | null
  exercise_catalog?: { name: string } | null
}

interface ExerciseLog {
  kg: number
  sets: number | null
  reps: number
  unilateral: boolean
}

interface ExerciseLastDone {
  date: string
  reps: number
  kg: number | null
}

interface TrainingSession {
  id: string
  name: string
  day_of_week: number
  user_id: string
  program_id: string
  sort_order: number
  [key: string]: unknown
}

interface TrainingProgram {
  id: string
  name: string
  user_id: string
  created_at: string
  [key: string]: unknown
}

interface CatalogItem {
  id: number
  name: string
  muscle_group: string | null
}

interface SessionData {
  user_id: string
  day_of_week: number
  name: string
  sort_order: number
  program_id: number
}

// --- Constants ---

const KG_TO_LBS: number = 2.20462
const toKg  = (lbs: number): number => +(lbs / KG_TO_LBS).toFixed(2)
const toLbs = (kg: number): number  => +(kg  * KG_TO_LBS).toFixed(1)

function formatRelativeDate(iso: string, t: (k: string, opts?: object) => string): string {
  const then = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return `(${t('today')})`
  if (diffDays === 1) return `(${t('yesterday')})`
  if (diffDays < 7) return `(${t('{{n}} days ago', { n: diffDays })})`
  if (diffDays < 14) return `(${t('1 week ago')})`
  const weeks = Math.floor(diffDays / 7)
  if (diffDays < 60) return `(${t('{{n}} weeks ago', { n: weeks })})`
  const months = Math.floor(diffDays / 30)
  return `(${t('{{n}} months ago', { n: months })})`
}

// --- Sub-components ---

interface SetPlan { set_number: number; reps: number; weight_kg: number | null }

interface ExerciseModalProps {
  exercise: Exercise
  current: ExerciseLog | undefined
  setPlans: SetPlan[]
  onRename: (exercise: Exercise, name: string) => Promise<void>
  onLog: (exerciseId: string, kg: number, sets: number | null, reps: number, unilateral: boolean) => Promise<void>
  onSaveSetPlans: (exerciseId: string, plans: SetPlan[]) => Promise<void>
  onSaveNote: (exerciseId: string, note: string) => Promise<void>
  onDelete: (exercise: Exercise) => Promise<void>
  onClose: () => void
}

function ExerciseModal({ exercise, current, setPlans, onRename, onLog, onSaveSetPlans, onSaveNote, onDelete, onClose }: ExerciseModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [name,       setName]       = useState<string>(exercise.name)
  const [note,       setNote]       = useState<string>(exercise.note ?? '')
  const [kg,         setKg]         = useState<string>(current?.kg?.toString() ?? '')
  const [lbs,        setLbs]        = useState<string>(current?.kg ? toLbs(current.kg).toString() : '')
  const [sets,       setSets]       = useState<string>(current?.sets?.toString() ?? '3')
  const [reps,       setReps]       = useState<string>(current?.reps?.toString() ?? '')
  const [saving,     setSaving]     = useState<boolean>(false)
  const [confirming, setConfirming] = useState<boolean>(false)
  const [deleting,   setDeleting]   = useState<boolean>(false)
  const [unilateral, setUnilateral] = useState<boolean>(current?.unilateral ?? false)
  const [individualMode, setIndividualMode] = useState<boolean>(setPlans.length > 0)
  const [indSets,    setIndSets]    = useState<Array<{ reps: string; kg: string; lbs: string }>>(
    setPlans.length > 0
      ? setPlans.map(p => ({ reps: p.reps.toString(), kg: p.weight_kg?.toString() ?? '', lbs: p.weight_kg ? toLbs(p.weight_kg).toString() : '' }))
      : []
  )

  function handleKgChange(val: string): void {
    setKg(val)
    const n = parseFloat(val.replace(',', '.'))
    if (!isNaN(n)) setLbs(toLbs(n).toString())
  }
  function handleLbsChange(val: string): void {
    setLbs(val)
    const n = parseFloat(val.replace(',', '.'))
    if (!isNaN(n)) setKg(toKg(n).toString())
  }
  function addIndSet(): void {
    setIndSets(prev => [...prev, { reps: '', kg: '', lbs: '' }])
  }
  function removeIndSet(i: number): void {
    setIndSets(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateIndSetKg(i: number, val: string): void {
    setIndSets(prev => prev.map((s, idx) => {
      if (idx !== i) return s
      const n = parseFloat(val.replace(',', '.'))
      return { ...s, kg: val, lbs: !isNaN(n) ? toLbs(n).toString() : s.lbs }
    }))
  }
  function updateIndSetLbs(i: number, val: string): void {
    setIndSets(prev => prev.map((s, idx) => {
      if (idx !== i) return s
      const n = parseFloat(val.replace(',', '.'))
      return { ...s, lbs: val, kg: !isNaN(n) ? toKg(n).toString() : s.kg }
    }))
  }
  function updateIndSetReps(i: number, val: string): void {
    setIndSets(prev => prev.map((s, idx) => idx === i ? { ...s, reps: val } : s))
  }

  async function handleSave(): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    if (trimmed !== exercise.name) await onRename(exercise, trimmed)
    if (note !== (exercise.note ?? '')) await onSaveNote(exercise.id, note)

    if (individualMode && indSets.length > 0) {
      const plans: SetPlan[] = indSets.map((s, i) => ({
        set_number: i + 1,
        reps: parseInt(s.reps) || 0,
        weight_kg: s.kg ? parseFloat(s.kg.replace(',', '.')) : null,
      })).filter(p => p.reps > 0)
      await onSaveSetPlans(exercise.id, plans)
    } else {
      // Standard mode — clear any individual plans
      await onSaveSetPlans(exercise.id, [])
      const kgVal = parseFloat(kg.replace(',', '.'))
      const setsVal = parseInt(sets)
      const repsVal = parseInt(reps)
      if (!isNaN(kgVal) && !isNaN(repsVal)) {
        await onLog(exercise.id, kgVal, isNaN(setsVal) ? null : setsVal, repsVal, unilateral)
      }
    }
    setSaving(false)
    onClose()
  }
  async function handleDelete(): Promise<void> {
    setDeleting(true)
    await onDelete(exercise)
    setDeleting(false)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} ${individualMode ? styles.modalLarge : ''}`} onClick={e => e.stopPropagation()}>
        {confirming ? (
          <>
            <div className={styles.modalTitle}>{t('Delete exercise?')}</div>
            <p className={styles.confirmText} dangerouslySetInnerHTML={{ __html: t('Delete <strong>{{name}}</strong>? This cannot be undone.', { name: exercise.name }) }} />
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>{t('Cancel')}</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : t('Yes, delete')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalTitle}>{t('Exercise')}</div>
            <div className={styles.modalFields}>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>{t('Name')}</span>
                <input className={styles.modalInput} type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </label>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>{t('Note')}</span>
                <input className={styles.modalInput} type="text" value={note} onChange={e => setNote(e.target.value)} placeholder={t('e.g. bar weighs 20kg')} />
              </label>

              {!individualMode ? (
                <>
                  <div className={styles.modalRow}>
                    <label className={styles.modalField}>
                      <span className={styles.modalLabel}>{t('Weight (kg)')}</span>
                      <input className={styles.modalInput} type="number" inputMode="decimal" step="0.5" value={kg} onChange={e => handleKgChange(e.target.value)} />
                    </label>
                    <label className={styles.modalField}>
                      <span className={styles.modalLabel}>{t('Weight (lbs)')}</span>
                      <input className={styles.modalInput} type="number" inputMode="decimal" step="1" value={lbs} onChange={e => handleLbsChange(e.target.value)} />
                    </label>
                  </div>
                  <div className={styles.modalRow}>
                    <label className={styles.modalField}>
                      <span className={styles.modalLabel}>{t('Sets')}</span>
                      <input className={styles.modalInput} type="number" step="1" value={sets} onChange={e => setSets(e.target.value)} />
                    </label>
                    <label className={styles.modalField}>
                      <span className={styles.modalLabel}>{t('Reps')}</span>
                      <input className={styles.modalInput} type="number" step="1" value={reps} onChange={e => setReps(e.target.value)} />
                    </label>
                  </div>
                  <button className={styles.indSetToggle} type="button" onClick={() => {
                    setIndividualMode(true)
                    if (indSets.length === 0) {
                      const numSets = parseInt(sets) || 1
                      const initSets = Array.from({ length: numSets }, () => ({ reps, kg, lbs }))
                      setIndSets(initSets)
                    }
                  }}>
                    + {t('Individual sets')}
                  </button>
                  <label className={styles.unilateralToggle}>
                    <input type="checkbox" checked={unilateral} onChange={e => setUnilateral(e.target.checked)} />
                    <span>{t('Unilateral (per side)')}</span>
                  </label>
                </>
              ) : (
                <>
                  <div className={styles.indSetList}>
                    <div className={styles.indSetHeader}>
                      <span className={styles.indSetLabel}></span>
                      <span className={styles.indSetHeaderCell}>{t('Reps')}</span>
                      <span className={styles.indSetHeaderCell}>{t('kg')}</span>
                      <span className={styles.indSetHeaderCell}>{t('lbs')}</span>
                      <span className={styles.indSetHeaderSpacer} />
                    </div>
                    {indSets.map((s, i) => (
                      <div key={i} className={styles.indSetRow}>
                        <span className={styles.indSetLabel}>Set {i + 1}</span>
                        <input className={styles.modalInput} type="number" placeholder={t('Reps')} value={s.reps} onChange={e => updateIndSetReps(i, e.target.value)} />
                        <input className={styles.modalInput} type="number" inputMode="decimal" step="0.5" placeholder="kg" value={s.kg} onChange={e => updateIndSetKg(i, e.target.value)} />
                        <input className={styles.modalInput} type="number" inputMode="decimal" step="1" placeholder="lbs" value={s.lbs} onChange={e => updateIndSetLbs(i, e.target.value)} />
                        <button className={styles.indSetRemove} type="button" onClick={() => removeIndSet(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button className={styles.indSetToggle} type="button" onClick={addIndSet}>
                    + {t('Add set')}
                  </button>
                  <button className={styles.indSetBack} type="button" onClick={() => { setIndividualMode(false); setIndSets([]) }}>
                    ← {t('Back to standard')}
                  </button>
                </>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.deleteSessionBtn} onClick={() => setConfirming(true)}>{t('Delete')}</button>
              <button className={styles.cancelBtn} onClick={onClose}>{t('Cancel')}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? '…' : t('Save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface AddSessionModalProps {
  userId: string | null
  sortOrder: number
  onSave: (data: SessionData) => Promise<void>
  onClose: () => void
}

function AddSessionModal({ userId, sortOrder, onSave, onClose }: AddSessionModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const dayFull = t('dayFull', { returnObjects: true }) as string[]
  const [name, setName] = useState<string>('')
  const [day,  setDay]  = useState<number>(1)
  const [saving, setSaving] = useState<boolean>(false)

  async function handleSave(): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await onSave({ user_id: userId!, day_of_week: day, name: trimmed, sort_order: sortOrder } as SessionData)
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{t('New training session')}</div>
        <div className={styles.modalFields}>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>{t('Session name')}</span>
            <input
              className={styles.modalInput}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder={t('e.g. Push, Legs, Full body…')}
              autoFocus
            />
          </label>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>{t('Day')}</span>
            <select className={styles.modalInput} value={day} onChange={e => setDay(Number(e.target.value))}>
              {dayFull.map((d: string, i: number) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>{t('Cancel')}</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? '…' : t('Add')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditSessionModalProps {
  session: TrainingSession
  onSave: (id: string, name: string, dayOfWeek: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

function EditSessionModal({ session, onSave, onDelete, onClose }: EditSessionModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const dayFull = t('dayFull', { returnObjects: true }) as string[]
  const [name,       setName]       = useState<string>(session.name)
  const [day,        setDay]        = useState<number>(session.day_of_week)
  const [saving,     setSaving]     = useState<boolean>(false)
  const [confirming, setConfirming] = useState<boolean>(false)
  const [deleting,   setDeleting]   = useState<boolean>(false)

  async function handleSave(): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await onSave(session.id, trimmed, day)
    setSaving(false)
  }
  async function handleDelete(): Promise<void> {
    setDeleting(true)
    await onDelete(session.id)
    setDeleting(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{t('Edit session')}</div>

        {confirming ? (
          <>
            <p className={styles.confirmText} dangerouslySetInnerHTML={{ __html: t('Delete <strong>{{name}}</strong> and all its exercises? This cannot be undone.', { name: session.name }) }} />
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>{t('Cancel')}</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : t('Yes, delete')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalFields}>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>{t('Session name')}</span>
                <input className={styles.modalInput} type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </label>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>{t('Day')}</span>
                <select className={styles.modalInput} value={day} onChange={e => setDay(Number(e.target.value))}>
                  {dayFull.map((d: string, i: number) => <option key={i + 1} value={i + 1}>{d}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.deleteSessionBtn} onClick={() => setConfirming(true)}>
                {t('Delete session')}
              </button>
              <button className={styles.cancelBtn} onClick={onClose}>{t('Cancel')}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? '…' : t('Save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface EditProgramModalProps {
  program: TrainingProgram
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

function EditProgramModal({ program, onRename, onDelete, onClose }: EditProgramModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [name,       setName]       = useState<string>(program.name)
  const [saving,     setSaving]     = useState<boolean>(false)
  const [confirming, setConfirming] = useState<boolean>(false)
  const [deleting,   setDeleting]   = useState<boolean>(false)

  async function handleSave(): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await onRename(program.id, trimmed)
    setSaving(false)
    onClose()
  }
  async function handleDelete(): Promise<void> {
    setDeleting(true)
    await onDelete(program.id)
    setDeleting(false)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{t('Edit program')}</div>
        {confirming ? (
          <>
            <p className={styles.confirmText} dangerouslySetInnerHTML={{ __html: t('Delete <strong>{{name}}</strong> and all its training sessions? This cannot be undone.', { name: program.name }) }} />
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>{t('Cancel')}</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : t('Yes, delete')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalFields}>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>{t('Name')}</span>
                <input
                  className={styles.modalInput}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                  autoFocus
                />
              </label>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.deleteSessionBtn} onClick={() => setConfirming(true)}>{t('Delete')}</button>
              <button className={styles.cancelBtn} onClick={onClose}>{t('Cancel')}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? '…' : t('Save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface CreateProgramModalProps {
  onSave: (name: string) => Promise<void>
  onClose: () => void
}

function CreateProgramModal({ onSave, onClose }: CreateProgramModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [name,    setName]    = useState<string>('')
  const [saving,  setSaving]  = useState<boolean>(false)

  async function handleSave(): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await onSave(trimmed)
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{t('New training program')}</div>
        <div className={styles.modalFields}>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>{t('Name')}</span>
            <input
              className={styles.modalInput}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder={t('e.g. Bulking, Deload, Summer…')}
              autoFocus
            />
          </label>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>{t('Cancel')}</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? '…' : t('Create')}
          </button>
        </div>
      </div>
    </div>
  )
}

interface SetupGuideProps {
  step: number
  onCreateProgram?: () => void
  onAddSession?: () => void
}

interface SetupStep {
  num: number
  title: string
  desc: string
  action: (() => void) | undefined
  label: string | null
}

function SetupGuide({ step, onCreateProgram, onAddSession }: SetupGuideProps): React.JSX.Element {
  const { t } = useTranslation()
  const steps: SetupStep[] = [
    { num: 1, title: t('Create a training program'), desc: t('Start by naming your program, e.g. Bulking, Deload or Summer.'), action: onCreateProgram, label: t('Create program') },
    { num: 2, title: t('Add training sessions'), desc: t('Add sessions for each training day, e.g. Push, Legs, Full body.'), action: onAddSession, label: t('Add session') },
    { num: 3, title: t('Add exercises'), desc: t('Add exercises to each session and log your weights.'), action: undefined, label: null },
  ]
  return (
    <div className={styles.setupGuide}>
      {steps.map((s: SetupStep) => {
        const done: boolean   = s.num < step
        const active: boolean = s.num === step
        const locked: boolean = s.num > step
        return (
          <div key={s.num} className={`${styles.setupStep} ${done ? styles.setupDone : ''} ${active ? styles.setupActive : ''} ${locked ? styles.setupLocked : ''}`}>
            <div className={styles.setupNum}>{done ? '✓' : s.num}</div>
            <div className={styles.setupContent}>
              <div className={styles.setupTitle}>{s.title}</div>
              {active && <div className={styles.setupDesc}>{s.desc}</div>}
              {active && s.action && (
                <button className={styles.setupCta} onClick={s.action}>{s.label}</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface SortableRowProps {
  ex: Exercise
  log: ExerciseLog | undefined
  lastDone?: ExerciseLastDone
  setPlans: SetPlan[]
  weightUnit: import('../../../hooks/useWeightUnit').WeightUnit
  onName: (ex: Exercise) => void
  onLog: (ex: Exercise) => void
  onPlay: (ex: Exercise) => void
  onMaximize: () => void
  onUndo: (exId: string) => void
  editMode: boolean
  isTimerActive: boolean
  timerRunning: boolean
  completedSets: number
}

function SortableRow({ ex, log, lastDone, setPlans, weightUnit, onName, onLog, onPlay, onMaximize, onUndo, editMode, isTimerActive, timerRunning, completedSets }: SortableRowProps): React.JSX.Element {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id, disabled: !editMode })
  const hasIndividual = setPlans.length > 0
  const configuredSets = hasIndividual ? setPlans.length : (log?.sets ?? 3)
  const totalDots = Math.max(configuredSets, completedSets)
  const allDone = completedSets >= configuredSets
  const isDisabled = !editMode && timerRunning && !isTimerActive
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isDisabled ? 0.4 : 1,
  }

  function handleClick(): void {
    if (editMode) { onName(ex); return }
    if (isTimerActive && timerRunning) { onMaximize(); return }
    if (isDisabled) return
    onPlay(ex)
  }

  return (
    <div ref={setNodeRef} style={{ ...style, ...(editMode ? { touchAction: 'none' } : {}) }} className={`${styles.exerciseCard} ${isTimerActive ? styles.exerciseActive : ''} ${isDisabled ? styles.exerciseDisabled : ''}`} onClick={handleClick} {...(editMode ? { ...attributes, ...listeners } : {})}>
      {editMode && <div className={styles.dragStrip}><span className={styles.dragGrip} /></div>}
      <div className={styles.exerciseCardBody}>
      <div className={styles.exerciseCardHeader}>
        <span className={styles.exNameText}>
          {allDone && !editMode && <span className={styles.exDoneCheck}>✓</span>}
          {ex.name}
        </span>
        {!editMode && (completedSets > 0 || isTimerActive) && (
          <span className={styles.setProgress}>
            {Array.from({ length: totalDots }, (_, i) => (
              <span key={i} className={i < completedSets ? styles.setDotDone : styles.setDotPending} />
            ))}
            {completedSets > 0 && !isTimerActive && (
              <button className={styles.undoBtn} onClick={(e) => { e.stopPropagation(); onUndo(ex.id) }} title="Undo">↩</button>
            )}
          </span>
        )}
      </div>
      {ex.note && !editMode && (
        <div className={styles.exerciseNote}>{ex.note}</div>
      )}
      <div className={styles.exerciseCardSets}>
        {hasIndividual ? (
          setPlans.map((p, i) => (
            <div key={i} className={styles.metaRow}>
              <span className={styles.metaLabel}>Set {i + 1}</span>
              <span className={styles.metaItem}>{p.reps} reps</span>
              <span className={styles.metaItem}>{p.weight_kg != null ? formatWeight(p.weight_kg, weightUnit) : '–'}</span>
            </div>
          ))
        ) : (
          <div className={styles.metaRow}>
            <span className={styles.metaItem}>{log?.sets ?? 3} {(log?.sets ?? 3) === 1 ? 'set' : 'sets'}</span>
            <span className={styles.metaItem}>{log?.reps ?? '–'} reps{log?.unilateral ? ` ${t('per side')}` : ''}</span>
            <span className={styles.metaItem}>{log?.kg != null ? formatWeight(log.kg, weightUnit) : '–'}</span>
          </div>
        )}
        {lastDone && !editMode && (
          <div className={styles.lastDoneRow}>
            {t('Latest')}: {lastDone.reps} × {lastDone.kg != null ? formatWeight(lastDone.kg, weightUnit) : '–'} {formatRelativeDate(lastDone.date, t)}
          </div>
        )}
      </div>
      </div>
      {!editMode && !allDone && !isTimerActive && (
        <div className={styles.playStrip}>
          <PlayIcon size={22} />
        </div>
      )}
    </div>
  )
}

// --- New Exercise Modal ---

function NewExerciseModal({ t, knownExercises, onLookup, onSave, onClose }: {
  t: (k: string) => string
  knownExercises: string[]
  onLookup: (name: string) => { kg: number | null; sets: number | null; reps: number | null } | null
  onSave: (name: string, kg: number | null, sets: number | null, reps: number | null) => Promise<void>
  onClose: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [kg, setKg] = useState('')
  const [lbs, setLbs] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAuto, setShowAuto] = useState(false)
  const pickedRef = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  const filtered = name.length >= 2 && !pickedRef.current
    ? knownExercises.filter(n => n.toLowerCase().includes(name.toLowerCase())).slice(0, 8)
    : []

  function handleKgChange(val: string): void { setKg(val); const n = parseFloat(val.replace(',', '.')); if (!isNaN(n)) setLbs(toLbs(n).toString()) }
  function handleLbsChange(val: string): void { setLbs(val); const n = parseFloat(val.replace(',', '.')); if (!isNaN(n)) setKg(toKg(n).toString()) }

  function selectExisting(exName: string): void {
    pickedRef.current = true
    setShowAuto(false)
    setName(exName)
    const last = onLookup(exName)
    if (last) {
      if (last.kg != null) { setKg(String(last.kg)); setLbs(String(toLbs(last.kg))) }
      if (last.sets != null) setSets(String(last.sets))
      if (last.reps != null) setReps(String(last.reps))
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{t('New exercise')}</div>
        <div className={styles.modalFields}>
          <label className={styles.modalField} style={{ position: 'relative' }}>
            <span className={styles.modalLabel}>{t('Name')}</span>
            <input ref={nameRef} className={styles.modalInput} type="text" value={name} onChange={e => { pickedRef.current = false; setName(e.target.value); setShowAuto(true) }} onBlur={() => setTimeout(() => setShowAuto(false), 150)} placeholder={t('Exercise name…')} />
            {showAuto && filtered.length > 0 && (
              <div className={styles.catalogDropdown}>
                {filtered.map((n, i) => (
                  <button key={i} className={styles.catalogItem} type="button" onClick={() => selectExisting(n)}>
                    <span className={styles.catalogItemName}>{n}</span>
                  </button>
                ))}
              </div>
            )}
          </label>
          {knownExercises.length > 0 && (
            <label className={styles.modalField}>
              <select className={styles.modalInput} value="" onChange={e => { if (e.target.value) selectExisting(e.target.value) }}>
                <option value="">{t('Or choose existing')}</option>
                {knownExercises.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          )}
          <div className={styles.modalRow}>
            <label className={styles.modalField}>
              <span className={styles.modalLabel}>{t('Weight (kg)')}</span>
              <input className={styles.modalInput} type="number" inputMode="decimal" step="0.5" value={kg} onChange={e => handleKgChange(e.target.value)} />
            </label>
            <label className={styles.modalField}>
              <span className={styles.modalLabel}>{t('Weight (lbs)')}</span>
              <input className={styles.modalInput} type="number" inputMode="decimal" step="1" value={lbs} onChange={e => handleLbsChange(e.target.value)} />
            </label>
          </div>
          <div className={styles.modalRow}>
            <label className={styles.modalField}>
              <span className={styles.modalLabel}>{t('Sets')}</span>
              <input className={styles.modalInput} type="number" value={sets} onChange={e => setSets(e.target.value)} />
            </label>
            <label className={styles.modalField}>
              <span className={styles.modalLabel}>{t('Reps')}</span>
              <input className={styles.modalInput} type="number" value={reps} onChange={e => setReps(e.target.value)} />
            </label>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} type="button" onClick={onClose}>{t('Cancel')}</button>
          <button className={styles.saveBtn} disabled={!name.trim() || saving} onClick={async () => {
            setSaving(true)
            const kgVal = parseFloat(kg.replace(',', '.'))
            const setsVal = parseInt(sets)
            const repsVal = parseInt(reps)
            await onSave(name.trim(), isNaN(kgVal) ? null : kgVal, isNaN(setsVal) ? null : setsVal, isNaN(repsVal) ? null : repsVal)
            setSaving(false)
          }}>{saving ? '…' : t('Save')}</button>
        </div>
      </div>
    </div>
  )
}

// --- Main component ---

export default function Traning(): React.JSX.Element {
  const { t } = useTranslation()
  const [weightUnit] = useWeightUnit()
  const dayAbbrev = t('dayAbbrev', { returnObjects: true }) as string[]
  const dayFull   = t('dayFull',   { returnObjects: true }) as string[]
  const { sessions, sessionsLoading, programs, programsLoading, activeProgramId, restSeconds, secPerRep, countdownSeconds, sidePauseSeconds, exercisesLoading, setExercisesLoading, addSession, createProgram, switchProgram, renameProgram, deleteProgram, load: loadProfile } = useProfile()!
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)
  const [activeTab,        setActiveTab]        = useState<string | null>(null)
  const [exercises,        setExercises]        = useState<Record<string, Exercise[]>>({})
  const [logs,             setLogs]             = useState<Record<string, ExerciseLog>>({})
  const [lastDone,         setLastDone]         = useState<Record<string, ExerciseLastDone>>({})
  const [individualSets,  setIndividualSets]   = useState<Record<string, SetPlan[]>>({})
  const [editMode,         setEditModeRaw]      = useState<boolean>(() => localStorage.getItem('pullpush_editMode') === 'true')
  const setEditMode = (v: boolean | ((prev: boolean) => boolean)): void => {
    setEditModeRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      localStorage.setItem('pullpush_editMode', String(next))
      return next
    })
  }
  const [addingExercise,   setAddingExercise]   = useState<boolean>(false)
  const [pickerDay,        setPickerDay]        = useState<number | null>(null)
  const [workoutId,        setWorkoutId]        = useState<string | null>(null)
  const [workoutSessionId, setWorkoutSessionId] = useState<string | null>(null)
  const [showEndDialog,    setShowEndDialog]    = useState<boolean>(false)
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null)
  const [showInactiveDialog, setShowInactiveDialog] = useState<boolean>(false)
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const INACTIVITY_MINUTES = 15

  // Exercise timer
  type TimerPhase = 'countdown' | 'work' | 'rest' | 'side_pause' | null
  const [timerExId,        setTimerExId]        = useState<string | null>(null)
  const [timerPhase,       setTimerPhase]       = useState<TimerPhase>(null)
  const [timerSet,         setTimerSet]         = useState<number>(0)
  const [timerSetsTotal,   setTimerSetsTotal]   = useState<number>(0)
  const [timerSecs,        setTimerSecs]        = useState<number>(0)
  const [timerTotalSecs,   setTimerTotalSecs]   = useState<number>(0)
  const [completedSets,    setCompletedSets]    = useState<Record<string, number>>({})
  const [restoreComplete,  setRestoreComplete]  = useState<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [countdownOverlay, setCountdownOverlay] = useState<number | null>(null)
  const [paused,           setPaused]           = useState<boolean>(false)
  const [timerMinimized,   setTimerMinimized]   = useState<boolean>(false)
  const [autoplay,         setAutoplay]         = useState<boolean>(() => localStorage.getItem('pullpush_autoplay') === 'true')
  const autoplayRef = useRef(autoplay)
  const completedSetsRef = useRef(completedSets)
  const pausedRemainRef = useRef<number>(0)
  const pausedPlanRef = useRef<{ plan: { phase: TimerPhase; duration: number }[]; step: number; exId: string; currentSet: number; setsTotal: number; kg: number | null; reps: number; wId: string | null } | null>(null)
  const timerEndRef = useRef<number>(0)
  const timerPlanRef = useRef<{ phase: TimerPhase; duration: number }[]>([])
  const timerStepRef = useRef<number>(0)
  const [programDropOpen,  setProgramDropOpen]  = useState<boolean>(false)
  const programDropRef = useRef<HTMLDivElement | null>(null)
  const [restTimer,        setRestTimer]        = useState<number | null>(null)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restEndTimeRef = useRef<number | null>(null)
  const [logging,          setLogging]          = useState<Exercise | null>(null)
  const [naming,           setNaming]           = useState<Exercise | null>(null)
  const [adding,           setAdding]           = useState<boolean>(false)
  const [newName,          setNewName]          = useState<string>('')
  const [catalogResults,   setCatalogResults]   = useState<CatalogItem[]>([])
  const [showCatalogDrop,  setShowCatalogDrop]  = useState<boolean>(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(null)
  const catalogDropRef = useRef<HTMLDivElement | null>(null)
  const [userId,           setUserId]           = useState<string | null>(null)
  const [addingSession,    setAddingSession]    = useState<boolean>(false)
  const [editingSession,   setEditingSession]   = useState<boolean>(false)
  const [creatingProgram,  setCreatingProgram]  = useState<boolean>(false)
  const [editingProgram,   setEditingProgram]   = useState<boolean>(false)

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!programDropOpen) return
    function handleClick(e: MouseEvent) {
      if (programDropRef.current && !programDropRef.current.contains(e.target as Node)) setProgramDropOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [programDropOpen])

  useEffect(() => {
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current) }
  }, [])

  // Re-sync timer when screen wakes / app returns to foreground
  useEffect(() => {
    function resync(): void {
      if (document.hidden) return
      if (paused) return
      if (timerEndRef.current === 0) return
      const remaining = Math.ceil((timerEndRef.current - Date.now()) / 1000)
      if (remaining < 0) return
      if (countdownOverlay !== null) {
        setCountdownOverlay(Math.max(0, remaining))
      } else if (timerPhase) {
        setTimerSecs(Math.max(0, remaining))
      }
    }
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('focus', resync)
    window.addEventListener('pageshow', resync)
    return () => {
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('focus', resync)
      window.removeEventListener('pageshow', resync)
    }
  }, [paused, countdownOverlay, timerPhase])

  async function startRest(): Promise<void> {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    const endTime: number = Date.now() + restSeconds * 1000
    restEndTimeRef.current = endTime
    setRestTimer(restSeconds)

    // Schedule notification
    try {
      await LocalNotifications.requestPermissions()
      await LocalNotifications.schedule({
        notifications: [{
          id: 1,
          title: t('Rest over'),
          body: t('Time to lift!'),
          schedule: { at: new Date(endTime) },
          sound: 'default',
        }],
      })
    } catch { /* web fallback — no notifications */ }

    // Start Live Activity (iOS lock screen countdown)
    try {
      if (RestTimer) {
        await RestTimer.start({ seconds: restSeconds })
      }
    } catch {}

    restIntervalRef.current = setInterval(() => {
      const remaining: number = Math.ceil((restEndTimeRef.current! - Date.now()) / 1000)
      if (remaining <= 0) {
        clearInterval(restIntervalRef.current!)
        restIntervalRef.current = null
        restEndTimeRef.current = null
        RestTimer?.stop().catch(() => {})
        setRestTimer(null)
      } else {
        setRestTimer(remaining)
      }
    }, 250)
  }

  async function stopRest(): Promise<void> {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
    restIntervalRef.current = null
    restEndTimeRef.current = null
    setRestTimer(null)
    try { await LocalNotifications.cancel({ notifications: [{ id: 1 }] }) } catch {}
    try { await RestTimer?.stop() } catch {}
  }

  async function startExerciseTimer(ex: Exercise): Promise<void> {
    setTimerMinimized(false)
    const log = logs[ex.id]
    const indPlans = individualSets[ex.id]
    const currentSet = (completedSetsRef.current[ex.id] ?? 0) + 1

    // Per-set data: use individual plans if available, otherwise global log
    const setInfo = indPlans?.[currentSet - 1]
    const reps = setInfo?.reps ?? log?.reps ?? 10
    const setKg = setInfo?.weight_kg ?? log?.kg ?? null
    const sets = indPlans ? indPlans.length : (log?.sets ?? 3)
    const workTime = reps * secPerRep
    const COUNTDOWN = countdownSeconds

    // Create workout if first set in this session.
    // If the current workoutId belongs to a *different* session (e.g. user
    // switched tabs after resuming an unfinished workout), discard it so the
    // new sets don't get stored under the wrong session_id.
    let wId = workoutId
    if (wId && workoutSessionId && activeTab && workoutSessionId !== activeTab) {
      wId = null
      setWorkoutId(null)
      setWorkoutSessionId(null)
      setCompletedSets({})
    }
    if (!wId && userId && activeTab && activeProgramId) {
      // Clean up old unfinished workouts
      await supabase.from('workouts').delete().eq('user_id', userId).is('completed_at', null)

      // Snapshot session name so renames don't change history
      const currentSession = sessions.find((s: TrainingSession) => s.id === activeTab)
      const { data, error } = await supabase.from('workouts').insert({
        user_id: userId,
        session_id: activeTab,
        session_name: currentSession?.name ?? null,
        program_id: activeProgramId,
      }).select('id').single()
      if (error || !data) {
        console.error('workouts insert failed', error)
        return  // abort — annars sätts completedSets utan persistence
      }
      wId = data.id
      setWorkoutId(wId)
      setWorkoutSessionId(activeTab)
    }

    // One set plan: countdown → work [→ side_pause → work] → rest
    const isUnilateral = log?.unilateral ?? false
    const plan: { phase: TimerPhase; duration: number }[] = []
    if (COUNTDOWN > 0) plan.push({ phase: 'countdown', duration: COUNTDOWN })
    if (workTime > 0) plan.push({ phase: 'work', duration: workTime })
    if (isUnilateral && sidePauseSeconds > 0) plan.push({ phase: 'side_pause', duration: sidePauseSeconds })
    if (isUnilateral && workTime > 0) plan.push({ phase: 'work', duration: workTime })
    if (restSeconds > 0) plan.push({ phase: 'rest', duration: restSeconds })

    timerPlanRef.current = plan
    timerStepRef.current = 0
    setTimerExId(ex.id)
    setTimerSetsTotal(sets)
    setTimerSet(currentSet)

    // Start Live Activity with total time (countdown + work + rest)
    const totalTime = plan.reduce((sum, p) => sum + p.duration, 0)
    const label = `Set ${currentSet}/${sets} • ${reps} reps\n${ex.name}${setKg ? `\n${formatWeight(setKg, weightUnit)}` : ''}`
    if (RestTimer) RestTimer.start({ seconds: totalTime, label }).catch(() => {})

    runTimerStep(plan, 0, ex.id, currentSet, sets, setKg, reps, wId)
  }

  function runTimerStep(plan: { phase: TimerPhase; duration: number }[], step: number, exId: string, currentSet: number, setsTotal: number, kg: number | null, reps: number, wId: string | null): void {
    if (step >= plan.length) {
      // Set done
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      setTimerPhase(null)
      setTimerExId(null)
      setCompletedSets(prev => ({ ...prev, [exId]: currentSet }))
      try { RestTimer?.stop() } catch {}

      // Autoplay: start next set or next exercise
      if (autoplayRef.current) {
        const exList = exercises[activeTab!] ?? []
        const indPlans = individualSets[exId]
        const totalSets = indPlans ? indPlans.length : (setsTotal)
        if (currentSet < totalSets) {
          // More sets on same exercise
          const ex = exList.find(e => e.id === exId)
          if (ex) setTimeout(() => startExerciseTimer(ex), 300)
        } else {
          // Next exercise
          const idx = exList.findIndex(e => e.id === exId)
          const nextEx = exList[idx + 1]
          if (nextEx) setTimeout(() => startExerciseTimer(nextEx), 300)
        }
      }
      return
    }

    const { phase, duration } = plan[step]

    // Countdown phase: fullscreen overlay
    if (phase === 'countdown') {
      setCountdownOverlay(duration)
      timerStepRef.current = step
      if (timerRef.current) clearInterval(timerRef.current)
      const cdEnd = Date.now() + duration * 1000
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((cdEnd - Date.now()) / 1000)
        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          setCountdownOverlay(null)
          runTimerStep(plan, step + 1, exId, currentSet, setsTotal, kg, reps, wId)
        } else {
          setCountdownOverlay(remaining)
        }
      }, 250)
      return
    }

    const endTime = Date.now() + duration * 1000
    timerEndRef.current = endTime
    timerStepRef.current = step
    setTimerPhase(phase)
    setTimerSecs(duration)
    setTimerTotalSecs(duration)

    // Schedule notification at end of rest phase
    if (phase === 'rest') {
      const exName = currentExercises.find(e => e.id === exId)?.name ?? ''
      LocalNotifications.schedule({
        notifications: [{
          id: 2,
          title: `Set ${currentSet}/${setsTotal} ${t('Done').toLowerCase()}`,
          body: exName,
          schedule: { at: new Date(endTime) },
          sound: 'default',
        }],
      }).catch(() => {})
    }

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const remaining = Math.ceil((timerEndRef.current - Date.now()) / 1000)
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null

        if (phase === 'work') {
          setCompletedSets(prev => ({ ...prev, [exId]: currentSet }))
          // Save completed set to database
          if (wId) {
            void (async () => {
              const { error } = await supabase.from('workout_sets').insert({
                workout_id: wId,
                exercise_id: exId,
                set_number: currentSet,
                kg,
                reps,
              })
              if (error) console.error('workout_sets insert failed', { wId, exId, currentSet, error })
            })()
          } else {
            console.warn('workout_sets insert skipped: no workoutId')
          }
        }

        runTimerStep(plan, step + 1, exId, currentSet, setsTotal, kg, reps, wId)
      } else {
        setTimerSecs(remaining)
      }
    }, 250)
  }

  function pauseCountdown(): void {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    pausedRemainRef.current = countdownOverlay ?? 0
    const step = timerStepRef.current
    const plan = timerPlanRef.current
    const exLog = timerExId ? logs[timerExId] : undefined
    pausedPlanRef.current = {
      plan, step, exId: timerExId!, currentSet: timerSet, setsTotal: timerSetsTotal,
      kg: exLog?.kg ?? null, reps: exLog?.reps ?? 10, wId: workoutId
    }
    setPaused(true)
    try { RestTimer?.stop() } catch {}
  }

  function pauseExerciseTimer(): void {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    pausedRemainRef.current = Math.ceil((timerEndRef.current - Date.now()) / 1000)
    const step = timerStepRef.current
    const plan = timerPlanRef.current
    const exLog = timerExId ? logs[timerExId] : undefined
    pausedPlanRef.current = {
      plan, step, exId: timerExId!, currentSet: timerSet, setsTotal: timerSetsTotal,
      kg: exLog?.kg ?? null, reps: exLog?.reps ?? 10, wId: workoutId
    }
    setPaused(true)
    try { RestTimer?.stop() } catch {}
  }

  function resumeExerciseTimer(): void {
    const ctx = pausedPlanRef.current
    if (!ctx) return
    setPaused(false)
    const remain = pausedRemainRef.current
    const { plan, step, exId, currentSet, setsTotal, kg, reps, wId } = ctx
    const { phase } = plan[step]

    // Resume countdown phase
    if (phase === 'countdown') {
      setCountdownOverlay(remain)
      const cdEnd = Date.now() + remain * 1000
      // Restart Live Activity
      const totalRemaining = plan.slice(step).reduce((sum, p) => sum + p.duration, 0) - (plan[step].duration - remain)
      if (RestTimer) RestTimer.start({ seconds: Math.max(1, Math.round(totalRemaining)) }).catch(() => {})
      timerRef.current = setInterval(() => {
        const r = Math.ceil((cdEnd - Date.now()) / 1000)
        if (r <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          setCountdownOverlay(null)
          runTimerStep(plan, step + 1, exId, currentSet, setsTotal, kg, reps, wId)
        } else {
          setCountdownOverlay(r)
        }
      }, 250)
      return
    }

    const endTime = Date.now() + remain * 1000
    timerEndRef.current = endTime
    setTimerSecs(remain)
    // Keep original timerTotalSecs for progress bar — don't reset it

    // Restart Live Activity with remaining time
    const remainingTotal = plan.slice(step).reduce((sum, p) => sum + p.duration, 0) - (plan[step].duration - remain)
    const resumeName = ctx.exId ? (currentExercises.find(e => e.id === ctx.exId)?.name ?? 'PULLPUSH') : 'PULLPUSH'
    const resumeReps = ctx.reps ?? 0
    const resumeKg = ctx.kg
    const resumeLabelFull = resumeReps > 0
      ? `Set ${ctx.currentSet}/${ctx.setsTotal} • ${resumeReps} reps\n${resumeName}${resumeKg ? `\n${formatWeight(resumeKg, weightUnit)}` : ''}`
      : resumeName
    if (RestTimer) RestTimer.start({ seconds: Math.max(1, Math.round(remainingTotal)), label: resumeLabelFull }).catch(() => {})

    timerRef.current = setInterval(() => {
      const r = Math.ceil((timerEndRef.current - Date.now()) / 1000)
      if (r <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        if (phase === 'work') {
          setCompletedSets(prev => ({ ...prev, [exId]: currentSet }))
          if (wId) {
            supabase.from('workout_sets').insert({
              workout_id: wId, exercise_id: exId, set_number: currentSet, kg, reps,
            }).then(() => {})
          }
        }
        runTimerStep(plan, step + 1, exId, currentSet, setsTotal, kg, reps, wId)
      } else {
        setTimerSecs(r)
      }
    }, 250)
  }

  function stopExerciseTimer(): void {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setCountdownOverlay(null)
    setTimerPhase(null)
    setTimerExId(null)
    setPaused(false)
    pausedPlanRef.current = null
    try { RestTimer?.stop() } catch {}
    try { LocalNotifications.cancel({ notifications: [{ id: 2 }] }) } catch {}
  }

  // Save/discard the current set and stop the timer — does NOT end the whole workout
  async function saveSetAndStop(save: boolean): Promise<void> {
    const ctx = pausedPlanRef.current
    const currentSet = ctx?.currentSet ?? timerSet
    const currentPhase = ctx?.plan[ctx.step]?.phase ?? timerPhase
    const exId = timerExId

    if (save && workoutId && exId) {
      // If set not yet saved (countdown or work), save it now
      if (currentPhase !== 'rest') {
        const exLog = exId ? logs[exId] : undefined
        const kg = ctx?.kg ?? exLog?.kg ?? null
        const reps = ctx?.reps ?? exLog?.reps ?? 10
        setCompletedSets(prev => ({ ...prev, [exId]: currentSet }))
        await supabase.from('workout_sets').insert({
          workout_id: workoutId, exercise_id: exId, set_number: currentSet, kg, reps,
        })
      }
      // If rest, set is already saved — nothing to do
    }

    if (!save && workoutId && exId) {
      // If set was already saved (rest phase), undo it
      if (currentPhase === 'rest') {
        setCompletedSets(prev => ({ ...prev, [exId]: Math.max(0, currentSet - 1) }))
        await supabase.from('workout_sets')
          .delete()
          .eq('workout_id', workoutId)
          .eq('exercise_id', exId)
          .eq('set_number', currentSet)
      }
      // If countdown or work, nothing was saved — nothing to undo
    }

    stopExerciseTimer()
  }

  // End the entire workout (via "Avsluta pass" button)
  async function finishWorkout(save: boolean): Promise<void> {
    const sessionName = currentSession?.name ?? ''
    const dayOfWeek = currentSession?.day_of_week ?? 0
    stopExerciseTimer()
    if (workoutId) {
      if (save) {
        await supabase.from('workouts').update({ completed_at: new Date().toISOString() }).eq('id', workoutId)
        // Find next session day name
        const nextDayName = dayFull[dayOfWeek - 1] ?? ''
        setShowCompleteModal(`${sessionName}|${nextDayName}`)
      } else {
        await supabase.from('workouts').delete().eq('id', workoutId)
      }
    }
    setWorkoutId(null)
    setWorkoutSessionId(null)
    setCompletedSets({})
    setShowEndDialog(false)
  }

  async function undoLastSet(exId: string): Promise<void> {
    const prev = completedSets[exId] ?? 0
    if (prev <= 0) return
    const next = { ...completedSets, [exId]: prev - 1 }
    setCompletedSets(next)
    // Delete from database
    if (workoutId) {
      const { error } = await supabase.from('workout_sets')
        .delete()
        .eq('workout_id', workoutId)
        .eq('exercise_id', exId)
        .eq('set_number', prev)
      if (error) console.error('workout_sets delete failed', error)

      // If no sets remain across the entire workout, delete the workout instance
      const totalSetsRemaining = Object.values(next).reduce((sum, n) => sum + n, 0)
      if (totalSetsRemaining === 0) {
        await supabase.from('workouts').delete().eq('id', workoutId)
        setWorkoutId(null)
        setWorkoutSessionId(null)
      }
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (sessions.length === 0) return
    if (activeTab && sessions.find((s: TrainingSession) => s.id === activeTab)) return
    // Auto-select today's session, or first session as fallback
    const todayDow = new Date().getDay() || 7
    const todaySession = sessions.find(s => s.day_of_week === todayDow)
    setActiveTab(todaySession ? todaySession.id : sessions[0].id)
  }, [sessions])

  useEffect(() => {
    localStorage.setItem('pullpush_autoplay', String(autoplay))
    autoplayRef.current = autoplay
  }, [autoplay])

  useEffect(() => {
    completedSetsRef.current = completedSets
  }, [completedSets])

  async function loadAll(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setExercisesLoading(true)

    const [{ data: exData }, { data: logData }] = await Promise.all([
      supabase.from('exercises').select('*, exercise_catalog(name)').eq('user_id', user.id).order('sort_order'),
      supabase.rpc('get_latest_exercise_logs', { p_user_id: user.id }),
    ])

    const grouped: Record<string, Exercise[]> = {}
    if (exData) {
      for (const ex of exData as Exercise[]) {
        if (ex.session_id) {
          if (!grouped[ex.session_id]) grouped[ex.session_id] = []
          const resolvedName: string = ex.exercise_catalog?.name ?? ex.name
          grouped[ex.session_id].push({ ...ex, name: resolvedName })
        }
      }
    }
    setExercises(grouped)

    if (logData) {
      const latest: Record<string, ExerciseLog> = {}
      for (const row of logData as Array<{ exercise_id: string; weight_kg: number; sets: number | null; reps: number; unilateral?: boolean }>) {
        latest[row.exercise_id] = { kg: row.weight_kg, sets: row.sets, reps: row.reps, unilateral: row.unilateral ?? false }
      }
      setLogs(latest)
    }

    // Latest "done" date per exercise from workout_sets joined with workouts
    const { data: lastDoneData } = await supabase
      .from('workout_sets')
      .select('exercise_id, reps, kg, workouts!inner(completed_at, user_id)')
      .eq('workouts.user_id', user.id)
      .not('workouts.completed_at', 'is', null)
      .order('workout_id', { ascending: false })
      .limit(2000)
    if (lastDoneData) {
      const map: Record<string, ExerciseLastDone> = {}
      for (const row of lastDoneData as Array<{ exercise_id: string; reps: number; kg: number | null; workouts: { completed_at: string } }>) {
        const exId = String(row.exercise_id)
        const date = row.workouts?.completed_at
        if (!date) continue
        if (!map[exId] || date > map[exId].date) {
          map[exId] = { date, reps: row.reps, kg: row.kg }
        }
      }
      setLastDone(map)
    }
    // Load individual set plans
    const allExIds = Object.values(grouped).flat().map(e => e.id)
    if (allExIds.length > 0) {
      const { data: planData } = await supabase
        .from('exercise_set_plans')
        .select('exercise_id, set_number, reps, weight_kg')
        .in('exercise_id', allExIds)
        .order('set_number')
      if (planData) {
        const plans: Record<string, SetPlan[]> = {}
        for (const p of planData as Array<{ exercise_id: string; set_number: number; reps: number; weight_kg: number | null }>) {
          if (!plans[p.exercise_id]) plans[p.exercise_id] = []
          plans[p.exercise_id].push({ set_number: p.set_number, reps: p.reps, weight_kg: p.weight_kg })
        }
        setIndividualSets(plans)
      }
    }

    // Resume unfinished workout if exists
    try {
      const { data: openWorkouts, error: wErr } = await supabase.from('workouts')
        .select('id, session_id, started_at')
        .eq('user_id', user.id)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
      if (wErr) console.error('open workouts query failed', wErr)

      if (openWorkouts && openWorkouts.length > 0) {
        const openWorkout = openWorkouts[0] as { id: string; session_id: string | null; started_at: string | null }
        const { data: sets, error: sErr } = await supabase.from('workout_sets')
          .select('exercise_id, set_number')
          .eq('workout_id', openWorkout.id)
        if (sErr) console.error('workout_sets query failed', sErr)

        const restored: Record<string, number> = {}
        for (const s of (sets ?? []) as Array<{ exercise_id: string | number; set_number: number }>) {
          const key = String(s.exercise_id)
          restored[key] = Math.max(restored[key] ?? 0, s.set_number)
        }
        setCompletedSets(restored)
        setWorkoutId(openWorkout.id)
        setWorkoutSessionId(openWorkout.session_id)
      }
    } finally {
      setRestoreComplete(true)
      setExercisesLoading(false)
    }
  }

  async function handleLogSave(exerciseId: string, kg: number, sets: number | null, reps: number, unilateral: boolean = false): Promise<void> {
    await supabase.from('exercise_log').insert({ user_id: userId, exercise_id: exerciseId, weight_kg: kg, sets, reps, unilateral })
    setLogs(prev => ({ ...prev, [exerciseId]: { kg, sets, reps, unilateral } }))
    setLogging(null)
  }

  async function handleSaveNote(exerciseId: string, noteText: string): Promise<void> {
    await supabase.from('exercises').update({ note: noteText || null }).eq('id', exerciseId)
    setExercises(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = next[key].map(ex => ex.id === exerciseId ? { ...ex, note: noteText || null } : ex)
      }
      return next
    })
  }

  async function handleSaveSetPlans(exerciseId: string, plans: SetPlan[]): Promise<void> {
    await supabase.from('exercise_set_plans').delete().eq('exercise_id', exerciseId)
    if (plans.length > 0) {
      await supabase.from('exercise_set_plans').insert(
        plans.map(p => ({ exercise_id: exerciseId, set_number: p.set_number, reps: p.reps, weight_kg: p.weight_kg }))
      )
    }
    setIndividualSets(prev => {
      const next = { ...prev }
      if (plans.length > 0) next[exerciseId] = plans
      else delete next[exerciseId]
      return next
    })
  }

  async function handleRename(exercise: Exercise, name: string): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed || trimmed === exercise.name) return
    let catalogId: number | null = null
    const { data: existing } = await supabase.from('exercise_catalog')
      .select('id').ilike('name', trimmed).limit(1).single()
    if (existing) {
      catalogId = (existing as { id: number }).id
    } else {
      const { data: created } = await supabase.from('exercise_catalog')
        .insert({ name: trimmed }).select('id').single()
      if (created) catalogId = (created as { id: number }).id
    }
    await supabase.from('exercises').update({ name: trimmed, catalog_id: catalogId }).eq('id', exercise.id)
    setExercises(prev => ({
      ...prev,
      [exercise.session_id]: prev[exercise.session_id].map(e => e.id === exercise.id ? { ...e, name: trimmed, catalog_id: catalogId } : e),
    }))
  }

  async function handleDelete(exercise: Exercise): Promise<void> {
    await supabase.from('exercises').delete().eq('id', exercise.id)
    setExercises(prev => ({
      ...prev,
      [exercise.session_id]: prev[exercise.session_id].filter(e => e.id !== exercise.id),
    }))
  }

  useEffect(() => {
    const trimmed = newName.trim()
    if (!trimmed || selectedCatalogId) { setCatalogResults([]); setShowCatalogDrop(false); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('exercise_catalog')
        .select('id, name, muscle_group')
        .ilike('name', `%${trimmed}%`)
        .limit(8)
      setCatalogResults((data as CatalogItem[]) ?? [])
      setShowCatalogDrop(((data as CatalogItem[]) ?? []).length > 0)
    }, 200)
    return () => clearTimeout(timer)
  }, [newName, selectedCatalogId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (catalogDropRef.current && !catalogDropRef.current.contains(e.target as Node)) setShowCatalogDrop(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectCatalogItem(item: CatalogItem): void {
    setNewName(item.name)
    setSelectedCatalogId(item.id)
    setCatalogResults([])
    setShowCatalogDrop(false)
  }

  async function handleAdd(): Promise<void> {
    const trimmed = newName.trim()
    if (!trimmed) return
    const sortOrder: number = (exercises[activeTab!] ?? []).length

    let catalogId: number | null = selectedCatalogId
    if (!catalogId) {
      // Check if exact name exists in catalog
      const { data: existing } = await supabase
        .from('exercise_catalog')
        .select('id')
        .ilike('name', trimmed)
        .maybeSingle()

      if (existing) {
        catalogId = (existing as { id: number }).id
      } else {
        const { data: inserted } = await supabase
          .from('exercise_catalog')
          .insert({ name: trimmed })
          .select()
          .single()
        if (inserted) catalogId = (inserted as { id: number }).id
      }
    }

    const { data, error } = await supabase.from('exercises')
      .insert({ user_id: userId, session_id: activeTab, name: trimmed, sort_order: sortOrder, tab: 'custom', catalog_id: catalogId ?? null })
      .select().single()
    if (error) { console.error('handleAdd error:', error); return }
    if (data) setExercises(prev => ({ ...prev, [activeTab!]: [...(prev[activeTab!] ?? []), data as Exercise] }))
    setNewName('')
    setSelectedCatalogId(null)
    setAdding(false)
  }

  async function handleCreateProgram(name: string): Promise<void> {
    await createProgram(name)
    setCreatingProgram(false)
    setActiveTab(null)
  }

  async function handleAddSession(sessionData: SessionData): Promise<void> {
    const data = await addSession({ ...sessionData, program_id: activeProgramId! })
    if (data) setActiveTab(data.id)
    setAddingSession(false)
  }

  async function handleSessionSave(id: string, name: string, day_of_week: number): Promise<void> {
    await supabase.from('training_sessions').update({ name, day_of_week }).eq('id', id)
    await loadProfile()
    setEditingSession(false)
  }

  async function handleSessionDelete(id: string): Promise<void> {
    await supabase.from('training_sessions').delete().eq('id', id)
    await loadProfile()
    setEditingSession(false)
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sessionId = activeTab!
    const items = [...(exercises[sessionId] ?? [])]
    const oldIndex: number = items.findIndex(e => e.id === active.id)
    const newIndex: number = items.findIndex(e => e.id === over.id)
    const reordered: Exercise[] = arrayMove(items, oldIndex, newIndex)

    setExercises(prev => ({ ...prev, [sessionId]: reordered }))

    await Promise.all(
      reordered.map((ex: Exercise, i: number) =>
        ex.sort_order !== i
          ? supabase.from('exercises').update({ sort_order: i }).eq('id', ex.id)
          : null
      ).filter(Boolean)
    )
  }

  const currentSession: TrainingSession | undefined   = sessions.find((s: TrainingSession) => s.id === activeTab)
  const currentExercises: Exercise[] = exercises[activeTab!] ?? []

  // Workout progress
  const totalSetsInSession = currentExercises.reduce((sum, ex) => sum + (logs[ex.id]?.sets ?? 3), 0)
  const completedSetsInSession = currentExercises.reduce((sum, ex) => sum + (completedSets[ex.id] ?? 0), 0)
  const workoutProgress = totalSetsInSession > 0 ? completedSetsInSession / totalSetsInSession : 0
  const allSessionDone = totalSetsInSession > 0 && completedSetsInSession >= totalSetsInSession

  // Auto-complete workout when all sets done
  useEffect(() => {
    if (!restoreComplete) return
    if (currentExercises.length === 0) return
    if (!allSessionDone || !workoutId || timerPhase) return

    const id = workoutId
    const sessionName = currentSession?.name ?? ''
    const dayOfWeek = currentSession?.day_of_week ?? 0
    const nextDayName = dayFull[dayOfWeek - 1] ?? ''
    void (async () => {
      const { error } = await supabase.from('workouts')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) console.error('workout auto-complete failed', error)
    })()
    setShowCompleteModal(`${sessionName}|${nextDayName}`)
    setWorkoutId(null)
    setWorkoutSessionId(null)
    setCompletedSets({})
  }, [restoreComplete, currentExercises.length, allSessionDone, workoutId, timerPhase])

  // Inactivity timeout — show dialog if no activity for 15 min during active workout
  useEffect(() => {
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    if (!workoutId || completedSetsInSession === 0 || allSessionDone || timerPhase) return
    inactivityRef.current = setTimeout(() => {
      setShowInactiveDialog(true)
    }, INACTIVITY_MINUTES * 60 * 1000)
    return () => { if (inactivityRef.current) clearTimeout(inactivityRef.current) }
  }, [workoutId, completedSetsInSession, allSessionDone, timerPhase, completedSets])

  // Find active exercise name/details for overlay
  const timerExercise = currentExercises.find(ex => ex.id === timerExId)
  const timerExLog = timerExId ? logs[timerExId] : undefined

  // Find next exercise/set for rest overlay preview
  const nextUp: { setLabel: string; name: string } | { setLabel: ''; name: string } = (() => {
    if (!timerExercise) return { setLabel: '', name: '' }
    const exSets = timerExLog?.sets ?? 3
    if (timerSet < exSets) return { setLabel: `Set ${timerSet + 1}`, name: timerExercise.name }
    const idx = currentExercises.findIndex(ex => ex.id === timerExId)
    const nextEx = currentExercises[idx + 1]
    if (nextEx) return { setLabel: 'Set 1', name: nextEx.name }
    return { setLabel: '', name: t('Done') }
  })()

  const setupStep: number | null = (!programsLoading && programs.length === 0) ? 1
    : (!programsLoading && !sessionsLoading && programs.length > 0 && sessions.length === 0) ? 2
    : null

  return (
  <>
    <section id="traning">
      <div className={styles.sectionHeaderRow}>
        <h2 className={styles.sectionTitle}>{t('Training sessions')}</h2>
        {currentExercises.length > 0 && (
          <label className={styles.flowSwitch}>
            <input type="checkbox" checked={!editMode} onChange={() => setEditMode(m => !m)} />
            <span className={styles.flowSlider} />
            <span className={styles.flowLabel}>Flow-mode</span>
          </label>
        )}
      </div>

      {/* Week overview */}
      {sessions.length > 0 && (
        <div className={styles.weekOverview}>
          {[1, 2, 3, 4, 5, 6, 7].map(dow => {
            const daySessions = sessions.filter(s => s.day_of_week === dow)
            const isToday = dow === (new Date().getDay() || 7)
            const hasActive = daySessions.some(s => s.id === activeTab)
            return (
              <div key={dow} className={styles.weekOverviewDayWrap}>
                <button
                  className={`${styles.weekOverviewDay} ${isToday ? styles.weekOverviewToday : ''} ${hasActive ? styles.weekOverviewActive : ''}`}
                  onClick={() => {
                    if (daySessions.length === 1) setActiveTab(daySessions[0].id)
                    else if (daySessions.length > 1) setPickerDay(pickerDay === dow ? null : dow)
                  }}
                  disabled={daySessions.length === 0}
                >
                  <span className={styles.weekOverviewLabel}>{dayAbbrev[dow - 1]}</span>
                  <span className={styles.weekOverviewDots}>
                    {daySessions.length > 0 ? (
                      <>
                        <span className={styles.weekOverviewDot} />
                        {daySessions.length > 1 && <span className={styles.weekOverviewCount}>{daySessions.length}</span>}
                      </>
                    ) : (
                      <span className={styles.weekOverviewDotRest} />
                    )}
                  </span>
                </button>
                {pickerDay === dow && daySessions.length > 1 && (
                  <div className={styles.weekPicker}>
                    {daySessions.map(s => (
                      <button key={s.id} className={styles.weekPickerItem} onClick={() => { setActiveTab(s.id); setPickerDay(null) }}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {setupStep === 1 && (
        <Reveal>
          <SetupGuide step={1} onCreateProgram={() => setCreatingProgram(true)} />
        </Reveal>
      )}

      {setupStep === 2 && (
        <>
          <Reveal>
            <div className={styles.programBar}>
              <select className={styles.programDropdown} value={String(activeProgramId ?? programs[0]?.id ?? '')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { switchProgram(e.target.value); setAdding(false) }}>
                {programs.map((p: TrainingProgram) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              <button className={styles.editProgramBtn} onClick={() => setEditingProgram(true)} title={t('Edit program')}>✎</button>
              <button className={styles.addProgramBtn} onClick={() => setCreatingProgram(true)}>+</button>
            </div>
          </Reveal>
          <Reveal>
            <SetupGuide step={2} onAddSession={() => setAddingSession(true)} />
          </Reveal>
        </>
      )}

      {setupStep === null && (
        <>
          {completedSetsInSession > 0 && (
            <Reveal>
              <div className={styles.workoutProgress}>
                <div className={styles.workoutProgressTrack}>
                  <div className={styles.workoutProgressFill} style={{ width: `${workoutProgress * 100}%` }} />
                </div>
                <span className={styles.workoutProgressLabel}>{completedSetsInSession}/{totalSetsInSession} sets</span>
              </div>
            </Reveal>
          )}


          {programs.length > 0 && (
            <Reveal>
              <div className={styles.programBar}>
                <select className={styles.programDropdown} value={String(activeProgramId ?? programs[0]?.id ?? '')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { switchProgram(e.target.value); setAdding(false) }}>
                  {programs.map((p: TrainingProgram) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
                {editMode && <button className={styles.editProgramBtn} onClick={() => setEditingProgram(true)} title={t('Edit program')}>✎</button>}
                {editMode && <button className={styles.addProgramBtn} onClick={() => setCreatingProgram(true)}>+</button>}
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className={styles.topRow}>
              {sessions.length > 0 && (
                <select
                  className={styles.sessionDropdown}
                  value={String(activeTab ?? sessions[0]?.id ?? '')}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setActiveTab(e.target.value); setAdding(false) }}
                >
                  {sessions.map((s: TrainingSession) => (
                    <option key={s.id} value={String(s.id)}>
                      {dayAbbrev[s.day_of_week - 1]} — {s.name}
                    </option>
                  ))}
                </select>
              )}
              {editMode && currentSession && (
                <button className={styles.editProgramBtn} onClick={() => setEditingSession(true)} title={t('Edit session')}>✎</button>
              )}
              {editMode && <button className={styles.addProgramBtn} onClick={() => setAddingSession(true)}>+</button>}
            </div>

            {currentExercises.length === 0 && activeTab && (
              <button className={styles.emptyPassBtn} onClick={() => setAddingExercise(true)}>
                + {t('Add your first exercise')}
              </button>
            )}

            {currentExercises.length > 0 && (
              <div className={styles.estimatedTime}>
                {(() => {
                  const totalSec = currentExercises.reduce((sum, ex) => {
                    const indPlans = individualSets[ex.id]
                    const log = logs[ex.id]
                    const numSets = indPlans ? indPlans.length : (log?.sets ?? 3)
                    let setTime = 0
                    for (let i = 0; i < numSets; i++) {
                      const reps = indPlans?.[i]?.reps ?? log?.reps ?? 10
                      const workDur = reps * secPerRep
                      const isUni = log?.unilateral ?? false
                      setTime += countdownSeconds + workDur + (isUni ? sidePauseSeconds + workDur : 0) + restSeconds
                    }
                    return sum + setTime
                  }, 0)
                  const mins = Math.floor(totalSec / 60)
                  const secs = totalSec % 60
                  return `${t('Estimated time')}: ${mins} min ${secs} sek`
                })()}
              </div>
            )}
          </Reveal>

          <Reveal key={activeTab}>


            <div className={styles.exerciseList}>

              {exercisesLoading ? (
                [0, 1, 2, 3].map((i: number) => (
                  <div key={i} className={`${styles.exerciseRow}`}>
                    <span><Skeleton width={16} height={16} /></span>
                    <span><Skeleton width="70%" height={14} /></span>
                    <Skeleton width={40} height={14} />
                    <Skeleton width={24} height={14} />
                    <Skeleton width={24} height={14} />
                  </div>
                ))
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={currentExercises.map((e: Exercise) => e.id)} strategy={verticalListSortingStrategy}>
                    {currentExercises.map((ex: Exercise) => (
                      <SortableRow key={ex.id} ex={ex} log={logs[ex.id]} lastDone={lastDone[ex.id]} setPlans={individualSets[ex.id] ?? []} weightUnit={weightUnit} onName={setNaming} onLog={setLogging} onPlay={(e) => timerExId === e.id ? pauseExerciseTimer() : startExerciseTimer(e)} onMaximize={() => setTimerMinimized(false)} onUndo={undoLastSet} editMode={editMode} isTimerActive={timerExId === ex.id} timerRunning={timerMinimized && !!(timerPhase || countdownOverlay !== null)} completedSets={completedSets[ex.id] ?? 0} />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {editMode && adding && (
                <div className={styles.exerciseRow}>
                  <div className={styles.addRow} style={{ gridColumn: '1 / -1' }} ref={catalogDropRef}>
                    <div className={styles.catalogSearchWrap}>
                      <input
                        className={styles.inlineInput}
                        placeholder={t('Exercise name…')}
                        value={newName}
                        onChange={e => { setNewName(e.target.value); setSelectedCatalogId(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                        onFocus={() => { if (catalogResults.length > 0) setShowCatalogDrop(true) }}
                        autoFocus
                      />
                      {showCatalogDrop && (
                        <div className={styles.catalogDropdown}>
                          {catalogResults.map((item: CatalogItem) => (
                            <button key={item.id} className={styles.catalogItem} type="button" onClick={() => selectCatalogItem(item)}>
                              <span className={styles.catalogItemName}>{item.name}</span>
                              {item.muscle_group && <span className={styles.catalogItemMuscle}>{item.muscle_group}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className={styles.addConfirmBtn} onClick={handleAdd}>{t('Add')}</button>
                    <button className={styles.cancelSmallBtn} onClick={() => { setAdding(false); setNewName(''); setSelectedCatalogId(null) }}>✕</button>
                  </div>
                </div>
              )}
            </div>


            {!editMode && workoutId && !allSessionDone && completedSetsInSession > 0 && (
              <button className={styles.endWorkoutBtn} onClick={() => setShowEndDialog(true)}>{t('End workout')}</button>
            )}

            {allSessionDone && workoutId && (
              <div className={styles.workoutDone}>✓ {t('Workout complete!')}</div>
            )}
          </Reveal>
        </>
      )}


      {(logging || naming) && (
        <ExerciseModal
          exercise={(logging ?? naming)!}
          current={logs[(logging ?? naming)!.id]}
          setPlans={individualSets[(logging ?? naming)!.id] ?? []}
          onRename={handleRename}
          onLog={handleLogSave}
          onSaveSetPlans={handleSaveSetPlans}
          onSaveNote={handleSaveNote}
          onDelete={handleDelete}
          onClose={() => { setLogging(null); setNaming(null) }}
        />
      )}

      {addingSession && (
        <AddSessionModal
          userId={userId}
          sortOrder={sessions.length}
          onSave={handleAddSession}
          onClose={() => setAddingSession(false)}
        />
      )}

      {editingProgram && activeProgramId && (
        <EditProgramModal
          program={programs.find((p: TrainingProgram) => p.id === activeProgramId)!}
          onRename={renameProgram}
          onDelete={deleteProgram}
          onClose={() => setEditingProgram(false)}
        />
      )}

      {creatingProgram && (
        <CreateProgramModal
          onSave={handleCreateProgram}
          onClose={() => setCreatingProgram(false)}
        />
      )}

      {editingSession && currentSession && (
        <EditSessionModal
          session={currentSession}
          onSave={handleSessionSave}
          onDelete={handleSessionDelete}
          onClose={() => setEditingSession(false)}
        />
      )}
      {countdownOverlay !== null && timerExercise && !paused && !timerMinimized && (
        <div className={styles.countdownOverlay}>
          <div className={styles.overlayContent}>
            <div className={styles.overlaySetLabel}>SET {timerSet}</div>
            <div className={styles.overlayExName}>{timerExercise.name}</div>
            <div className={styles.overlayTime}>{countdownOverlay}</div>
            <div className={styles.overlayProgressTrack}>
              <div className={styles.overlayProgressFill} style={{ width: `${countdownSeconds > 0 ? (countdownOverlay / countdownSeconds) * 100 : 0}%` }} />
            </div>
            <div className={styles.overlayReps}>{timerExLog?.reps ?? 10}x</div>
            {timerExLog?.kg != null && (
              <div className={styles.overlayWeightBelow}>{formatWeight(timerExLog.kg, weightUnit)}</div>
            )}
          </div>
          <div className={styles.overlayActions}>
            <div className={styles.flowActionRow}>
              <button className={styles.flowActionBtn} onClick={pauseCountdown}>
                <CirclePauseIcon size={18} />
                <span>{t('Pause')}</span>
              </button>
              <button className={styles.flowActionBtn} onClick={() => setTimerMinimized(true)}>
                <MinimizeIcon size={18} />
                <span>{t('Minimize')}</span>
              </button>
            </div>
            <button className={`${styles.flowToggleBtn} ${autoplay ? styles.flowToggleBtnActive : ''}`} onClick={() => setAutoplay(a => !a)}>
              <AutoplayIcon size={18} />
              <span>{t('Start next set after rest')}</span>
            </button>
          </div>
        </div>
      )}

      {timerPhase === 'work' && timerExercise && !paused && !timerMinimized && (
        <div className={styles.workOverlay}>
          <div className={styles.overlayContent}>
            <div className={styles.overlaySetLabel}>SET {timerSet}</div>
            <div className={styles.overlayExName}>{timerExercise.name}</div>
            <div className={styles.overlayTime}>
              {Math.floor(timerSecs / 60)}:{String(timerSecs % 60).padStart(2, '0')}
            </div>
            <div className={styles.overlayProgressTrack}>
              <div className={styles.overlayProgressFill} style={{ width: `${timerTotalSecs > 0 ? (timerSecs / timerTotalSecs) * 100 : 0}%` }} />
            </div>
            <div className={styles.overlayReps}>{timerExLog?.reps ?? 10}x</div>
            {timerExLog?.kg != null && (
              <div className={styles.overlayWeightBelow}>{formatWeight(timerExLog.kg, weightUnit)}</div>
            )}
          </div>
          <div className={styles.overlayActions}>
            <div className={styles.flowActionRow}>
              <button className={styles.flowActionBtn} onClick={pauseExerciseTimer}>
                <CirclePauseIcon size={18} />
                <span>{t('Pause')}</span>
              </button>
              <button className={styles.flowActionBtn} onClick={() => setTimerMinimized(true)}>
                <MinimizeIcon size={18} />
                <span>{t('Minimize')}</span>
              </button>
            </div>
            <button className={`${styles.flowToggleBtn} ${autoplay ? styles.flowToggleBtnActive : ''}`} onClick={() => setAutoplay(a => !a)}>
              <AutoplayIcon size={18} />
              <span>{t('Start next set after rest')}</span>
            </button>
          </div>
        </div>
      )}

      {timerPhase === 'side_pause' && !paused && !timerMinimized && (
        <div className={styles.countdownOverlay}>
          <div className={styles.overlayContent}>
            <div className={styles.overlaySetLabel}>{t('Switch side')}</div>
            <div className={styles.overlayTime}>{timerSecs}</div>
            <div className={styles.overlayProgressTrack}>
              <div className={styles.overlayProgressFill} style={{ width: `${timerTotalSecs > 0 ? (timerSecs / timerTotalSecs) * 100 : 0}%` }} />
            </div>
          </div>
          <div className={styles.overlayActions}>
            <div className={styles.flowActionRow}>
              <button className={styles.flowActionBtn} onClick={pauseExerciseTimer}>
                <CirclePauseIcon size={18} />
                <span>{t('Pause')}</span>
              </button>
              <button className={styles.flowActionBtn} onClick={() => setTimerMinimized(true)}>
                <MinimizeIcon size={18} />
                <span>{t('Minimize')}</span>
              </button>
            </div>
            <button className={`${styles.flowToggleBtn} ${autoplay ? styles.flowToggleBtnActive : ''}`} onClick={() => setAutoplay(a => !a)}>
              <AutoplayIcon size={18} />
              <span>{t('Start next set after rest')}</span>
            </button>
          </div>
        </div>
      )}

      {timerPhase === 'rest' && !paused && !timerMinimized && (
        <div className={styles.restOverlay}>
          <div className={styles.blobOrange} />
          <div className={styles.blobPink} />
          <div className={styles.blobPurple} />
          <div className={styles.overlayContent}>
            <div className={styles.overlaySetLabel}>SET {timerSet} — {t('Rest')}</div>
            {timerExercise && <div className={styles.overlayExName}>{timerExercise.name}</div>}
            <div className={styles.overlayTime}>
              {Math.floor(timerSecs / 60)}:{String(timerSecs % 60).padStart(2, '0')}
            </div>
            <div className={styles.overlayProgressTrack}>
              <div className={styles.overlayProgressFill} style={{ width: `${timerTotalSecs > 0 ? (timerSecs / timerTotalSecs) * 100 : 0}%` }} />
            </div>
            <div className={styles.overlayNextLabel}>{t('Next')}</div>
            {nextUp.setLabel && <div className={styles.overlayNextValue}>{nextUp.setLabel}</div>}
            <div className={styles.overlayNextValue}>{nextUp.name}</div>
          </div>
          <div className={styles.overlayActions}>
            <div className={styles.flowActionRow}>
              <button className={styles.flowActionBtn} onClick={pauseExerciseTimer}>
                <CirclePauseIcon size={18} />
                <span>{t('Pause')}</span>
              </button>
              <button className={styles.flowActionBtn} onClick={() => setTimerMinimized(true)}>
                <MinimizeIcon size={18} />
                <span>{t('Minimize')}</span>
              </button>
            </div>
            <button className={`${styles.flowToggleBtn} ${autoplay ? styles.flowToggleBtnActive : ''}`} onClick={() => setAutoplay(a => !a)}>
              <AutoplayIcon size={18} />
              <span>{t('Start next set after rest')}</span>
            </button>
          </div>
        </div>
      )}

      {timerMinimized && !paused && (timerPhase || countdownOverlay !== null) && (
        <div className={`${styles.miniTimerBar} ${timerPhase === 'work' ? styles.miniTimerWork : timerPhase === 'rest' ? styles.miniTimerRest : styles.miniTimerCountdown}`} onClick={() => setTimerMinimized(false)}>
          {timerPhase === 'rest' && (
            <>
              <div className={styles.blobOrange} />
              <div className={styles.blobPink} />
              <div className={styles.blobPurple} />
            </>
          )}
          <div className={styles.miniTimerInfo}>
            <MaximizeIcon size={20} className={styles.miniTimerExpandLeft} />
            <span className={styles.miniTimerPhase}>
              {countdownOverlay !== null ? `Set ${timerSet} — ${t('Countdown')}` : timerPhase === 'work' ? `Set ${timerSet} — ${t('Reps')}` : timerPhase === 'side_pause' ? `Set ${timerSet} — ${t('Switch side')}` : `Set ${timerSet} — ${t('Rest')}`}
            </span>
            <span className={styles.miniTimerTime}>
              {countdownOverlay !== null
                ? countdownOverlay
                : `${Math.floor(timerSecs / 60)}:${String(timerSecs % 60).padStart(2, '0')}`}
            </span>
          </div>
          <div className={styles.miniTimerTrack}>
            <div className={styles.miniTimerFill} style={{ width: `${
              countdownOverlay !== null
                ? (countdownSeconds > 0 ? (countdownOverlay / countdownSeconds) * 100 : 0)
                : (timerTotalSecs > 0 ? (timerSecs / timerTotalSecs) * 100 : 0)
            }%` }} />
          </div>
        </div>
      )}

      {paused && !timerMinimized && (timerPhase || countdownOverlay !== null) && (
        <div className={styles.pauseOverlay}>
          <div className={styles.overlayContent}>
            {timerExercise && (
              <>
                <div className={styles.overlaySetLabel}>
                  SET {timerSet} — {countdownOverlay !== null ? t('Countdown') : timerPhase === 'work' ? t('Reps') : timerPhase === 'side_pause' ? t('Switch side') : t('Rest')}
                </div>
                <div className={styles.overlayExName}>{timerExercise.name}</div>
              </>
            )}
            <div className={styles.pauseTitle}>{t('Paused')}</div>
            <div className={styles.overlayTime}>
              {countdownOverlay !== null
                ? countdownOverlay
                : `${Math.floor(timerSecs / 60)}:${String(timerSecs % 60).padStart(2, '0')}`}
            </div>
            <div className={styles.endDialogActions}>
              <button className={styles.pauseResumeBtn} onClick={resumeExerciseTimer}>{t('Continue')}</button>
              <button className={styles.pauseStopBtn} onClick={() => saveSetAndStop(true)}>{t('Save & end')}</button>
              <button className={`${styles.pauseStopBtn} ${styles.pauseStopBtnDanger}`} onClick={() => saveSetAndStop(false)}>{t('End without saving')}</button>
            </div>
          </div>
        </div>
      )}

      {showEndDialog && (
        <div className={styles.pauseOverlay}>
          <div className={styles.overlayContent}>
            <div className={styles.pauseTitle}>{t('End workout?')}</div>
            <div className={styles.endDialogActions}>
              <button className={styles.pauseResumeBtn} onClick={() => finishWorkout(true)}>{t('Save & end')}</button>
              <button className={`${styles.pauseStopBtn} ${styles.pauseStopBtnDanger}`} onClick={() => finishWorkout(false)}>{t('End without saving')}</button>
              <button className={styles.pauseStopBtn} onClick={() => setShowEndDialog(false)}>{t('Cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showInactiveDialog && (
        <div className={styles.pauseOverlay}>
          <div className={styles.overlayContent}>
            <div className={styles.pauseTitle}>{t('Still training?')}</div>
            <div className={styles.overlayNext}>{t('You have an unfinished workout')}</div>
            <div className={styles.endDialogActions}>
              <button className={styles.pauseResumeBtn} onClick={() => setShowInactiveDialog(false)}>{t('Continue training')}</button>
              <button className={styles.pauseStopBtn} onClick={() => { setShowInactiveDialog(false); finishWorkout(true) }}>{t('Save & end')}</button>
              <button className={styles.pauseStopBtn} onClick={() => { setShowInactiveDialog(false); finishWorkout(false) }}>{t('End without saving')}</button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (() => {
        const [sessionName, nextDay] = showCompleteModal.split('|')
        return (
          <div className={styles.completeOverlay} onClick={() => setShowCompleteModal(null)}>
            <div className={styles.completeModal} onClick={e => e.stopPropagation()}>
              <div className={styles.completeEmoji}>💪</div>
              <div className={styles.completeTitle}>{t('Great job!')}</div>
              <div className={styles.completeText}>
                {t('Your {{session}} is now saved!', { session: sessionName })}
              </div>
              {nextDay && <div className={styles.completeNext}>{t('See you on {{day}}!', { day: nextDay })}</div>}
              <button className={styles.completeBtn} onClick={() => setShowCompleteModal(null)}>{t('Close')}</button>
            </div>
          </div>
        )
      })()}
    </section>

    {editMode && activeTab && !adding && !addingExercise && (
      <button className={styles.addExerciseFab} onClick={() => setAddingExercise(true)} title={t('+ Add exercise')}>+</button>
    )}

    {addingExercise && (
      <NewExerciseModal
        t={t}
        knownExercises={(() => {
          const names = new Set<string>()
          for (const exs of Object.values(exercises)) for (const ex of exs) names.add(ex.name)
          return Array.from(names).sort()
        })()}
        onLookup={(exName: string) => {
          for (const sessionExs of Object.values(exercises)) {
            const ex = sessionExs.find(e => e.name.toLowerCase() === exName.toLowerCase())
            if (ex && logs[ex.id]) return logs[ex.id]
          }
          return null
        }}
        onSave={async (name, kg, sets, reps) => {
          const sortOrder = (exercises[activeTab!] ?? []).length
          let catalogId: number | null = null
          const { data: existing } = await supabase.from('exercise_catalog').select('id').ilike('name', name).maybeSingle()
          if (existing) catalogId = (existing as { id: number }).id
          else {
            const { data: inserted } = await supabase.from('exercise_catalog').insert({ name }).select().single()
            if (inserted) catalogId = (inserted as { id: number }).id
          }
          const { data } = await supabase.from('exercises')
            .insert({ user_id: userId, session_id: activeTab, name, sort_order: sortOrder, tab: 'custom', catalog_id: catalogId })
            .select().single()
          if (data) {
            const ex = data as Exercise
            setExercises(prev => ({ ...prev, [activeTab!]: [...(prev[activeTab!] ?? []), ex] }))
            if (kg != null && reps != null) {
              await supabase.from('exercise_log').insert({ user_id: userId, exercise_id: ex.id, weight_kg: kg, sets, reps })
              setLogs(prev => ({ ...prev, [ex.id]: { kg, sets, reps, unilateral: false } }))
            }
          }
          setAddingExercise(false)
        }}
        onClose={() => setAddingExercise(false)}
      />
    )}
  </>
  )
}

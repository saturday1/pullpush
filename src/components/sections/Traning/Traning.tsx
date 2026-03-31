import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor, registerPlugin } from '@capacitor/core'
import SectionHeader from '../../SectionHeader/SectionHeader'

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
  id: number
  name: string
  session_id: number
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

// --- Sub-components ---

interface NameModalProps {
  exercise: Exercise
  onRename: (exercise: Exercise, name: string) => Promise<void>
  onDelete: (exercise: Exercise) => Promise<void>
  onClose: () => void
}

function NameModal({ exercise, onRename, onDelete, onClose }: NameModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [name,       setName]       = useState<string>(exercise.name)
  const [saving,     setSaving]     = useState<boolean>(false)
  const [confirming, setConfirming] = useState<boolean>(false)
  const [deleting,   setDeleting]   = useState<boolean>(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    await onRename(exercise, name)
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
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{t('Exercise')}</div>

        {confirming ? (
          <>
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
              <button className={styles.deleteSessionBtn} onClick={() => setConfirming(true)}>
                {t('Delete')}
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

interface LogModalProps {
  exercise: Exercise
  current: ExerciseLog | undefined
  onSave: (exerciseId: number, kg: number, sets: number | null, reps: number) => Promise<void>
  onClose: () => void
}

function LogModal({ exercise, current, onSave, onClose }: LogModalProps): React.JSX.Element {
  const { t } = useTranslation()
  const [kg,     setKg]     = useState<string>(current?.kg?.toString() ?? '')
  const [lbs,    setLbs]    = useState<string>(current?.kg ? toLbs(current.kg).toString() : '')
  const [sets,   setSets]   = useState<string>(current?.sets?.toString() ?? '')
  const [reps,   setReps]   = useState<string>(current?.reps?.toString() ?? '')
  const [saving, setSaving] = useState<boolean>(false)

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
  async function handleSave(): Promise<void> {
    const kgVal   = parseFloat(kg.replace(',', '.'))
    const setsVal = parseInt(sets)
    const repsVal = parseInt(reps)
    if (isNaN(kgVal) || isNaN(repsVal)) return
    setSaving(true)
    await onSave(exercise.id, kgVal, isNaN(setsVal) ? null : setsVal, repsVal)
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{exercise.name}</div>
        <div className={styles.modalFields}>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>{t('Weight (kg)')}</span>
            <input className={styles.modalInput} type="number" step="0.5" value={kg} onChange={e => handleKgChange(e.target.value)} autoFocus />
          </label>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>{t('Weight (lbs)')}</span>
            <input className={styles.modalInput} type="number" step="1" value={lbs} onChange={e => handleLbsChange(e.target.value)} />
          </label>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>{t('Sets')}</span>
            <input className={styles.modalInput} type="number" step="1" value={sets} onChange={e => setSets(e.target.value)} />
          </label>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>{t('Reps')}</span>
            <input className={styles.modalInput} type="number" step="1" value={reps} onChange={e => setReps(e.target.value)} />
          </label>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>{t('Cancel')}</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '…' : t('Save')}
          </button>
        </div>
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
  onName: (ex: Exercise) => void
  onLog: (ex: Exercise) => void
  onPlay: (ex: Exercise) => void
  onUndo: (exId: number) => void
  hideSets: boolean
  editMode: boolean
  isTimerActive: boolean
  completedSets: number
}

function SortableRow({ ex, log, onName, onLog, onPlay, onUndo, hideSets, editMode, isTimerActive, completedSets }: SortableRowProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id, disabled: !editMode })
  const totalSets = log?.sets ?? 3
  const allDone = completedSets >= totalSets
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className={`${styles.exerciseRow} ${hideSets ? styles.hideSets : ''} ${editMode ? styles.editMode : ''} ${isTimerActive ? styles.exerciseActive : ''}`}>
      {editMode && <span className={styles.dragHandle} {...attributes} {...listeners}>⋮⋮</span>}
      <span className={styles.exNameCell}>
        {editMode ? (
          <button className={styles.exNameBtn} onClick={() => onName(ex)}>{ex.name}</button>
        ) : (
          <button className={styles.exPlayBtn} onClick={() => onPlay(ex)}>
            {allDone ? <span className={styles.exDoneCheck}>✓</span> : null}
            {ex.name}
          </button>
        )}
        {!editMode && (completedSets > 0 || isTimerActive) && (
          <span className={styles.setProgress}>
            {Array.from({ length: totalSets }, (_, i) => (
              <span key={i} className={i < completedSets ? styles.setDotDone : styles.setDotPending} />
            ))}
            {completedSets > 0 && !isTimerActive && (
              <button className={styles.undoBtn} onClick={(e) => { e.stopPropagation(); onUndo(ex.id) }} title="Undo">↩</button>
            )}
          </span>
        )}
      </span>
      <span className={`${styles.weightCell} ${editMode ? styles.clickableCell : ''}`} onClick={() => editMode && onLog(ex)}>
        <span className={styles.kgVal}>{log?.kg ?? '–'}</span>
        <span className={styles.lbsVal}>{log?.kg != null ? toLbs(log.kg) : ''}</span>
      </span>
      {!hideSets && <span className={`${styles.numCell} ${editMode ? styles.clickableCell : ''}`} onClick={() => editMode && onLog(ex)}>{log?.sets ?? '–'}</span>}
      <span className={`${styles.numCell} ${editMode ? styles.clickableCell : ''} ${styles.repsCell}`} onClick={() => editMode && onLog(ex)}>{log?.reps ?? '–'}</span>
    </div>
  )
}

// --- Main component ---

export default function Traning(): React.JSX.Element {
  const { t } = useTranslation()
  const dayAbbrev = t('dayAbbrev', { returnObjects: true }) as string[]
  const dayFull   = t('dayFull',   { returnObjects: true }) as string[]
  const { sessions, sessionsLoading, programs, programsLoading, activeProgramId, restSeconds, secPerRep, countdownSeconds, addSession, createProgram, switchProgram, renameProgram, deleteProgram, load: loadProfile } = useProfile()!
  const [activeTab,        setActiveTab]        = useState<string | null>(null)
  const [exercises,        setExercises]        = useState<Record<string, Exercise[]>>({})
  const [logs,             setLogs]             = useState<Record<string, ExerciseLog>>({})
  const [exercisesLoading, setExercisesLoading] = useState<boolean>(false)
  const [hideSets,         setHideSets]         = useState<boolean>(false)
  const [editMode,         setEditMode]         = useState<boolean>(false)
  const [workoutId,        setWorkoutId]        = useState<string | null>(null)
  const [showEndDialog,    setShowEndDialog]    = useState<boolean>(false)

  // Exercise timer
  type TimerPhase = 'countdown' | 'work' | 'rest' | null
  const [timerExId,        setTimerExId]        = useState<number | null>(null)
  const [timerPhase,       setTimerPhase]       = useState<TimerPhase>(null)
  const [timerSet,         setTimerSet]         = useState<number>(0)
  const [timerSetsTotal,   setTimerSetsTotal]   = useState<number>(0)
  const [timerSecs,        setTimerSecs]        = useState<number>(0)
  const [timerTotalSecs,   setTimerTotalSecs]   = useState<number>(0)
  const [completedSets,    setCompletedSets]    = useState<Record<number, number>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [countdownOverlay, setCountdownOverlay] = useState<number | null>(null)
  const [paused,           setPaused]           = useState<boolean>(false)
  const pausedRemainRef = useRef<number>(0)
  const pausedPlanRef = useRef<{ plan: { phase: TimerPhase; duration: number }[]; step: number; exId: number; currentSet: number; setsTotal: number; kg: number | null; reps: number; wId: string | null } | null>(null)
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
    const log = logs[ex.id]
    const sets = log?.sets ?? 3
    const reps = log?.reps ?? 10
    const workTime = reps * secPerRep
    const COUNTDOWN = countdownSeconds
    const currentSet = (completedSets[ex.id] ?? 0) + 1

    // Create workout if first set in this session
    let wId = workoutId
    if (!wId && userId && activeTab && activeProgramId) {
      const { data } = await supabase.from('workouts').insert({
        user_id: userId,
        session_id: activeTab,
        program_id: activeProgramId,
      }).select('id').single()
      if (data) {
        wId = data.id
        setWorkoutId(wId)
      }
    }

    // One set plan: countdown → work → rest (always, for transition to next exercise/set)
    const plan: { phase: TimerPhase; duration: number }[] = [
      { phase: 'countdown', duration: COUNTDOWN },
      { phase: 'work', duration: workTime },
      { phase: 'rest', duration: restSeconds },
    ]

    timerPlanRef.current = plan
    timerStepRef.current = 0
    setTimerExId(ex.id)
    setTimerSetsTotal(sets)
    setTimerSet(currentSet)

    // Start Live Activity with total time (countdown + work + rest)
    const totalTime = plan.reduce((sum, p) => sum + p.duration, 0)
    const label = `${reps} × ${ex.name} + ${t('Rest').toLowerCase()}`
    if (RestTimer) RestTimer.start({ seconds: totalTime, label }).catch(() => {})

    // Schedule notification when set cycle ends
    try {
      await LocalNotifications.requestPermissions()
      await LocalNotifications.schedule({
        notifications: [{
          id: 2,
          title: `Set ${currentSet}/${sets} ${t('Done').toLowerCase()}`,
          body: ex.name,
          schedule: { at: new Date(Date.now() + totalTime * 1000) },
          sound: 'default',
        }],
      })
    } catch {}

    runTimerStep(plan, 0, ex.id, currentSet, sets, log?.kg ?? null, reps, wId)
  }

  function runTimerStep(plan: { phase: TimerPhase; duration: number }[], step: number, exId: number, currentSet: number, setsTotal: number, kg: number | null, reps: number, wId: string | null): void {
    if (step >= plan.length) {
      // Set done — stop and wait for next play
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      setTimerPhase(null)
      setTimerExId(null)
      setCompletedSets(prev => ({ ...prev, [exId]: currentSet }))
      try { RestTimer?.stop() } catch {}
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
            supabase.from('workout_sets').insert({
              workout_id: wId,
              exercise_id: exId,
              set_number: currentSet,
              kg,
              reps,
            }).then(() => {})
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
    setTimerTotalSecs(remain)

    // Restart Live Activity with remaining time
    const remainingTotal = plan.slice(step).reduce((sum, p) => sum + p.duration, 0) - (plan[step].duration - remain)
    const resumeLabel = ctx.exId ? (currentExercises.find(e => e.id === ctx.exId)?.name ?? 'PULLPUSH') : 'PULLPUSH'
    const resumeReps = ctx.reps ?? 0
    const resumeLabelFull = resumeReps > 0 ? `${resumeReps} × ${resumeLabel} + ${t('Rest').toLowerCase()}` : resumeLabel
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

  async function finishWorkout(save: boolean): Promise<void> {
    stopExerciseTimer()
    if (workoutId) {
      if (save) {
        await supabase.from('workouts').update({ completed_at: new Date().toISOString() }).eq('id', workoutId)
      } else {
        await supabase.from('workouts').delete().eq('id', workoutId)
      }
    }
    setWorkoutId(null)
    setCompletedSets({})
    setShowEndDialog(false)
  }

  function undoLastSet(exId: number): void {
    const prev = completedSets[exId] ?? 0
    if (prev <= 0) return
    setCompletedSets(p => ({ ...p, [exId]: prev - 1 }))
    // Delete from database
    if (workoutId) {
      supabase.from('workout_sets')
        .delete()
        .eq('workout_id', workoutId)
        .eq('exercise_id', exId)
        .eq('set_number', prev)
        .then(() => {})
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (sessions.length > 0 && (activeTab === null || !sessions.find((s: TrainingSession) => s.id === activeTab))) {
      setActiveTab(sessions[0].id)
    }
  }, [sessions])

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
      for (const row of logData as Array<{ exercise_id: string; weight_kg: number; sets: number | null; reps: number }>) {
        latest[row.exercise_id] = { kg: row.weight_kg, sets: row.sets, reps: row.reps }
      }
      setLogs(latest)
    }
    setExercisesLoading(false)

    // Resume unfinished workout if exists
    const { data: openWorkout } = await supabase.from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .is('completed_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (openWorkout) {
      setWorkoutId(openWorkout.id)
      const { data: sets } = await supabase.from('workout_sets')
        .select('exercise_id, set_number')
        .eq('workout_id', openWorkout.id)

      if (sets) {
        const restored: Record<number, number> = {}
        for (const s of sets as Array<{ exercise_id: number; set_number: number }>) {
          restored[s.exercise_id] = Math.max(restored[s.exercise_id] ?? 0, s.set_number)
        }
        setCompletedSets(restored)
      }
    }
  }

  async function handleLogSave(exerciseId: number, kg: number, sets: number | null, reps: number): Promise<void> {
    await supabase.from('exercise_log').insert({ user_id: userId, exercise_id: exerciseId, weight_kg: kg, sets, reps })
    setLogs(prev => ({ ...prev, [exerciseId]: { kg, sets, reps } }))
    setLogging(null)
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
    if (allSessionDone && workoutId && !timerPhase) {
      supabase.from('workouts').update({ completed_at: new Date().toISOString() }).eq('id', workoutId)
    }
  }, [allSessionDone, workoutId, timerPhase])

  // Find active exercise name/details for overlay
  const timerExercise = currentExercises.find(ex => ex.id === timerExId)
  const timerExLog = timerExId ? logs[timerExId] : undefined

  // Find next exercise/set for rest overlay preview
  const nextUpLabel = (() => {
    if (!timerExercise) return ''
    const exSets = timerExLog?.sets ?? 3
    const done = completedSets[timerExercise.id] ?? 0
    if (timerSet < exSets) return `Set ${timerSet + 1} — ${timerExercise.name}`
    const idx = currentExercises.findIndex(ex => ex.id === timerExId)
    const nextEx = currentExercises[idx + 1]
    if (nextEx) return `${nextEx.name}`
    return t('Done')
  })()

  const setupStep: number | null = (!programsLoading && programs.length === 0) ? 1
    : (!programsLoading && !sessionsLoading && programs.length > 0 && sessions.length === 0) ? 2
    : null

  return (
    <section id="traning">
      <SectionHeader number="04" title={t('Training sessions')} />

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

          <Reveal>
            <div className={styles.actionBar}>
              <button className={`${styles.toggleSetsBtn} ${editMode ? styles.editModeActive : ''}`} onClick={() => setEditMode(m => !m)} type="button">
                {editMode ? t('Done') : t('Edit')}
              </button>
              <button className={styles.toggleSetsBtn} onClick={() => setHideSets(h => !h)} type="button">
                {hideSets ? t('Show sets') : t('Hide sets')}
              </button>
            </div>
          </Reveal>

          {programs.length > 0 && (
            <Reveal>
              <div className={styles.programBar}>
                <select className={styles.programDropdown} value={String(activeProgramId ?? programs[0]?.id ?? '')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { switchProgram(e.target.value); setAdding(false) }}>
                  {programs.map((p: TrainingProgram) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
                <button className={styles.editProgramBtn} onClick={() => setEditingProgram(true)} title={t('Edit program')}>✎</button>
                <button className={styles.addProgramBtn} onClick={() => setCreatingProgram(true)}>+</button>
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
              {currentSession && (
                <button className={styles.editProgramBtn} onClick={() => setEditingSession(true)} title={t('Edit session')}>✎</button>
              )}
              <button className={styles.addProgramBtn} onClick={() => setAddingSession(true)}>+</button>
            </div>
          </Reveal>

          <Reveal key={activeTab}>


            <div className={styles.exerciseList}>
              <div className={`${styles.exerciseHeader} ${hideSets ? styles.hideSets : ''} ${editMode ? styles.editMode : ''}`}>
                {editMode && <span></span>}
                <span>{t('Exercise')}</span>
                <span><span className={styles.kgLabel}>kg</span><br/><span className={styles.lbsLabel}>lbs</span></span>
                {!hideSets && <span>{t('Sets')}</span>}
                <span>{t('Reps')}</span>
              </div>

              {exercisesLoading ? (
                [0, 1, 2, 3].map((i: number) => (
                  <div key={i} className={`${styles.exerciseRow} ${hideSets ? styles.hideSets : ''}`}>
                    <span><Skeleton width={16} height={16} /></span>
                    <span><Skeleton width="70%" height={14} /></span>
                    <Skeleton width={40} height={14} />
                    {!hideSets && <Skeleton width={24} height={14} />}
                    <Skeleton width={24} height={14} />
                  </div>
                ))
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={currentExercises.map((e: Exercise) => e.id)} strategy={verticalListSortingStrategy}>
                    {currentExercises.map((ex: Exercise) => (
                      <SortableRow key={ex.id} ex={ex} log={logs[ex.id]} onName={setNaming} onLog={setLogging} onPlay={(e) => timerExId === e.id ? pauseExerciseTimer() : startExerciseTimer(e)} onUndo={undoLastSet} hideSets={hideSets} editMode={editMode} isTimerActive={timerExId === ex.id} completedSets={completedSets[ex.id] ?? 0} />
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

            {editMode && !adding && (
              <button className={styles.addBtn} onClick={() => setAdding(true)}>{t('+ Add exercise')}</button>
            )}

            {!editMode && workoutId && !allSessionDone && (
              <button className={styles.endWorkoutBtn} onClick={() => setShowEndDialog(true)}>{t('End workout')}</button>
            )}

            {allSessionDone && workoutId && (
              <div className={styles.workoutDone}>✓ {t('Workout complete!')}</div>
            )}
          </Reveal>
        </>
      )}


      {logging && (
        <LogModal
          exercise={logging}
          current={logs[logging.id]}
          onSave={handleLogSave}
          onClose={() => setLogging(null)}
        />
      )}

      {naming && (
        <NameModal
          exercise={naming}
          onRename={handleRename}
          onDelete={handleDelete}
          onClose={() => setNaming(null)}
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
      {countdownOverlay !== null && timerExercise && !paused && (
        <div className={styles.countdownOverlay} onClick={pauseCountdown}>
          <div className={styles.countdownInner}>
            <div className={styles.countdownMeta}>{t('Get ready')}</div>
            <div className={styles.countdownMeta}>Set {timerSet}/{timerSetsTotal}</div>
            <div className={styles.countdownLabel}>{timerExercise.name}</div>
            <div className={styles.countdownMeta}>{timerExLog?.reps ?? 10} {t('reps')}</div>
            <div className={styles.countdownNumber}>{countdownOverlay}</div>
            <div className={styles.overlayHint}>{t('Tap to pause')}</div>
          </div>
        </div>
      )}

      {timerPhase === 'work' && timerExercise && !paused && (
        <div className={styles.workOverlay} onClick={pauseExerciseTimer}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayTop}>
              <span className={styles.overlaySetLabel}>SET {timerSet}/{timerSetsTotal}</span>
              {timerExLog?.kg && <span className={styles.overlayWeight}>{timerExLog.kg} kg</span>}
            </div>
            <div className={styles.overlayExName}>{timerExercise.name}</div>
            <div className={styles.overlayTime}>
              {Math.floor(timerSecs / 60)}:{String(timerSecs % 60).padStart(2, '0')}
            </div>
            <div className={styles.overlayProgressTrack}>
              <div className={styles.overlayProgressFill} style={{ width: `${timerTotalSecs > 0 ? (timerSecs / timerTotalSecs) * 100 : 0}%` }} />
            </div>
            <div className={styles.overlayHint}>{t('Tap to pause')}</div>
          </div>
        </div>
      )}

      {timerPhase === 'rest' && !paused && (
        <div className={styles.restOverlay} onClick={pauseExerciseTimer}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayRestLabel}>{t('Rest')}</div>
            <div className={styles.overlayTime}>
              {Math.floor(timerSecs / 60)}:{String(timerSecs % 60).padStart(2, '0')}
            </div>
            <div className={styles.overlayProgressTrack}>
              <div className={styles.overlayProgressFill} style={{ width: `${timerTotalSecs > 0 ? (timerSecs / timerTotalSecs) * 100 : 0}%` }} />
            </div>
            <div className={styles.overlayNext}>{t('Next')}: {nextUpLabel}</div>
            <div className={styles.overlayHint}>{t('Tap to pause')}</div>
          </div>
        </div>
      )}

      {paused && (timerPhase || countdownOverlay !== null) && (
        <div className={styles.pauseOverlay}>
          <div className={styles.overlayContent}>
            <div className={styles.pauseTitle}>{t('Paused')}</div>
            <div className={styles.overlayTime}>
              {countdownOverlay !== null
                ? countdownOverlay
                : `${Math.floor(timerSecs / 60)}:${String(timerSecs % 60).padStart(2, '0')}`}
            </div>
            <div className={styles.pauseActions}>
              <button className={styles.pauseResumeBtn} onClick={resumeExerciseTimer}>{t('Continue')}</button>
              <button className={styles.pauseStopBtn} onClick={stopExerciseTimer}>{t('Stop')}</button>
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
              <button className={styles.pauseStopBtn} onClick={() => finishWorkout(false)}>{t('End without saving')}</button>
              <button className={styles.pauseStopBtn} onClick={() => setShowEndDialog(false)}>{t('Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

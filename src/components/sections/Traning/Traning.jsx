import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import Skeleton from '../../Skeleton/Skeleton'
import { supabase } from '../../../supabase'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Traning.module.scss'

const KG_TO_LBS = 2.20462
const toKg  = lbs => +(lbs / KG_TO_LBS).toFixed(2)
const toLbs = kg  => +(kg  * KG_TO_LBS).toFixed(1)

function NameModal({ exercise, onRename, onDelete, onClose }) {
  const { t } = useTranslation()
  const [name,       setName]       = useState(exercise.name)
  const [saving,     setSaving]     = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function handleSave() {
    setSaving(true)
    await onRename(exercise, name)
    setSaving(false)
    onClose()
  }
  async function handleDelete() {
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

function LogModal({ exercise, current, onSave, onClose }) {
  const { t } = useTranslation()
  const [kg,     setKg]     = useState(current?.kg?.toString() ?? '')
  const [lbs,    setLbs]    = useState(current?.kg ? toLbs(current.kg).toString() : '')
  const [sets,   setSets]   = useState(current?.sets?.toString() ?? '')
  const [reps,   setReps]   = useState(current?.reps?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  function handleKgChange(val) {
    setKg(val)
    const n = parseFloat(val.replace(',', '.'))
    if (!isNaN(n)) setLbs(toLbs(n).toString())
  }
  function handleLbsChange(val) {
    setLbs(val)
    const n = parseFloat(val.replace(',', '.'))
    if (!isNaN(n)) setKg(toKg(n).toString())
  }
  async function handleSave() {
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

function AddSessionModal({ userId, sortOrder, onSave, onClose }) {
  const { t } = useTranslation()
  const dayFull = t('dayFull', { returnObjects: true })
  const [name, setName] = useState('')
  const [day,  setDay]  = useState(1)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await onSave({ user_id: userId, day_of_week: day, name: trimmed, sort_order: sortOrder })
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
              {dayFull.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
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

function EditSessionModal({ session, onSave, onDelete, onClose }) {
  const { t } = useTranslation()
  const dayFull = t('dayFull', { returnObjects: true })
  const [name,       setName]       = useState(session.name)
  const [day,        setDay]        = useState(session.day_of_week)
  const [saving,     setSaving]     = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await onSave(session.id, trimmed, day)
    setSaving(false)
  }
  async function handleDelete() {
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
                  {dayFull.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
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

function EditProgramModal({ program, onRename, onDelete, onClose }) {
  const { t } = useTranslation()
  const [name,       setName]       = useState(program.name)
  const [saving,     setSaving]     = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await onRename(program.id, trimmed)
    setSaving(false)
    onClose()
  }
  async function handleDelete() {
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

function CreateProgramModal({ onSave, onClose }) {
  const { t } = useTranslation()
  const [name,    setName]    = useState('')
  const [saving,  setSaving]  = useState(false)

  async function handleSave() {
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

function SetupGuide({ step, onCreateProgram, onAddSession }) {
  const { t } = useTranslation()
  const steps = [
    { num: 1, title: t('Create a training program'), desc: t('Start by naming your program, e.g. Bulking, Deload or Summer.'), action: onCreateProgram, label: t('Create program') },
    { num: 2, title: t('Add training sessions'), desc: t('Add sessions for each training day, e.g. Push, Legs, Full body.'), action: onAddSession, label: t('Add session') },
    { num: 3, title: t('Add exercises'), desc: t('Add exercises to each session and log your weights.'), action: null, label: null },
  ]
  return (
    <div className={styles.setupGuide}>
      {steps.map(s => {
        const done   = s.num < step
        const active = s.num === step
        const locked = s.num > step
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

function SortableRow({ ex, log, onName, onLog }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className={styles.exerciseRow}>
      <span className={styles.dragHandle} {...attributes} {...listeners}>⋮⋮</span>
      <span><button className={styles.exNameBtn} onClick={() => onName(ex)}>{ex.name}</button></span>
      <span className={`${styles.numCell} ${styles.clickableCell} ${styles.weightCell} ${styles.weightStart}`} onClick={() => onLog(ex)}>{log?.kg ?? '–'}</span>
      <span className={`${styles.numCell} ${styles.clickableCell} ${styles.weightCell} ${styles.weightEnd}`} onClick={() => onLog(ex)}>{log?.kg != null ? toLbs(log.kg) : '–'}</span>
      <span className={`${styles.numCell} ${styles.clickableCell}`} onClick={() => onLog(ex)}>{log?.sets ?? '–'}</span>
      <span className={`${styles.numCell} ${styles.clickableCell} ${styles.repsCell}`} onClick={() => onLog(ex)}>{log?.reps ?? '–'}</span>
    </div>
  )
}

export default function Traning() {
  const { t } = useTranslation()
  const dayAbbrev = t('dayAbbrev', { returnObjects: true })
  const dayFull   = t('dayFull',   { returnObjects: true })
  const { sessions, sessionsLoading, programs, programsLoading, activeProgramId, addSession, createProgram, switchProgram, renameProgram, deleteProgram, load: loadProfile } = useProfile()
  const [activeTab,        setActiveTab]        = useState(null)
  const [exercises,        setExercises]        = useState({})
  const [logs,             setLogs]             = useState({})
  const [exercisesLoading, setExercisesLoading] = useState(true)
  const [logging,          setLogging]          = useState(null)
  const [naming,           setNaming]           = useState(null)
  const [adding,           setAdding]           = useState(false)
  const [newName,          setNewName]          = useState('')
  const [catalogResults,   setCatalogResults]   = useState([])
  const [showCatalogDrop,  setShowCatalogDrop]  = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState(null)
  const catalogDropRef = useRef(null)
  const [userId,           setUserId]           = useState(null)
  const [addingSession,    setAddingSession]    = useState(false)
  const [editingSession,   setEditingSession]   = useState(false)
  const [creatingProgram,  setCreatingProgram]  = useState(false)
  const [editingProgram,   setEditingProgram]   = useState(false)

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (sessions.length > 0 && (activeTab === null || !sessions.find(s => s.id === activeTab))) {
      setActiveTab(sessions[0].id)
    }
  }, [sessions])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setExercisesLoading(true)

    const [{ data: exData }, { data: logData }] = await Promise.all([
      supabase.from('exercises').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('exercise_log').select('exercise_id, weight_kg, sets, reps, logged_at').eq('user_id', user.id).order('logged_at', { ascending: false }),
    ])

    const grouped = {}
    if (exData) {
      for (const ex of exData) {
        if (ex.session_id) {
          if (!grouped[ex.session_id]) grouped[ex.session_id] = []
          grouped[ex.session_id].push(ex)
        }
      }
    }
    setExercises(grouped)

    if (logData) {
      const latest = {}
      for (const row of logData) {
        if (!latest[row.exercise_id]) latest[row.exercise_id] = { kg: row.weight_kg, sets: row.sets, reps: row.reps }
      }
      setLogs(latest)
    }
    setExercisesLoading(false)
  }

  async function handleLogSave(exerciseId, kg, sets, reps) {
    await supabase.from('exercise_log').insert({ user_id: userId, exercise_id: exerciseId, weight_kg: kg, sets, reps })
    setLogs(prev => ({ ...prev, [exerciseId]: { kg, sets, reps } }))
    setLogging(null)
  }

  async function handleRename(exercise, name) {
    const trimmed = name.trim()
    if (!trimmed || trimmed === exercise.name) return
    await supabase.from('exercises').update({ name: trimmed }).eq('id', exercise.id)
    setExercises(prev => ({
      ...prev,
      [exercise.session_id]: prev[exercise.session_id].map(e => e.id === exercise.id ? { ...e, name: trimmed } : e),
    }))
  }

  async function handleDelete(exercise) {
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
      setCatalogResults(data ?? [])
      setShowCatalogDrop((data ?? []).length > 0)
    }, 200)
    return () => clearTimeout(timer)
  }, [newName, selectedCatalogId])

  useEffect(() => {
    function handleClickOutside(e) {
      if (catalogDropRef.current && !catalogDropRef.current.contains(e.target)) setShowCatalogDrop(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectCatalogItem(item) {
    setNewName(item.name)
    setSelectedCatalogId(item.id)
    setCatalogResults([])
    setShowCatalogDrop(false)
  }

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const sortOrder = (exercises[activeTab] ?? []).length

    let catalogId = selectedCatalogId
    if (!catalogId) {
      // Check if exact name exists in catalog
      const { data: existing } = await supabase
        .from('exercise_catalog')
        .select('id')
        .ilike('name', trimmed)
        .maybeSingle()

      if (existing) {
        catalogId = existing.id
      } else {
        const { data: inserted } = await supabase
          .from('exercise_catalog')
          .insert({ name: trimmed })
          .select()
          .single()
        if (inserted) catalogId = inserted.id
      }
    }

    const { data, error } = await supabase.from('exercises')
      .insert({ user_id: userId, session_id: activeTab, name: trimmed, sort_order: sortOrder, tab: 'custom', catalog_id: catalogId ?? null })
      .select().single()
    if (error) { console.error('handleAdd error:', error); return }
    if (data) setExercises(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] ?? []), data] }))
    setNewName('')
    setSelectedCatalogId(null)
    setAdding(false)
  }

  async function handleCreateProgram(name) {
    await createProgram(name)
    setCreatingProgram(false)
    setActiveTab(null)
  }

  async function handleAddSession(sessionData) {
    const data = await addSession({ ...sessionData, program_id: activeProgramId })
    if (data) setActiveTab(data.id)
    setAddingSession(false)
  }

  async function handleSessionSave(id, name, day_of_week) {
    await supabase.from('training_sessions').update({ name, day_of_week }).eq('id', id)
    await loadProfile()
    setEditingSession(false)
  }

  async function handleSessionDelete(id) {
    await supabase.from('training_sessions').delete().eq('id', id)
    await loadProfile()
    setEditingSession(false)
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sessionId = activeTab
    const items = [...(exercises[sessionId] ?? [])]
    const oldIndex = items.findIndex(e => e.id === active.id)
    const newIndex = items.findIndex(e => e.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)

    setExercises(prev => ({ ...prev, [sessionId]: reordered }))

    await Promise.all(
      reordered.map((ex, i) =>
        ex.sort_order !== i
          ? supabase.from('exercises').update({ sort_order: i }).eq('id', ex.id)
          : null
      ).filter(Boolean)
    )
  }

  const currentSession   = sessions.find(s => s.id === activeTab)
  const currentExercises = exercises[activeTab] ?? []

  const setupStep = (!programsLoading && programs.length === 0) ? 1
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
              {programs.map(p => (
                <span key={p.id} className={styles.programChipWrap}>
                  <button
                    className={`${styles.programChip} ${p.id === activeProgramId ? styles.programChipActive : ''}`}
                    onClick={() => { switchProgram(p.id); setAdding(false) }}
                  >
                    {p.name}
                  </button>
                  {p.id === activeProgramId && (
                    <button className={styles.editProgramBtn} onClick={() => setEditingProgram(true)} title={t('Edit program')}>✎</button>
                  )}
                </span>
              ))}
              <button className={styles.addProgramBtn} onClick={() => setCreatingProgram(true)}>
                {t('+ New program')}
              </button>
            </div>
          </Reveal>
          <Reveal>
            <SetupGuide step={2} onAddSession={() => setAddingSession(true)} />
          </Reveal>
        </>
      )}

      {setupStep === null && (
        <>
          {programs.length > 0 && (
            <Reveal>
              <div className={styles.programBar}>
                {programs.map(p => (
                  <span key={p.id} className={styles.programChipWrap}>
                    <button
                      className={`${styles.programChip} ${p.id === activeProgramId ? styles.programChipActive : ''}`}
                      onClick={() => { switchProgram(p.id); setAdding(false) }}
                    >
                      {p.name}
                    </button>
                    {p.id === activeProgramId && (
                      <button className={styles.editProgramBtn} onClick={() => setEditingProgram(true)} title={t('Edit program')}>✎</button>
                    )}
                  </span>
                ))}
                <button className={styles.addProgramBtn} onClick={() => setCreatingProgram(true)}>
                  {t('+ New program')}
                </button>
              </div>
            </Reveal>
          )}

          <Reveal>
            <div className={styles.topRow}>
              <div className={styles.tabs}>
                {sessionsLoading ? (
                  <>
                    <Skeleton width={110} height={36} borderRadius={20} />
                    <Skeleton width={110} height={36} borderRadius={20} />
                    <Skeleton width={110} height={36} borderRadius={20} />
                  </>
                ) : (
                  sessions.map(s => (
                    <button
                      key={s.id}
                      className={`${styles.tab} ${activeTab === s.id ? styles.active : ''}`}
                      onClick={() => { setActiveTab(s.id); setAdding(false) }}
                    >
                      {dayAbbrev[s.day_of_week - 1]} — {s.name}
                    </button>
                  ))
                )}
              </div>
              <div className={styles.topActions}>
                <button className={styles.addSessionBtn} onClick={() => setAddingSession(true)}>
                  {t('+ Add session')}
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal key={activeTab}>
            <div className={styles.dayBadgeRow}>
              <div className={styles.dayBadge}>
                <div className={styles.dot} />
                <span className={styles.dayLabel}>
                  {currentSession ? dayFull[currentSession.day_of_week - 1] : ''}
                </span>
              </div>
              {currentSession && (
                <button className={styles.editSessionIconBtn} onClick={() => setEditingSession(true)} title={t('Edit session')}>
                  ✎
                </button>
              )}
            </div>

            <div className={styles.exerciseList}>
              <div className={styles.exerciseHeader}>
                <span></span>
                <span>{t('Exercise')}</span>
                <span className={`${styles.numCol}`}>kg</span>
                <span className={`${styles.numCol}`}>lbs</span>
                <span className={styles.numCol}>{t('Sets')}</span>
                <span className={styles.numCol}>{t('Reps')}</span>
              </div>

              {exercisesLoading ? (
                [0, 1, 2, 3].map(i => (
                  <div key={i} className={styles.exerciseRow}>
                    <span><Skeleton width={16} height={16} /></span>
                    <span><Skeleton width="70%" height={14} /></span>
                    <span className={styles.numCell}><Skeleton width={32} height={14} /></span>
                    <span className={styles.numCell}><Skeleton width={32} height={14} /></span>
                    <span className={styles.numCell}><Skeleton width={24} height={14} /></span>
                    <span className={styles.numCell}><Skeleton width={24} height={14} /></span>
                  </div>
                ))
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={currentExercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    {currentExercises.map(ex => (
                      <SortableRow key={ex.id} ex={ex} log={logs[ex.id]} onName={setNaming} onLog={setLogging} />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {adding && (
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
                          {catalogResults.map(item => (
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

            {!adding && (
              <button className={styles.addBtn} onClick={() => setAdding(true)}>{t('+ Add exercise')}</button>
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
          program={programs.find(p => p.id === activeProgramId)}
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
    </section>
  )
}

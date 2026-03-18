import { useState, useEffect } from 'react'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { supabase } from '../../../supabase'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Traning.module.scss'

const KG_TO_LBS = 2.20462
const toKg  = lbs => +(lbs / KG_TO_LBS).toFixed(2)
const toLbs = kg  => +(kg  * KG_TO_LBS).toFixed(1)

const DAY_ABBREV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const DAY_FULL   = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

function NameModal({ exercise, onRename, onDelete, onClose }) {
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
        <div className={styles.modalTitle}>Övning</div>

        {confirming ? (
          <>
            <p className={styles.confirmText}>Ta bort <strong>{exercise.name}</strong>? Detta går inte att ångra.</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>Avbryt</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Ja, ta bort'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalFields}>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>Namn</span>
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
                Ta bort
              </button>
              <button className={styles.cancelBtn} onClick={onClose}>Avbryt</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? '…' : 'Spara'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function LogModal({ exercise, current, onSave, onClose }) {
  const [kg,     setKg]     = useState(current?.kg?.toString() ?? '')
  const [lbs,    setLbs]    = useState(current?.kg ? toLbs(current.kg).toString() : '')
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
    const repsVal = parseInt(reps)
    if (isNaN(kgVal) || isNaN(repsVal)) return
    setSaving(true)
    await onSave(exercise.id, kgVal, repsVal)
    setSaving(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>{exercise.name}</div>
        <div className={styles.modalFields}>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>Vikt (kg)</span>
            <input className={styles.modalInput} type="number" step="0.5" value={kg} onChange={e => handleKgChange(e.target.value)} autoFocus />
          </label>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>Vikt (lbs)</span>
            <input className={styles.modalInput} type="number" step="1" value={lbs} onChange={e => handleLbsChange(e.target.value)} />
          </label>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>Reps</span>
            <input className={styles.modalInput} type="number" step="1" value={reps} onChange={e => setReps(e.target.value)} />
          </label>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Avbryt</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '…' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddSessionModal({ userId, sortOrder, onSave, onClose }) {
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
        <div className={styles.modalTitle}>Nytt träningspass</div>
        <div className={styles.modalFields}>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>Passnamn</span>
            <input
              className={styles.modalInput}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="t.ex. Push, Ben, Helkropp…"
              autoFocus
            />
          </label>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>Dag</span>
            <select className={styles.modalInput} value={day} onChange={e => setDay(Number(e.target.value))}>
              {DAY_FULL.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Avbryt</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? '…' : 'Lägg till'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditSessionModal({ session, onSave, onDelete, onClose }) {
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
        <div className={styles.modalTitle}>Redigera pass</div>

        {confirming ? (
          <>
            <p className={styles.confirmText}>
              Ta bort <strong>{session.name}</strong> och alla dess övningar? Detta går inte att ångra.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>Avbryt</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Ja, ta bort'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalFields}>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>Passnamn</span>
                <input className={styles.modalInput} type="text" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </label>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>Dag</span>
                <select className={styles.modalInput} value={day} onChange={e => setDay(Number(e.target.value))}>
                  {DAY_FULL.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.deleteSessionBtn} onClick={() => setConfirming(true)}>
                Ta bort pass
              </button>
              <button className={styles.cancelBtn} onClick={onClose}>Avbryt</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? '…' : 'Spara'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EditProgramModal({ program, onRename, onDelete, onClose }) {
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
        <div className={styles.modalTitle}>Redigera program</div>
        {confirming ? (
          <>
            <p className={styles.confirmText}>
              Ta bort <strong>{program.name}</strong> och alla dess träningspass? Detta går inte att ångra.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirming(false)}>Avbryt</button>
              <button className={styles.deleteConfirmBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Ja, ta bort'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalFields}>
              <label className={styles.modalField}>
                <span className={styles.modalLabel}>Namn</span>
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
              <button className={styles.deleteSessionBtn} onClick={() => setConfirming(true)}>Ta bort</button>
              <button className={styles.cancelBtn} onClick={onClose}>Avbryt</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? '…' : 'Spara'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CreateProgramModal({ onSave, onClose }) {
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
        <div className={styles.modalTitle}>Nytt träningsprogram</div>
        <div className={styles.modalFields}>
          <label className={styles.modalField}>
            <span className={styles.modalLabel}>Namn</span>
            <input
              className={styles.modalInput}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="t.ex. Bulking, Deload, Sommar…"
              autoFocus
            />
          </label>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Avbryt</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? '…' : 'Skapa'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Traning() {
  const { sessions, programs, activeProgramId, createProgram, switchProgram, renameProgram, deleteProgram, load: loadProfile } = useProfile()
  const [activeTab,      setActiveTab]      = useState(null)
  const [exercises,      setExercises]      = useState({})
  const [logs,           setLogs]           = useState({})
  const [logging,        setLogging]        = useState(null)
  const [naming,         setNaming]         = useState(null)
  const [adding,         setAdding]         = useState(false)
  const [newName,        setNewName]        = useState('')
  const [userId,         setUserId]         = useState(null)
  const [addingSession,   setAddingSession]   = useState(false)
  const [editingSession,  setEditingSession]  = useState(false)
  const [creatingProgram, setCreatingProgram] = useState(false)
  const [editingProgram,  setEditingProgram]  = useState(false)

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

    const [{ data: exData }, { data: logData }] = await Promise.all([
      supabase.from('exercises').select('*').eq('user_id', user.id).order('sort_order'),
      supabase.from('exercise_log').select('exercise_id, weight_kg, reps, logged_at').eq('user_id', user.id).order('logged_at', { ascending: false }),
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
        if (!latest[row.exercise_id]) latest[row.exercise_id] = { kg: row.weight_kg, reps: row.reps }
      }
      setLogs(latest)
    }
  }

  async function handleLogSave(exerciseId, kg, reps) {
    await supabase.from('exercise_log').insert({ user_id: userId, exercise_id: exerciseId, weight_kg: kg, reps })
    setLogs(prev => ({ ...prev, [exerciseId]: { kg, reps } }))
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

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const sortOrder = (exercises[activeTab] ?? []).length
    const { data, error } = await supabase.from('exercises')
      .insert({ user_id: userId, session_id: activeTab, name: trimmed, sort_order: sortOrder, tab: 'custom' })
      .select().single()
    if (error) { console.error('handleAdd error:', error); return }
    if (data) setExercises(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] ?? []), data] }))
    setNewName('')
    setAdding(false)
  }

  async function handleCreateProgram(name) {
    await createProgram(name)
    setCreatingProgram(false)
    setActiveTab(null)
  }

  async function handleAddSession(sessionData) {
    const { data } = await supabase.from('training_sessions').insert({ ...sessionData, program_id: activeProgramId }).select().single()
    if (data) {
      await loadProfile()
      setActiveTab(data.id)
    }
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

  const currentSession   = sessions.find(s => s.id === activeTab)
  const currentExercises = exercises[activeTab] ?? []

  return (
    <section id="traning">
      <SectionHeader number="04" title="Träningspass" />

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
                  <button className={styles.editProgramBtn} onClick={() => setEditingProgram(true)} title="Redigera program">✎</button>
                )}
              </span>
            ))}
            <button className={styles.addProgramBtn} onClick={() => setCreatingProgram(true)}>
              + Nytt program
            </button>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className={styles.topRow}>
          <div className={styles.tabs}>
            {sessions.map(s => (
              <button
                key={s.id}
                className={`${styles.tab} ${activeTab === s.id ? styles.active : ''}`}
                onClick={() => { setActiveTab(s.id); setAdding(false) }}
              >
                {DAY_ABBREV[s.day_of_week - 1]} — {s.name}
              </button>
            ))}
          </div>
          <div className={styles.topActions}>
            <button className={styles.addSessionBtn} onClick={() => setAddingSession(true)}>
              + Lägg till pass
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal key={activeTab}>
        <div className={styles.dayBadgeRow}>
          <div className={styles.dayBadge}>
            <div className={styles.dot} />
            <span className={styles.dayLabel}>
              {currentSession ? DAY_FULL[currentSession.day_of_week - 1] : ''}
            </span>
          </div>
          {currentSession && (
            <button className={styles.editSessionIconBtn} onClick={() => setEditingSession(true)} title="Redigera pass">
              ✎
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Övning</th>
                <th className={styles.numCol}>kg</th>
                <th className={styles.numCol}>lbs</th>
                <th className={styles.numCol}>Reps</th>
              </tr>
            </thead>
            <tbody>
              {currentExercises.map(ex => {
                const log = logs[ex.id]
                return (
                  <tr key={ex.id}>
                    <td>
                      <button className={styles.exNameBtn} onClick={() => setNaming(ex)}>
                        {ex.name}
                      </button>
                    </td>
                    <td className={`${styles.numCell} ${styles.clickableCell}`} onClick={() => setLogging(ex)}>
                      {log?.kg ?? '–'}
                    </td>
                    <td className={`${styles.numCell} ${styles.clickableCell}`} onClick={() => setLogging(ex)}>
                      {log?.kg != null ? toLbs(log.kg) : '–'}
                    </td>
                    <td className={`${styles.numCell} ${styles.clickableCell} ${styles.repsCell}`} onClick={() => setLogging(ex)}>
                      {log?.reps ?? '–'}
                    </td>
                  </tr>
                )
              })}

              {adding && (
                <tr>
                  <td colSpan={4}>
                    <div className={styles.addRow}>
                      <input
                        className={styles.inlineInput}
                        placeholder="Övningsnamn…"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                        autoFocus
                      />
                      <button className={styles.addConfirmBtn} onClick={handleAdd}>Lägg till</button>
                      <button className={styles.cancelSmallBtn} onClick={() => { setAdding(false); setNewName('') }}>✕</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!adding && (
          <button className={styles.addBtn} onClick={() => setAdding(true)}>+ Lägg till övning</button>
        )}
      </Reveal>

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

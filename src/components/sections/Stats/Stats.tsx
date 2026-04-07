import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { supabase } from '../../../supabase'
import Skeleton from '../../Skeleton/Skeleton'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Stats.module.scss'

interface WorkoutSetDetail {
  set_number: number
  reps: number | null
  kg: number | null
}

interface WorkoutExerciseDetail {
  id: number
  name: string
  sets: WorkoutSetDetail[]
}

interface CompletedWorkout {
  id: string
  completed_at: string
  started_at: string | null
  session_id: number | null
  session_name: string | null
  set_count: number
  total_kg: number
  exercises: WorkoutExerciseDetail[]
}

interface ChartPoint {
  date: string
  maxKg: number
}

interface ExerciseProgression {
  name: string
  data: ChartPoint[]
}

type ProgressionMap = Record<number, ExerciseProgression>

interface RawWorkout {
  id: string
  completed_at: string | null
  started_at: string | null
  session_id: number | null
}

interface RawSet {
  id: string
  workout_id: string
  exercise_id: number
  kg: number | null
  reps: number | null
  set_number: number
}

interface RawSession {
  id: number
  name: string
}

interface RawExercise {
  id: number
  name: string
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDisplayTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(
  startIso: string | null,
  endIso: string | null,
  t: (k: string) => string,
): string {
  if (!startIso || !endIso) return '–'
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (!isFinite(start) || !isFinite(end) || end <= start) return '–'
  const totalMin = Math.round((end - start) / 60000)
  if (totalMin < 60) return `${totalMin} ${t('min')}`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h} ${t('h')}` : `${h} ${t('h')} ${m} ${t('min')}`
}

function formatTotalKg(kg: number): string {
  return `${Math.round(kg).toLocaleString('sv-SE')} kg`
}

export default function Stats(): React.JSX.Element {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isActive = pathname === '/stats'
  const [loading, setLoading] = useState(true)
  const [workouts, setWorkouts] = useState<CompletedWorkout[]>([])
  const [progressionMap, setProgressionMap] = useState<ProgressionMap>({})
  const [selectedExId, setSelectedExId] = useState<number | null>(null)
  const [openWorkout, setOpenWorkout] = useState<CompletedWorkout | null>(null)

  useEffect(() => {
    if (!openWorkout) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpenWorkout(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openWorkout])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Simple queries without joins — avoids FK issues
      const [workoutsRes, setsRes, sessionsRes, exercisesRes] = await Promise.all([
        supabase
          .from('workouts')
          .select('id, completed_at, started_at, session_id')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false }),

        supabase
          .from('workout_sets')
          .select('id, workout_id, exercise_id, kg, reps, set_number')
          .limit(5000),

        supabase
          .from('training_sessions')
          .select('id, name')
          .eq('user_id', user.id),

        supabase
          .from('exercises')
          .select('id, name')
          .eq('user_id', user.id),
      ])

      if (cancelled) return

      const rawWorkouts = (workoutsRes.data ?? []) as RawWorkout[]
      const rawSets = (setsRes.data ?? []) as RawSet[]
      const sessions = (sessionsRes.data ?? []) as RawSession[]
      const exercises = (exercisesRes.data ?? []) as RawExercise[]

      // Build lookup maps
      const sessionMap = new Map(sessions.map(s => [s.id, s.name]))
      const exerciseMap = new Map(exercises.map(e => [e.id, e.name]))
      const workoutIds = new Set(rawWorkouts.map(w => w.id))

      // Filter sets to only those belonging to user's completed workouts
      const userSets = rawSets.filter(s => workoutIds.has(s.workout_id))

      // Group sets per workout → per exercise (preserve first-occurrence order)
      interface WorkoutAgg {
        setCount: number
        totalKg: number
        exerciseOrder: number[]
        exerciseSets: Map<number, WorkoutSetDetail[]>
      }
      const workoutAggMap = new Map<string, WorkoutAgg>()
      for (const s of userSets) {
        let agg = workoutAggMap.get(s.workout_id)
        if (!agg) {
          agg = { setCount: 0, totalKg: 0, exerciseOrder: [], exerciseSets: new Map() }
          workoutAggMap.set(s.workout_id, agg)
        }
        agg.setCount += 1
        if (s.kg != null && s.reps != null) {
          agg.totalKg += s.kg * s.reps
        }
        let exSets = agg.exerciseSets.get(s.exercise_id)
        if (!exSets) {
          exSets = []
          agg.exerciseSets.set(s.exercise_id, exSets)
          agg.exerciseOrder.push(s.exercise_id)
        }
        exSets.push({ set_number: s.set_number, reps: s.reps, kg: s.kg })
      }

      // Sort sets within each exercise by set_number
      for (const agg of workoutAggMap.values()) {
        for (const sets of agg.exerciseSets.values()) {
          sets.sort((a, b) => a.set_number - b.set_number)
        }
      }

      // Process workouts
      const processed: CompletedWorkout[] = rawWorkouts
        .filter(w => w.completed_at)
        .map(w => {
          const agg = workoutAggMap.get(w.id)
          const exercises: WorkoutExerciseDetail[] = agg
            ? agg.exerciseOrder.map(exId => ({
                id: exId,
                name: exerciseMap.get(exId) ?? `Exercise ${exId}`,
                sets: agg.exerciseSets.get(exId) ?? [],
              }))
            : []
          return {
            id: w.id,
            completed_at: w.completed_at!,
            started_at: w.started_at,
            session_id: w.session_id,
            session_name: w.session_id != null ? (sessionMap.get(w.session_id) ?? null) : null,
            set_count: agg?.setCount ?? 0,
            total_kg: agg?.totalKg ?? 0,
            exercises,
          }
        })

      // Build workout date lookup for progression
      const workoutDateMap = new Map(rawWorkouts.map(w => [w.id, w.completed_at!]))

      // Process sets → progression map
      const map: ProgressionMap = {}

      for (const s of userSets) {
        const completedAt = workoutDateMap.get(s.workout_id)
        if (!completedAt || s.kg == null) continue
        const exId = s.exercise_id
        const date = formatDate(completedAt)
        const name = exerciseMap.get(exId) ?? `Exercise ${exId}`

        if (!map[exId]) map[exId] = { name, data: [] }

        const existing = map[exId].data.find(d => d.date === date)
        if (existing) {
          if (s.kg > existing.maxKg) existing.maxKg = s.kg
        } else {
          map[exId].data.push({ date, maxKg: s.kg })
        }
      }

      // Auto-select exercise with most data points
      let bestId: number | null = null
      let bestCount = 0
      for (const [idStr, ex] of Object.entries(map)) {
        if (ex.data.length > bestCount) {
          bestCount = ex.data.length
          bestId = Number(idStr)
        }
      }

      setWorkouts(processed)
      setProgressionMap(map)
      setSelectedExId(bestId)
      setLoading(false)
    }

    setLoading(true)
    load()
    return () => { cancelled = true }
  }, [isActive])

  // ── Summary card values ────────────────────────────────────
  const totalWorkouts = workouts.length
  const totalSets = workouts.reduce((sum, w) => sum + w.set_count, 0)

  const sessionCounts: Record<string, number> = {}
  for (const w of workouts) {
    const key = w.session_name ?? t('Unknown')
    sessionCounts[key] = (sessionCounts[key] ?? 0) + 1
  }
  const mostTrained = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '–'

  const oldestWorkout = workouts.length > 0 ? workouts[workouts.length - 1].completed_at : null
  const trainingSince = oldestWorkout ? formatDisplayDate(oldestWorkout) : '–'

  // ── Monthly workout data (bar chart) ─────────────────────
  const monthlyData: { month: string; count: number }[] = (() => {
    const map = new Map<string, number>()
    for (const w of workouts) {
      const key = w.completed_at.slice(0, 7) // "YYYY-MM"
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }))
  })()

  // ── Chart data ─────────────────────────────────────────────
  const chartData = selectedExId != null ? (progressionMap[selectedExId]?.data ?? []) : []
  const exerciseList = Object.entries(progressionMap).sort((a, b) => b[1].data.length - a[1].data.length)

  const isEmpty = !loading && workouts.length === 0

  // ── Skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <section className={styles.container}>
        <SectionHeader number="08" title={t('Stats')} />
        <div className={styles.summaryGrid}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={styles.summaryCard}>
              <Skeleton height={11} width="60%" style={{ marginBottom: 12 }} />
              <Skeleton height={32} width="80%" />
            </div>
          ))}
        </div>

        <div className={styles.sectionHeader}>
          <Skeleton height={14} width={140} />
        </div>
        {[0, 1, 2].map(i => (
          <div key={i} className={styles.workoutCard}>
            <Skeleton height={14} width="40%" style={{ marginBottom: 8 }} />
            <Skeleton height={11} width="60%" />
          </div>
        ))}

        <div className={styles.sectionHeader} style={{ marginTop: 32 }}>
          <Skeleton height={14} width={160} />
        </div>
        <Skeleton height={220} borderRadius={14} />
      </section>
    )
  }

  // ── Empty state ───────────────────────────────────────────
  if (isEmpty) {
    return (
      <section className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏋️</div>
        <p className={styles.emptyTitle}>{t('No workouts yet')}</p>
        <p className={styles.emptyText}>{t('Complete your first workout to see stats here')}</p>
      </section>
    )
  }

  return (
    <section className={styles.container}>
      <SectionHeader number="08" title={t('Stats')} />
      {/* ── Section 1: Summary cards ── */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t('Total workouts')}</div>
          <div className={styles.summaryValue}>{totalWorkouts}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t('Total sets')}</div>
          <div className={styles.summaryValue}>{totalSets}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t('Most trained')}</div>
          <div className={styles.summaryValue} title={mostTrained}>{mostTrained}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>{t('Training since')}</div>
          <div className={styles.summaryValue}>{trainingSince}</div>
        </div>
      </div>

      {/* ── Section 2: Workouts per month (bar chart) ── */}
      {monthlyData.length > 0 && (
        <>
          <div className={styles.sectionHeader}>{t('Workouts per month')}</div>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ff5c35" />
                    <stop offset="100%" stopColor="#e8197d" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => {
                    const [, m] = v.split('-')
                    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                    return names[parseInt(m, 10) - 1] ?? v
                  }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontFamily: 'DM Sans',
                    fontSize: 13,
                    color: 'var(--text)',
                  }}
                  formatter={(value) => [`${value}`, t('Workouts')]}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── Section 3: Strength progress ── */}
      {exerciseList.length > 0 && (
        <>
          <div className={styles.sectionHeader} style={{ marginTop: 32 }}>{t('Strength Progress')}</div>

          {/* Exercise picker */}
          <div className={styles.exercisePicker}>
            {exerciseList.map(([idStr, ex]) => {
              const id = Number(idStr)
              return (
                <button
                  key={id}
                  className={`${styles.exerciseChip} ${selectedExId === id ? styles.exerciseChipActive : ''}`}
                  onClick={() => setSelectedExId(id)}
                >
                  {ex.name}
                </button>
              )
            })}
          </div>

          {/* Line chart */}
          {chartData.length > 0 && (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="statsGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#ff5c35" />
                      <stop offset="55%"  stopColor="#e8197d" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v}kg`}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontFamily: 'DM Sans',
                      fontSize: 13,
                      color: 'var(--text)',
                    }}
                    formatter={(value) => [`${value} kg`, t('Max weight')]}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxKg"
                    stroke="url(#statsGradient)"
                    strokeWidth={2.5}
                    dot={{ fill: '#ff5c35', r: 3, strokeWidth: 0 }}
                    activeDot={{ fill: '#e8197d', r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── Section 4: Workout history ── */}
      <div className={styles.sectionHeader} style={{ marginTop: 32 }}>{t('Workout History')}</div>
      <div className={styles.workoutList}>
        {workouts.map(w => (
          <button
            key={w.id}
            type="button"
            className={styles.workoutCard}
            onClick={() => setOpenWorkout(w)}
          >
            <div className={styles.workoutCardLeft}>
              <div className={styles.workoutDate}>{formatDisplayDate(w.completed_at)}</div>
              <div className={styles.workoutSession}>{w.session_name ?? '–'}</div>
            </div>
            <div className={styles.workoutSets}>{w.set_count} sets</div>
            <div className={styles.workoutCardChevron}>›</div>
          </button>
        ))}
      </div>

      {openWorkout && (
        <div
          className={styles.overlay}
          onClick={() => setOpenWorkout(null)}
          role="presentation"
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setOpenWorkout(null)}
              aria-label={t('Close')}
            >
              ✕
            </button>
            <div className={styles.modalTitle}>
              {openWorkout.session_name ?? '–'}
            </div>
            <div className={styles.modalSubtitle}>
              {formatDisplayDate(openWorkout.completed_at)} · {formatDisplayTime(openWorkout.completed_at)}
            </div>

            <div className={styles.modalDivider} />

            <div className={styles.modalStatsRow}>
              <div className={styles.modalStat}>
                <div className={styles.modalStatLabel}>{t('Duration')}</div>
                <div className={styles.modalStatValue}>
                  ⏱ {formatDuration(openWorkout.started_at, openWorkout.completed_at, t)}
                </div>
              </div>
              <div className={styles.modalStat}>
                <div className={styles.modalStatLabel}>{t('Total')}</div>
                <div className={styles.modalStatValue}>
                  ⚖ {formatTotalKg(openWorkout.total_kg)}
                </div>
              </div>
            </div>

            <div className={styles.modalDivider} />

            <div className={styles.modalExerciseList}>
              {openWorkout.exercises.length === 0 && (
                <div className={styles.modalEmpty}>{t('No sets recorded')}</div>
              )}
              {openWorkout.exercises.map(ex => (
                <div key={ex.id} className={styles.modalExerciseGroup}>
                  <div className={styles.modalExerciseName}>{ex.name}</div>
                  {ex.sets.map((s, i) => (
                    <div key={i} className={styles.modalSetRow}>
                      <span className={styles.modalSetLabel}>
                        {t('Set')} {s.set_number}
                      </span>
                      <span className={styles.modalSetValue}>
                        {s.reps ?? '–'} {t('reps')} × {s.kg ?? '–'} kg
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

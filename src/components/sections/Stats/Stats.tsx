import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useSubscription } from '../../../context/SubscriptionContext'
import { X } from 'lucide-react'
import ClockIcon from '../../icons/Normal/ClockIcon'
import WeightIcon from '../../icons/Normal/WeightIcon'
import { useWeightUnit, formatWeight } from '../../../hooks/useWeightUnit'
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    Pie,
    PieChart,
    ResponsiveContainer,
    Sector,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { supabase } from '../../../supabase'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Skeleton from '../../Skeleton/Skeleton'
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
    is_deload: boolean
    set_count: number
    total_kg: number
    exercises: WorkoutExerciseDetail[]
    pr_count: number
    pr_exercise_ids: number[]
}

interface FavoriteExercise {
    name: string
    count: number
}

interface RawWorkout {
    id: string
    completed_at: string | null
    started_at: string | null
    session_id: number | null
    session_name: string | null
    is_deload: boolean | null
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

const KG_TO_LBS = 2.20462
const toLbs = (kg: number): number => +(kg * KG_TO_LBS).toFixed(1)

function formatTotalKg(kg: number): string {
    return `${Math.round(kg).toLocaleString('sv-SE')} kg`
}

function formatTotalKgLbs(kg: number): string {
    const kgStr = Math.round(kg).toLocaleString('sv-SE')
    const lbsStr = Math.round(kg * KG_TO_LBS).toLocaleString('sv-SE')
    return `${kgStr} kg / ${lbsStr} lbs`
}

export default function Stats(): React.JSX.Element {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const isActive = pathname === '/stats'
    const { canUse } = useSubscription()
    interface PersonalRecord { name: string; kg: number; lbs: number }
    const [weightUnit] = useWeightUnit()
    const [loading, setLoading] = useState(true)
    const [workouts, setWorkouts] = useState<CompletedWorkout[]>([])
    const [openWorkout, setOpenWorkout] = useState<CompletedWorkout | null>(null)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [closingModal, setClosingModal] = useState(false)
    const [favoriteExercise, setFavoriteExercise] = useState<FavoriteExercise | null>(null)
    const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])
    const [prWorkoutMap, setPrWorkoutMap] = useState<Record<string, string>>({})
    const [exerciseProgressData, setExerciseProgressData] = useState<Record<string, { date: string; kg: number }[]>>({})
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
    const [heatmapOffset, setHeatmapOffset] = useState(0) // 0 = current month, -1 = last month, etc.
    const [activeTab, setActiveTab] = useState<'history' | 'strength' | 'volume'>('history')
    const [showAllWorkouts, setShowAllWorkouts] = useState(false)
    const [showAllPRs, setShowAllPRs] = useState(false)

    useEffect(() => {
        if (openWorkout) document.body.classList.add('modal-open')
        else document.body.classList.remove('modal-open')
        return () => document.body.classList.remove('modal-open')
    }, [openWorkout])

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
            const statsUnlimited = canUse('statsUnlimited')
            const statsExtended = canUse('statsExtended')
            const statsCutoff = statsUnlimited
                ? null
                : statsExtended
                    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
                    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

            const workoutsQuery = supabase
                    .from('workouts')
                    .select('id, completed_at, started_at, session_id, session_name, is_deload')
                    .eq('user_id', user.id)
                    .not('completed_at', 'is', null)
                    .order('completed_at', { ascending: false })
            if (statsCutoff) workoutsQuery.gte('completed_at', statsCutoff)

            const [workoutsRes, setsRes, sessionsRes, exercisesRes] = await Promise.all([
                workoutsQuery,

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

            // PR detection — iterate workouts chronologically (oldest → newest),
            // track running max kg per exercise, flag workouts that beat the record.
            const prCountByWorkout = new Map<string, number>()
            const prExerciseIdsByWorkout = new Map<string, number[]>()
            const runningMaxKg = new Map<number, number>()
            const maxKgWorkoutId = new Map<number, string>() // exercise_id → workout_id that holds current max
            const chronoWorkouts = rawWorkouts
                .filter(w => w.completed_at)
                .slice()
                .sort((a, b) => a.completed_at!.localeCompare(b.completed_at!))

            for (const w of chronoWorkouts) {
                const agg = workoutAggMap.get(w.id)
                if (!agg) continue
                // Deload workouts are excluded from PR tracking entirely
                if (w.is_deload) continue
                // Per workout: compute best kg per exercise first, then compare
                const workoutBestKg = new Map<number, number>()
                for (const [exId, sets] of agg.exerciseSets) {
                    let best = -Infinity
                    for (const s of sets) {
                        if (s.kg != null && s.kg > best) best = s.kg
                    }
                    if (best > -Infinity) workoutBestKg.set(exId, best)
                }
                let count = 0
                const ids: number[] = []
                for (const [exId, best] of workoutBestKg) {
                    const prev = runningMaxKg.get(exId)
                    if (prev === undefined || best > prev) {
                        if (prev !== undefined) {
                            count += 1
                            ids.push(exId)
                        }
                        runningMaxKg.set(exId, best)
                        maxKgWorkoutId.set(exId, w.id)
                    }
                }
                if (count > 0) {
                    prCountByWorkout.set(w.id, count)
                    prExerciseIdsByWorkout.set(w.id, ids)
                }
            }

            // Process workouts (descending order, preserving rawWorkouts order)
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
                        session_name: w.session_name ?? (w.session_id != null ? (sessionMap.get(w.session_id) ?? null) : null),
                        is_deload: w.is_deload ?? false,
                        set_count: agg?.setCount ?? 0,
                        total_kg: agg?.totalKg ?? 0,
                        exercises,
                        pr_count: prCountByWorkout.get(w.id) ?? 0,
                        pr_exercise_ids: prExerciseIdsByWorkout.get(w.id) ?? [],
                    }
                })

            // Favorite exercise this month
            const workoutDateMap = new Map(rawWorkouts.map(w => [w.id, w.completed_at]))
            const now = new Date()
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const favCounts = new Map<number, number>()
            for (const s of userSets) {
                const completedAt = workoutDateMap.get(s.workout_id)
                if (!completedAt) continue
                if (completedAt.slice(0, 7) === monthKey) {
                    favCounts.set(s.exercise_id, (favCounts.get(s.exercise_id) ?? 0) + 1)
                }
            }
            let favExId: number | null = null
            let favBest = 0
            for (const [exId, count] of favCounts) {
                if (count > favBest) {
                    favBest = count
                    favExId = exId
                }
            }
            const favorite: FavoriteExercise | null = favExId != null
                ? { name: exerciseMap.get(favExId) ?? `Exercise ${favExId}`, count: favBest }
                : null

            // Build personal records from runningMaxKg
            const prs: PersonalRecord[] = Array.from(runningMaxKg.entries())
                .map(([exId, kg]) => ({ name: exerciseMap.get(exId) ?? `Exercise ${exId}`, kg, lbs: toLbs(kg) }))
                .sort((a, b) => b.kg - a.kg)
                .slice(0, 10)

            // Map exercise name → workout id that holds the current max
            const prWkMap: Record<string, string> = {}
            for (const [exId, wkId] of maxKgWorkoutId) {
                const name = exerciseMap.get(exId) ?? `Exercise ${exId}`
                prWkMap[name] = wkId
            }

            // Build exercise progress data (max kg per exercise per date, deduplicated)
            const progressRaw: Record<string, Map<string, number>> = {}
            for (const w of chronoWorkouts) {
                const agg = workoutAggMap.get(w.id)
                if (!agg || !w.completed_at) continue
                const dateStr = w.completed_at.slice(0, 10)
                for (const [exId, sets] of agg.exerciseSets) {
                    let best = -Infinity
                    for (const s of sets) {
                        if (s.kg != null && s.kg > best) best = s.kg
                    }
                    if (best > -Infinity) {
                        const name = exerciseMap.get(exId) ?? `Exercise ${exId}`
                        if (!progressRaw[name]) progressRaw[name] = new Map()
                        const prev = progressRaw[name].get(dateStr)
                        if (prev === undefined || best > prev) {
                            progressRaw[name].set(dateStr, best)
                        }
                    }
                }
            }
            const progressMap: Record<string, { date: string; kg: number }[]> = {}
            for (const [name, dateMap] of Object.entries(progressRaw)) {
                progressMap[name] = Array.from(dateMap.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([date, kg]) => ({ date, kg }))
            }

            setWorkouts(processed)
            setFavoriteExercise(favorite)
            setPersonalRecords(prs)
            setPrWorkoutMap(prWkMap)
            setExerciseProgressData(progressMap)
            setLoading(false)
        }

        setLoading(true)
        load()
        return () => { cancelled = true }
    }, [isActive])

    // ── Summary card values ────────────────────────────────────
    const totalWorkouts = workouts.length
    const totalSets = workouts.reduce((sum, w) => sum + w.set_count, 0)
    const totalVolume = workouts.reduce((sum, w) => sum + w.total_kg, 0)

    const sessionCounts: Record<string, number> = {}
    for (const w of workouts) {
        const key = w.session_name ?? t('Unknown')
        sessionCounts[key] = (sessionCounts[key] ?? 0) + 1
    }
    const mostTrained = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '–'

    const oldestWorkout = workouts.length > 0 ? workouts[workouts.length - 1].completed_at : null
    const trainingSince = oldestWorkout ? formatDisplayDate(oldestWorkout) : '–'

    // Streak: consecutive weeks with at least 1 workout
    const weekStreak = (() => {
        if (workouts.length === 0) return 0
        const getWeekKey = (iso: string) => {
            const d = new Date(iso)
            const jan1 = new Date(d.getFullYear(), 0, 1)
            const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
            return `${d.getFullYear()}-W${week}`
        }
        const weeks = new Set(workouts.map(w => getWeekKey(w.completed_at)))
        const now = new Date()
        let streak = 0
        for (let i = 0; i < 52; i++) {
            const d = new Date(now.getTime() - i * 7 * 86400000)
            const jan1 = new Date(d.getFullYear(), 0, 1)
            const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
            const key = `${d.getFullYear()}-W${week}`
            if (weeks.has(key)) streak++
            else break
        }
        return streak
    })()

    // ── Best streak (all-time) ───────────────────────────────────
    const bestStreak = (() => {
        if (workouts.length === 0) return 0
        const getWeekKey = (iso: string) => {
            const d = new Date(iso)
            const jan1 = new Date(d.getFullYear(), 0, 1)
            const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
            return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
        }
        const weekKeys = [...new Set(workouts.map(w => getWeekKey(w.completed_at)))].sort()
        let best = 1
        let current = 1
        for (let i = 1; i < weekKeys.length; i++) {
            // Check if consecutive week
            const prev = weekKeys[i - 1]
            const curr = weekKeys[i]
            const [py, pw] = prev.split('-W').map(Number)
            const [cy, cw] = curr.split('-W').map(Number)
            const isConsecutive = (cy === py && cw === pw + 1) || (cy === py + 1 && pw >= 52 && cw === 1)
            if (isConsecutive) {
                current++
                if (current > best) best = current
            } else {
                current = 1
            }
        }
        return best
    })()

    // ── This week vs Last week ───────────────────────────────────
    const weekComparison = (() => {
        const now = new Date()
        const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1 // Mon=0
        const thisWeekStart = new Date(now)
        thisWeekStart.setDate(now.getDate() - dayOfWeek)
        thisWeekStart.setHours(0, 0, 0, 0)
        const lastWeekStart = new Date(thisWeekStart)
        lastWeekStart.setDate(thisWeekStart.getDate() - 7)

        let thisWeekWorkouts = 0, lastWeekWorkouts = 0
        let thisWeekVolume = 0, lastWeekVolume = 0
        for (const w of workouts) {
            const d = new Date(w.completed_at)
            if (d >= thisWeekStart) {
                thisWeekWorkouts++
                thisWeekVolume += w.total_kg
            } else if (d >= lastWeekStart && d < thisWeekStart) {
                lastWeekWorkouts++
                lastWeekVolume += w.total_kg
            }
        }
        return { thisWeekWorkouts, lastWeekWorkouts, thisWeekVolume, lastWeekVolume }
    })()

    // ── Session distribution (pie chart data) ────────────────────
    const sessionDistData = Object.entries(sessionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))

    const PIE_COLORS = ['#ff5c35', '#e8197d', '#7c3aed', '#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#6366f1']

    // ── Training heatmap (monthly calendar) ─────────────────────
    const heatmapMonth = (() => {
        const now = new Date()
        const targetDate = new Date(now.getFullYear(), now.getMonth() + heatmapOffset, 1)
        const year = targetDate.getFullYear()
        const month = targetDate.getMonth()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        // 0=Sun,1=Mon... convert to Mon=0
        const firstDayRaw = new Date(year, month, 1).getDay()
        const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1

        const volumeByDay = new Map<string, number>()
        for (const w of workouts) {
            const d = w.completed_at.slice(0, 10)
            volumeByDay.set(d, (volumeByDay.get(d) ?? 0) + w.total_kg)
        }

        const monthName = targetDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

        // Build weeks (rows), each has 7 slots (Mon-Sun)
        const weeks: ({ day: number; date: string; volume: number } | null)[][] = []
        let week: ({ day: number; date: string; volume: number } | null)[] = []
        // Pad start
        for (let i = 0; i < firstDay; i++) week.push(null)
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d)
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const isFuture = dateObj > today
            week.push({ day: d, date: key, volume: isFuture ? -1 : (volumeByDay.get(key) ?? 0) })
            if (week.length === 7) {
                weeks.push(week)
                week = []
            }
        }
        // Pad end
        if (week.length > 0) {
            while (week.length < 7) week.push(null)
            weeks.push(week)
        }
        return { weeks, monthName }
    })()

    // ── Exercise progress: top 5 exercises by data points ────────
    const topExercises = Object.entries(exerciseProgressData)
        .filter(([, pts]) => pts.length >= 2)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5)
        .map(([name]) => name)

    const activeExercise = selectedExercise ?? topExercises[0] ?? null

    // ── Weekly volume data (line chart) ────────────────────────
    const weeklyVolumeData: { week: string; volume: number }[] = (() => {
        const map = new Map<string, number>()
        for (const w of workouts) {
            const d = new Date(w.completed_at)
            const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000)
            const weekNum = Math.ceil((dayOfYear + new Date(d.getFullYear(), 0, 1).getDay() + 1) / 7)
            const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
            map.set(key, (map.get(key) ?? 0) + w.total_kg)
        }
        return Array.from(map.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([week, volume]) => ({ week: `V${week.split('-W')[1]}`, volume: Math.round(volume) }))
    })()

    // ── Monthly workout data (bar chart) ─────────────────────
    const monthlyData: { month: string; count: number }[] = (() => {
        const now = new Date()
        const map = new Map<string, number>()
        for (const w of workouts) {
            const key = w.completed_at.slice(0, 7)
            map.set(key, (map.get(key) ?? 0) + 1)
        }
        const result: { month: string; count: number }[] = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            result.push({ month: key, count: map.get(key) ?? 0 })
        }
        return result
    })()

    const isEmpty = !loading && workouts.length === 0

    // ── Skeleton ──────────────────────────────────────────────
    if (loading) {
        return (
            <section className={styles.container}>
                <SectionHeader number="08" title={t('Stats')} />
                <div className={styles.summaryPanel}>
                    <div className={styles.heroRow}>
                        {[0, 1, 2].map(i => (
                            <div key={i} className={styles.heroStat}>
                                <Skeleton height={32} width="60%" style={{ margin: '0 auto 8px' }} />
                                <Skeleton height={10} width="40%" style={{ margin: '0 auto' }} />
                            </div>
                        ))}
                    </div>
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

    function closeModal(): void {
        setClosingModal(true)
        setTimeout(() => {
            setOpenWorkout(null)
            setConfirmDelete(false)
            setClosingModal(false)
        }, 220)
    }

    async function handleDeleteWorkout(id: string): Promise<void> {
        setDeletingId(id)
        closeModal()
        await new Promise(r => setTimeout(r, 480))
        await supabase.from('workout_sets').delete().eq('workout_id', id)
        await supabase.from('workouts').delete().eq('id', id)
        setWorkouts(prev => prev.filter(w => w.id !== id))
        setDeletingId(null)
    }

    return (
        <section className={styles.container}>
            <SectionHeader number="08" title={t('Stats')} />
            {/* ── Section 1: Summary panel ── */}
            <div className={styles.summaryPanel}>
                <div className={styles.heroRow}>
                    <div className={styles.heroStat}>
                        <div className={styles.heroValue}>{totalWorkouts}</div>
                        <div className={styles.heroLabel}>{t('Workouts')}</div>
                    </div>
                    <div className={styles.heroDivider} />
                    <div className={styles.heroStat}>
                        <div className={styles.heroValue}>{totalSets}</div>
                        <div className={styles.heroLabel}>{t('sets')}</div>
                    </div>
                    <div className={styles.heroDivider} />
                    <div className={styles.heroStat}>
                        <div className={styles.heroValueSmall}>{formatWeight(Math.round(totalVolume), weightUnit)}</div>
                        <div className={styles.heroLabel}>{t('Volume')}</div>
                    </div>
                </div>
                <div className={styles.secondaryRow}>
                    <div className={styles.secondaryStat}>
                        <span className={styles.secondaryLabel}>{t('Streak')}</span>
                        <span className={styles.secondaryValue}>{weekStreak > 0 ? t('{{n}} weeks', { n: weekStreak }) : '–'}</span>
                    </div>
                    <div className={styles.secondaryStat}>
                        <span className={styles.secondaryLabel}>{t('Best streak')}</span>
                        <span className={styles.secondaryValue}>{bestStreak > 0 ? t('{{n}} weeks', { n: bestStreak }) : '–'}</span>
                    </div>
                    <div className={styles.secondaryStat}>
                        <span className={styles.secondaryLabel}>{t('Most trained')}</span>
                        <span className={styles.secondaryValue} title={mostTrained}>{mostTrained}</span>
                    </div>
                    <div className={styles.secondaryStat}>
                        <span className={styles.secondaryLabel}>{t('Training since')}</span>
                        <span className={styles.secondaryValue}>{trainingSince}</span>
                    </div>
                    {favoriteExercise && (
                        <div className={styles.secondaryStat}>
                            <span className={styles.secondaryLabel}>{t('Favorite this month')}</span>
                            <span className={styles.secondaryValue} title={favoriteExercise.name}>{favoriteExercise.name}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tab row ── */}
            <div className={styles.statsTabRow}>
                {(['history', 'strength', 'volume'] as const).map(tab => (
                    <button
                        key={tab}
                        type="button"
                        className={`${styles.statsTab} ${activeTab === tab ? styles.statsTabActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'history' ? t('Historik') : tab === 'strength' ? t('Styrka') : t('Volym')}
                    </button>
                ))}
            </div>

            {/* ── History tab ── */}
            {activeTab === 'history' && (
                <>
                    {/* Training Heatmap */}
                    <div className={styles.heatmapHeader}>
                        <button type="button" className={styles.heatmapArrow} onClick={() => setHeatmapOffset(o => o - 1)}>‹</button>
                        <span className={styles.sectionHeader} style={{ margin: 0 }}>{heatmapMonth.monthName}</span>
                        <button type="button" className={styles.heatmapArrow} onClick={() => setHeatmapOffset(o => Math.min(o + 1, 0))} disabled={heatmapOffset >= 0}>›</button>
                    </div>
                    <div className={styles.heatmap}>
                        <div className={styles.heatmapWeekRow}>
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                <span key={i} className={styles.heatmapDayLabel}>{d}</span>
                            ))}
                        </div>
                        {heatmapMonth.weeks.map((week, wi) => (
                            <div key={wi} className={styles.heatmapWeekRow}>
                                {week.map((cell, di) => {
                                    if (!cell) return <div key={di} className={styles.heatmapCellEmpty} />
                                    const hasWorkout = cell.volume > 0
                                    const dayWorkout = hasWorkout
                                        ? workouts.find(w => w.completed_at.slice(0, 10) === cell.date)
                                        : null
                                    return (
                                        <div
                                            key={di}
                                            className={`${styles.heatmapCell} ${dayWorkout ? styles.heatmapCellClickable : ''}`}
                                            data-level={cell.volume < 0 ? 'future' : cell.volume === 0 ? '0' : cell.volume < 5000 ? '1' : cell.volume < 15000 ? '2' : '3'}
                                            title={hasWorkout ? `${cell.date}: ${Math.round(cell.volume).toLocaleString()} kg` : cell.date}
                                            onClick={dayWorkout ? () => setOpenWorkout(dayWorkout) : undefined}
                                        >
                                            <span className={styles.heatmapDayNum}>{cell.day}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>

                    {/* This Week vs Last Week */}
                    <div className={styles.weekComparison}>
                        <div className={styles.comparisonCard}>
                            <div className={styles.comparisonLabel}>{t('This week')}</div>
                            <div className={styles.comparisonValue}>{weekComparison.thisWeekWorkouts} {t('Workouts').toLowerCase()}</div>
                            <div className={styles.comparisonSub}>{formatWeight(Math.round(weekComparison.thisWeekVolume), weightUnit)}</div>
                            {weekComparison.lastWeekWorkouts > 0 && (
                                <div className={`${styles.comparisonArrow} ${weekComparison.thisWeekWorkouts >= weekComparison.lastWeekWorkouts ? styles.comparisonUp : styles.comparisonDown}`}>
                                    {weekComparison.thisWeekWorkouts >= weekComparison.lastWeekWorkouts ? '↑' : '↓'}
                                    {' '}{Math.abs(Math.round(((weekComparison.thisWeekWorkouts - weekComparison.lastWeekWorkouts) / weekComparison.lastWeekWorkouts) * 100))}%
                                </div>
                            )}
                        </div>
                        <div className={styles.comparisonCard}>
                            <div className={styles.comparisonLabel}>{t('Last week')}</div>
                            <div className={styles.comparisonValue}>{weekComparison.lastWeekWorkouts} {t('Workouts').toLowerCase()}</div>
                            <div className={styles.comparisonSub}>{formatWeight(Math.round(weekComparison.lastWeekVolume), weightUnit)}</div>
                        </div>
                    </div>

                    {/* Workout History */}
                    <div className={styles.sectionHeader}>{t('Workout History')}</div>
                    <div className={styles.workoutList}>
                        {(showAllWorkouts ? workouts : workouts.slice(0, 5)).map(w => (
                            <button
                                key={w.id}
                                type="button"
                                className={`${styles.workoutCard} ${w.pr_count > 0 ? styles.workoutCardPr : ''} ${deletingId === w.id ? styles.workoutCardDeleting : ''}`}
                                onClick={() => setOpenWorkout(w)}
                            >
                                <div className={styles.workoutCardLeft}>
                                    <div className={styles.workoutDateRow}>
                                        <span className={styles.workoutDate}>{formatDisplayDate(w.completed_at)}</span>
                                        {w.is_deload && (
                                            <span className={styles.deloadBadge}>Deload</span>
                                        )}
                                        {w.pr_count > 0 && (
                                            <span className={styles.prBadge}>
                                                <span className={styles.prBadgeIcon}>🏆</span>
                                                <span className={styles.prBadgeText}>
                                                    {w.pr_count > 1 ? `${w.pr_count}× ${t('PR!')}` : t('New PR!')}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.workoutSession}>{w.session_name ?? '–'}</div>
                                </div>
                                <div className={styles.workoutSets}>{w.set_count} sets</div>
                                <div className={styles.workoutCardChevron}>›</div>
                            </button>
                        ))}
                    </div>
                    {!showAllWorkouts && workouts.length > 5 && (
                        <button type="button" className={styles.showMoreBtn} onClick={() => setShowAllWorkouts(true)}>
                            {t('Visa alla')} ({workouts.length})
                        </button>
                    )}
                </>
            )}

            {/* ── Strength tab ── */}
            {activeTab === 'strength' && (
                <>
                    {/* Personal Records */}
                    {personalRecords.length > 0 && (
                        <>
                            <div className={styles.sectionHeader}>{t('Personal Records')}</div>
                            <div className={styles.prList}>
                                {(showAllPRs ? personalRecords : personalRecords.slice(0, 3)).map((pr, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`${styles.prRow} ${prWorkoutMap[pr.name] ? styles.prRowClickable : ''}`}
                                        onClick={() => {
                                            const wkId = prWorkoutMap[pr.name]
                                            if (wkId) {
                                                const w = workouts.find(w => w.id === wkId)
                                                if (w) setOpenWorkout(w)
                                            }
                                        }}
                                    >
                                        <span className={styles.prName}>{pr.name}</span>
                                        <span className={styles.prValue}>{formatWeight(pr.kg, weightUnit)}</span>
                                    </button>
                                ))}
                                {!showAllPRs && personalRecords.length > 3 && (
                                    <button type="button" className={styles.showMoreBtn} onClick={() => setShowAllPRs(true)}>
                                        {t('Visa alla')} ({personalRecords.length})
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Exercise Progress Chart */}
                    {activeExercise && exerciseProgressData[activeExercise] && (
                        <>
                            <div className={styles.sectionHeader} style={{ marginTop: 32 }}>{t('Exercise progress')}</div>
                            <div className={styles.exerciseChartTabs}>
                                {topExercises.map(name => (
                                    <button
                                        key={name}
                                        type="button"
                                        className={`${styles.exerciseTab} ${name === activeExercise ? styles.exerciseTabActive : ''}`}
                                        onClick={() => setSelectedExercise(name)}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.chartWrap}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={exerciseProgressData[activeExercise]} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }}
                                            tickFormatter={(v: string) => { const [, m, d] = v.split('-'); return `${d}/${m}` }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }}
                                            unit=" kg"
                                            domain={['dataMin - 5', 'dataMax + 5']}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }}
                                            formatter={(value) => [`${value} kg`, t('Max')]}
                                        />
                                        <Area type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2} fill="url(#progressGradient)" dot={{ r: 3, fill: '#10b981' }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── Volume tab ── */}
            {activeTab === 'volume' && (
                <>
                    {/* Workouts per month */}
                    <>
                        <div className={styles.sectionHeader}>{t('Workouts per month')}</div>
                        <div className={styles.chartWrap}>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={monthlyData} margin={{ top: 24, right: 16, left: -16, bottom: 0 }} barCategoryGap="40%" maxBarSize={56}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ff5c35" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#e8197d" stopOpacity={0.7} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(v: string) => {
                                            const [, m] = v.split('-')
                                            const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
                                            return names[parseInt(m, 10) - 1] ?? v
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontFamily: 'DM Sans', fontSize: 11, fill: 'var(--muted)', fontWeight: 500 }}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        axisLine={false}
                                        tickLine={false}
                                        width={28}
                                        tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }}
                                        contentStyle={{
                                            background: 'var(--card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 10,
                                            fontFamily: 'DM Sans',
                                            fontSize: 13,
                                            color: 'var(--text)',
                                        }}
                                        formatter={(value) => [`${value} pass`, '']}
                                        labelFormatter={(v: string) => {
                                            const [y, m] = v.split('-')
                                            const names = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
                                            return `${names[parseInt(m, 10) - 1]} ${y}`
                                        }}
                                    />
                                    <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 4, 4]}>
                                        <LabelList dataKey="count" position="top" style={{ fontFamily: 'DM Sans', fontSize: 12, fontWeight: 700, fill: 'var(--text)' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>

                    {/* Session distribution (pie chart) */}
                    {sessionDistData.length > 1 && (
                        <>
                            <div className={styles.sectionHeader} style={{ marginTop: 32 }}>{t('Session split')}</div>
                            <div className={styles.chartWrap}>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={sessionDistData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                            label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                            activeShape={((props: { cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string }) => (
                                                <g>
                                                    <Sector cx={props.cx} cy={props.cy} innerRadius={props.innerRadius} outerRadius={props.outerRadius} startAngle={props.startAngle} endAngle={props.endAngle} fill={props.fill} style={{ transition: 'all 0.2s ease' }} />
                                                    <Sector cx={props.cx} cy={props.cy} innerRadius={props.innerRadius - 8} outerRadius={props.outerRadius + 8} startAngle={props.startAngle} endAngle={props.endAngle} fill="rgba(255,255,255,0.08)" style={{ transition: 'all 0.2s ease' }} />
                                                </g>
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            )) as any}
                                        >
                                            {sessionDistData.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 13, color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value) => [`${value}`, t('Workouts')]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}

                    {/* Weekly volume chart */}
                    {weeklyVolumeData.length > 1 && (
                        <>
                            <div className={styles.sectionHeader} style={{ marginTop: 32 }}>{t('Weekly volume')}</div>
                            <div className={styles.chartWrap}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={weeklyVolumeData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#7c3aed" />
                                                <stop offset="100%" stopColor="#2563eb" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                                        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: 'DM Sans', fontSize: 10, fill: 'var(--muted)' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}t`} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: 'DM Sans', fontSize: 13, color: 'var(--text)' }} formatter={(value) => [`${Number(value).toLocaleString('sv-SE')} kg`, t('Volume')]} />
                                        <Bar dataKey="volume" fill="url(#volumeGradient)" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </>
            )}

            {openWorkout && (
                <div
                    className={`${styles.overlay} ${closingModal ? styles.overlayOut : ''}`}
                    onClick={closeModal}
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
                            onClick={closeModal}
                            aria-label={t('Close')}
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                        <div className={styles.modalTitle}>
                            {openWorkout.session_name ?? '–'}
                            {openWorkout.is_deload && <span className={styles.deloadBadge} style={{ marginLeft: 10, verticalAlign: 'middle' }}>Deload</span>}
                        </div>
                        <div className={styles.modalSubtitle}>
                            {(() => {
                                if (!openWorkout.started_at) {
                                    return `${formatDisplayDate(openWorkout.completed_at)} · ${formatDisplayTime(openWorkout.completed_at)}`
                                }
                                const sameDay = formatDisplayDate(openWorkout.started_at) === formatDisplayDate(openWorkout.completed_at)
                                if (sameDay) {
                                    return `${formatDisplayDate(openWorkout.completed_at)} · ${formatDisplayTime(openWorkout.started_at)} – ${formatDisplayTime(openWorkout.completed_at)}`
                                }
                                return `${formatDisplayDate(openWorkout.started_at)} ${formatDisplayTime(openWorkout.started_at)} – ${formatDisplayDate(openWorkout.completed_at)} ${formatDisplayTime(openWorkout.completed_at)}`
                            })()}
                        </div>

                        {openWorkout.pr_count > 0 && (
                            <div className={styles.modalPrBanner}>
                                <span className={styles.modalPrBannerIcon}>🏆</span>
                                <span>
                                    {openWorkout.pr_count > 1
                                        ? `${openWorkout.pr_count}× ${t('New Personal Records')}`
                                        : t('New Personal Record')}
                                </span>
                            </div>
                        )}

                        <div className={styles.modalDivider} />

                        <div className={styles.modalStatsRow}>
                            <div className={styles.modalStat}>
                                <div className={styles.modalStatLabel}>{t('Duration')}</div>
                                <div className={styles.modalStatValue}>
                                    <ClockIcon size={20} className={styles.modalStatIcon} /> {formatDuration(openWorkout.started_at, openWorkout.completed_at, t)}
                                </div>
                            </div>
                            <div className={styles.modalStat}>
                                <div className={styles.modalStatLabel}>{t('Total')}</div>
                                <div className={styles.modalStatValue}>
                                    <WeightIcon size={20} className={styles.modalStatIcon} /> {formatWeight(Math.round(openWorkout.total_kg), weightUnit)}
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalDivider} />

                        {confirmDelete ? (
                            <div className={styles.deleteConfirm}>
                                <span>{t('Delete this workout?')}</span>
                                <div className={styles.deleteConfirmBtns}>
                                    <button type="button" className={styles.deleteConfirmCancel} onClick={() => setConfirmDelete(false)}>{t('Cancel')}</button>
                                    <button type="button" className={styles.deleteConfirmOk} onClick={() => handleDeleteWorkout(openWorkout.id)}>{t('Delete')}</button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.deleteConfirmBtns}>
                                <button type="button" className={styles.deleteConfirmCancel} onClick={closeModal}>{t('Continue training')}</button>
                                <button type="button" className={styles.deleteConfirmOk} onClick={() => setConfirmDelete(true)}>{t('Delete workout')}</button>
                            </div>
                        )}

                        <div className={styles.modalExerciseList}>
                            {openWorkout.exercises.length === 0 && (
                                <div className={styles.modalEmpty}>{t('No sets recorded')}</div>
                            )}
                            {openWorkout.exercises.map(ex => {
                                const isPr = openWorkout.pr_exercise_ids.includes(ex.id)
                                return (
                                    <div key={ex.id} className={styles.modalExerciseGroup}>
                                        <div className={`${styles.modalExerciseName} ${isPr ? styles.modalExerciseNamePr : ''}`}>
                                            {ex.name}
                                            {isPr && <span className={styles.modalExerciseNamePrIcon}>🏆</span>}
                                        </div>
                                        {ex.sets.map((s, i) => (
                                            <div key={i} className={styles.modalSetRow}>
                                                <span className={styles.modalSetLabel}>
                                                    {t('Set')} {s.set_number}
                                                </span>
                                                <span className={styles.modalSetValue}>
                                                    {s.reps ?? '–'} {t('reps')} × {s.kg != null ? formatWeight(s.kg, weightUnit) : '–'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

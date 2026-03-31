import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { useProfile } from '../../../context/ProfileContext'
import { supabase } from '../../../supabase'
import styles from './Vecka.module.scss'

interface TrainingSession {
  id: string
  day_of_week: number
  name: string
  program_id: string
  user_id: string
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

interface DayInfo {
  name: string
  dow: number
  type: string
  train: boolean
  sessionId: string | null
}

type SlideClass = 'exitLeft' | 'exitRight' | 'enterFromRight' | 'enterFromLeft' | null

export default function Vecka(): React.JSX.Element {
  const { t } = useTranslation()
  const { sessions, programs, activeProgramId } = useProfile()!
  const dayNames = t('dayNames', { returnObjects: true }) as string[]

  const jsDay: number = new Date().getDay()
  const todayDow: number = jsDay === 0 ? 7 : jsDay

  const [exerciseCounts, setExerciseCounts] = useState<Record<string, number>>({})
  const [countsLoading, setCountsLoading] = useState<boolean>(true)

  // Index into programs array for the currently displayed program
  const [displayIndex, setDisplayIndex] = useState<number>(0)
  // Animation state
  const [slideClass, setSlideClass] = useState<SlideClass>(null)
  const pendingIndexRef = useRef<number | null>(null)

  const [viewSessions, setViewSessions] = useState<TrainingSession[]>([])

  // Sync displayIndex when activeProgramId or programs change externally
  useEffect(() => {
    const idx: number = programs.findIndex((p: TrainingProgram) => p.id === activeProgramId)
    if (idx >= 0) setDisplayIndex(idx)
  }, [activeProgramId, programs])

  const effectiveProgramId: string | null = programs[displayIndex]?.id ?? activeProgramId

  // Fetch sessions for the displayed program
  useEffect(() => {
    if (!effectiveProgramId || effectiveProgramId === activeProgramId) {
      setViewSessions(sessions)
      return
    }
    supabase
      .from('training_sessions')
      .select('*')
      .eq('program_id', effectiveProgramId)
      .order('day_of_week')
      .then(({ data }) => setViewSessions((data as TrainingSession[] | null) ?? []))
  }, [effectiveProgramId, activeProgramId, sessions])

  useEffect(() => {
    if (viewSessions.length === 0) { setExerciseCounts({}); setCountsLoading(false); return }
    setCountsLoading(true)
    supabase
      .from('exercises')
      .select('session_id')
      .in('session_id', viewSessions.map((s: TrainingSession) => s.id))
      .then(({ data }) => {
        const counts: Record<number, number> = {}
        if (data) for (const row of data as Array<{ session_id: number }>) counts[row.session_id] = (counts[row.session_id] ?? 0) + 1
        setExerciseCounts(counts)
        setCountsLoading(false)
      })
  }, [viewSessions])

  function navigate(dir: 'prev' | 'next'): void {
    if (slideClass || programs.length <= 1) return
    const next: number = dir === 'next'
      ? (displayIndex + 1) % programs.length
      : (displayIndex - 1 + programs.length) % programs.length
    pendingIndexRef.current = next
    setSlideClass(dir === 'next' ? 'exitLeft' : 'exitRight')
  }

  function handleAnimationEnd(): void {
    if (slideClass === 'exitLeft') {
      setDisplayIndex(pendingIndexRef.current!)
      setSlideClass('enterFromRight')
    } else if (slideClass === 'exitRight') {
      setDisplayIndex(pendingIndexRef.current!)
      setSlideClass('enterFromLeft')
    } else {
      setSlideClass(null)
    }
  }

  const days: DayInfo[] = dayNames.map((name: string, i: number) => {
    const session: TrainingSession | undefined = viewSessions.find((s: TrainingSession) => s.day_of_week === i + 1)
    return { name, dow: i + 1, type: session ? session.name.toUpperCase() : t('REST'), train: !!session, sessionId: session?.id ?? null }
  })

  const trainingDayCount: number = days.filter((d: DayInfo) => d.train).length
  const totalExercises: number = Object.values(exerciseCounts).reduce((sum: number, n: number) => sum + n, 0)

  const gridClass: string = [
    styles.grid,
    slideClass ? styles[slideClass] : ''
  ].filter(Boolean).join(' ')

  return (
    <section id="vecka">
      <SectionHeader number="07" title={t('Weekly overview')} />

      {programs.length > 1 && (
        <Reveal>
          <div className={styles.weekNav}>
            <button
              className={styles.weekNavArrow}
              onClick={() => navigate('prev')}
              disabled={!!slideClass}
              aria-label="Föregående program"
            >
              ‹
            </button>
            <span className={styles.weekNavLabel}>
              {programs[displayIndex]?.name ?? `Vecka ${displayIndex + 1}`}
            </span>
            <button
              className={styles.weekNavArrow}
              onClick={() => navigate('next')}
              disabled={!!slideClass}
              aria-label="Nästa program"
            >
              ›
            </button>
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className={styles.statsBar}>
          <span>{t('trainingDaysCount', { count: trainingDayCount })}</span>
          <span className={styles.statsDot} />
          <span>{t('totalExercisesCount', { count: totalExercises })}</span>
        </div>
      </Reveal>

      <Reveal>
        <div className={styles.gridOuter}>
          <div
            className={gridClass}
            onAnimationEnd={handleAnimationEnd}
          >
            {days.map(({ name, type, train, dow, sessionId }: DayInfo) => {
              const isToday: boolean = dow === todayDow
              return (
                <div
                  key={name}
                  className={[styles.day, train ? styles.train : styles.rest, isToday ? styles.today : ''].filter(Boolean).join(' ')}
                >
                  {isToday && <div className={styles.todayDot} />}
                  <div className={styles.dayName}>{name}</div>
                  <div className={styles.dayType} style={!train ? { color: 'var(--muted)' } : {}}>{type}</div>
                  {train && !countsLoading && (
                    <div className={styles.exerciseCount}>
                      {t('exerciseCount', { count: exerciseCounts[sessionId!] ?? 0 })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

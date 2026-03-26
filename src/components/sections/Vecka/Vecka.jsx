import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { useProfile } from '../../../context/ProfileContext'
import { supabase } from '../../../supabase'
import styles from './Vecka.module.scss'

export default function Vecka() {
  const { t } = useTranslation()
  const { sessions, programs, activeProgramId } = useProfile()
  const dayNames = t('dayNames', { returnObjects: true })

  const jsDay = new Date().getDay()
  const todayDow = jsDay === 0 ? 7 : jsDay

  const [exerciseCounts, setExerciseCounts] = useState({})
  const [countsLoading, setCountsLoading] = useState(true)

  // Index into programs array for the currently displayed program
  const [displayIndex, setDisplayIndex] = useState(0)
  // Animation state: null | 'exitLeft' | 'exitRight' | 'enterFromRight' | 'enterFromLeft'
  const [slideClass, setSlideClass] = useState(null)
  const pendingIndexRef = useRef(null)

  const [viewSessions, setViewSessions] = useState([])

  // Sync displayIndex when activeProgramId or programs change externally
  useEffect(() => {
    const idx = programs.findIndex(p => p.id === activeProgramId)
    if (idx >= 0) setDisplayIndex(idx)
  }, [activeProgramId, programs])

  const effectiveProgramId = programs[displayIndex]?.id ?? activeProgramId

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
      .then(({ data }) => setViewSessions(data ?? []))
  }, [effectiveProgramId, activeProgramId, sessions])

  useEffect(() => {
    if (viewSessions.length === 0) { setExerciseCounts({}); setCountsLoading(false); return }
    setCountsLoading(true)
    supabase
      .from('exercises')
      .select('session_id')
      .in('session_id', viewSessions.map(s => s.id))
      .then(({ data }) => {
        const counts = {}
        if (data) for (const row of data) counts[row.session_id] = (counts[row.session_id] ?? 0) + 1
        setExerciseCounts(counts)
        setCountsLoading(false)
      })
  }, [viewSessions])

  function navigate(dir) {
    if (slideClass || programs.length <= 1) return
    const next = dir === 'next'
      ? (displayIndex + 1) % programs.length
      : (displayIndex - 1 + programs.length) % programs.length
    pendingIndexRef.current = next
    setSlideClass(dir === 'next' ? 'exitLeft' : 'exitRight')
  }

  function handleAnimationEnd() {
    if (slideClass === 'exitLeft') {
      setDisplayIndex(pendingIndexRef.current)
      setSlideClass('enterFromRight')
    } else if (slideClass === 'exitRight') {
      setDisplayIndex(pendingIndexRef.current)
      setSlideClass('enterFromLeft')
    } else {
      setSlideClass(null)
    }
  }

  const days = dayNames.map((name, i) => {
    const session = viewSessions.find(s => s.day_of_week === i + 1)
    return { name, dow: i + 1, type: session ? session.name.toUpperCase() : t('REST'), train: !!session, sessionId: session?.id ?? null }
  })

  const trainingDayCount = days.filter(d => d.train).length
  const totalExercises = Object.values(exerciseCounts).reduce((sum, n) => sum + n, 0)

  const gridClass = [
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
            {days.map(({ name, type, train, dow, sessionId }) => {
              const isToday = dow === todayDow
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
                      {t('exerciseCount', { count: exerciseCounts[sessionId] ?? 0 })}
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

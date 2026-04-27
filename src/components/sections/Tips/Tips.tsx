import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { STORAGE } from '../../../constants/storage'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Tips.module.scss'

type GoalType = 'bulk' | 'cut' | 'maintain'

interface PeriodiseringBox {
  title: string
  text: string
}

const generalTipKeys: string[] = [
  'Recovery takes longer. <strong>7–9 hours of sleep</strong> is just as important as training.',
  '<strong>5–10 min light cardio</strong> + dynamic stretching before the session. Always warm up properly.',
  '<strong>Technique over weight.</strong> Risk of injury increases with age, and injuries halt all progress.',
  'Try adding <strong>1–2 g omega-3 (fish oil)</strong> — reduces inflammation and supports joint health.',
  '<strong>Vitamin D + magnesium</strong> can improve sleep and muscle function — ask your doctor.',
  'Weigh yourself <strong>max once a week</strong>, in the morning after the bathroom, not after training.',
  'Photos and how your clothes fit are <strong>better metrics</strong> than just the number on the scale.',
]

const goalTips: Record<GoalType, string[]> = {
  bulk: [
    'Eat <strong>250–500 kcal above TDEE</strong> — enough surplus for muscle growth without excessive fat gain.',
    'Keep protein at <strong>1.6–2.2 g/kg</strong> even in a bulk — muscles need building blocks to grow.',
    '<strong>Progressive overload is essential</strong> when bulking — track every session and aim to beat your last.',
    'Don\'t skip cardio — <strong>2×20 min light cardio/week</strong> supports heart health and speeds up recovery.',
  ],
  cut: [
    'Keep protein <strong>high (2–2.5 g/kg)</strong> to preserve muscle mass while in a calorie deficit.',
    '<strong>0.3–0.5 kg/week</strong> is the sweet spot — faster and you risk losing muscle, not just fat.',
    'Keep carbs higher around workouts and lower on rest days — <strong>fuel your training, not your couch time</strong>.',
    'Strength may dip slightly during a cut — that\'s normal. <strong>Avoid chasing new PRs</strong> when in deficit.',
  ],
  maintain: [
    'Body recomposition is possible at maintenance — <strong>slow muscle gain and fat loss simultaneously</strong>.',
    'Shift focus to <strong>performance goals</strong> — strength, reps, endurance — rather than the scale.',
    'Protein still matters at maintenance — <strong>1.6–2.0 g/kg</strong> keeps you in an anabolic state.',
    'Track food occasionally to make sure you\'re truly at maintenance — <strong>not accidentally cutting or bulking</strong>.',
  ],
}

const GOALS: GoalType[] = ['bulk', 'cut', 'maintain']

export default function Tips(): React.JSX.Element {
  const { t } = useTranslation()
  const { currentWeight, goalWeight } = useProfile()!

  const [goal, setGoal] = useState<GoalType | null>(() => (localStorage.getItem(STORAGE.TIPS_GOAL) as GoalType | null) ?? null)
  const [displayGoal, setDisplayGoal] = useState<GoalType>(() => (localStorage.getItem(STORAGE.TIPS_GOAL) as GoalType | null) ?? 'cut')
  const [tipsFading, setTipsFading] = useState<boolean>(false)

  // Auto-detect goal from profile data if user hasn't chosen manually
  useEffect(() => {
    if (localStorage.getItem(STORAGE.TIPS_GOAL)) return
    if (!currentWeight || !goalWeight) return
    const detected: GoalType = currentWeight > goalWeight + 1 ? 'cut' : goalWeight > currentWeight + 1 ? 'bulk' : 'maintain'
    setGoal(detected)
    setDisplayGoal(detected)
  }, [currentWeight, goalWeight])

  // Fade out -> swap content -> fade in
  useEffect(() => {
    if (!goal || goal === displayGoal) return
    setTipsFading(true)
    const timer = setTimeout(() => {
      setDisplayGoal(goal)
      setTipsFading(false)
    }, 180)
    return () => clearTimeout(timer)
  }, [goal])

  const activeGoal: GoalType = displayGoal

  function selectGoal(g: GoalType): void {
    setGoal(g)
    localStorage.setItem(STORAGE.TIPS_GOAL, g)
  }

  const periodiseringBoxes: PeriodiseringBox[] = [
    { title: t('Progressive overload'), text: t('If you can do more reps than the upper range with good form → increase the weight next time. Add 1.25–2.5 kg for upper body, 2.5–5 kg for legs. Always log your weights.') },
    { title: t('Exercise rotation'),    text: t('Swap 1–2 exercises per session every 6–8 weeks. Keep the core lifts (bench, lat pulldown, leg press). Don\'t swap because it\'s "boring" — progression is the result.') },
    { title: t('Free weights'),         text: t('Add free weights (dumbbell press, deadlift) after 3–4 months when technique is solid. Activates more stabilizer muscles.') },
  ]

  return (
    <section id="tips">
      <SectionHeader number="07" title={t('Tips & periodization')} />

      {/* Goal selector */}
      <Reveal>
        <div className={styles.goalBar}>
          {GOALS.map((g: GoalType) => (
            <button
              key={g}
              className={[styles.goalChip, activeGoal === g ? styles.goalChipActive : ''].filter(Boolean).join(' ')}
              onClick={() => selectGoal(g)}
            >
              {t(`goal_${g}`)}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Personalized tips */}
      <Reveal>
        <div className={[styles.goalSectionLabel, tipsFading ? styles.goalFading : ''].filter(Boolean).join(' ')}>
          {t('Personalized for')} <strong>{t(`goal_${activeGoal}`)}</strong>
        </div>
        <ul className={[styles.tipsList, styles.tipsListGoal, tipsFading ? styles.goalFading : ''].filter(Boolean).join(' ')}>
          {goalTips[activeGoal].map((key: string) => (
            <li key={key} dangerouslySetInnerHTML={{ __html: t(key) }} />
          ))}
        </ul>
      </Reveal>

      {/* General tips */}
      <Reveal>
        <div className={styles.generalTipsLabel}>{t('General tips')}</div>
        <ul className={styles.tipsList}>
          {generalTipKeys.map((key: string) => (
            <li key={key} dangerouslySetInnerHTML={{ __html: t(key) }} />
          ))}
        </ul>
      </Reveal>

      <Reveal>
        <div className={styles.infoGrid}>
          {periodiseringBoxes.map(({ title, text }: PeriodiseringBox) => (
            <div key={title} className={styles.infoBox}>
              <h4>{title}</h4>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <div className={styles.deloadNote}>
          <strong>{t('DELOAD')}</strong>
          <span dangerouslySetInnerHTML={{ __html: t('Every 6–8 weeks: do the same exercises and sets, but <strong>reduce the weight by 50%</strong> and keep reps lower. Active deload — don\'t rest completely. Signs you need a deload NOW: performance drops 2 sessions in a row, sleep problems, joint/muscle soreness that won\'t go away, sharply declining motivation.') }} />
        </div>
      </Reveal>

      <Reveal>
        <CardGrid>
          <CardGridItem label={t('Deload — how often')} value={t('Every 6–8 w')}  valueStyle={{ fontSize: '22px' }} sub={t('Increases to every 4–6 w as intensity rises')} />
          <CardGridItem label={t('Deload weight')}      value="50%"                valueStyle={{ color: 'var(--orange)' }}  sub={t('Of your normal working weight')} />
          <CardGridItem label={t('Diet during deload')} value={t('Maintenance')}   valueStyle={{ fontSize: '18px' }}        sub={t('Eating a bit more supports recovery')} />
        </CardGrid>
      </Reveal>

      <div className={styles.disclaimer}>
        {t('This plan is a suggestion based on the provided information. Consult a doctor or certified nutritionist before making major dietary changes.')}
      </div>
    </section>
  )
}

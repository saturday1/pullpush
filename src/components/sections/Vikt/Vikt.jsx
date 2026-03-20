import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import { useProfile } from '../../../context/ProfileContext'
import styles from './Vikt.module.scss'

export default function Vikt() {
  const { t } = useTranslation()
  const { loading, startWeight, currentWeight, goalWeight, height, age, firstName, lastName, birthDate, phone, macros, logWeight, updateProfile } = useProfile()
  const [weightInput,   setWeightInput]   = useState('')
  const [loggingWeight, setLoggingWeight] = useState(false)
  const [goalInput,     setGoalInput]     = useState('')
  const [savingGoal,    setSavingGoal]    = useState(false)
  const [barsVisible,   setBarsVisible]   = useState(false)

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setBarsVisible(true), 400)
      return () => clearTimeout(timer)
    }
  }, [loading])

  async function handleLogWeight(e) {
    e.preventDefault()
    const kg = parseFloat(weightInput.replace(',', '.'))
    if (isNaN(kg)) return
    setLoggingWeight(true)
    await logWeight(kg)
    setWeightInput('')
    setLoggingWeight(false)
  }

  async function handleSaveGoal(e) {
    e.preventDefault()
    const kg = parseFloat(goalInput.replace(',', '.'))
    if (isNaN(kg)) return
    setSavingGoal(true)
    await updateProfile({
      goal_weight: kg,
      height_cm:   height,
      first_name:  firstName,
      last_name:   lastName,
      birth_date:  birthDate,
      phone,
    })
    setGoalInput('')
    setSavingGoal(false)
  }

  const start  = startWeight ?? currentWeight ?? 0
  const weight = currentWeight ?? start
  const goal   = goalWeight ?? 0
  const diff   = parseFloat((weight - start).toFixed(1))
  const kvar   = Math.max(0, weight - goal).toFixed(1)
  const pct    = start !== goal
    ? Math.min(100, Math.max(0, ((start - weight) / (start - goal)) * 100))
    : 0

  const m = macros
  const macroBars = m ? [
    { name: `🥩 ${t('Protein')}`,  color: '#f97316', gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
    { name: `🍚 ${t('Carbs')}`,    color: '#60a5fa', gram: `${m.carbs} g`,   pct: `${m.carbPct}%`,    barWidth: `${m.carbPct}%`    },
    { name: `🥑 ${t('Fat')}`,      color: '#22c55e', gram: `${m.fat} g`,     pct: `${m.fatPct}%`,     barWidth: `${m.fatPct}%`     },
  ] : []

  return (
    <section id="vikt">
      <SectionHeader number="02" title={t('Weight & Calories')} />

      <Reveal className={styles.section}>
        <CardGrid>
          <CardGridItem label={t('Start weight')}   value={loading ? '…' : `${start} kg`} />
          <CardGridItem label={t('Current weight')}  value={loading ? '…' : `${weight} kg`} valueStyle={{ color: 'var(--accent)' }} />
          <CardGridItem label={t('Goal weight')}     value={loading ? '…' : `${goal} kg`}   valueStyle={{ color: 'var(--green)' }} />
          <CardGridItem
            label={t('Change')}
            value={loading ? '…' : `${diff > 0 ? '+' : ''}${diff} kg`}
            valueStyle={{ color: diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--orange)' : 'var(--muted)' }}
          />
          <CardGridItem label={t('Remaining')} value={loading ? '…' : `−${kvar} kg`} valueStyle={{ color: 'var(--orange)' }} />
        </CardGrid>
      </Reveal>

      <Reveal className={styles.section}>
        <div className={styles.goalSection}>
          <div className={styles.goalHeader}>
            <span className={styles.goalTitle}>{t('Weight goal — {{start}} kg → {{goal}} kg', { start, goal })}</span>
            <span className={styles.goalNums}>
              {t('{{pct}}% done', { pct: pct.toFixed(0) })}
            </span>
          </div>
          <div className={styles.goalBarBg}>
            <div className={styles.goalBarFill} style={{ width: loading ? '0%' : `${pct}%` }} />
          </div>
          <div className={styles.goalLabels}>
            <span>{t('Start ({{start}} kg)', { start })}</span>
            <span>{t('Goal ({{goal}} kg)', { goal })}</span>
          </div>
        </div>
      </Reveal>

      <Reveal className={styles.section}>
        <div className={styles.subHeading}>{t('Calories & Macros')}</div>
        <CardGrid className={styles.gridMargin}>
          <CardGridItem label={t('BMR')}                value={loading || !m ? '…' : `${m.bmr} kcal`}       sub={t('Resting metabolism')} />
          <CardGridItem label={t('TDEE')}               value={loading || !m ? '…' : `${m.tdee} kcal`}       sub={t('With training 3×/week')} />
          <CardGridItem label={t('Deficit')}             value={loading || !m ? '…' : `−${m.deficit} kcal`}   sub={t('≈ 0.3 kg/week')} valueStyle={{ color: 'var(--red)' }} />
          <CardGridItem label={t('Training day goal')}   value={loading || !m ? '…' : `${m.targetKcal} kcal`} valueStyle={{ color: 'var(--accent)' }} />
        </CardGrid>

        <div className={styles.macroCard}>
          <div className={styles.macroCardTitle}>{t('Macro split — training day')}</div>
          {macroBars.map(({ name, color, gram, pct: macroPct, barWidth }) => (
            <div key={name} className={styles.macroRow}>
              <span className={styles.macroName} style={{ color }}>{name}</span>
              <div className={styles.macroBarWrap}>
                <div className={styles.macroBar} style={{ background: color, width: barsVisible ? barWidth : '0%' }} />
              </div>
              <span className={styles.macroGram} style={{ color }}>{gram}</span>
              <span className={styles.macroPct}>{macroPct}</span>
            </div>
          ))}
          {m && weight > 0 && (
            <div className={styles.proteinRow}>
              <span>{t('Protein per kg body weight')}</span>
              <span className={styles.proteinVal}>{t('{{value}} g/kg', { value: (m.protein / weight).toFixed(2) })}</span>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal>
        <div className={styles.inputsCard}>
          <div className={styles.inputsCardTitle}>{t('Update')}</div>
          <div className={styles.inputSection}>
          <div>
            <div className={styles.inputLabel}>{t('Log new weight')}</div>
            <form onSubmit={handleLogWeight} className={styles.logForm}>
              <input
                type="number" step="0.1"
                placeholder={t('Current ({{weight}} kg)', { weight })}
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                className={styles.logInput}
              />
              <button type="submit" disabled={loggingWeight} className={styles.logBtn}>
                {loggingWeight ? '…' : t('Save')}
              </button>
            </form>
          </div>
          <div>
            <div className={styles.inputLabel}>{t('Change goal weight')}</div>
            <form onSubmit={handleSaveGoal} className={styles.logForm}>
              <input
                type="number" step="0.1"
                placeholder={t('Current goal ({{goal}} kg)', { goal })}
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                className={styles.logInput}
              />
              <button type="submit" disabled={savingGoal} className={styles.logBtn}>
                {savingGoal ? '…' : t('Save')}
              </button>
            </form>
          </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

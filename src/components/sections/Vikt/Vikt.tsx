import { type FormEvent, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import Skeleton from '../../Skeleton/Skeleton'
import { useProfile } from '../../../context/ProfileContext'
import InfoModal from '../../InfoModal/InfoModal'
import { useWeightUnit, formatWeightJsx } from '../../../hooks/useWeightUnit'
import styles from './Vikt.module.scss'

interface MacroBar {
  name: string
  color: string
  gram: string
  pct: string
  barWidth: string
}

const KG_TO_LBS = 2.20462
const toLbs = (kg: number): number => +(kg * KG_TO_LBS).toFixed(1)

export default function Vikt(): React.JSX.Element {
  const { t } = useTranslation()
  const { weightLoading, profileLoading, startWeight, currentWeight, goalWeight, height, age, macros, logWeight } = useProfile()!
  const [weightUnit] = useWeightUnit()
  const [weightInput,   setWeightInput]   = useState<string>('')
  const [lbsInput,      setLbsInput]      = useState<string>('')
  const [loggingWeight, setLoggingWeight] = useState<boolean>(false)
  const [showWeightModal, setShowWeightModal] = useState<boolean>(false)
  const [barsVisible,   setBarsVisible]   = useState<boolean>(false)

  const loading: boolean = weightLoading || profileLoading

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setBarsVisible(true), 400)
      return () => clearTimeout(timer)
    }
  }, [loading])

  async function handleLogWeight(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const kg: number = parseFloat(weightInput.replace(',', '.'))
    if (isNaN(kg)) return
    setLoggingWeight(true)
    await logWeight(kg)
    setWeightInput('')
    setLoggingWeight(false)
  }

  const start: number = startWeight ?? currentWeight ?? 0
  const weight: number = currentWeight ?? start
  const goal: number = goalWeight ?? 0
  const diff: number = parseFloat((weight - start).toFixed(1))
  const kvar: string = Math.max(0, weight - goal).toFixed(1)
  const pct: number = start !== goal
    ? Math.min(100, Math.max(0, ((start - weight) / (start - goal)) * 100))
    : 0

  const m = macros
  const macroBars: MacroBar[] = m ? [
    { name: `🥩 ${t('Protein')}`,  color: '#f97316', gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
    { name: `🍚 ${t('Carbs')}`,    color: '#60a5fa', gram: `${m.carbs} g`,   pct: `${m.carbPct}%`,    barWidth: `${m.carbPct}%`    },
    { name: `🥑 ${t('Fat')}`,      color: '#22c55e', gram: `${m.fat} g`,     pct: `${m.fatPct}%`,     barWidth: `${m.fatPct}%`     },
  ] : []

  return (
    <section id="vikt">
      <SectionHeader number="02" title={t('Weight & Calories')} />

      <Reveal className={styles.section}>
        <CardGrid>
          <CardGridItem label={t('Start weight')}   value={loading ? <Skeleton width={60} height={18} /> : (() => { const [p, s] = formatWeightJsx(start, weightUnit); return s ? <>{p}<br /><span className="lbsLight">{s}</span></> : p })() } />
          <CardGridItem label={t('Current weight')}  value={loading ? <Skeleton width={60} height={18} /> : (() => { const [p, s] = formatWeightJsx(weight, weightUnit); return s ? <>{p}<br /><span className="lbsLight">{s}</span></> : p })() } valueStyle={{ color: 'var(--accent)' }} />
          <CardGridItem label={t('Goal weight')}     value={loading ? <Skeleton width={60} height={18} /> : (() => { const [p, s] = formatWeightJsx(goal, weightUnit); return s ? <>{p}<br /><span className="lbsLight">{s}</span></> : p })() }   valueStyle={{ color: 'var(--green)' }} />
          <CardGridItem
            label={t('Change')}
            value={loading ? <Skeleton width={60} height={18} /> : currentWeight == null ? <span style={{ fontSize: '13px', color: 'var(--accent)' }}>{t('Log your first weight')}</span> : (() => { const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''; const abs = Math.abs(diff); const [p, s] = formatWeightJsx(abs, weightUnit); const pSigned = `${sign}${p}`; return s ? <>{pSigned}<br /><span className="lbsLight">{sign}{s}</span></> : pSigned })() }
            valueStyle={{ color: diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--orange)' : 'var(--muted)' }}
          />
          <CardGridItem label={t('Remaining')} value={loading ? <Skeleton width={60} height={18} /> : (() => { const k = parseFloat(kvar); const [p, s] = formatWeightJsx(k, weightUnit); return s ? <>−{p} / <span className="lbsLight">−{s}</span></> : `−${p}` })() } valueStyle={{ color: 'var(--green)' }} />
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
          <CardGridItem
            label={<span className={styles.labelInfo}>BMR<InfoModal title="BMR – Basalämnesomsättning" text="Antalet kalorier din kropp förbränner i total vila – utan någon aktivitet alls. Beräknas med Mifflin-St Jeor-formeln utifrån din vikt, längd och ålder. Det är grunden för alla övriga beräkningar." /></span>}
            value={loading || !m ? <Skeleton width={70} height={18} /> : `${m.bmr} kcal`}
            sub={t('Resting metabolism')}
          />
          <CardGridItem
            label={<span className={styles.labelInfo}>TDEE<InfoModal title="TDEE – Total daglig energiförbrukning" text="Total Daily Energy Expenditure. Ditt BMR multiplicerat med en aktivitetsfaktor. Faktor 1.55 används för måttlig träning (~3 gånger per vecka). Det här är ungefär hur många kalorier du förbränner totalt per dag och vad du behöver äta för att hålla vikten." /></span>}
            value={loading || !m ? <Skeleton width={70} height={18} /> : `${m.tdee} kcal`}
            sub={t('With training 3×/week')}
          />
          <CardGridItem
            label={<span className={styles.labelInfo}>Underskott<InfoModal title="Kaloriunderskott" text="Äter du färre kalorier än ditt TDEE skapar du ett underskott. Med 280 kcal under TDEE varje dag förväntas du gå ner ungefär 0.3 kg per vecka – ett lagom och hållbart tempo." /></span>}
            value={loading || !m ? <Skeleton width={70} height={18} /> : `−${m.deficit} kcal`}
            sub={t('≈ 0.3 kg/week')}
            valueStyle={{ color: 'var(--red)' }}
          />
          <CardGridItem
            label={<span className={styles.labelInfo}>Mål per träningsdag<InfoModal title="Kalorier – träningsdag" text="Ditt faktiska dagliga kaloriintag på träningsdagar. Beräknas som TDEE minus underskottet. Det är kring det här värdet som ditt matschema är byggt." /></span>}
            value={loading || !m ? <Skeleton width={70} height={18} /> : `${m.targetKcal} kcal`}
            valueStyle={{ color: 'var(--accent)' }}
          />
        </CardGrid>

        <div className={styles.macroCard}>
          <div className={styles.macroCardTitle}>{t('Macro split — training day')}</div>
          {macroBars.map(({ name, color, gram, pct: macroPct, barWidth }: MacroBar) => (
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

      <button className={styles.weightFab} onClick={() => setShowWeightModal(true)}>+</button>

      {showWeightModal && (
        <div className={styles.weightOverlay} onClick={() => setShowWeightModal(false)}>
          <div className={styles.weightModal} onClick={e => e.stopPropagation()}>
            <div className={styles.weightModalTitle}>{t('Log new weight')}</div>
            <form onSubmit={(e) => { handleLogWeight(e); setShowWeightModal(false) }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="number" step="0.1" inputMode="decimal"
                  placeholder={`${weight} kg`}
                  value={weightInput}
                  onChange={e => { setWeightInput(e.target.value); const n = parseFloat(e.target.value.replace(',', '.')); setLbsInput(!isNaN(n) ? toLbs(n).toString() : '') }}
                  className={styles.logInput}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <input
                  type="number" step="0.1" inputMode="decimal"
                  placeholder={`${toLbs(weight)} lbs`}
                  value={lbsInput}
                  onChange={e => { setLbsInput(e.target.value); const n = parseFloat(e.target.value.replace(',', '.')); setWeightInput(!isNaN(n) ? (n / KG_TO_LBS).toFixed(1) : '') }}
                  className={styles.logInput}
                  style={{ flex: 1 }}
                />
              </div>
              <div className={styles.weightModalActions}>
                <button type="button" className={styles.weightModalCancel} onClick={() => setShowWeightModal(false)}>{t('Cancel')}</button>
                <button type="submit" disabled={loggingWeight} className={`${styles.logBtn} ${styles.weightModalSave}`}>
                  {loggingWeight ? '…' : t('Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

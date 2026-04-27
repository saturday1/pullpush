import { type FormEvent, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import Skeleton from '../../Skeleton/Skeleton'
import { useProfile } from '../../../context/ProfileContext'
import InfoModal from '../../InfoModal/InfoModal'
import { useWeightUnit, formatWeightJsx, toLbs } from '../../../hooks/useWeightUnit'
import { KG_TO_LBS } from '../../../constants/units'
import { DB } from '../../../constants/database'
import { STORAGE } from '../../../constants/storage'
import { COLOR_PROTEIN, COLOR_CARBS, COLOR_FAT, COLOR_KCAL } from '../../../constants/colors'
import { supabase } from '../../../supabase'
import styles from './Vikt.module.scss'

interface MacroBar {
  name: string
  color: string
  gram: string
  pct: string
  barWidth: string
}

interface WeightEntry {
  date: string
  weight_kg: number
}

const DAYS_SV      = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
const DAYS_SV_FULL = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']

function getWeighInDay(): number | null {
  const v = localStorage.getItem(STORAGE.WEIGH_IN_DAY)
  return v !== null ? parseInt(v) : null
}
function setWeighInDay(d: number | null): void {
  if (d === null) localStorage.removeItem(STORAGE.WEIGH_IN_DAY)
  else localStorage.setItem(STORAGE.WEIGH_IN_DAY, String(d))
}

export default function Vikt(): React.JSX.Element {
  const { t } = useTranslation()
  const { weightLoading, profileLoading, startWeight, currentWeight, goalWeight, height, age, macros, logWeight } = useProfile()!
  const [weightUnit] = useWeightUnit()
  const [weightInput,   setWeightInput]   = useState<string>('')
  const [lbsInput,      setLbsInput]      = useState<string>('')
  const [loggingWeight, setLoggingWeight] = useState<boolean>(false)
  const [showWeightModal, setShowWeightModal] = useState<boolean>(false)
  const [barsVisible,   setBarsVisible]   = useState<boolean>(false)
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [weighInDay,    setWeighInDayState] = useState<number | null>(getWeighInDay)
  const [editingDay,    setEditingDay]    = useState<boolean>(false)
  const [pendingDay,    setPendingDay]    = useState<number>(weighInDay ?? 0)
  const chartScrollRef = useRef<HTMLDivElement>(null)
  const chartWrapRef   = useRef<HTMLDivElement>(null)
  const [chartWrapWidth, setChartWrapWidth] = useState(320)

  const loading: boolean = weightLoading || profileLoading

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setBarsVisible(true), 400)
      return () => clearTimeout(timer)
    }
  }, [loading])

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from(DB.WEIGHT_LOG)
      .select('date, weight_kg')
      .order('date', { ascending: true })
    if (data) setWeightHistory(data as WeightEntry[])
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  useEffect(() => {
    if (chartWrapRef.current) setChartWrapWidth(chartWrapRef.current.offsetWidth)
  }, [])

  useEffect(() => {
    if (chartScrollRef.current) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth
    }
  }, [weightHistory.length])

  function handleWeighInDay(d: number): void {
    setWeighInDay(d)
    setWeighInDayState(d)
    setEditingDay(false)
  }

  async function handleLogWeight(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const kg: number = parseFloat(weightInput.replace(',', '.'))
    if (isNaN(kg)) return
    setLoggingWeight(true)
    await logWeight(kg)
    setWeightInput('')
    setLbsInput('')
    setLoggingWeight(false)
    loadHistory()
  }

  const start: number = startWeight ?? currentWeight ?? 0
  const weight: number = currentWeight ?? start
  const goal: number = goalWeight ?? 0
  const diff: number = parseFloat((weight - start).toFixed(1))
  const kvar: string = Math.max(0, weight - goal).toFixed(1)
  const pct: number = start !== goal
    ? Math.min(100, Math.max(0, ((start - weight) / (start - goal)) * 100))
    : 0

  const chartData: WeightEntry[] = (() => {
    const deduped = Object.values(
      weightHistory.reduce<Record<string, WeightEntry>>((acc, e) => {
        const day = e.date.slice(0, 10)
        acc[day] = { date: day, weight_kg: e.weight_kg }
        return acc
      }, {})
    )
    if (start > 0 && (deduped.length === 0 || deduped[0].weight_kg !== start)) {
      return [{ date: 'start', weight_kg: start }, ...deduped]
    }
    return deduped
  })()

  const m = macros
  const macroBars: MacroBar[] = m ? [
    { name: `🥩 ${t('Protein')}`,  color: COLOR_PROTEIN, gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
    { name: `🍚 ${t('Carbs')}`,    color: COLOR_CARBS,   gram: `${m.carbs} g`,   pct: `${m.carbPct}%`,    barWidth: `${m.carbPct}%`    },
    { name: `🥑 ${t('Fat')}`,      color: COLOR_FAT,     gram: `${m.fat} g`,     pct: `${m.fatPct}%`,     barWidth: `${m.fatPct}%`     },
  ] : []

  return (
    <section id="vikt">
      <SectionHeader number="02" title={t('Weight & Calories')} />

      {chartData.length > 1 && (
        <Reveal className={styles.section}>
          <div className={styles.chartCard}>
            <div className={styles.chartTitle}>{t('Weight history')}</div>
            <div ref={chartWrapRef} style={{ width: '100%' }}>
            <div
              ref={chartScrollRef}
              style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as never }}
              className={styles.chartScroll}
            >
            {(() => {
              const PX_PER_POINT = Math.max(chartWrapWidth / 8, 44)
              const chartWidth = Math.max(chartWrapWidth, chartData.length * PX_PER_POINT)
              return (
              <LineChart data={chartData} width={chartWidth} height={180} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={0.5} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => {
                    if (d === 'start') return 'Start'
                    const date = new Date(d)
                    const [day, mon] = date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }).split(' ')
                    return `${day} ${mon.slice(0, 3)}`
                  }}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={48}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.floor(dataMin) - 1,
                    (dataMax: number) => Math.ceil(Math.max(dataMax, start)) + 1,
                  ]}
                  tickCount={5}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--muted)' }}
                  itemStyle={{ color: 'var(--accent)' }}
                  labelFormatter={(d: string) => {
                    if (d === 'start') return 'Startvikt'
                    const date = new Date(d)
                    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })
                  }}
                  formatter={(v: number) => [`${v} kg`, 'Vikt']}
                />
{goal > 0 && chartData.length > 0 && (() => {
                  const dataMin = Math.min(...chartData.map(e => e.weight_kg))
                  const dataMax = Math.max(...chartData.map(e => e.weight_kg))
                  return goal >= dataMin - 3 && goal <= dataMax + 3
                })() && (
                  <ReferenceLine y={goal} stroke="var(--green)" strokeDasharray="4 3" label={{ value: `Mål ${goal} kg`, fill: 'var(--green)', fontSize: 10, position: 'right' }} />
                )}
                <Line
                  type="monotone"
                  dataKey="weight_kg"
                  stroke="url(#wGradient)"
                  strokeWidth={2.5}
                  dot={chartData.length <= 20}
                  activeDot={{ r: 4 }}
                />
                <defs>
                  <linearGradient id="wGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COLOR_KCAL} />
                    <stop offset="100%" stopColor={COLOR_PROTEIN} />
                  </linearGradient>
                </defs>
              </LineChart>
              )}
            )()}
            </div>
            </div>
          </div>
        </Reveal>
      )}

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
        <div className={styles.chartCard}>
          <div className={styles.weighInHeader}>
            <span className={styles.chartTitle}>{t('Weigh-in day')}</span>
            <button className={styles.weighInChange} onClick={() => { setPendingDay(weighInDay ?? 0); setEditingDay(true) }}>
              {t('Change')}
            </button>
          </div>
          <span className={styles.weighInValue}>
            {weighInDay !== null ? DAYS_SV_FULL[weighInDay] : '—'}
          </span>
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
                <div style={{ flex: 1 }}>
                  <div className={styles.inputLabel}>KG</div>
                  <input
                    type="number" step="0.1" inputMode="decimal"
                    value={weightInput}
                    onChange={e => { setWeightInput(e.target.value); const n = parseFloat(e.target.value.replace(',', '.')); setLbsInput(!isNaN(n) ? toLbs(n).toString() : '') }}
                    className={styles.logInput}
                    style={{ width: '100%' }}
                    autoFocus
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.inputLabel}>LBS</div>
                  <input
                    type="number" step="0.1" inputMode="decimal"
                    value={lbsInput}
                    onChange={e => { setLbsInput(e.target.value); const n = parseFloat(e.target.value.replace(',', '.')); setWeightInput(!isNaN(n) ? (n / KG_TO_LBS).toFixed(1) : '') }}
                    className={styles.logInput}
                    style={{ width: '100%' }}
                  />
                </div>
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

      {editingDay && (
        <div className={styles.weightOverlay} onClick={() => setEditingDay(false)}>
          <div className={styles.weightModal} onClick={e => e.stopPropagation()}>
            <div className={styles.weightModalTitle}>{t('Weigh-in day')}</div>
            <select
              className={styles.daySelect}
              value={pendingDay}
              onChange={e => setPendingDay(parseInt(e.target.value))}
            >
              {DAYS_SV_FULL.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
            <div className={styles.weightModalActions}>
              <button className={styles.weightModalCancel} onClick={() => setEditingDay(false)}>{t('Cancel')}</button>
              <button
                className={`${styles.logBtn} ${styles.weightModalSave}`}
                onClick={() => { handleWeighInDay(pendingDay) }}
              >
                {t('Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

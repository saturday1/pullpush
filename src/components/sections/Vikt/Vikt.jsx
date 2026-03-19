import { useEffect, useState } from 'react'
import { useProfile } from '../../../context/ProfileContext'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import InfoModal from '../../InfoModal/InfoModal'
import styles from './Vikt.module.scss'

export default function Vikt() {
    const { loading, startWeight, currentWeight, goalWeight, height, age, firstName, lastName, birthDate, phone, macros, logWeight, updateProfile } = useProfile()
    const [weightInput, setWeightInput] = useState('')
    const [loggingWeight, setLoggingWeight] = useState(false)
    const [goalInput, setGoalInput] = useState('')
    const [savingGoal, setSavingGoal] = useState(false)
    const [barsVisible, setBarsVisible] = useState(false)

    useEffect(() => {
        if (!loading) {
            const t = setTimeout(() => setBarsVisible(true), 400)
            return () => clearTimeout(t)
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
            height_cm: height,
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDate,
            phone,
        })
        setGoalInput('')
        setSavingGoal(false)
    }

    const start = startWeight ?? currentWeight ?? 0
    const weight = currentWeight ?? start
    const goal = goalWeight ?? 0
    const diff = parseFloat((weight - start).toFixed(1))
    const kvar = Math.max(0, weight - goal).toFixed(1)
    const pct = start !== goal
        ? Math.min(100, Math.max(0, ((start - weight) / (start - goal)) * 100))
        : 0

    const m = macros
    const macroBars = m ? [
        { name: '🥩 Protein', color: '#f97316', gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
        { name: '🍚 Kolhydr.', color: '#60a5fa', gram: `${m.carbs} g`, pct: `${m.carbPct}%`, barWidth: `${m.carbPct}%` },
        { name: '🥑 Fett', color: '#22c55e', gram: `${m.fat} g`, pct: `${m.fatPct}%`, barWidth: `${m.fatPct}%` },
    ] : []

    return (
        <section id="vikt">
            <SectionHeader number="02" title="Vikt & Kalorier" />

            {/* ── Stats ── */}
            <Reveal className={styles.section}>
                <CardGrid>
                    <CardGridItem label="Startvikt" value={loading ? '…' : `${start} kg`} />
                    <CardGridItem label="Aktuell vikt" value={loading ? '…' : `${weight} kg`} valueStyle={{ color: 'var(--accent)' }} />
                    <CardGridItem label="Målvikt" value={loading ? '…' : `${goal} kg`} valueStyle={{ color: 'var(--green)' }} />
                    <CardGridItem
                        label="Förändring"
                        value={loading ? '…' : `${diff > 0 ? '+' : ''}${diff} kg`}
                        valueStyle={{ color: diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--orange)' : 'var(--muted)' }}
                    />
                    <CardGridItem label="Kvar till mål" value={loading ? '…' : `−${kvar} kg`} valueStyle={{ color: 'var(--orange)' }} />
                </CardGrid>
            </Reveal>

            {/* ── Progress ── */}
            <Reveal className={styles.section}>
                <div className={styles.goalSection}>
                    <div className={styles.goalHeader}>
                        <span className={styles.goalTitle}>Viktmål — {start} kg → {goal} kg</span>
                        <span className={styles.goalNums}>
                            {pct.toFixed(0)}% klart
                        </span>
                    </div>
                    <div className={styles.goalBarBg}>
                        <div
                            className={styles.goalBarFill}
                            style={{ width: loading ? '0%' : `${pct}%` }}
                        />
                    </div>
                    <div className={styles.goalLabels}>
                        <span>Start ({start} kg)</span>
                        <span>Mål ({goal} kg)</span>
                    </div>
                </div>
            </Reveal>

            {/* ── Kalorier & Makros ── */}
            <Reveal className={styles.section}>
                <div className={styles.subHeading}>Kalorier &amp; Makros</div>
                <CardGrid className={styles.gridMargin}>
                    <CardGridItem
                        label={<span className={styles.labelInfo}>BMR<InfoModal title="BMR – Basalämnesomsättning" text="Antalet kalorier din kropp förbränner i total vila – utan någon aktivitet alls. Beräknas med Mifflin-St Jeor-formeln utifrån din vikt, längd och ålder. Det är grunden för alla övriga beräkningar." /></span>}
                        value={loading || !m ? '…' : `${m.bmr} kcal`}
                        sub="Vilande metabolim"
                    />
                    <CardGridItem
                        label={<span className={styles.labelInfo}>TDEE<InfoModal title="TDEE – Total daglig energiförbrukning" text="Total Daily Energy Expenditure. Ditt BMR multiplicerat med en aktivitetsfaktor. Faktor 1.55 används för måttlig träning (~3 gånger per vecka). Det här är ungefär hur många kalorier du förbränner totalt per dag och vad du behöver äta för att hålla vikten." /></span>}
                        value={loading || !m ? '…' : `${m.tdee} kcal`}
                        sub="Med träning 3×/vecka"
                    />
                    <CardGridItem
                        label={<span className={styles.labelInfo}>Underskott<InfoModal title="Kaloriunderskott" text="Äter du färre kalorier än ditt TDEE skapar du ett underskott. Med 280 kcal under TDEE varje dag förväntas du gå ner ungefär 0.3 kg per vecka – ett lagom och hållbart tempo." /></span>}
                        value={loading || !m ? '…' : `−${m.deficit} kcal`}
                        sub="≈ 0.3 kg/vecka"
                        valueStyle={{ color: 'var(--red)' }}
                    />
                    <CardGridItem
                        label={<span className={styles.labelInfo}>Mål per träningsdag<InfoModal title="Kalorier – träningsdag" text="Ditt faktiska dagliga kaloriintag på träningsdagar. Beräknas som TDEE minus underskottet. Det är kring det här värdet som ditt matschema är byggt." /></span>}
                        value={loading || !m ? '…' : `${m.targetKcal} kcal`}
                        valueStyle={{ color: 'var(--accent)' }}
                    />
                </CardGrid>

                <div className={styles.macroCard}>
                    <div className={styles.macroCardTitle}>Makrofördelning — träningsdag</div>
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
                            <span>Protein per kg kroppsvikt</span>
                            <span className={styles.proteinVal}>{(m.protein / weight).toFixed(2)} g/kg</span>
                        </div>
                    )}
                </div>
            </Reveal>

            {/* ── Logga / Ändra mål ── */}
            <Reveal>
                <div className={styles.inputsCard}>
                    <div className={styles.inputsCardTitle}>Uppdatera</div>
                    <div className={styles.inputSection}>
                        <div>
                            <div className={styles.inputLabel}>Logga ny vikt</div>
                            <form onSubmit={handleLogWeight} className={styles.logForm}>
                                <input
                                    type="number" step="0.1"
                                    placeholder={`Nuvarande (${weight} kg)`}
                                    value={weightInput}
                                    onChange={e => setWeightInput(e.target.value)}
                                    className={styles.logInput}
                                />
                                <button type="submit" disabled={loggingWeight} className={styles.logBtn}>
                                    {loggingWeight ? '…' : 'Spara'}
                                </button>
                            </form>
                        </div>
                        <div>
                            <div className={styles.inputLabel}>Ändra målvikt</div>
                            <form onSubmit={handleSaveGoal} className={styles.logForm}>
                                <input
                                    type="number" step="0.1"
                                    placeholder={`Nuvarande mål (${goal} kg)`}
                                    value={goalInput}
                                    onChange={e => setGoalInput(e.target.value)}
                                    className={styles.logInput}
                                />
                                <button type="submit" disabled={savingGoal} className={styles.logBtn}>
                                    {savingGoal ? '…' : 'Spara'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </Reveal>
        </section>
    )
}

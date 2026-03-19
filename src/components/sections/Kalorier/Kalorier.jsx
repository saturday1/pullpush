import { useEffect, useState } from 'react'
import { useProfile } from '../../../context/ProfileContext'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import InfoModal from '../../InfoModal/InfoModal'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Kalorier.module.scss'

export default function Kalorier() {
    const { loading, macros, currentWeight } = useProfile()
    const [barsVisible, setBarsVisible] = useState(false)

    useEffect(() => {
        if (!loading) {
            const t = setTimeout(() => setBarsVisible(true), 400)
            return () => clearTimeout(t)
        }
    }, [loading])

    const m = macros

    const macroBars = m ? [
        { name: '🥩 Protein', color: '#f97316', gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
        { name: '🍚 Kolhydr.', color: '#60a5fa', gram: `${m.carbs} g`, pct: `${m.carbPct}%`, barWidth: `${m.carbPct}%` },
        { name: '🥑 Fett', color: '#22c55e', gram: `${m.fat} g`, pct: `${m.fatPct}%`, barWidth: `${m.fatPct}%` },
    ] : []

    return (
        <section id="kalorier">
            <SectionHeader number="02" title="Kaloriberäkning & Makros" />

            <Reveal>
                <CardGrid className={styles.gridMargin}>
                    <CardGridItem
                        label={<span className={styles.labelInfo}>BMR (Mifflin-St Jeor)<InfoModal title="BMR – Basalämnesomsättning" text="Antalet kalorier din kropp förbränner i total vila – utan någon aktivitet alls. Beräknas med Mifflin-St Jeor-formeln utifrån din vikt, längd och ålder. Det är grunden för alla övriga beräkningar." /></span>}
                        value={loading || !m ? '…' : `${m.bmr} kcal`}
                        sub="Vilande metabolim"
                    />
                    <CardGridItem
                        label={<span className={styles.labelInfo}>TDEE (faktor 1.55)<InfoModal title="TDEE – Total daglig energiförbrukning" text="Total Daily Energy Expenditure. Ditt BMR multiplicerat med en aktivitetsfaktor. Faktor 1.55 används för måttlig träning (~3 gånger per vecka). Det här är ungefär hur många kalorier du förbränner totalt per dag och vad du behöver äta för att hålla vikten." /></span>}
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
                        label={<span className={styles.labelInfo}>Träningsdag totalt<InfoModal title="Kalorier – träningsdag" text="Ditt faktiska dagliga kaloriintag på träningsdagar. Beräknas som TDEE minus underskottet. Det är kring det här värdet som ditt matschema är byggt." /></span>}
                        value={loading || !m ? '…' : `${m.targetKcal} kcal`}
                        sub="Faktiskt matschema"
                        valueStyle={{ color: 'var(--accent)' }}
                    />
                </CardGrid>
            </Reveal>

            <Reveal>
                <div className={styles.card}>
                    <div className={styles.cardTitle}>Makrofördelning — träningsdag</div>
                    {macroBars.map(({ name, color, gram, pct, barWidth }) => (
                        <div key={name} className={styles.macroRow}>
                            <span className={styles.macroName} style={{ color }}>{name}</span>
                            <div className={styles.macroBarWrap}>
                                <div
                                    className={styles.macroBar}
                                    style={{ background: color, width: barsVisible ? barWidth : '0%' }}
                                />
                            </div>
                            <span className={styles.macroGram} style={{ color }}>{gram}</span>
                            <span className={styles.macroPct}>{pct}</span>
                        </div>
                    ))}
                    {m && currentWeight && (
                        <div className={styles.proteinRow}>
                            <span>Protein per kg kroppsvikt</span>
                            <span className={styles.proteinVal}>{(m.protein / currentWeight).toFixed(2)} g/kg</span>
                        </div>
                    )}
                </div>
            </Reveal>
        </section>
    )
}

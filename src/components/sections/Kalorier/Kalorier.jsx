import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProfile } from '../../../context/ProfileContext'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import InfoModal from '../../InfoModal/InfoModal'
import Reveal from '../../Reveal/Reveal'
import SectionHeader from '../../SectionHeader/SectionHeader'
import styles from './Kalorier.module.scss'

export default function Kalorier() {
    const { t } = useTranslation()
    const { loading, macros, currentWeight } = useProfile()
    const [barsVisible, setBarsVisible] = useState(false)

    useEffect(() => {
        if (!loading) {
            const timer = setTimeout(() => setBarsVisible(true), 400)
            return () => clearTimeout(timer)
        }
    }, [loading])

    const m = macros

    const macroBars = m ? [
        { name: `🥩 ${t('Protein')}`, color: '#f97316', gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
        { name: `🍚 ${t('Carbs')}`,   color: '#60a5fa', gram: `${m.carbs} g`,   pct: `${m.carbPct}%`,    barWidth: `${m.carbPct}%`    },
        { name: `🥑 ${t('Fat')}`,     color: '#22c55e', gram: `${m.fat} g`,     pct: `${m.fatPct}%`,     barWidth: `${m.fatPct}%`     },
    ] : []

    return (
        <section id="kalorier">
            <SectionHeader number="02" title={t('Calorie calculation & Macros')} />

            <Reveal>
                <CardGrid className={styles.gridMargin}>
                    <CardGridItem
                        label={<span className={styles.labelInfo}>BMR (Mifflin-St Jeor)<InfoModal title="BMR – Basalämnesomsättning" text="Antalet kalorier din kropp förbränner i total vila – utan någon aktivitet alls. Beräknas med Mifflin-St Jeor-formeln utifrån din vikt, längd och ålder. Det är grunden för alla övriga beräkningar." /></span>}
                        value={loading || !m ? '…' : `${m.bmr} kcal`}
                        sub={t('Resting metabolism')}
                    />
                    <CardGridItem
                        label={<span className={styles.labelInfo}>TDEE (faktor 1.55)<InfoModal title="TDEE – Total daglig energiförbrukning" text="Total Daily Energy Expenditure. Ditt BMR multiplicerat med en aktivitetsfaktor. Faktor 1.55 används för måttlig träning (~3 gånger per vecka). Det här är ungefär hur många kalorier du förbränner totalt per dag och vad du behöver äta för att hålla vikten." /></span>}
                        value={loading || !m ? '…' : `${m.tdee} kcal`}
                        sub={t('With training 3×/week')}
                    />
                    <CardGridItem
                        label={<span className={styles.labelInfo}>Underskott<InfoModal title="Kaloriunderskott" text="Äter du färre kalorier än ditt TDEE skapar du ett underskott. Med 280 kcal under TDEE varje dag förväntas du gå ner ungefär 0.3 kg per vecka – ett lagom och hållbart tempo." /></span>}
                        value={loading || !m ? '…' : `−${m.deficit} kcal`}
                        sub={t('≈ 0.3 kg/week')}
                        valueStyle={{ color: 'var(--red)' }}
                    />
                    <CardGridItem
                        label={<span className={styles.labelInfo}>Träningsdag totalt<InfoModal title="Kalorier – träningsdag" text="Ditt faktiska dagliga kaloriintag på träningsdagar. Beräknas som TDEE minus underskottet. Det är kring det här värdet som ditt matschema är byggt." /></span>}
                        value={loading || !m ? '…' : `${m.targetKcal} kcal`}
                        sub={t('Actual meal plan')}
                        valueStyle={{ color: 'var(--accent)' }}
                    />
                </CardGrid>
            </Reveal>

            <Reveal>
                <div className={styles.card}>
                    <div className={styles.cardTitle}>{t('Macro split — training day')}</div>
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
                            <span>{t('Protein per kg body weight')}</span>
                            <span className={styles.proteinVal}>{(m.protein / currentWeight).toFixed(2)} g/kg</span>
                        </div>
                    )}
                </div>
            </Reveal>
        </section>
    )
}

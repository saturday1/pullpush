import { useEffect, useState } from 'react'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import { useProfile } from '../../../context/ProfileContext'
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
    { name: '🥩 Protein',  color: '#f97316', gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
    { name: '🍚 Kolhydr.', color: '#60a5fa', gram: `${m.carbs} g`,   pct: `${m.carbPct}%`,    barWidth: `${m.carbPct}%`    },
    { name: '🥑 Fett',     color: '#22c55e', gram: `${m.fat} g`,     pct: `${m.fatPct}%`,     barWidth: `${m.fatPct}%`     },
  ] : []

  return (
    <section id="kalorier">
      <SectionHeader number="02" title="Kaloriberäkning & Makros" />

      <Reveal>
        <CardGrid className={styles.gridMargin}>
          <CardGridItem label="BMR (Mifflin-St Jeor)" value={loading || !m ? '…' : `${m.bmr} kcal`}       sub="Vilande metabolim" />
          <CardGridItem label="TDEE (faktor 1.55)"    value={loading || !m ? '…' : `${m.tdee} kcal`}       sub="Med träning 3×/vecka" />
          <CardGridItem label="Underskott"            value={loading || !m ? '…' : `−${m.deficit} kcal`}   sub="≈ 0.3 kg/vecka" valueStyle={{ color: 'var(--red)' }} />
          <CardGridItem label="Träningsdag totalt"    value={loading || !m ? '…' : `${m.targetKcal} kcal`} sub="Faktiskt matschema" valueStyle={{ color: 'var(--accent)' }} />
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

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import { useProfile } from '../../../context/ProfileContext'
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
    { name: `🥩 ${t('Protein')}`,  color: '#f97316', gram: `${m.protein} g`, pct: `${m.proteinPct}%`, barWidth: `${m.proteinPct}%` },
    { name: `🍚 ${t('Carbs')}`,    color: '#60a5fa', gram: `${m.carbs} g`,   pct: `${m.carbPct}%`,    barWidth: `${m.carbPct}%`    },
    { name: `🥑 ${t('Fat')}`,      color: '#22c55e', gram: `${m.fat} g`,     pct: `${m.fatPct}%`,     barWidth: `${m.fatPct}%`     },
  ] : []

  return (
    <section id="kalorier">
      <SectionHeader number="02" title={t('Calorie calculation & Macros')} />

      <Reveal>
        <CardGrid className={styles.gridMargin}>
          <CardGridItem label={t('BMR (Mifflin-St Jeor)')} value={loading || !m ? '…' : `${m.bmr} kcal`}       sub={t('Resting metabolism')} />
          <CardGridItem label={t('TDEE (factor 1.55)')}     value={loading || !m ? '…' : `${m.tdee} kcal`}       sub={t('With training 3×/week')} />
          <CardGridItem label={t('Deficit')}                 value={loading || !m ? '…' : `−${m.deficit} kcal`}   sub={t('≈ 0.3 kg/week')} valueStyle={{ color: 'var(--red)' }} />
          <CardGridItem label={t('Training day total')}      value={loading || !m ? '…' : `${m.targetKcal} kcal`} sub={t('Actual meal plan')} valueStyle={{ color: 'var(--accent)' }} />
        </CardGrid>
      </Reveal>

      <Reveal>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{t('Macro split — training day')}</div>
          {macroBars.map(({ name, color, gram, pct, barWidth }) => (
            <div key={name} className={styles.macroRow}>
              <span className={styles.macroName} style={{ color }}>{name}</span>
              <div className={styles.macroBarWrap}>
                <div className={styles.macroBar} style={{ background: color, width: barsVisible ? barWidth : '0%' }} />
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

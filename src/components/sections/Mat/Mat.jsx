import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import styles from './Mat.module.scss'

function MealTable({ meals, t }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('Time')}</th>
            <th>{t('Food')}</th>
            <th style={{ color: '#f97316' }}>{t('P')}</th>
            <th style={{ color: '#60a5fa' }}>{t('C')}</th>
            <th style={{ color: '#22c55e' }}>{t('F')}</th>
            <th>Kcal</th>
          </tr>
        </thead>
        <tbody>
          {meals.map(({ time, label, food, note, p, k, f, kcal }) => (
            <tr key={time + label}>
              <td>
                <div className={styles.mealTime}>{time}</div>
                <div className={styles.mealLabel}>{label}</div>
              </td>
              <td>{food}{note && <em className={styles.mealNote}> {note}</em>}</td>
              <td><span className="pill pill-p">{p}</span></td>
              <td><span className="pill pill-k">{k}</span></td>
              <td><span className="pill pill-f">{f}</span></td>
              <td>{kcal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Mat() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('train')

  const trainMeals  = t('trainMeals',  { returnObjects: true })
  const restMeals   = t('restMeals',   { returnObjects: true })
  const supplements = t('supplements',  { returnObjects: true })

  return (
    <section id="mat">
      <SectionHeader number="03" title={t('Food & Nutrition')} />

      <Reveal>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'train' ? styles.active : ''}`} onClick={() => setTab('train')}>{t('Training day')}</button>
          <button className={`${styles.tab} ${tab === 'rest'  ? styles.active : ''}`} onClick={() => setTab('rest')}>{t('Rest day')}</button>
        </div>
      </Reveal>

      {tab === 'train' && (
        <Reveal>
          <div className={styles.totals}>
            <span>{t('Total:')} <strong>{t('~2,507 kcal')}</strong></span>
            <span style={{ color: '#f97316' }}>{t('P: 262 g')}</span>
            <span style={{ color: '#60a5fa' }}>{t('C: 159 g')}</span>
            <span style={{ color: '#22c55e' }}>{t('F: 92 g')}</span>
          </div>
          <MealTable meals={trainMeals} t={t} />
        </Reveal>
      )}
      {tab === 'rest' && (
        <Reveal>
          <div className={styles.totals}>
            <span>{t('Total:')} <strong>{t('~2,021 kcal')}</strong></span>
            <span style={{ color: '#f97316' }}>{t('P: 228 g')}</span>
            <span style={{ color: '#60a5fa' }}>{t('C: 117 g')}</span>
            <span style={{ color: '#22c55e' }}>{t('F: 71 g')}</span>
          </div>
          <MealTable meals={restMeals} t={t} />
          <div className={styles.restNote}>
            {t('Difference: Almonds removed, sweet potato dropped, half rice at dinner, no post-workout shake. Creatine taken in a glass of water.')}
          </div>
        </Reveal>
      )}

      <Reveal>
        <div className={styles.subHeading}>{t('Creatine & Supplements')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('Supplement')}</th>
                <th>{t('Dose')}</th>
                <th>{t('Recommendation')}</th>
              </tr>
            </thead>
            <tbody>
              {supplements.map(({ name, dose, info }, i) => (
                <tr key={i}>
                  <td><div className={styles.suppName}>{name}</div></td>
                  <td><span className={styles.suppDose} style={name === 'Vatten' || name === 'Water' ? { color: 'var(--blue)' } : {}}>{dose}</span></td>
                  <td>{info}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  )
}

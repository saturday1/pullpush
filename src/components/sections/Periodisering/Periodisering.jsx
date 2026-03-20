import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import styles from './Periodisering.module.scss'

export default function Periodisering() {
  const { t } = useTranslation()

  const infoBoxes = [
    { variant: '',      title: t('Progressive overload'), text: t('If you can do more reps than the upper range with good form → increase the weight next time. Add 1.25–2.5 kg for upper body, 2.5–5 kg for legs. Always log your weights.') },
    { variant: 'blue',  title: t('Exercise rotation'),    text: t('Swap 1–2 exercises per session every 6–8 weeks. Keep the core lifts (bench, lat pulldown, leg press). Don\'t swap because it\'s "boring" — progression is the result.') },
    { variant: 'green', title: t('Free weights'),         text: t('Add free weights (dumbbell press, deadlift) after 3–4 months when technique is solid. Activates more stabilizer muscles.') },
  ]

  return (
    <section id="periodisering">
      <SectionHeader number="05" title={t('Periodization')} />

      <Reveal>
        <div className={styles.infoGrid}>
          {infoBoxes.map(({ variant, title, text }) => (
            <div key={title} className={`${styles.infoBox} ${variant ? styles[variant] : ''}`}>
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
    </section>
  )
}

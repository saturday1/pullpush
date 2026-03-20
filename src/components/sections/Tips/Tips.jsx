import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import styles from './Tips.module.scss'

const tipKeys = [
  'Recovery takes longer. <strong>7–9 hours of sleep</strong> is just as important as training.',
  '<strong>5–10 min light cardio</strong> + dynamic stretching before the session. Always warm up properly.',
  '<strong>Technique over weight.</strong> Risk of injury increases with age, and injuries halt all progress.',
  'Try adding <strong>1–2 g omega-3 (fish oil)</strong> — reduces inflammation and supports joint health.',
  '<strong>Vitamin D + magnesium</strong> can improve sleep and muscle function — ask your doctor.',
  'Weigh yourself <strong>max once a week</strong>, in the morning after the bathroom, not after training.',
  'Photos and how your clothes fit are <strong>better metrics</strong> than just the number on the scale.',
  'With 17 kg to lose you can expect <strong>6–12 months</strong> at 0.3–0.5 kg/week — realistic and sustainable.',
]

export default function Tips() {
  const { t } = useTranslation()

  const periodiseringBoxes = [
    { title: t('Progressive overload'), text: t('If you can do more reps than the upper range with good form → increase the weight next time. Add 1.25–2.5 kg for upper body, 2.5–5 kg for legs. Always log your weights.') },
    { title: t('Exercise rotation'),    text: t('Swap 1–2 exercises per session every 6–8 weeks. Keep the core lifts (bench, lat pulldown, leg press). Don\'t swap because it\'s "boring" — progression is the result.') },
    { title: t('Free weights'),         text: t('Add free weights (dumbbell press, deadlift) after 3–4 months when technique is solid. Activates more stabilizer muscles.') },
  ]

  return (
    <section id="tips">
      <SectionHeader number="07" title={t('Tips & periodization')} />

      <Reveal>
        <ul className={styles.tipsList}>
          {tipKeys.map((key) => (
            <li key={key} dangerouslySetInnerHTML={{ __html: t(key) }} />
          ))}
        </ul>
      </Reveal>

      <Reveal>
        <div className={styles.infoGrid}>
          {periodiseringBoxes.map(({ title, text }) => (
            <div key={title} className={styles.infoBox}>
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

      <div className={styles.disclaimer}>
        {t('This plan is a suggestion based on the provided information. Consult a doctor or certified nutritionist before making major dietary changes.')}
      </div>
    </section>
  )
}

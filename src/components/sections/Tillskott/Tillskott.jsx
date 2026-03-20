import { useTranslation } from 'react-i18next'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import styles from './Tillskott.module.scss'

export default function Tillskott() {
  const { t } = useTranslation()
  const supplements = t('supplements', { returnObjects: true })

  return (
    <section id="tillskott">
      <SectionHeader number="06" title={t('Creatine & Supplements')} />

      <Reveal>
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

import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import styles from './Periodisering.module.scss'

const infoBoxes = [
  {
    variant: '',
    title: 'Progressiv överlastning',
    text: 'Klara du fler reps än övre intervallet med bra teknik → höj vikten nästa gång. Öka med 1.25–2.5 kg för överkropp, 2.5–5 kg för ben. Logga alltid dina vikter.',
  },
  {
    variant: 'blue',
    title: 'Byte av övningar',
    text: 'Byt 1–2 övningar per pass var 6–8:e vecka. Behåll kärnövningarna (bänk, lat pulldown, benpress). Byt inte för att det är "tråkigt" — progression är resultatet.',
  },
  {
    variant: 'green',
    title: 'Fria vikter',
    text: 'Lägg till fria vikter (hantelpress, marklyft) efter 3–4 månader när tekniken sitter. Aktiverar fler stabiliseringsmuskler.',
  },
]

export default function Periodisering() {
  return (
    <section id="periodisering">
      <SectionHeader number="05" title="Periodisering" />

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
          <strong>DELOAD</strong>
          <span>
            Var 6–8:e vecka: kör samma övningar och set, men <strong>minska vikten med 50%</strong> och håll lägre reps.
            Aktiv deload — vila inte helt. Tecken på att du behöver deload NU: prestanda minskar 2 pass i rad,
            sömnproblem, led-/muskelömhet som inte försvinner, kraftigt sjunkande motivation.
          </span>
        </div>
      </Reveal>

      <Reveal>
        <CardGrid>
          <CardGridItem label="Deload — hur ofta" value="Var 6–8 v"   valueStyle={{ fontSize: '22px' }} sub="Ökar till var 4–6 v när intensiteten ökar" />
          <CardGridItem label="Deload-vikt"       value="50%"         valueStyle={{ color: 'var(--orange)' }}                                           sub="Av din normala arbetsvikt" />
          <CardGridItem label="Kost under deload" value="Underhåll"   valueStyle={{ fontSize: '18px' }}                                                 sub="Äta lite mer stödjer återhämtning" />
        </CardGrid>
      </Reveal>
    </section>
  )
}

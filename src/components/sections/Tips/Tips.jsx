import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import { CardGrid, CardGridItem } from '../../CardGrid/CardGrid'
import styles from './Tips.module.scss'

const tips = [
  <>Återhämtning tar längre tid. <strong>7–9 timmars sömn</strong> är lika viktigt som träningen.</>,
  <><strong>5–10 min lätt kardio</strong> + dynamisk stretch före passet. Värm alltid upp ordentligt.</>,
  <><strong>Teknik framför vikt.</strong> Risk för skada ökar med åldern, och skador stoppar all progress.</>,
  <>Testa att lägga till <strong>1–2 g omega-3 (fiskolja)</strong> — minskar inflammation och stödjer led-hälsa.</>,
  <><strong>D-vitamin + magnesium</strong> kan förbättra sömn och muskelfunktion — fråga din läkare.</>,
  <>Mät vikten <strong>max 1 gång/vecka</strong>, på morgonen efter toalettbesök, ej efter träning.</>,
  <>Foton och hur kläderna sitter är <strong>bättre mätvärden</strong> än bara kilo på vågen.</>,
  <>Med 17 kg att tappa kan du räkna med <strong>6–12 månader</strong> om du håller 0.3–0.5 kg/vecka — realistiskt och hållbart.</>,
]

const periodiseringBoxes = [
  {
    title: 'Progressiv överlastning',
    text: 'Klara du fler reps än övre intervallet med bra teknik → höj vikten nästa gång. Öka med 1.25–2.5 kg för överkropp, 2.5–5 kg för ben. Logga alltid dina vikter.',
  },
  {
    title: 'Byte av övningar',
    text: 'Byt 1–2 övningar per pass var 6–8:e vecka. Behåll kärnövningarna (bänk, lat pulldown, benpress). Byt inte för att det är "tråkigt" — progression är resultatet.',
  },
  {
    title: 'Fria vikter',
    text: 'Lägg till fria vikter (hantelpress, marklyft) efter 3–4 månader när tekniken sitter. Aktiverar fler stabiliseringsmuskler.',
  },
]

export default function Tips() {
  return (
    <section id="tips">
      <SectionHeader number="07" title="Tips & periodisering" />

      <Reveal>
        <ul className={styles.tipsList}>
          {tips.map((tip, i) => (
            <li key={i}>{tip}</li>
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

      <div className={styles.disclaimer}>
        Denna plan är ett förslag baserat på angivna uppgifter. Konsultera läkare eller certifierad kostrådgivare vid stora kostförändringar.
      </div>
    </section>
  )
}

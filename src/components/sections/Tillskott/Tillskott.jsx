import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import styles from './Tillskott.module.scss'

const supplements = [
  {
    name: 'Kreatin monohydrat',
    dose: '5 g/dag',
    doseStyle: {},
    info: 'Timing spelar ingen roll — ta det när det passar. Ingen laddningsfas behövs. Kör konsekvent varje dag, även vilodagar.',
  },
  {
    name: 'Whey 100 (post-workout)',
    dose: '1 dl (~30g)',
    doseStyle: {},
    info: 'Drick inom 1–2h efter träning. På vilodagar ingår det i kvällsmålet (i kvargen).',
  },
  {
    name: 'Vatten',
    dose: '3+ liter/dag',
    doseStyle: { color: 'var(--blue)' },
    info: 'Kreatin ökar vattenbehovet. Tecken på underfuktning: trötthet, sämre prestanda, hunger.',
  },
]

export default function Tillskott() {
  return (
    <section id="tillskott">
      <SectionHeader number="06" title="Kreatin & Tillskott" />

      <Reveal>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tillskott</th>
                <th>Dos</th>
                <th>Rekommendation</th>
              </tr>
            </thead>
            <tbody>
              {supplements.map(({ name, dose, doseStyle, info }) => (
                <tr key={name}>
                  <td><div className={styles.suppName}>{name}</div></td>
                  <td><span className={styles.suppDose} style={doseStyle}>{dose}</span></td>
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

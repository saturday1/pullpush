import { useState } from 'react'
import SectionHeader from '../../SectionHeader/SectionHeader'
import Reveal from '../../Reveal/Reveal'
import styles from './Mat.module.scss'

const trainMeals = [
  { time: '07:00',      label: 'Frukost',   food: '1 dl kvarg (140g) + 1 dl proteinpulver (30g whey) + 1 dl havregryn (40g) + 1 dl mjölk 3% (100ml)', p: '46g', k: '38g', f: '8g',  kcal: 405 },
  { time: '10:30',      label: 'Mellanmål', food: '1 kokt ägg + 1 äpple + 10 mandlar',                                                                   p: '12g', k: '21g', f: '15g', kcal: 267 },
  { time: '13:00',      label: 'Lunch',     food: '300g kycklingfilé (ugn) + 150g sötpotatis + stor sallad + 1 msk olivolja',                             p: '72g', k: '32g', f: '23g', kcal: 624 },
  { time: '15:30',      label: 'Mellanmål', food: '2 kokta ägg + 1 äpple + 10 mandlar',                                                                   p: '19g', k: '21g', f: '21g', kcal: 348 },
  { time: 'Efter pass', label: 'Protein',   food: '1 dl whey (30g) i vatten/mjölk. Kreatin (5g) kan tas här.',                                            p: '23g', k: '2g',  f: '2g',  kcal: 114 },
  { time: '19:00',      label: 'Middag',    food: '200g lax/torsk/nöt + 100g quinoa/ris + broccoli/zucchini',                                             p: '46g', k: '29g', f: '21g', kcal: 489 },
  { time: '21:00',      label: 'Kvällsmål', food: '200g kvarg + 100g bär (frysta OK) + 30g proteinpulver (i kvargen)',                                    p: '44g', k: '16g', f: '2g',  kcal: 260 },
]

const restMeals = [
  { time: '07:00', label: 'Frukost',   food: '1 dl kvarg (140g) + 1 dl proteinpulver (30g whey) + 1 dl havregryn (40g) + 1 dl mjölk 3% (100ml)', p: '46g', k: '38g', f: '8g',  kcal: 405 },
  { time: '10:30', label: 'Mellanmål', food: '1 kokt ägg + 1 äpple',                                                                               p: '8g',  k: '18g', f: '6g',  kcal: 157 },
  { time: '13:00', label: 'Lunch',     food: '300g kycklingfilé (ugn) + stor sallad + 1 msk olivolja',                                             p: '70g', k: '3g',  f: '23g', kcal: 499, note: '(skippa sötpotatisen)' },
  { time: '15:30', label: 'Mellanmål', food: '2 kokta ägg + 1 äpple',                                                                              p: '15g', k: '19g', f: '11g', kcal: 238 },
  { time: '19:00', label: 'Middag',    food: '200g lax/torsk/nöt + 75g quinoa/ris + broccoli/zucchini',                                            p: '45g', k: '23g', f: '21g', kcal: 462, note: '(halv portion ris)' },
  { time: '21:00', label: 'Kvällsmål', food: '200g kvarg + 100g bär + 30g proteinpulver (i kvargen)',                                              p: '44g', k: '16g', f: '2g',  kcal: 260 },
]

const supplements = [
  { name: 'Kreatin monohydrat', dose: '5 g/dag',       doseStyle: {},                        info: 'Timing spelar ingen roll — ta det när det passar. Ingen laddningsfas behövs. Kör konsekvent varje dag, även vilodagar.' },
  { name: 'Whey 100 (post-workout)', dose: '1 dl (~30g)', doseStyle: {},                     info: 'Drick inom 1–2h efter träning. På vilodagar ingår det i kvällsmålet (i kvargen).' },
  { name: 'Vatten',             dose: '3+ liter/dag',   doseStyle: { color: 'var(--blue)' }, info: 'Kreatin ökar vattenbehovet. Tecken på underfuktning: trötthet, sämre prestanda, hunger.' },
]

function MealTable({ meals }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tid</th>
            <th>Mat</th>
            <th style={{ color: '#f97316' }}>P</th>
            <th style={{ color: '#60a5fa' }}>K</th>
            <th style={{ color: '#22c55e' }}>F</th>
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
  const [tab, setTab] = useState('train')

  return (
    <section id="mat">
      <SectionHeader number="03" title="Mat & Näring" />

      {/* ── Matschema ── */}
      <Reveal>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'train' ? styles.active : ''}`} onClick={() => setTab('train')}>Träningsdag</button>
          <button className={`${styles.tab} ${tab === 'rest'  ? styles.active : ''}`} onClick={() => setTab('rest')}>Vilodag</button>
        </div>
      </Reveal>

      {tab === 'train' && (
        <Reveal>
          <div className={styles.totals}>
            <span>Totalt: <strong>~2 507 kcal</strong></span>
            <span style={{ color: '#f97316' }}>P: 262 g</span>
            <span style={{ color: '#60a5fa' }}>K: 159 g</span>
            <span style={{ color: '#22c55e' }}>F: 92 g</span>
          </div>
          <MealTable meals={trainMeals} />
        </Reveal>
      )}
      {tab === 'rest' && (
        <Reveal>
          <div className={styles.totals}>
            <span>Totalt: <strong>~2 021 kcal</strong></span>
            <span style={{ color: '#f97316' }}>P: 228 g</span>
            <span style={{ color: '#60a5fa' }}>K: 117 g</span>
            <span style={{ color: '#22c55e' }}>F: 71 g</span>
          </div>
          <MealTable meals={restMeals} />
          <div className={styles.restNote}>
            Skillnad: Mandlar borttagna, sötpotatis utgår, halv risdel vid middag, ingen post-workout shake. Kreatin tas i ett glas vatten.
          </div>
        </Reveal>
      )}

      {/* ── Tillskott ── */}
      <Reveal>
        <div className={styles.subHeading}>Kreatin &amp; Tillskott</div>
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

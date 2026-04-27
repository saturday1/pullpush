import { terms } from '../TermsModal/terms'
import styles from './Legal.module.scss'

export default function Terms(): React.ReactElement {
    const content = terms.sv

    return (
        <div className={styles.page}>
            <button className={styles.back} onClick={() => history.back()}>← Tillbaka</button>
            <div className={styles.title}>{content.title}</div>
            <div className={styles.updated}>{content.updated}</div>
            {content.sections.map(s => (
                <div key={s.heading} className={styles.section}>
                    <h2>{s.heading}</h2>
                    <p>{s.text}</p>
                </div>
            ))}
        </div>
    )
}

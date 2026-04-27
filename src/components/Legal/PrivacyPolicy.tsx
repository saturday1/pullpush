import { privacy } from '../PrivacyPolicyModal/privacy'
import styles from './Legal.module.scss'

export default function PrivacyPolicy(): React.ReactElement {
    const content = privacy.sv

    return (
        <div className={styles.page}>
            <button className={styles.back} onClick={() => history.back()}>← Tillbaka</button>
            <div className={styles.title}>{content.title}</div>
            <div className={styles.updated}>{content.updated}</div>
            {content.sections.map(s => (
                <div key={s.heading} className={styles.section}>
                    <h2>{s.heading}</h2>
                    {s.text && <p>{s.text}</p>}
                    {s.items && (
                        <ul>
                            {s.items.map(item => <li key={item}>{item}</li>)}
                        </ul>
                    )}
                    {s.text2 && <p>{s.text2}</p>}
                </div>
            ))}
        </div>
    )
}
